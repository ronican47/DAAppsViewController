from fastapi import FastAPI, APIRouter, File, UploadFile, HTTPException, Form, Depends, status
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.encoders import jsonable_encoder
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timedelta
from enum import Enum
import shutil
import mimetypes
import jwt
import bcrypt
from cryptography.fernet import Fernet
import asyncio
from fastapi import WebSocket, WebSocketDisconnect
import json
from bson import ObjectId
import random
import aiohttp
import langdetect

# Import new LLM service and mock integrations
from llm_service import translation_service, stt_service
from mock_integrations import whatsapp_mock, telegram_mock

# Language settings
SUPPORTED_LANGUAGES = {
    'tr': 'Türkçe',
    'en': 'English', 
    'de': 'Deutsch',
    'fr': 'Français',
    'es': 'Español',
    'it': 'Italiano',
    'ru': 'Русский',
    'ar': 'العربية',
    'ja': '日本語',
    'ko': '한국어',
    'zh': '中文',
    'pt': 'Português'
}

def detect_language(text: str) -> str:
    """Detect language of text"""
    try:
        return langdetect.detect(text)
    except:
        return 'en'  # Default to English if detection fails

async def translate_text(text: str, target_language: str, source_language: str = None) -> Dict:
    """Translate text to target language using Emergent LLM Key (OpenAI GPT-4)"""
    try:
        # Use new LLM-based translation service
        result = await translation_service.translate_text(text, target_language, source_language)
        return result
    except Exception as e:
        print(f"LLM Translation error: {e}")
        # Return original text if translation fails
        return {
            'translated_text': text,
            'source_language': source_language or 'en',
            'target_language': target_language,
            'confidence': 0.0
        }

async def get_message_translations(message_content: str, user_languages: List[str]) -> Dict[str, str]:
    """Get translations for message in multiple languages"""
    translations = {}
    source_lang = detect_language(message_content)
    
    for target_lang in user_languages:
        if target_lang != source_lang:
            translation_result = await translate_text(message_content, target_lang, source_lang)
            translations[target_lang] = translation_result['translated_text']
        else:
            translations[target_lang] = message_content
    
    return translations


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Create uploads directory
UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Security
SECRET_KEY = os.environ.get('SECRET_KEY', 'whatgram-secret-key-2024')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours for mobile apps

# Encryption key for E2E
ENCRYPTION_KEY = Fernet.generate_key()
cipher_suite = Fernet(ENCRYPTION_KEY)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="WhatGram API", description="Unified Messaging Platform")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Serve static files
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

# Security
security = HTTPBearer(auto_error=False)

# WebSocket Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.user_connections: dict = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.user_connections[user_id] = websocket
    
    def disconnect(self, websocket: WebSocket, user_id: str):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if user_id in self.user_connections:
            del self.user_connections[user_id]
    
    async def send_personal_message(self, message: str, user_id: str):
        if user_id in self.user_connections:
            websocket = self.user_connections[user_id]
            try:
                await websocket.send_text(message)
            except:
                pass
    
    async def broadcast(self, message: str):
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except:
                pass

manager = ConnectionManager()


class Platform(str, Enum):
    WHATSAPP = "whatsapp"
    TELEGRAM = "telegram"
    WHATGRAM = "whatgram"


class UserRole(str, Enum):
    USER = "user"
    ADMIN = "admin"


class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    phone: str  # Primary identifier
    hashed_password: Optional[str] = None  # For admin users
    role: UserRole = UserRole.USER
    is_active: bool = True
    is_verified: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    profile_picture: Optional[str] = None
    
    # Platform connections
    whatsapp_connected: bool = False
    telegram_connected: bool = False
    whatsapp_session: Optional[str] = None
    telegram_session: Optional[str] = None
    
    # Language settings
    preferred_language: str = "tr"  # tr, en, de, fr, es, etc.
    auto_translate: bool = True
    interface_language: str = "tr"


class PhoneVerification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    phone: str
    code: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    is_used: bool = False
    attempts: int = 0


class PhoneRegister(BaseModel):
    phone: str
    username: str


class PhoneLogin(BaseModel):
    phone: str


class VerifyCode(BaseModel):
    phone: str
    code: str


class Token(BaseModel):
    access_token: str
    token_type: str
    user: dict


class Contact(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    phone: str
    platform: Platform
    platform_user_id: Optional[str] = None  # WhatsApp/Telegram user ID
    avatar_url: Optional[str] = None
    last_seen: datetime = Field(default_factory=datetime.utcnow)
    is_online: bool = False
    is_blocked: bool = False


class FileMessage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    filename: str
    original_name: str
    file_path: str
    file_size: int
    mime_type: str
    encrypted: bool = False
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    thumbnail_path: Optional[str] = None  # For images/videos


class Translation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    original_text: str
    translated_text: str
    source_language: str
    target_language: str
    confidence: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    conversation_id: str
    sender_id: str
    receiver_id: str
    content: Optional[str] = None
    file_message: Optional[FileMessage] = None
    platform: Platform
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    is_sent: bool = True
    is_delivered: bool = False
    is_read: bool = False
    encrypted_content: Optional[str] = None  # E2E encrypted content
    message_type: str = "text"  # text, image, video, file, audio
    
    # Translation support
    original_language: Optional[str] = None
    translations: Dict[str, str] = {}  # {"en": "Hello", "tr": "Merhaba", "de": "Hallo"}
    auto_detected_language: Optional[str] = None


class Group(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    platform: Platform
    creator_id: str
    admin_ids: List[str] = []
    member_ids: List[str] = []
    avatar_url: Optional[str] = None
    is_public: bool = False
    invite_link: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    member_count: int = 0
    max_members: int = 256  # WhatsApp limit


class Channel(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: Optional[str] = None
    platform: Platform
    creator_id: str
    admin_ids: List[str] = []
    subscriber_ids: List[str] = []
    avatar_url: Optional[str] = None
    is_public: bool = True
    invite_link: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    subscriber_count: int = 0
    can_subscribers_message: bool = False  # Only admins can send messages by default


class Conversation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    participant_ids: List[str]
    platform: Platform
    conversation_type: str = "private"  # private, group, channel
    title: Optional[str] = None
    last_message_id: Optional[str] = None
    last_activity: datetime = Field(default_factory=datetime.utcnow)
    created_by: str
    is_encrypted: bool = True
    # For group/channel conversations
    group_id: Optional[str] = None
    channel_id: Optional[str] = None


class ContactCreate(BaseModel):
    name: str
    phone: str
    platform: Platform
    avatar_url: Optional[str] = None


class MessageCreate(BaseModel):
    conversation_id: str
    receiver_id: str
    content: Optional[str] = None
    platform: Platform
    message_type: str = "text"


class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    platform: Platform
    is_public: bool = False
    member_phones: List[str] = []  # Phone numbers to add as members


class ChannelCreate(BaseModel):
    name: str
    description: Optional[str] = None
    platform: Platform
    is_public: bool = True
    can_subscribers_message: bool = False


class GroupMemberAction(BaseModel):
    group_id: str
    user_phone: str
    action: str  # "add", "remove", "promote", "demote"


class TranslateRequest(BaseModel):
    text: str
    target_language: str
    source_language: Optional[str] = None


class LanguageSettings(BaseModel):
    preferred_language: str
    auto_translate: bool
    interface_language: str


# Utility functions
def normalize_phone(phone: str) -> str:
    """Normalize phone number format"""
    # Remove all non-digit characters
    phone = ''.join(filter(str.isdigit, phone))
    # Add +90 prefix if not present for Turkish numbers
    if len(phone) == 10 and not phone.startswith('90'):
        phone = '90' + phone
    elif len(phone) == 11 and phone.startswith('0'):
        phone = '90' + phone[1:]
    return '+' + phone


def generate_sms_code() -> str:
    """Generate 6-digit SMS verification code"""
    return str(random.randint(100000, 999999))


async def send_sms_code(phone: str, code: str) -> bool:
    """Simulate SMS sending (in real app, integrate with SMS provider)"""
    print(f"📱 SMS SENT to {phone}: Verification code is {code}")
    return True


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        return None
    
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
    except jwt.PyJWTError:
        return None
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        return None
    
    # Convert ObjectId to string if present
    if "_id" in user:
        user.pop("_id")
    
    return User(**user)


async def get_current_user_required(current_user: User = Depends(get_current_user)):
    if not current_user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return current_user


def encrypt_message(content: str) -> str:
    """Encrypt message content for E2E encryption"""
    return cipher_suite.encrypt(content.encode()).decode()


def decrypt_message(encrypted_content: str) -> str:
    """Decrypt message content"""
    return cipher_suite.decrypt(encrypted_content.encode()).decode()


# Routes
@api_router.get("/")
async def root():
    return {
        "message": "WhatGram API - Unified Messaging Platform",
        "version": "1.0.0",
        "platforms": ["WhatsApp", "Telegram", "WhatGram"],
        "auth_type": "phone_based"
    }


# Phone-based Authentication Routes
@api_router.post("/auth/request-code")
async def request_verification_code(phone_data: PhoneLogin):
    """Request SMS verification code for login/register"""
    phone = normalize_phone(phone_data.phone)
    
    # Generate verification code
    code = generate_sms_code()
    expires_at = datetime.utcnow() + timedelta(minutes=5)  # 5 minutes expiry
    
    # Store verification in database
    verification = PhoneVerification(
        phone=phone,
        code=code,
        expires_at=expires_at
    )
    
    # Remove any existing pending verifications for this phone
    await db.phone_verifications.delete_many({"phone": phone, "is_used": False})
    
    # Insert new verification
    await db.phone_verifications.insert_one(verification.dict())
    
    # Send SMS (simulated)
    await send_sms_code(phone, code)
    
    return {
        "message": "Verification code sent to your phone",
        "phone": phone,
        "expires_in": 300  # 5 minutes in seconds
    }


@api_router.post("/auth/verify-code", response_model=Token)
async def verify_code_and_login(verify_data: VerifyCode):
    """Verify SMS code and login/register user"""
    phone = normalize_phone(verify_data.phone)
    
    # Find verification record
    verification = await db.phone_verifications.find_one({
        "phone": phone,
        "code": verify_data.code,
        "is_used": False
    })
    
    if not verification:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")
    
    # Check if code has expired
    verification_obj = PhoneVerification(**verification)
    if datetime.utcnow() > verification_obj.expires_at:
        raise HTTPException(status_code=400, detail="Verification code has expired")
    
    # Mark verification as used
    await db.phone_verifications.update_one(
        {"id": verification_obj.id},
        {"$set": {"is_used": True}}
    )
    
    # Check if user already exists
    existing_user = await db.users.find_one({"phone": phone})
    
    if existing_user:
        # Login existing user
        existing_user.pop("_id", None)
        user = User(**existing_user)
    else:
        # Register new user
        username = f"user_{phone[-4:]}"  # Use last 4 digits as default username
        user = User(
            username=username,
            phone=phone,
            is_verified=True,
            whatsapp_connected=True,
            telegram_connected=True
        )
        
        await db.users.insert_one(user.dict())
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    user_dict = user.dict()
    user_dict.pop('hashed_password', None)  # Don't send password
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user_dict
    }


@api_router.post("/auth/update-profile")
async def update_user_profile(
    username: str = Form(...),
    current_user: User = Depends(get_current_user_required)
):
    """Update user profile after registration"""
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"username": username}}
    )
    
    return {"message": "Profile updated successfully"}


@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user_required)):
    return current_user


# Contact Routes
@api_router.get("/contacts", response_model=List[Contact])
async def get_contacts(
    platform: Optional[Platform] = None,
    current_user: User = Depends(get_current_user_required)
):
    filter_dict = {"user_id": current_user.id}
    if platform:
        filter_dict["platform"] = platform.value
    
    contacts = await db.contacts.find(filter_dict).to_list(1000)
    # Remove MongoDB ObjectId
    for contact in contacts:
        contact.pop("_id", None)
    return [Contact(**contact) for contact in contacts]


@api_router.post("/contacts", response_model=Contact)
async def create_contact(
    contact: ContactCreate,
    current_user: User = Depends(get_current_user_required)
):
    contact_dict = contact.dict()
    contact_dict["user_id"] = current_user.id
    contact_obj = Contact(**contact_dict)
    await db.contacts.insert_one(contact_obj.dict())
    return contact_obj


# Conversation Routes
@api_router.get("/conversations", response_model=List[Conversation])
async def get_conversations(
    platform: Optional[Platform] = None,
    current_user: User = Depends(get_current_user_required)
):
    filter_dict = {"participant_ids": current_user.id}
    if platform:
        filter_dict["platform"] = platform.value
    
    conversations = await db.conversations.find(filter_dict).sort("last_activity", -1).to_list(1000)
    # Remove MongoDB ObjectId
    for conv in conversations:
        conv.pop("_id", None)
    return [Conversation(**conv) for conv in conversations]


@api_router.post("/conversations")
async def create_conversation(
    participant_id: str,
    platform: Platform,
    current_user: User = Depends(get_current_user_required)
):
    # Check if conversation already exists
    existing_conv = await db.conversations.find_one({
        "participant_ids": {"$all": [current_user.id, participant_id]},
        "platform": platform.value
    })
    
    if existing_conv:
        existing_conv.pop("_id", None)
        return Conversation(**existing_conv)
    
    conversation = Conversation(
        participant_ids=[current_user.id, participant_id],
        platform=platform,
        created_by=current_user.id
    )
    
    await db.conversations.insert_one(conversation.dict())
    return conversation


@api_router.get("/conversations/{conversation_id}/messages", response_model=List[Message])
async def get_conversation_messages(
    conversation_id: str,
    current_user: User = Depends(get_current_user_required)
):
    # Verify user is participant
    conversation = await db.conversations.find_one({"id": conversation_id})
    if not conversation or current_user.id not in conversation["participant_ids"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    messages = await db.messages.find({"conversation_id": conversation_id}).sort("timestamp", 1).to_list(1000)
    
    # Decrypt messages if encrypted
    decrypted_messages = []
    for msg in messages:
        # Remove MongoDB ObjectId
        msg.pop("_id", None)
        message_obj = Message(**msg)
        if message_obj.encrypted_content and message_obj.platform == Platform.WHATGRAM:
            try:
                message_obj.content = decrypt_message(message_obj.encrypted_content)
            except:
                pass  # Keep original if decryption fails
        decrypted_messages.append(message_obj)
    
    return decrypted_messages


@api_router.post("/messages", response_model=Message)
async def send_message(
    message: MessageCreate,
    current_user: User = Depends(get_current_user_required)
):
    # Verify conversation exists and user is participant
    conversation = await db.conversations.find_one({"id": message.conversation_id})
    if not conversation or current_user.id not in conversation["participant_ids"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    message_dict = message.dict()
    message_dict["sender_id"] = current_user.id
    
    # Add translation support
    if message.content:
        # Detect original language
        detected_lang = detect_language(message.content)
        message_dict["auto_detected_language"] = detected_lang
        message_dict["original_language"] = detected_lang
        
        # Get languages of conversation participants for translations
        participant_users = []
        for participant_id in conversation["participant_ids"]:
            if participant_id != current_user.id:
                user = await db.users.find_one({"id": participant_id})
                if user:
                    participant_users.append(user)
        
        # Generate translations for participants who have auto_translate enabled
        translations = {}
        for participant in participant_users:
            if participant.get("auto_translate", True) and participant.get("preferred_language", "tr") != detected_lang:
                target_lang = participant.get("preferred_language", "tr")
                translation_result = await translate_text(message.content, target_lang, detected_lang)
                translations[target_lang] = translation_result["translated_text"]
        
        # Always include original language
        translations[detected_lang] = message.content
        message_dict["translations"] = translations
    
    # Encrypt content for WhatGram platform
    if message.platform == Platform.WHATGRAM and message.content:
        message_dict["encrypted_content"] = encrypt_message(message.content)
    
    message_obj = Message(**message_dict)
    
    # Insert message
    await db.messages.insert_one(message_obj.dict())
    
    # Update conversation
    await db.conversations.update_one(
        {"id": message.conversation_id},
        {
            "$set": {
                "last_message_id": message_obj.id,
                "last_activity": datetime.utcnow()
            }
        }
    )
    
    # Send real-time notification with translations
    try:
        # Notify each participant with their preferred language translation
        for participant_id in conversation["participant_ids"]:
            if participant_id != current_user.id:
                participant = await db.users.find_one({"id": participant_id})
                if participant:
                    # Get translation for this user's preferred language
                    user_lang = participant.get("preferred_language", "tr")
                    translated_content = message_dict.get("translations", {}).get(user_lang, message.content)
                    
                    notification_message = message_obj.dict()
                    notification_message["content"] = translated_content
                    
                    await manager.send_personal_message(
                        json.dumps({
                            "type": "new_message",
                            "message": notification_message,
                            "conversation_id": message.conversation_id,
                            "translated_for": user_lang
                        }),
                        participant_id
                    )
    except:
        pass
    
    return message_obj


# File Upload Routes
@api_router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    conversation_id: str = Form(...),
    receiver_id: str = Form(...),
    platform: Platform = Form(...),
    current_user: User = Depends(get_current_user_required)
):
    try:
        # Verify conversation
        conversation = await db.conversations.find_one({"id": conversation_id})
        if not conversation or current_user.id not in conversation["participant_ids"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
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
        
        # Determine message type
        message_type = "file"
        if mime_type.startswith("image/"):
            message_type = "image"
        elif mime_type.startswith("video/"):
            message_type = "video"
        elif mime_type.startswith("audio/"):
            message_type = "audio"
        
        # Create file message
        file_message = FileMessage(
            filename=unique_filename,
            original_name=file.filename,
            file_path=f"/uploads/{unique_filename}",
            file_size=file_size,
            mime_type=mime_type,
            encrypted=platform == Platform.WHATGRAM
        )
        
        # Create message with file
        message = Message(
            conversation_id=conversation_id,
            sender_id=current_user.id,
            receiver_id=receiver_id,
            file_message=file_message,
            platform=platform,
            message_type=message_type
        )
        
        # Save to database
        await db.messages.insert_one(message.dict())
        
        # Update conversation
        await db.conversations.update_one(
            {"id": conversation_id},
            {
                "$set": {
                    "last_message_id": message.id,
                    "last_activity": datetime.utcnow()
                }
            }
        )
        
        # Send real-time notification
        try:
            await manager.send_personal_message(
                json.dumps({
                    "type": "new_file",
                    "message": message.dict(),
                    "conversation_id": conversation_id
                }),
                receiver_id
            )
        except:
            pass
        
        return {
            "message": "File uploaded successfully",
            "file_message": file_message,
            "message_id": message.id,
            "message_type": message_type
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")


@api_router.get("/files/{filename}")
async def get_file(filename: str):
    file_path = UPLOAD_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path)


# Group Management Routes
@api_router.get("/groups", response_model=List[Group])
async def get_groups(
    platform: Optional[Platform] = None,
    current_user: User = Depends(get_current_user_required)
):
    filter_dict = {
        "$or": [
            {"member_ids": current_user.id},
            {"admin_ids": current_user.id},
            {"creator_id": current_user.id}
        ]
    }
    if platform:
        filter_dict["platform"] = platform.value
    
    groups = await db.groups.find(filter_dict).sort("updated_at", -1).to_list(1000)
    # Remove MongoDB ObjectId
    for group in groups:
        group.pop("_id", None)
    return [Group(**group) for group in groups]


@api_router.post("/groups", response_model=Group)
async def create_group(
    group_data: GroupCreate,
    current_user: User = Depends(get_current_user_required)
):
    # Create group
    group = Group(
        name=group_data.name,
        description=group_data.description,
        platform=group_data.platform,
        creator_id=current_user.id,
        admin_ids=[current_user.id],
        member_ids=[current_user.id],
        is_public=group_data.is_public,
        member_count=1
    )
    
    # Add members by phone numbers
    if group_data.member_phones:
        for phone in group_data.member_phones:
            normalized_phone = normalize_phone(phone)
            user = await db.users.find_one({"phone": normalized_phone})
            if user:
                group.member_ids.append(user["id"])
                group.member_count += 1
    
    # Generate invite link
    group.invite_link = f"https://whatgram.app/join/{group.id}"
    
    await db.groups.insert_one(group.dict())
    
    # Create conversation for the group
    conversation = Conversation(
        participant_ids=group.member_ids,
        platform=group_data.platform,
        conversation_type="group",
        title=group.name,
        created_by=current_user.id,
        group_id=group.id
    )
    await db.conversations.insert_one(conversation.dict())
    
    return group


@api_router.post("/groups/{group_id}/members")
async def manage_group_member(
    group_id: str,
    action_data: GroupMemberAction,
    current_user: User = Depends(get_current_user_required)
):
    # Find group
    group = await db.groups.find_one({"id": group_id})
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    
    group_obj = Group(**group)
    
    # Check if user is admin
    if current_user.id not in group_obj.admin_ids and current_user.id != group_obj.creator_id:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Find target user
    normalized_phone = normalize_phone(action_data.user_phone)
    target_user = await db.users.find_one({"phone": normalized_phone})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    target_user_id = target_user["id"]
    
    # Perform action
    if action_data.action == "add":
        if target_user_id not in group_obj.member_ids:
            group_obj.member_ids.append(target_user_id)
            group_obj.member_count += 1
    elif action_data.action == "remove":
        if target_user_id in group_obj.member_ids:
            group_obj.member_ids.remove(target_user_id)
            group_obj.member_count -= 1
        if target_user_id in group_obj.admin_ids:
            group_obj.admin_ids.remove(target_user_id)
    elif action_data.action == "promote":
        if target_user_id in group_obj.member_ids and target_user_id not in group_obj.admin_ids:
            group_obj.admin_ids.append(target_user_id)
    elif action_data.action == "demote":
        if target_user_id in group_obj.admin_ids and target_user_id != group_obj.creator_id:
            group_obj.admin_ids.remove(target_user_id)
    
    # Update group
    await db.groups.update_one(
        {"id": group_id},
        {"$set": group_obj.dict()}
    )
    
    # Update conversation participants
    await db.conversations.update_one(
        {"group_id": group_id},
        {"$set": {"participant_ids": group_obj.member_ids}}
    )
    
    return {"message": f"Member {action_data.action} successful", "member_count": group_obj.member_count}


# Channel Management Routes
@api_router.get("/channels", response_model=List[Channel])
async def get_channels(
    platform: Optional[Platform] = None,
    current_user: User = Depends(get_current_user_required)
):
    filter_dict = {
        "$or": [
            {"subscriber_ids": current_user.id},
            {"admin_ids": current_user.id},
            {"creator_id": current_user.id}
        ]
    }
    if platform:
        filter_dict["platform"] = platform.value
    
    channels = await db.channels.find(filter_dict).sort("updated_at", -1).to_list(1000)
    # Remove MongoDB ObjectId
    for channel in channels:
        channel.pop("_id", None)
    return [Channel(**channel) for channel in channels]


@api_router.post("/channels", response_model=Channel)
async def create_channel(
    channel_data: ChannelCreate,
    current_user: User = Depends(get_current_user_required)
):
    # Create channel
    channel = Channel(
        name=channel_data.name,
        description=channel_data.description,
        platform=channel_data.platform,
        creator_id=current_user.id,
        admin_ids=[current_user.id],
        subscriber_ids=[current_user.id],
        is_public=channel_data.is_public,
        can_subscribers_message=channel_data.can_subscribers_message,
        subscriber_count=1
    )
    
    # Generate invite link
    channel.invite_link = f"https://whatgram.app/channel/{channel.id}"
    
    await db.channels.insert_one(channel.dict())
    
    # Create conversation for the channel
    conversation = Conversation(
        participant_ids=[current_user.id],  # Only admins can message by default
        platform=channel_data.platform,
        conversation_type="channel",
        title=channel.name,
        created_by=current_user.id,
        channel_id=channel.id
    )
    await db.conversations.insert_one(conversation.dict())
    
    return channel


@api_router.post("/channels/{channel_id}/subscribe")
async def subscribe_to_channel(
    channel_id: str,
    current_user: User = Depends(get_current_user_required)
):
    # Find channel
    channel = await db.channels.find_one({"id": channel_id})
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    
    channel_obj = Channel(**channel)
    
    # Add user to subscribers if not already subscribed
    if current_user.id not in channel_obj.subscriber_ids:
        channel_obj.subscriber_ids.append(current_user.id)
        channel_obj.subscriber_count += 1
        
        # Update channel
        await db.channels.update_one(
            {"id": channel_id},
            {"$set": channel_obj.dict()}
        )
    
    return {"message": "Successfully subscribed to channel", "subscriber_count": channel_obj.subscriber_count}


# Platform Connection Routes
@api_router.post("/connect/whatsapp")
async def connect_whatsapp(
    current_user: User = Depends(get_current_user_required)
):
    """Connect user's WhatsApp account"""
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {
            "whatsapp_connected": True,
            "whatsapp_session": f"wa_session_{current_user.phone}"
        }}
    )
    
    return {"message": "WhatsApp connected successfully", "status": "connected"}


@api_router.post("/connect/telegram")
async def connect_telegram(
    current_user: User = Depends(get_current_user_required)
):
    """Connect user's Telegram account"""
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {
            "telegram_connected": True,
            "telegram_session": f"tg_session_{current_user.phone}"
        }}
    )
    
    return {"message": "Telegram connected successfully", "status": "connected"}


# Mock Platform Integration Routes
@api_router.get("/mock/whatsapp/contacts")
async def get_whatsapp_contacts_mock(
    current_user: User = Depends(get_current_user_required)
):
    """Get mock WhatsApp contacts"""
    contacts = await whatsapp_mock.get_contacts(current_user.id)
    return {"contacts": contacts, "platform": "whatsapp", "mock": True}


@api_router.get("/mock/whatsapp/groups")
async def get_whatsapp_groups_mock(
    current_user: User = Depends(get_current_user_required)
):
    """Get mock WhatsApp groups"""
    groups = await whatsapp_mock.get_groups(current_user.id)
    return {"groups": groups, "platform": "whatsapp", "mock": True}


@api_router.get("/mock/whatsapp/messages")
async def get_whatsapp_messages_mock(
    limit: int = 10,
    current_user: User = Depends(get_current_user_required)
):
    """Get mock WhatsApp recent messages"""
    messages = await whatsapp_mock.get_recent_messages(current_user.id, limit)
    return {"messages": messages, "platform": "whatsapp", "mock": True}


@api_router.get("/mock/telegram/contacts")
async def get_telegram_contacts_mock(
    current_user: User = Depends(get_current_user_required)
):
    """Get mock Telegram contacts"""
    contacts = await telegram_mock.get_contacts(current_user.id)
    return {"contacts": contacts, "platform": "telegram", "mock": True}


@api_router.get("/mock/telegram/channels")
async def get_telegram_channels_mock(
    current_user: User = Depends(get_current_user_required)
):
    """Get mock Telegram channels"""
    channels = await telegram_mock.get_channels(current_user.id)
    return {"channels": channels, "platform": "telegram", "mock": True}


@api_router.get("/mock/telegram/groups")
async def get_telegram_groups_mock(
    current_user: User = Depends(get_current_user_required)
):
    """Get mock Telegram groups"""
    groups = await telegram_mock.get_groups(current_user.id)
    return {"groups": groups, "platform": "telegram", "mock": True}


@api_router.get("/mock/telegram/messages")
async def get_telegram_messages_mock(
    limit: int = 10,
    current_user: User = Depends(get_current_user_required)
):
    """Get mock Telegram recent messages"""
    messages = await telegram_mock.get_recent_messages(current_user.id, limit)
    return {"messages": messages, "platform": "telegram", "mock": True}


# Translation Routes
@api_router.get("/languages")
async def get_supported_languages():
    """Get list of supported languages"""
    return {
        "languages": SUPPORTED_LANGUAGES,
        "total": len(SUPPORTED_LANGUAGES)
    }


@api_router.post("/translate")
async def translate_message(
    translate_req: TranslateRequest,
    current_user: User = Depends(get_current_user_required)
):
    """Translate text to target language"""
    result = await translate_text(
        translate_req.text,
        translate_req.target_language,
        translate_req.source_language
    )
    
    return result


@api_router.post("/detect-language")
async def detect_text_language(
    text: str = Form(...),
    current_user: User = Depends(get_current_user_required)
):
    """Detect language of given text"""
    detected_lang = detect_language(text)
    language_name = SUPPORTED_LANGUAGES.get(detected_lang, "Unknown")
    
    return {
        "detected_language": detected_lang,
        "language_name": language_name,
        "confidence": 0.8  # Simulated confidence
    }


@api_router.get("/user/language-settings")
async def get_user_language_settings(
    current_user: User = Depends(get_current_user_required)
):
    """Get user's language settings"""
    return {
        "preferred_language": current_user.preferred_language,
        "auto_translate": current_user.auto_translate,
        "interface_language": current_user.interface_language,
        "supported_languages": SUPPORTED_LANGUAGES
    }


@api_router.post("/user/language-settings")
async def update_user_language_settings(
    settings: LanguageSettings,
    current_user: User = Depends(get_current_user_required)
):
    """Update user's language settings"""
    
    # Validate language codes
    if settings.preferred_language not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail="Unsupported preferred language")
    if settings.interface_language not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail="Unsupported interface language")
    
    # Update user settings
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {
            "preferred_language": settings.preferred_language,
            "auto_translate": settings.auto_translate,
            "interface_language": settings.interface_language
        }}
    )
    
    return {"message": "Language settings updated successfully"}


# Unified Inbox Routes
@api_router.get("/unified-inbox")
async def get_unified_inbox(
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user_required)
):
    """Get unified inbox with all messages from all platforms sorted chronologically"""
    
    # Get all conversations where user is participant
    user_conversations = await db.conversations.find({
        "participant_ids": current_user.id
    }).to_list(1000)
    
    conversation_ids = [conv["id"] for conv in user_conversations]
    
    # Get recent messages from all conversations
    messages = await db.messages.find({
        "conversation_id": {"$in": conversation_ids}
    }).sort("timestamp", -1).skip(offset).limit(limit).to_list(limit)
    
    # Enrich messages with conversation and contact info
    enriched_messages = []
    for msg in messages:
        msg.pop("_id", None)
        message_obj = Message(**msg)
        
        # Get conversation info
        conversation = next((conv for conv in user_conversations if conv["id"] == msg["conversation_id"]), None)
        if not conversation:
            continue
            
        # Decrypt WhatGram messages if needed
        if message_obj.encrypted_content and message_obj.platform == Platform.WHATGRAM:
            try:
                message_obj.content = decrypt_message(message_obj.encrypted_content)
            except:
                pass
        
        # Get contact/group/channel info
        sender_info = None
        chat_info = None
        
        if message_obj.sender_id != current_user.id:
            # Get sender contact info
            sender_contact = await db.contacts.find_one({"id": message_obj.sender_id})
            if sender_contact:
                sender_contact.pop("_id", None)
                sender_info = Contact(**sender_contact)
        
        # Get chat info (individual, group, or channel)
        if conversation.get("group_id"):
            group = await db.groups.find_one({"id": conversation["group_id"]})
            if group:
                group.pop("_id", None)
                chat_info = {
                    "type": "group",
                    "name": group["name"],
                    "avatar_url": group.get("avatar_url"),
                    "member_count": group.get("member_count", 0)
                }
        elif conversation.get("channel_id"):
            channel = await db.channels.find_one({"id": conversation["channel_id"]})
            if channel:
                channel.pop("_id", None)
                chat_info = {
                    "type": "channel",
                    "name": channel["name"],
                    "avatar_url": channel.get("avatar_url"),
                    "subscriber_count": channel.get("subscriber_count", 0)
                }
        else:
            # Individual chat
            other_participant_id = next((pid for pid in conversation["participant_ids"] if pid != current_user.id), None)
            if other_participant_id:
                contact = await db.contacts.find_one({"id": other_participant_id})
                if contact:
                    contact.pop("_id", None)
                    chat_info = {
                        "type": "contact",
                        "name": contact["name"],
                        "avatar_url": contact.get("avatar_url"),
                        "phone": contact["phone"]
                    }
        
        # Apply translation for user's preferred language
        display_content = message_obj.content
        if (message_obj.translations and 
            current_user.preferred_language in message_obj.translations and
            current_user.auto_translate):
            display_content = message_obj.translations[current_user.preferred_language]
        
        enriched_message = {
            "id": message_obj.id,
            "content": display_content,
            "original_content": message_obj.content,
            "file_message": message_obj.file_message,
            "platform": message_obj.platform.value,
            "timestamp": message_obj.timestamp,
            "message_type": message_obj.message_type,
            "is_sent": message_obj.sender_id == current_user.id,
            "sender_info": sender_info.dict() if sender_info else None,
            "chat_info": chat_info,
            "conversation_id": message_obj.conversation_id,
            "auto_detected_language": message_obj.auto_detected_language,
            "has_translation": bool(message_obj.translations and current_user.preferred_language in message_obj.translations)
        }
        
        enriched_messages.append(enriched_message)
    
    return {
        "messages": enriched_messages,
        "total": len(enriched_messages),
        "offset": offset,
        "limit": limit,
        "user_language": current_user.preferred_language
    }


@api_router.get("/inbox-stats")
async def get_inbox_stats(
    current_user: User = Depends(get_current_user_required)
):
    """Get inbox statistics for dashboard"""
    
    # Get all user conversations
    user_conversations = await db.conversations.find({
        "participant_ids": current_user.id
    }).to_list(1000)
    
    conversation_ids = [conv["id"] for conv in user_conversations]
    
    # Count messages by platform
    pipeline = [
        {"$match": {"conversation_id": {"$in": conversation_ids}}},
        {"$group": {
            "_id": "$platform", 
            "count": {"$sum": 1},
            "latest": {"$max": "$timestamp"}
        }}
    ]
    
    platform_stats = await db.messages.aggregate(pipeline).to_list(100)
    
    # Count unread messages (simplified - all recent messages)
    recent_messages = await db.messages.count_documents({
        "conversation_id": {"$in": conversation_ids},
        "sender_id": {"$ne": current_user.id},
        "timestamp": {"$gte": datetime.utcnow() - timedelta(hours=24)}
    })
    
    # Count by chat type
    individual_chats = len([conv for conv in user_conversations if conv.get("conversation_type") == "private"])
    group_chats = len([conv for conv in user_conversations if conv.get("conversation_type") == "group"])
    channel_chats = len([conv for conv in user_conversations if conv.get("conversation_type") == "channel"])
    
    return {
        "platform_stats": platform_stats,
        "unread_count": recent_messages,
        "chat_counts": {
            "individual": individual_chats,
            "groups": group_chats,
            "channels": channel_chats,
            "total": len(user_conversations)
        },
        "supported_platforms": ["whatsapp", "telegram", "whatgram"]
    }


# WebSocket endpoint
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming WebSocket messages
            await websocket.send_text(f"Message received: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)


# Mock Data for Testing
@api_router.post("/init-mock-data")
async def init_mock_data():
    # Create demo user with phone
    demo_phone = "+905551234567"
    demo_user = User(
        username="demo_user",
        phone=demo_phone,
        is_verified=True,
        whatsapp_connected=True,
        telegram_connected=True
    )
    
    # Clear and insert demo user
    await db.users.delete_many({"phone": demo_phone})
    await db.users.insert_one(demo_user.dict())
    
    # Clear existing data for demo user
    await db.contacts.delete_many({"user_id": demo_user.id})
    await db.conversations.delete_many({"participant_ids": demo_user.id})
    await db.messages.delete_many({"sender_id": demo_user.id})
    await db.groups.delete_many({"creator_id": demo_user.id})
    await db.channels.delete_many({"creator_id": demo_user.id})
    
    # Create contacts for each platform
    contacts_data = {
        Platform.WHATSAPP: [
            {"name": "Ali Yılmaz", "phone": "+90555123456"},
            {"name": "Ayşe Demir", "phone": "+90555234567"},
            {"name": "Mehmet Can", "phone": "+90555345678"},
            {"name": "Fatma Şahin", "phone": "+90555456789"},
        ],
        Platform.TELEGRAM: [
            {"name": "Ahmet Türk", "phone": "+90555123111"},
            {"name": "Elif Yıldız", "phone": "+90555234222"},
            {"name": "Cem Doğan", "phone": "+90555345333"},
            {"name": "Derya Arslan", "phone": "+90555456444"},
        ],
        Platform.WHATGRAM: [
            {"name": "Emre Kaya (WhatGram)", "phone": "+90555567890"},
            {"name": "Zeynep Özkan (WhatGram)", "phone": "+90555678901"},
            {"name": "Burak Aydın (WhatGram)", "phone": "+90555789012"},
            {"name": "Selin Çelik (WhatGram)", "phone": "+90555890123"},
        ]
    }
    
    avatar_urls = [
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
        "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face"
    ]
    
    all_contacts = []
    conversations = []
    
    for platform, contact_list in contacts_data.items():
        for i, contact_data in enumerate(contact_list):
            contact = Contact(
                user_id=demo_user.id,
                name=contact_data["name"],
                phone=contact_data["phone"],
                platform=platform,
                avatar_url=avatar_urls[i % len(avatar_urls)],
                is_online=i % 2 == 0
            )
            all_contacts.append(contact)
            await db.contacts.insert_one(contact.dict())
            
            # Create conversation
            conversation = Conversation(
                participant_ids=[demo_user.id, contact.id],
                platform=platform,
                created_by=demo_user.id
            )
            conversations.append(conversation)
            await db.conversations.insert_one(conversation.dict())
            
            # Create sample messages
            sample_messages = [
                Message(
                    conversation_id=conversation.id,
                    sender_id=contact.id,
                    receiver_id=demo_user.id,
                    content=f"Merhaba! {platform.value} üzerinden mesaj gönderiyorum.",
                    platform=platform
                ),
                Message(
                    conversation_id=conversation.id,
                    sender_id=demo_user.id,
                    receiver_id=contact.id,
                    content="Merhaba! Nasılsın?",
                    platform=platform
                ),
                Message(
                    conversation_id=conversation.id,
                    sender_id=contact.id,
                    receiver_id=demo_user.id,
                    content="İyiyim teşekkürler. WhatGram'da dosya paylaşımı çok hızlı!" if platform == Platform.WHATGRAM else "İyiyim teşekkürler. Dosya paylaşma özelliğini test edebiliriz!",
                    platform=platform
                )
            ]
            
            for msg in sample_messages:
                # Encrypt WhatGram messages
                if msg.platform == Platform.WHATGRAM and msg.content:
                    msg.encrypted_content = encrypt_message(msg.content)
                await db.messages.insert_one(msg.dict())
    
    # Create demo groups for each platform
    demo_groups = []
    for platform in [Platform.WHATSAPP, Platform.TELEGRAM, Platform.WHATGRAM]:
        platform_name = platform.value.capitalize()
        
        # Tech group
        tech_group = Group(
            name=f"{platform_name} Tech Grubu",
            description=f"{platform_name} teknoloji ve geliştirme grubu",
            platform=platform,
            creator_id=demo_user.id,
            admin_ids=[demo_user.id],
            member_ids=[demo_user.id] + [c.id for c in all_contacts if c.platform == platform][:3],
            is_public=True,
            invite_link=f"https://whatgram.app/join/tech-{platform.value}",
            member_count=4
        )
        demo_groups.append(tech_group)
        await db.groups.insert_one(tech_group.dict())
        
        # Create conversation for group
        group_conv = Conversation(
            participant_ids=tech_group.member_ids,
            platform=platform,
            conversation_type="group",
            title=tech_group.name,
            created_by=demo_user.id,
            group_id=tech_group.id
        )
        await db.conversations.insert_one(group_conv.dict())
        
        # Add group messages
        group_messages = [
            Message(
                conversation_id=group_conv.id,
                sender_id=demo_user.id,
                receiver_id="",
                content=f"{platform_name} Tech Grubu'na hoş geldiniz! 🚀",
                platform=platform
            ),
            Message(
                conversation_id=group_conv.id,
                sender_id=tech_group.member_ids[1] if len(tech_group.member_ids) > 1 else demo_user.id,
                receiver_id="",
                content="Merhaba! Bu grup harika görünüyor 👍",
                platform=platform
            )
        ]
        
        for msg in group_messages:
            if msg.platform == Platform.WHATGRAM and msg.content:
                msg.encrypted_content = encrypt_message(msg.content)
            await db.messages.insert_one(msg.dict())
    
    # Create demo channels
    demo_channels = []
    for platform in [Platform.WHATSAPP, Platform.TELEGRAM, Platform.WHATGRAM]:
        platform_name = platform.value.capitalize()
        
        # News channel
        news_channel = Channel(
            name=f"{platform_name} Haberler",
            description=f"{platform_name} güncel haberler ve duyurular",
            platform=platform,
            creator_id=demo_user.id,
            admin_ids=[demo_user.id],
            subscriber_ids=[demo_user.id] + [c.id for c in all_contacts if c.platform == platform][:5],
            is_public=True,
            invite_link=f"https://whatgram.app/channel/news-{platform.value}",
            can_subscribers_message=False,
            subscriber_count=6
        )
        demo_channels.append(news_channel)
        await db.channels.insert_one(news_channel.dict())
        
        # Create conversation for channel
        channel_conv = Conversation(
            participant_ids=[demo_user.id],  # Only admin can message
            platform=platform,
            conversation_type="channel",
            title=news_channel.name,
            created_by=demo_user.id,
            channel_id=news_channel.id
        )
        await db.conversations.insert_one(channel_conv.dict())
        
        # Add channel announcement
        announcement = Message(
            conversation_id=channel_conv.id,
            sender_id=demo_user.id,
            receiver_id="",
            content=f"📢 {platform_name} Haberler kanalına hoş geldiniz! Güncel haberler için takipte kalın.",
            platform=platform,
            message_type="announcement"
        )
        
        if announcement.platform == Platform.WHATGRAM and announcement.content:
            announcement.encrypted_content = encrypt_message(announcement.content)
        await db.messages.insert_one(announcement.dict())
    
    # Create demo user token
    access_token = create_access_token(data={"sub": demo_user.id}, expires_delta=timedelta(hours=24))
    
    return {
        "message": "WhatGram mock data initialized successfully",
        "demo_user": {
            "phone": demo_user.phone,
            "verification_code": "123456",
            "access_token": access_token
        },
        "contacts_created": len(all_contacts),
        "conversations_created": len(conversations),
        "groups_created": len(demo_groups),
        "channels_created": len(demo_channels),
        "platforms": ["WhatsApp", "Telegram", "WhatGram"]
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