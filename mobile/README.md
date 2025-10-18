# WhatGram Mobile App

Unified messaging platform for WhatsApp, Telegram, and WhatGram.

## Features

✅ **Unified Inbox** - All messages from all platforms in one place
✅ **Platform-Specific Tabs** - Separate views for WhatsApp, Telegram, and WhatGram
✅ **Multi-Language Support** - Powered by OpenAI GPT-4 via Emergent LLM Key
✅ **Real-time Messaging** - WebSocket-based instant updates
✅ **File Sharing** - Send and receive files, images, videos
✅ **Groups & Channels** - Manage groups and channels across platforms
✅ **Phone-Based Authentication** - Secure OTP-based login

## Tech Stack

- **Frontend**: React Native + Expo
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Translation**: OpenAI GPT-4 (Emergent LLM Key)
- **Speech-to-Text**: OpenAI Whisper (Emergent LLM Key)

## Prerequisites

1. **Node.js** (v16 or higher)
2. **Yarn** package manager
3. **Expo CLI**: `npm install -g expo-cli`
4. **EAS CLI**: `npm install -g eas-cli`
5. **Apple Developer Account** (for iOS builds)
6. **Xcode** (for local iOS builds, optional)

## Installation

```bash
cd /app/mobile
yarn install
```

## Running in Development

### Start Expo Development Server

```bash
yarn start
```

### Run on iOS Simulator (macOS only)

```bash
yarn ios
```

### Run on Android Emulator

```bash
yarn android
```

### Run on Physical Device

1. Install **Expo Go** app on your device
2. Scan the QR code from the terminal

## Building for Production

### iOS IPA Build (using EAS Build - No macOS required!)

1. **Login to EAS**:
```bash
eas login
```

2. **Configure Build**:
```bash
eas build:configure
```

3. **Build for iOS**:
```bash
# For internal distribution (TestFlight)
eas build --platform ios --profile preview

# For App Store
eas build --platform ios --profile production
```

4. **Download IPA**:
After build completes, download the IPA file from the provided link.

### Android APK Build

```bash
# For testing
eas build --platform android --profile preview

# For production
eas build --platform android --profile production
```

## Apple Developer Setup

Before building for iOS, you need:

1. **Apple Developer Account** ($99/year)
2. **Bundle Identifier**: `com.whatgram.app`
3. **App ID** created in Apple Developer Portal
4. **Certificates & Provisioning Profiles** (EAS can auto-generate these)

### EAS will prompt you for:
- Apple ID
- Apple Team ID
- Whether to auto-generate certificates

## Submitting to App Store

### TestFlight (Beta Testing)

```bash
eas submit --platform ios --profile preview
```

### App Store

```bash
eas submit --platform ios --profile production
```

## Configuration

### Backend URL

Update in `/app/mobile/.env`:
```
EXPO_PUBLIC_BACKEND_URL=https://your-backend-url.com
```

## Project Structure

```
mobile/
├── src/
│   ├── config.js           # App configuration
│   ├── context/
│   │   └── AuthContext.js  # Authentication state
│   ├── services/
│   │   ├── api.js          # API client
│   │   └── authService.js  # Auth services
│   └── screens/
│       ├── AuthScreen.js          # Phone + OTP login
│       ├── UnifiedInboxScreen.js  # Unified inbox
│       ├── PlatformScreen.js      # Platform tabs
│       └── ChatScreen.js          # Chat interface
├── App.js                  # Main app with navigation
├── app.json               # Expo configuration
├── eas.json               # EAS Build configuration
└── package.json           # Dependencies
```

## Mock Integrations

Currently, WhatsApp and Telegram integrations are **mocked** for development:
- Mock contacts, groups, channels
- Mock messages
- Real WhatGram network functionality

### To Enable Real Integrations:

1. **WhatsApp Business API**:
   - Obtain API credentials from Meta
   - Update backend `/app/backend/server.py`

2. **Telegram Bot API**:
   - Create bot via BotFather
   - Add bot token to backend

## Testing

### Backend API

Backend is running at: `https://chatbridge-12.preview.emergentagent.com`

Test endpoints:
```bash
# Request OTP
curl -X POST https://chatbridge-12.preview.emergentagent.com/api/auth/request-code \
  -H "Content-Type: application/json" \
  -d '{"phone":"+905551234567"}'

# Verify OTP
curl -X POST https://chatbridge-12.preview.emergentagent.com/api/auth/verify-code \
  -H "Content-Type: application/json" \
  -d '{"phone":"+905551234567","code":"123456"}'
```

## Troubleshooting

### Build Issues

1. **Clear cache**:
```bash
yarn start --clear
```

2. **Reinstall dependencies**:
```bash
rm -rf node_modules yarn.lock
yarn install
```

3. **EAS Build fails**:
- Check EAS build logs
- Verify Apple Developer credentials
- Ensure bundle identifier is unique

### Runtime Issues

1. **Backend connection failed**:
   - Check `.env` file has correct `EXPO_PUBLIC_BACKEND_URL`
   - Ensure backend is running

2. **Authentication issues**:
   - Check phone number format (+90XXXXXXXXXX)
   - Verify OTP code (check backend logs)

## Deployment Checklist

- [ ] Update `version` and `buildNumber` in `app.json`
- [ ] Test on iOS simulator/device
- [ ] Test on Android emulator/device
- [ ] Verify all API endpoints work
- [ ] Test authentication flow
- [ ] Test messaging functionality
- [ ] Verify file uploads work
- [ ] Build IPA/APK via EAS
- [ ] Test builds on physical devices
- [ ] Submit to TestFlight for beta testing
- [ ] Submit to App Store for review

## Support

For issues or questions:
- Check backend logs: `/var/log/supervisor/backend.err.log`
- Check mobile app logs in Expo Dev Tools
- Review API responses in Network tab

## License

Proprietary - WhatGram Application
