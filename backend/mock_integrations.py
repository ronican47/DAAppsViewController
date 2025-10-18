"""
Mock WhatsApp and Telegram integrations
Simulates platform-specific functionality for development
"""
from typing import List, Dict, Optional
from datetime import datetime
import uuid
import random


class MockWhatsAppIntegration:
    """Mock WhatsApp Business API integration"""
    
    def __init__(self):
        self.mock_contacts = []
        self.mock_groups = []
        self.mock_messages = []
    
    async def get_contacts(self, user_id: str) -> List[Dict]:
        """Get WhatsApp contacts for a user"""
        return [
            {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "name": "John Doe (WhatsApp)",
                "phone": "+905551234567",
                "platform": "whatsapp",
                "platform_user_id": f"wa_{uuid.uuid4().hex[:12]}",
                "avatar_url": None,
                "last_seen": datetime.utcnow().isoformat(),
                "is_online": random.choice([True, False]),
                "is_blocked": False
            },
            {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "name": "Jane Smith (WhatsApp)",
                "phone": "+905551234568",
                "platform": "whatsapp",
                "platform_user_id": f"wa_{uuid.uuid4().hex[:12]}",
                "avatar_url": None,
                "last_seen": datetime.utcnow().isoformat(),
                "is_online": random.choice([True, False]),
                "is_blocked": False
            },
            {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "name": "Ali Yılmaz (WhatsApp)",
                "phone": "+905551234569",
                "platform": "whatsapp",
                "platform_user_id": f"wa_{uuid.uuid4().hex[:12]}",
                "avatar_url": None,
                "last_seen": datetime.utcnow().isoformat(),
                "is_online": random.choice([True, False]),
                "is_blocked": False
            }
        ]
    
    async def get_groups(self, user_id: str) -> List[Dict]:
        """Get WhatsApp groups for a user"""
        return [
            {
                "id": str(uuid.uuid4()),
                "name": "Family Group (WhatsApp)",
                "description": "Our family chat",
                "platform": "whatsapp",
                "creator_id": user_id,
                "admin_ids": [user_id],
                "member_ids": [user_id],
                "avatar_url": None,
                "is_public": False,
                "invite_link": None,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "member_count": 5,
                "max_members": 256
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Work Team (WhatsApp)",
                "description": "Project discussions",
                "platform": "whatsapp",
                "creator_id": user_id,
                "admin_ids": [user_id],
                "member_ids": [user_id],
                "avatar_url": None,
                "is_public": False,
                "invite_link": None,
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "member_count": 8,
                "max_members": 256
            }
        ]
    
    async def send_message(self, to_phone: str, message: str) -> Dict:
        """Send WhatsApp message (simulated)"""
        message_id = str(uuid.uuid4())
        print(f"📱 [WhatsApp Mock] Sending message to {to_phone}: {message}")
        return {
            "success": True,
            "message_id": message_id,
            "platform": "whatsapp",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def get_recent_messages(self, user_id: str, limit: int = 10) -> List[Dict]:
        """Get recent WhatsApp messages"""
        return [
            {
                "id": str(uuid.uuid4()),
                "conversation_id": str(uuid.uuid4()),
                "sender_id": f"wa_user_{uuid.uuid4().hex[:8]}",
                "sender_name": "John Doe",
                "receiver_id": user_id,
                "content": "Hey! How are you doing?",
                "platform": "whatsapp",
                "timestamp": datetime.utcnow().isoformat(),
                "is_sent": True,
                "is_delivered": True,
                "is_read": False,
                "message_type": "text"
            },
            {
                "id": str(uuid.uuid4()),
                "conversation_id": str(uuid.uuid4()),
                "sender_id": f"wa_user_{uuid.uuid4().hex[:8]}",
                "sender_name": "Jane Smith",
                "receiver_id": user_id,
                "content": "Don't forget about the meeting tomorrow!",
                "platform": "whatsapp",
                "timestamp": datetime.utcnow().isoformat(),
                "is_sent": True,
                "is_delivered": True,
                "is_read": False,
                "message_type": "text"
            }
        ]


class MockTelegramIntegration:
    """Mock Telegram Bot API integration"""
    
    def __init__(self):
        self.mock_contacts = []
        self.mock_channels = []
        self.mock_groups = []
    
    async def get_contacts(self, user_id: str) -> List[Dict]:
        """Get Telegram contacts for a user"""
        return [
            {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "name": "Alex Johnson (Telegram)",
                "phone": "+905552234567",
                "platform": "telegram",
                "platform_user_id": f"tg_{uuid.uuid4().hex[:12]}",
                "avatar_url": None,
                "last_seen": datetime.utcnow().isoformat(),
                "is_online": random.choice([True, False]),
                "is_blocked": False
            },
            {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "name": "Maria Garcia (Telegram)",
                "phone": "+905552234568",
                "platform": "telegram",
                "platform_user_id": f"tg_{uuid.uuid4().hex[:12]}",
                "avatar_url": None,
                "last_seen": datetime.utcnow().isoformat(),
                "is_online": random.choice([True, False]),
                "is_blocked": False
            },
            {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "name": "Mehmet Demir (Telegram)",
                "phone": "+905552234569",
                "platform": "telegram",
                "platform_user_id": f"tg_{uuid.uuid4().hex[:12]}",
                "avatar_url": None,
                "last_seen": datetime.utcnow().isoformat(),
                "is_online": random.choice([True, False]),
                "is_blocked": False
            }
        ]
    
    async def get_channels(self, user_id: str) -> List[Dict]:
        """Get Telegram channels for a user"""
        return [
            {
                "id": str(uuid.uuid4()),
                "name": "Tech News (Telegram)",
                "description": "Latest technology news and updates",
                "platform": "telegram",
                "creator_id": user_id,
                "admin_ids": [user_id],
                "subscriber_ids": [user_id],
                "avatar_url": None,
                "is_public": True,
                "invite_link": "https://t.me/technews_mock",
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "subscriber_count": 1250,
                "can_subscribers_message": False
            },
            {
                "id": str(uuid.uuid4()),
                "name": "Community Updates (Telegram)",
                "description": "Stay informed about community events",
                "platform": "telegram",
                "creator_id": user_id,
                "admin_ids": [user_id],
                "subscriber_ids": [user_id],
                "avatar_url": None,
                "is_public": True,
                "invite_link": "https://t.me/community_mock",
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "subscriber_count": 850,
                "can_subscribers_message": False
            }
        ]
    
    async def get_groups(self, user_id: str) -> List[Dict]:
        """Get Telegram groups for a user"""
        return [
            {
                "id": str(uuid.uuid4()),
                "name": "Developers Group (Telegram)",
                "description": "Discussion about coding and development",
                "platform": "telegram",
                "creator_id": user_id,
                "admin_ids": [user_id],
                "member_ids": [user_id],
                "avatar_url": None,
                "is_public": True,
                "invite_link": "https://t.me/devgroup_mock",
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat(),
                "member_count": 32,
                "max_members": 200000
            }
        ]
    
    async def send_message(self, to_user_id: str, message: str) -> Dict:
        """Send Telegram message (simulated)"""
        message_id = str(uuid.uuid4())
        print(f"✈️ [Telegram Mock] Sending message to {to_user_id}: {message}")
        return {
            "success": True,
            "message_id": message_id,
            "platform": "telegram",
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def get_recent_messages(self, user_id: str, limit: int = 10) -> List[Dict]:
        """Get recent Telegram messages"""
        return [
            {
                "id": str(uuid.uuid4()),
                "conversation_id": str(uuid.uuid4()),
                "sender_id": f"tg_user_{uuid.uuid4().hex[:8]}",
                "sender_name": "Alex Johnson",
                "receiver_id": user_id,
                "content": "Check out this cool library I found!",
                "platform": "telegram",
                "timestamp": datetime.utcnow().isoformat(),
                "is_sent": True,
                "is_delivered": True,
                "is_read": False,
                "message_type": "text"
            },
            {
                "id": str(uuid.uuid4()),
                "conversation_id": str(uuid.uuid4()),
                "sender_id": f"tg_user_{uuid.uuid4().hex[:8]}",
                "sender_name": "Maria Garcia",
                "receiver_id": user_id,
                "content": "Can you review my pull request?",
                "platform": "telegram",
                "timestamp": datetime.utcnow().isoformat(),
                "is_sent": True,
                "is_delivered": True,
                "is_read": False,
                "message_type": "text"
            }
        ]


# Initialize mock integrations
whatsapp_mock = MockWhatsAppIntegration()
telegram_mock = MockTelegramIntegration()
