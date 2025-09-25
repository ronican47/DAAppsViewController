from fastapi import FastAPI, APIRouter, File, UploadFile, HTTPException, Form
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
from enum import Enum
import shutil
import mimetypes


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Serve static files
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")


class Platform(str, Enum):
    WHATSAPP = "whatsapp"
    TELEGRAM = "telegram"


class Contact(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: str
    platform: Platform
    avatar_url: Optional[str] = None
    last_seen: datetime = Field(default_factory=datetime.utcnow)
    is_online: bool = False


class FileMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    original_name: str
    file_path: str
    file_size: int
    mime_type: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)


class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: str
    sender_id: str
    content: Optional[str] = None
    file_message: Optional[FileMessage] = None
    platform: Platform
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    is_sent: bool = True
    is_read: bool = False


class Conversation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    participant_ids: List[str]
    platform: Platform
    last_message_id: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ContactCreate(BaseModel):
    name: str
    phone: str
    platform: Platform
    avatar_url: Optional[str] = None


class MessageCreate(BaseModel):
    conversation_id: str
    sender_id: str
    content: Optional[str] = None
    platform: Platform


# Routes
@api_router.get("/")
async def root():
    return {"message": "WhatsApp + Telegram Unified Messaging API"}


@api_router.get("/contacts", response_model=List[Contact])
async def get_contacts(platform: Optional[Platform] = None):
    filter_dict = {}
    if platform:
        filter_dict["platform"] = platform.value
    
    contacts = await db.contacts.find(filter_dict).to_list(1000)
    return [Contact(**contact) for contact in contacts]


@api_router.post("/contacts", response_model=Contact)
async def create_contact(contact: ContactCreate):
    contact_dict = contact.dict()
    contact_obj = Contact(**contact_dict)
    await db.contacts.insert_one(contact_obj.dict())
    return contact_obj


@api_router.get("/conversations", response_model=List[Conversation])
async def get_conversations(platform: Optional[Platform] = None):
    filter_dict = {}
    if platform:
        filter_dict["platform"] = platform.value
    
    conversations = await db.conversations.find(filter_dict).sort("updated_at", -1).to_list(1000)
    return [Conversation(**conv) for conv in conversations]


@api_router.get("/conversations/{conversation_id}/messages", response_model=List[Message])
async def get_conversation_messages(conversation_id: str):
    messages = await db.messages.find({"conversation_id": conversation_id}).sort("timestamp", 1).to_list(1000)
    return [Message(**msg) for msg in messages]


@api_router.post("/messages", response_model=Message)
async def send_message(message: MessageCreate):
    message_dict = message.dict()
    message_obj = Message(**message_dict)
    
    # Insert message
    await db.messages.insert_one(message_obj.dict())
    
    # Update conversation
    await db.conversations.update_one(
        {"id": message.conversation_id},
        {
            "$set": {
                "last_message_id": message_obj.id,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return message_obj


@api_router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    conversation_id: str = Form(...),
    sender_id: str = Form(...),
    platform: Platform = Form(...)
):
    try:
        # Generate unique filename
        file_extension = Path(file.filename).suffix
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        file_path = UPLOAD_DIR / unique_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Get file info
        file_size = file_path.stat().st_size
        mime_type = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
        
        # Create file message
        file_message = FileMessage(
            filename=unique_filename,
            original_name=file.filename,
            file_path=f"/uploads/{unique_filename}",
            file_size=file_size,
            mime_type=mime_type
        )
        
        # Create message with file
        message = Message(
            conversation_id=conversation_id,
            sender_id=sender_id,
            file_message=file_message,
            platform=platform
        )
        
        # Save to database
        await db.messages.insert_one(message.dict())
        
        # Update conversation
        await db.conversations.update_one(
            {"id": conversation_id},
            {
                "$set": {
                    "last_message_id": message.id,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        return {"message": "File uploaded successfully", "file_message": file_message, "message_id": message.id}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")


@api_router.get("/files/{filename}")
async def get_file(filename: str):
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)


@api_router.post("/init-mock-data")
async def init_mock_data():
    # Clear existing data
    await db.contacts.delete_many({})
    await db.conversations.delete_many({})
    await db.messages.delete_many({})
    
    # Create WhatsApp contacts
    whatsapp_contacts = [
        Contact(name="Ali Yılmaz", phone="+90555123456", platform=Platform.WHATSAPP, avatar_url="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face", is_online=True),
        Contact(name="Ayşe Demir", phone="+90555234567", platform=Platform.WHATSAPP, avatar_url="https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face", is_online=False),
        Contact(name="Mehmet Can", phone="+90555345678", platform=Platform.WHATSAPP, avatar_url="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face", is_online=True),
        Contact(name="Fatma Şahin", phone="+90555456789", platform=Platform.WHATSAPP, avatar_url="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face", is_online=False),
        Contact(name="Emre Kaya", phone="+90555567890", platform=Platform.WHATSAPP, avatar_url="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face", is_online=True),
        Contact(name="Zeynep Özkan", phone="+90555678901", platform=Platform.WHATSAPP, avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face", is_online=False),
        Contact(name="Burak Aydın", phone="+90555789012", platform=Platform.WHATSAPP, avatar_url="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face", is_online=True),
        Contact(name="Selin Çelik", phone="+90555890123", platform=Platform.WHATSAPP, avatar_url="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face", is_online=False),
    ]
    
    # Create Telegram contacts
    telegram_contacts = [
        Contact(name="Ahmet Türk", phone="+90555123111", platform=Platform.TELEGRAM, avatar_url="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop&crop=face", is_online=True),
        Contact(name="Elif Yıldız", phone="+90555234222", platform=Platform.TELEGRAM, avatar_url="https://images.unsplash.com/photo-1581456495146-65a71b2c8e52?w=100&h=100&fit=crop&crop=face", is_online=False),
        Contact(name="Cem Doğan", phone="+90555345333", platform=Platform.TELEGRAM, avatar_url="https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=100&h=100&fit=crop&crop=face", is_online=True),
        Contact(name="Derya Arslan", phone="+90555456444", platform=Platform.TELEGRAM, avatar_url="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face", is_online=False),
        Contact(name="Oğuz Polat", phone="+90555567555", platform=Platform.TELEGRAM, avatar_url="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face", is_online=True),
        Contact(name="İrem Bulut", phone="+90555678666", platform=Platform.TELEGRAM, avatar_url="https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=100&h=100&fit=crop&crop=face", is_online=False),
        Contact(name="Kerem Aktaş", phone="+90555789777", platform=Platform.TELEGRAM, avatar_url="https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=100&h=100&fit=crop&crop=face", is_online=True),
        Contact(name="Gizem Koç", phone="+90555890888", platform=Platform.TELEGRAM, avatar_url="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=100&h=100&fit=crop&crop=face", is_online=False),
    ]
    
    all_contacts = whatsapp_contacts + telegram_contacts
    
    # Insert contacts
    for contact in all_contacts:
        await db.contacts.insert_one(contact.dict())
    
    # Create conversations
    conversations = []
    for i, contact in enumerate(all_contacts):
        conv = Conversation(
            participant_ids=["user", contact.id],
            platform=contact.platform
        )
        conversations.append(conv)
        await db.conversations.insert_one(conv.dict())
        
        # Create sample messages
        sample_messages = [
            Message(
                conversation_id=conv.id,
                sender_id=contact.id,
                content=f"Merhaba! {contact.platform.value} üzerinden mesaj gönderiyorum.",
                platform=contact.platform
            ),
            Message(
                conversation_id=conv.id,
                sender_id="user",
                content="Merhaba! Nasılsın?",
                platform=contact.platform
            ),
            Message(
                conversation_id=conv.id,
                sender_id=contact.id,
                content="İyiyim teşekkürler. Dosya paylaşma özelliğini test edebiliriz!",
                platform=contact.platform
            )
        ]
        
        for msg in sample_messages:
            await db.messages.insert_one(msg.dict())
    
    return {
        "message": "Mock data initialized successfully",
        "contacts_created": len(all_contacts),
        "conversations_created": len(conversations)
    }


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()