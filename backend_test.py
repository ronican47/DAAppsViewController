#!/usr/bin/env python3
"""
WhatGram Backend API Testing Suite
Tests all backend endpoints with focus on authentication, mock integrations, translation, and unified inbox
"""

import asyncio
import aiohttp
import json
import sys
from typing import Dict, Optional
from datetime import datetime

# Backend URL from environment
BACKEND_URL = "https://chatbridge-12.preview.emergentagent.com/api"

# Test credentials
TEST_PHONE = "+905551234567"
TEST_OTP_CODE = None  # Will be extracted from logs or set manually
ACCESS_TOKEN = None

class WhatGramAPITester:
    def __init__(self):
        self.session = None
        self.access_token = None
        self.test_results = []
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    def log_result(self, test_name: str, success: bool, details: str, response_data: Optional[Dict] = None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "response_data": response_data,
            "timestamp": datetime.now().isoformat()
        })
    
    async def make_request(self, method: str, endpoint: str, data: Optional[Dict] = None, 
                          headers: Optional[Dict] = None, use_auth: bool = False) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        url = f"{BACKEND_URL}{endpoint}"
        
        # Prepare headers
        request_headers = {"Content-Type": "application/json"}
        if headers:
            request_headers.update(headers)
        
        # Add authorization if needed
        if use_auth and self.access_token:
            request_headers["Authorization"] = f"Bearer {self.access_token}"
        
        try:
            async with self.session.request(
                method, url, 
                json=data if data else None,
                headers=request_headers,
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                try:
                    response_data = await response.json()
                except:
                    response_data = {"text": await response.text()}
                
                return response.status == 200, response_data, response.status
                
        except Exception as e:
            return False, {"error": str(e)}, 0
    
    async def test_root_endpoint(self):
        """Test root API endpoint"""
        success, data, status = await self.make_request("GET", "/")
        
        if success and "message" in data:
            self.log_result("Root Endpoint", True, f"API accessible, version: {data.get('version', 'unknown')}", data)
        else:
            self.log_result("Root Endpoint", False, f"Failed to access root endpoint. Status: {status}", data)
    
    async def test_request_otp(self):
        """Test OTP request endpoint"""
        payload = {"phone": TEST_PHONE}
        success, data, status = await self.make_request("POST", "/auth/request-code", payload)
        
        if success and "message" in data:
            self.log_result("Request OTP", True, f"OTP requested successfully for {TEST_PHONE}", data)
            return True
        else:
            self.log_result("Request OTP", False, f"Failed to request OTP. Status: {status}", data)
            return False
    
    async def test_verify_otp(self, otp_code: str):
        """Test OTP verification endpoint"""
        payload = {"phone": TEST_PHONE, "code": otp_code}
        success, data, status = await self.make_request("POST", "/auth/verify-code", payload)
        
        if success and "access_token" in data:
            self.access_token = data["access_token"]
            self.log_result("Verify OTP", True, f"OTP verified successfully, token received", data)
            return True
        else:
            self.log_result("Verify OTP", False, f"Failed to verify OTP. Status: {status}", data)
            return False
    
    async def test_get_current_user(self):
        """Test get current user endpoint"""
        success, data, status = await self.make_request("GET", "/auth/me", use_auth=True)
        
        if success and "id" in data:
            self.log_result("Get Current User", True, f"User info retrieved: {data.get('username', 'unknown')}", data)
            return True
        else:
            self.log_result("Get Current User", False, f"Failed to get user info. Status: {status}", data)
            return False
    
    async def test_whatsapp_contacts(self):
        """Test WhatsApp mock contacts endpoint"""
        success, data, status = await self.make_request("GET", "/mock/whatsapp/contacts", use_auth=True)
        
        if success and "contacts" in data and data.get("mock") is True:
            contacts_count = len(data["contacts"])
            self.log_result("WhatsApp Contacts", True, f"Retrieved {contacts_count} mock WhatsApp contacts", data)
            return True
        else:
            self.log_result("WhatsApp Contacts", False, f"Failed to get WhatsApp contacts. Status: {status}", data)
            return False
    
    async def test_whatsapp_groups(self):
        """Test WhatsApp mock groups endpoint"""
        success, data, status = await self.make_request("GET", "/mock/whatsapp/groups", use_auth=True)
        
        if success and "groups" in data and data.get("mock") is True:
            groups_count = len(data["groups"])
            self.log_result("WhatsApp Groups", True, f"Retrieved {groups_count} mock WhatsApp groups", data)
            return True
        else:
            self.log_result("WhatsApp Groups", False, f"Failed to get WhatsApp groups. Status: {status}", data)
            return False
    
    async def test_telegram_contacts(self):
        """Test Telegram mock contacts endpoint"""
        success, data, status = await self.make_request("GET", "/mock/telegram/contacts", use_auth=True)
        
        if success and "contacts" in data and data.get("mock") is True:
            contacts_count = len(data["contacts"])
            self.log_result("Telegram Contacts", True, f"Retrieved {contacts_count} mock Telegram contacts", data)
            return True
        else:
            self.log_result("Telegram Contacts", False, f"Failed to get Telegram contacts. Status: {status}", data)
            return False
    
    async def test_telegram_channels(self):
        """Test Telegram mock channels endpoint"""
        success, data, status = await self.make_request("GET", "/mock/telegram/channels", use_auth=True)
        
        if success and "channels" in data and data.get("mock") is True:
            channels_count = len(data["channels"])
            self.log_result("Telegram Channels", True, f"Retrieved {channels_count} mock Telegram channels", data)
            return True
        else:
            self.log_result("Telegram Channels", False, f"Failed to get Telegram channels. Status: {status}", data)
            return False
    
    async def test_translation(self):
        """Test translation endpoint with Emergent LLM Key"""
        payload = {
            "text": "Hello",
            "target_language": "tr",
            "source_language": "en"
        }
        success, data, status = await self.make_request("POST", "/translate", payload, use_auth=True)
        
        if success and "translated_text" in data:
            translated = data["translated_text"]
            confidence = data.get("confidence", 0)
            self.log_result("Translation", True, f"Translated 'Hello' to '{translated}' (confidence: {confidence})", data)
            return True
        else:
            self.log_result("Translation", False, f"Failed to translate text. Status: {status}", data)
            return False
    
    async def test_unified_inbox(self):
        """Test unified inbox endpoint"""
        success, data, status = await self.make_request("GET", "/unified-inbox", use_auth=True)
        
        if success and "messages" in data:
            messages_count = len(data["messages"])
            user_language = data.get("user_language", "unknown")
            self.log_result("Unified Inbox", True, f"Retrieved {messages_count} messages (user lang: {user_language})", data)
            return True
        else:
            self.log_result("Unified Inbox", False, f"Failed to get unified inbox. Status: {status}", data)
            return False
    
    async def test_inbox_stats(self):
        """Test inbox statistics endpoint"""
        success, data, status = await self.make_request("GET", "/inbox-stats", use_auth=True)
        
        if success and "platform_stats" in data:
            total_chats = data.get("chat_counts", {}).get("total", 0)
            unread_count = data.get("unread_count", 0)
            self.log_result("Inbox Stats", True, f"Retrieved stats: {total_chats} chats, {unread_count} unread", data)
            return True
        else:
            self.log_result("Inbox Stats", False, f"Failed to get inbox stats. Status: {status}", data)
            return False
    
    async def test_supported_languages(self):
        """Test supported languages endpoint"""
        success, data, status = await self.make_request("GET", "/languages", use_auth=True)
        
        if success and "languages" in data:
            lang_count = data.get("total", 0)
            self.log_result("Supported Languages", True, f"Retrieved {lang_count} supported languages", data)
            return True
        else:
            self.log_result("Supported Languages", False, f"Failed to get languages. Status: {status}", data)
            return False
    
    def print_summary(self):
        """Print test summary"""
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"\n{'='*60}")
        print(f"TEST SUMMARY")
        print(f"{'='*60}")
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        
        if failed_tests > 0:
            print(f"\nFAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['details']}")
        
        return passed_tests, failed_tests

async def main():
    """Main test execution"""
    print("🚀 Starting WhatGram Backend API Tests")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Test Phone: {TEST_PHONE}")
    print("="*60)
    
    async with WhatGramAPITester() as tester:
        # Priority 1: Authentication & Core
        print("\n📱 PRIORITY 1: Authentication & Core")
        await tester.test_root_endpoint()
        
        # Request OTP
        otp_requested = await tester.test_request_otp()
        
        if otp_requested:
            # Try common OTP codes or ask user
            otp_codes_to_try = ["183732", "123456", "000000", "111111"]
            
            print(f"\n🔐 Attempting OTP verification...")
            print("Note: Check backend logs for the actual OTP code if these fail")
            
            otp_verified = False
            for otp_code in otp_codes_to_try:
                print(f"Trying OTP: {otp_code}")
                if await tester.test_verify_otp(otp_code):
                    otp_verified = True
                    break
            
            if not otp_verified:
                print("❌ Could not verify OTP with common codes. Check backend logs for actual code.")
                print("You can manually set the OTP code in the script if needed.")
            else:
                # Test authenticated endpoints
                await tester.test_get_current_user()
                
                # Priority 2: Mock Integrations
                print("\n🔗 PRIORITY 2: Mock Integrations")
                await tester.test_whatsapp_contacts()
                await tester.test_whatsapp_groups()
                await tester.test_telegram_contacts()
                await tester.test_telegram_channels()
                
                # Priority 3: Translation
                print("\n🌐 PRIORITY 3: Translation (Emergent LLM Key)")
                await tester.test_translation()
                await tester.test_supported_languages()
                
                # Priority 4: Unified Inbox
                print("\n📬 PRIORITY 4: Unified Inbox")
                await tester.test_unified_inbox()
                await tester.test_inbox_stats()
        
        # Print final summary
        passed, failed = tester.print_summary()
        
        # Return appropriate exit code
        return 0 if failed == 0 else 1

if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print("\n⚠️ Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        sys.exit(1)