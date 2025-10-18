import Constants from 'expo-constants';

export const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || 'https://chatbridge-12.preview.emergentagent.com';
export const API_BASE = `${API_URL}/api`;

export const SUPPORTED_LANGUAGES = {
  tr: 'Türkçe',
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  ru: 'Русский',
  ar: 'العربية',
  ja: '日本語',
  ko: '한국어',
  zh: '中文',
  pt: 'Português'
};

export const PLATFORM_COLORS = {
  whatsapp: '#25D366',
  telegram: '#0088CC',
  whatgram: '#6B46C1'
};

export const PLATFORM_ICONS = {
  whatsapp: '💬',
  telegram: '✈️',
  whatgram: '📱'
};
