import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Components
const AuthModal = ({ isOpen, onClose, onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: 'demo@whatgram.com',
    password: 'demo123',
    username: '',
    phone: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin ? 
        { email: formData.email, password: formData.password } :
        formData;

      const response = await axios.post(`${API}${endpoint}`, payload);
      const { access_token, user } = response.data;
      
      localStorage.setItem('whatgram_token', access_token);
      localStorage.setItem('whatgram_user', JSON.stringify(user));
      
      onLogin(access_token, user);
      onClose();
    } catch (error) {
      alert(error.response?.data?.detail || 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="auth-modal">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">WhatGram</h2>
          <p className="text-gray-600">Birleşik Mesajlaşma Platformu</p>
        </div>

        <div className="flex mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-l-lg ${
              isLogin ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
            data-testid="login-tab"
          >
            Giriş Yap
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 px-4 text-sm font-medium rounded-r-lg ${
              !isLogin ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
            data-testid="register-tab"
          >
            Kayıt Ol
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <input
                type="text"
                placeholder="Kullanıcı adı"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required={!isLogin}
                data-testid="username-input"
              />
              <input
                type="tel"
                placeholder="Telefon numarası"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="phone-input"
              />
            </>
          )}
          <input
            type="email"
            placeholder="E-posta"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            data-testid="email-input"
          />
          <input
            type="password"
            placeholder="Şifre"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            data-testid="password-input"
          />
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-lg text-white font-medium ${
              loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
            }`}
            data-testid="auth-submit-btn"
          >
            {loading ? 'Yükleniyor...' : (isLogin ? 'Giriş Yap' : 'Kayıt Ol')}
          </button>
        </form>

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-700 font-medium">Demo Hesap:</p>
          <p className="text-xs text-blue-600">E-posta: demo@whatgram.com</p>
          <p className="text-xs text-blue-600">Şifre: demo123</p>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [activeTab, setActiveTab] = useState('whatsapp');
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState({
    whatsapp: false,
    telegram: false,
    whatgram: true
  });
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const ws = useRef(null);

  useEffect(() => {
    // Check for existing auth
    const savedToken = localStorage.getItem('whatgram_token');
    const savedUser = localStorage.getItem('whatgram_user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    } else {
      setShowAuth(true);
    }
  }, []);

  useEffect(() => {
    if (token) {
      initMockData();
      setupWebSocket();
      setConnectionStatus({
        whatsapp: user?.whatsapp_connected || false,
        telegram: user?.telegram_connected || false,
        whatgram: true
      });
    }
  }, [token, user]);

  useEffect(() => {
    if (token) {
      loadContacts();
    }
  }, [activeTab, token]);

  useEffect(() => {
    if (selectedContact && token) {
      loadMessages();
    }
  }, [selectedContact, token]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const setupWebSocket = () => {
    if (user && !ws.current) {
      try {
        ws.current = new WebSocket(`${BACKEND_URL.replace('http', 'ws')}/ws/${user.id}`);
        
        ws.current.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'new_message' || data.type === 'new_file') {
            if (data.conversation_id === selectedContact?.conversationId) {
              loadMessages();
            }
            loadContacts(); // Refresh contacts to update last message
          }
        };
      } catch (error) {
        console.log('WebSocket connection failed:', error);
      }
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleLogin = (accessToken, userData) => {
    setToken(accessToken);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('whatgram_token');
    localStorage.removeItem('whatgram_user');
    setToken(null);
    setUser(null);
    setShowAuth(true);
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
  };

  const initMockData = async () => {
    try {
      await axios.post(`${API}/init-mock-data`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Mock data initialized');
    } catch (error) {
      console.error('Error initializing mock data:', error);
    }
  };

  const loadContacts = async () => {
    if (!token) return;
    
    try {
      const response = await axios.get(`${API}/contacts?platform=${activeTab}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContacts(response.data);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const loadMessages = async () => {
    if (!token || !selectedContact || !selectedContact.conversationId) return;
    
    try {
      const response = await axios.get(
        `${API}/conversations/${selectedContact.conversationId}/messages`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(response.data);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const selectContact = async (contact) => {
    if (!token) return;
    
    try {
      // Create or get conversation
      const response = await axios.post(
        `${API}/conversations?participant_id=${contact.id}&platform=${activeTab}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      contact.conversationId = response.data.id;
      setSelectedContact(contact);
    } catch (error) {
      console.error('Error selecting contact:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedContact || !token) return;

    try {
      await axios.post(
        `${API}/messages`,
        {
          conversation_id: selectedContact.conversationId,
          receiver_id: selectedContact.id,
          content: newMessage,
          platform: activeTab
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNewMessage('');
      loadMessages();
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
  };

  const handleFileDrop = (event) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    setSelectedFiles(files);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0 || !selectedContact || !token) return;

    setIsUploading(true);
    
    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('conversation_id', selectedContact.conversationId);
        formData.append('receiver_id', selectedContact.id);
        formData.append('platform', activeTab);

        await axios.post(`${API}/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}`
          }
        });
      }

      setSelectedFiles([]);
      loadMessages();
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Dosya yükleme başarısız!');
    } finally {
      setIsUploading(false);
    }
  };

  const connectPlatform = async (platform) => {
    if (!token) return;
    
    try {
      if (platform === 'whatsapp') {
        // Simulate QR code connection
        await axios.post(
          `${API}/connect/whatsapp`,
          { qr_data: 'simulated_qr_data' },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else if (platform === 'telegram') {
        // Simulate phone number connection
        await axios.post(
          `${API}/connect/telegram`,
          { phone_number: user.phone || '+905551234567' },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      
      setConnectionStatus(prev => ({ ...prev, [platform]: true }));
      alert(`${platform === 'whatsapp' ? 'WhatsApp' : 'Telegram'} bağlantısı başarılı!`);
    } catch (error) {
      console.error(`Error connecting ${platform}:`, error);
    }
  };

  const getPlatformColor = (platform) => {
    switch (platform) {
      case 'whatsapp': return 'bg-green-500';
      case 'telegram': return 'bg-blue-500';
      case 'whatgram': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImageFile = (mimeType) => {
    return mimeType && mimeType.startsWith('image/');
  };

  const renderFileMessage = (fileMessage) => {
    const isImage = isImageFile(fileMessage.mime_type);
    
    return (
      <div className="file-message">
        {isImage ? (
          <img
            src={`${BACKEND_URL}${fileMessage.file_path}`}
            alt={fileMessage.original_name}
            className="max-w-xs max-h-64 rounded-lg cursor-pointer"
            onClick={() => window.open(`${BACKEND_URL}${fileMessage.file_path}`, '_blank')}
          />
        ) : (
          <div className="flex items-center p-3 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200"
               onClick={() => window.open(`${BACKEND_URL}${fileMessage.file_path}`, '_blank')}>
            <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white text-xs font-bold">
                {fileMessage.original_name.split('.').pop()?.toUpperCase() || 'FILE'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {fileMessage.original_name}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(fileMessage.file_size)}
                {fileMessage.encrypted && <span className="ml-2 text-green-600">🔒</span>}
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-400 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-6xl font-bold mb-4" data-testid="app-title">WhatGram</h1>
          <p className="text-xl mb-8">WhatsApp, Telegram ve WhatGram'ı birleştiren platform</p>
          <button
            onClick={() => setShowAuth(true)}
            className="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            data-testid="get-started-btn"
          >
            Başlayın
          </button>
        </div>
        <AuthModal 
          isOpen={showAuth} 
          onClose={() => setShowAuth(false)}
          onLogin={handleLogin}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-1/3 bg-white border-r border-gray-300 flex flex-col">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-bold" data-testid="whatgram-header">WhatGram</h1>
            <button
              onClick={logout}
              className="px-3 py-1 bg-white bg-opacity-20 rounded-full text-sm hover:bg-opacity-30"
              data-testid="logout-btn"
            >
              Çıkış
            </button>
          </div>
          <p className="text-sm opacity-90">Merhaba, {user.username}!</p>
        </div>

        {/* Platform Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center space-x-2 ${
              activeTab === 'whatsapp'
                ? 'bg-green-500 text-white'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
            data-testid="whatsapp-tab"
          >
            <span>📱</span>
            <span>WhatsApp</span>
            {!connectionStatus.whatsapp && (
              <span 
                className="w-2 h-2 bg-red-500 rounded-full cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  connectPlatform('whatsapp');
                }}
                title="Bağlan"
              ></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('telegram')}
            className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center space-x-2 ${
              activeTab === 'telegram'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
            data-testid="telegram-tab"
          >
            <span>✈️</span>
            <span>Telegram</span>
            {!connectionStatus.telegram && (
              <span 
                className="w-2 h-2 bg-red-500 rounded-full cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  connectPlatform('telegram');
                }}
                title="Bağlan"
              ></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('whatgram')}
            className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center space-x-2 ${
              activeTab === 'whatgram'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
            data-testid="whatgram-tab"
          >
            <span>💬</span>
            <span>WhatGram</span>
            <span className="w-2 h-2 bg-green-500 rounded-full" title="Bağlı"></span>
          </button>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-3" data-testid="contacts-title">
              Kişiler ({contacts.length})
            </h3>
            <div className="space-y-2">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => selectContact(contact)}
                  className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedContact?.id === contact.id
                      ? `${getPlatformColor(activeTab).replace('bg-', 'bg-opacity-20 bg-')}`
                      : 'hover:bg-gray-100'
                  }`}
                  data-testid={`contact-${contact.id}`}
                >
                  <div className="relative">
                    <img
                      src={contact.avatar_url}
                      alt={contact.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {contact.is_online && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {contact.name}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {contact.phone}
                    </p>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${getPlatformColor(contact.platform)}`}></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className={`flex items-center justify-between p-4 border-b border-gray-200 ${getPlatformColor(activeTab)} text-white`}>
              <div className="flex items-center">
                <img
                  src={selectedContact.avatar_url}
                  alt={selectedContact.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="ml-3">
                  <h4 className="font-medium" data-testid="chat-contact-name">
                    {selectedContact.name}
                  </h4>
                  <p className="text-sm opacity-75">
                    {selectedContact.is_online ? 'Çevrimiçi' : 'Son görülme: az önce'} • 
                    {activeTab === 'whatgram' && <span className="text-green-300">🔒 E2E Şifreli</span>}
                    {activeTab !== 'whatgram' && <span>Platform: {activeTab}</span>}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-75 capitalize">{activeTab}</p>
                {activeTab === 'whatgram' && (
                  <p className="text-xs opacity-60">Hızlı Dosya Paylaşımı</p>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="messages-container">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender_id === user.id ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender_id === user.id
                        ? `${getPlatformColor(activeTab)} text-white`
                        : 'bg-gray-200 text-gray-900'
                    }`}
                    data-testid={`message-${message.id}`}
                  >
                    {message.file_message ? (
                      <div className="space-y-2">
                        {renderFileMessage(message.file_message)}
                        <p className={`text-xs ${
                          message.sender_id === user.id ? 'text-white opacity-75' : 'text-gray-500'
                        }`}>
                          {message.message_type} • {formatTime(message.timestamp)}
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm">{message.content}</p>
                        <div className="flex justify-between items-center mt-1">
                          <p className={`text-xs ${
                            message.sender_id === user.id ? 'text-white opacity-75' : 'text-gray-500'
                          }`}>
                            {formatTime(message.timestamp)}
                          </p>
                          {message.encrypted_content && (
                            <span className="text-xs">🔒</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* File Upload Area */}
            {selectedFiles.length > 0 && (
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="space-y-2">
                  <h5 className="text-sm font-medium">Seçilen Dosyalar:</h5>
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                      <span className="text-sm truncate flex-1">{file.name}</span>
                      <span className="text-xs text-gray-500 ml-2">{formatFileSize(file.size)}</span>
                      <button
                        onClick={() => setSelectedFiles(files => files.filter((_, i) => i !== index))}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <div className="flex space-x-2">
                    <button
                      onClick={uploadFiles}
                      disabled={isUploading}
                      className={`px-4 py-2 rounded text-white text-sm ${
                        isUploading 
                          ? 'bg-gray-400 cursor-not-allowed'
                          : `${getPlatformColor(activeTab)} hover:opacity-80`
                      }`}
                      data-testid="upload-files-btn"
                    >
                      {isUploading ? 'Yükleniyor...' : 'Dosyaları Gönder'}
                      {activeTab === 'whatgram' && <span className="ml-1">🔒</span>}
                    </button>
                    <button
                      onClick={() => setSelectedFiles([])}
                      className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded text-sm"
                    >
                      İptal
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div 
                className="flex items-center space-x-2 p-3 border-2 border-dashed border-gray-300 rounded-lg"
                onDrop={handleFileDrop}
                onDragOver={handleDragOver}
                data-testid="message-input-area"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  multiple
                  className="hidden"
                  data-testid="file-input"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-2 rounded-full ${getPlatformColor(activeTab)} hover:opacity-80 text-white`}
                  data-testid="file-upload-btn"
                >
                  📎
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder={`${activeTab} üzerinden mesaj yazın...`}
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="message-input"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className={`p-2 rounded-full ${
                    !newMessage.trim()
                      ? 'bg-gray-300 cursor-not-allowed'
                      : `${getPlatformColor(activeTab)} hover:opacity-80`
                  } text-white`}
                  data-testid="send-message-btn"
                >
                  ➤
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                {activeTab === 'whatgram' && '🔒 Uçtan uca şifreli • '}
                Dosya sürükleyip bırakın veya 📎 butonuna tıklayarak dosya seçin
                {activeTab === 'whatgram' && ' • Sınırsız dosya boyutu'}
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-xl font-medium mb-2">WhatGram'a Hoş Geldiniz</h3>
              <p>Sol taraftan bir kişi seçerek mesajlaşmaya başlayın</p>
              <div className="mt-4 space-y-2">
                <p className="text-sm">
                  <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                  📱 WhatsApp - Klasik mesajlaşma
                </p>
                <p className="text-sm">
                  <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                  ✈️ Telegram - Gelişmiş özellikler
                </p>
                <p className="text-sm">
                  <span className="inline-block w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                  💬 WhatGram - Sınırsız dosya paylaşımı & E2E şifreleme
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;