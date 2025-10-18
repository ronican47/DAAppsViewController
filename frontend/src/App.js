import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Phone Auth Components
const PhoneAuthModal = ({ isOpen, onClose, onLogin }) => {
  const [step, setStep] = useState('phone'); // 'phone' or 'verify'
  const [formData, setFormData] = useState({
    phone: '+905551234567', // Demo phone pre-filled
    code: '',
    username: ''
  });
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let interval;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown(countdown - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdown]);

  const formatPhone = (phone) => {
    // Format phone for display
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('90')) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8, 10)} ${cleaned.slice(10)}`;
    }
    return phone;
  };

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/auth/request-code`, {
        phone: formData.phone
      });
      
      setStep('verify');
      setCountdown(300); // 5 minutes
      alert('Doğrulama kodu gönderildi! Demo için: 123456');
    } catch (error) {
      alert(error.response?.data?.detail || 'Kod gönderimi başarısız');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/verify-code`, {
        phone: formData.phone,
        code: formData.code
      });
      
      const { access_token, user } = response.data;
      
      localStorage.setItem('whatgram_token', access_token);
      localStorage.setItem('whatgram_user', JSON.stringify(user));
      
      onLogin(access_token, user);
      onClose();
    } catch (error) {
      alert(error.response?.data?.detail || 'Doğrulama başarısız');
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
          <p className="text-gray-600">Telefon numaranızla giriş yapın</p>
        </div>

        {step === 'phone' && (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Telefon Numarası
              </label>
              <input
                type="tel"
                placeholder="+90 555 123 45 67"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-lg"
                required
                data-testid="phone-input"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ülke kodu ile birlikte telefon numaranızı girin
              </p>
            </div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-lg text-white font-medium text-lg ${
                loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-500 hover:bg-purple-600'
              }`}
              data-testid="request-code-btn"
            >
              {loading ? 'Kod Gönderiliyor...' : 'Doğrulama Kodu Gönder'}
            </button>
            
            <div className="mt-4 p-3 bg-purple-50 rounded-lg">
              <p className="text-xs text-purple-700 font-medium">Demo Hesap:</p>
              <p className="text-xs text-purple-600">Telefon: +90 555 123 45 67</p>
              <p className="text-xs text-purple-600">Kod: 123456</p>
            </div>
          </form>
        )}

        {step === 'verify' && (
          <form onSubmit={handleVerifySubmit} className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-gray-700">
                <span className="font-semibold">{formatPhone(formData.phone)}</span> numarasına gönderilen doğrulama kodunu girin
              </p>
              {countdown > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  Kod {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')} dakika geçerli
                </p>
              )}
            </div>
            
            <input
              type="text"
              placeholder="6 haneli kod"
              value={formData.code}
              onChange={(e) => setFormData({...formData, code: e.target.value.replace(/\D/g, '').slice(0, 6)})}
              className="w-full p-4 text-center text-2xl tracking-widest border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              maxLength="6"
              required
              data-testid="verification-code-input"
            />
            
            <button
              type="submit"
              disabled={loading || formData.code.length !== 6}
              className={`w-full py-3 px-4 rounded-lg text-white font-medium text-lg ${
                loading || formData.code.length !== 6 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-purple-500 hover:bg-purple-600'
              }`}
              data-testid="verify-code-btn"
            >
              {loading ? 'Doğrulanıyor...' : 'Doğrula ve Giriş Yap'}
            </button>
            
            <button
              type="button"
              onClick={() => {
                setStep('phone');
                setFormData({...formData, code: ''});
              }}
              className="w-full py-2 px-4 text-gray-600 hover:text-gray-800"
            >
              ← Telefon numarasını değiştir
            </button>
            
            {countdown === 0 && (
              <button
                type="button"
                onClick={handlePhoneSubmit}
                className="w-full py-2 px-4 text-purple-600 hover:text-purple-800 font-medium"
              >
                Kodu tekrar gönder
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

// Group/Channel Creation Modals
const CreateGroupModal = ({ isOpen, onClose, activeTab, token, onGroupCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: false,
    memberPhones: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const memberPhonesArray = formData.memberPhones
        .split(',') 
        .map(phone => phone.trim())
        .filter(phone => phone.length > 0);

      await axios.post(`${API}/groups`, {
        name: formData.name,
        description: formData.description,
        platform: activeTab,
        is_public: formData.isPublic,
        member_phones: memberPhonesArray
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Grup başarıyla oluşturuldu!');
      onGroupCreated();
      onClose();
      setFormData({ name: '', description: '', isPublic: false, memberPhones: '' });
    } catch (error) {
      alert(error.response?.data?.detail || 'Grup oluşturma başarısız');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold mb-4">Yeni Grup Oluştur</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Grup adı"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="w-full p-3 border rounded-lg"
            required
          />
          <textarea
            placeholder="Grup açıklaması (isteğe bağlı)"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full p-3 border rounded-lg h-20"
          />
          <textarea
            placeholder="Üye telefon numaraları (virgülle ayrılı): +905551234567, +905552345678"
            value={formData.memberPhones}
            onChange={(e) => setFormData({...formData, memberPhones: e.target.value})}
            className="w-full p-3 border rounded-lg h-20"
          />
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isPublic}
              onChange={(e) => setFormData({...formData, isPublic: e.target.checked})}
              className="mr-2"
            />
            Herkese açık grup
          </label>
          <div className="flex space-x-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400"
            >
              {loading ? 'Oluşturuluyor...' : 'Grup Oluştur'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              İptal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CreateChannelModal = ({ isOpen, onClose, activeTab, token, onChannelCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: true,
    canSubscribersMessage: false
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post(`${API}/channels`, {
        name: formData.name,
        description: formData.description,
        platform: activeTab,
        is_public: formData.isPublic,
        can_subscribers_message: formData.canSubscribersMessage
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert('Kanal başarıyla oluşturuldu!');
      onChannelCreated();
      onClose();
      setFormData({ name: '', description: '', isPublic: true, canSubscribersMessage: false });
    } catch (error) {
      alert(error.response?.data?.detail || 'Kanal oluşturma başarısız');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
        <h3 className="text-xl font-bold mb-4">Yeni Kanal Oluştur</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Kanal adı"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            className="w-full p-3 border rounded-lg"
            required
          />
          <textarea
            placeholder="Kanal açıklaması (isteğe bağlı)"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            className="w-full p-3 border rounded-lg h-20"
          />
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isPublic}
              onChange={(e) => setFormData({...formData, isPublic: e.target.checked})}
              className="mr-2"
            />
            Herkese açık kanal
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.canSubscribersMessage}
              onChange={(e) => setFormData({...formData, canSubscribersMessage: e.target.checked})}
              className="mr-2"
            />
            Abone olanlar mesaj gönderebilir
          </label>
          <div className="flex space-x-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
            >
              {loading ? 'Oluşturuluyor...' : 'Kanal Oluştur'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
            >
              İptal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [activeTab, setActiveTab] = useState('whatsapp');
  const [contentType, setContentType] = useState('contacts'); // 'contacts', 'groups', 'channels'
  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [channels, setChannels] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
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
      loadContent();
    }
  }, [activeTab, contentType, token]);

  useEffect(() => {
    if ((selectedContact || selectedGroup || selectedChannel) && token) {
      loadMessages();
    }
  }, [selectedContact, selectedGroup, selectedChannel, token]);

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
            loadMessages();
            loadContent();
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

  const loadContent = async () => {
    if (!token) return;
    
    try {
      if (contentType === 'contacts') {
        const response = await axios.get(`${API}/contacts?platform=${activeTab}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setContacts(response.data);
      } else if (contentType === 'groups') {
        const response = await axios.get(`${API}/groups?platform=${activeTab}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setGroups(response.data);
      } else if (contentType === 'channels') {
        const response = await axios.get(`${API}/channels?platform=${activeTab}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setChannels(response.data);
      }
    } catch (error) {
      console.error('Error loading content:', error);
      if (error.response?.status === 401) {
        logout();
      }
    }
  };

  const loadMessages = async () => {
    const currentChat = selectedContact || selectedGroup || selectedChannel;
    if (!token || !currentChat || !currentChat.conversationId) return;
    
    try {
      const response = await axios.get(
        `${API}/conversations/${currentChat.conversationId}/messages`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(response.data);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const selectChat = async (item, type) => {
    if (!token) return;
    
    try {
      let conversationId;
      
      if (type === 'contact') {
        // Create or get conversation for contact
        const response = await axios.post(
          `${API}/conversations?participant_id=${item.id}&platform=${activeTab}`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        conversationId = response.data.id;
        item.conversationId = conversationId;
        setSelectedContact(item);
        setSelectedGroup(null);
        setSelectedChannel(null);
      } else if (type === 'group' || type === 'channel') {
        // Groups and channels already have conversations
        // Find the conversation by group_id or channel_id
        const response = await axios.get(`${API}/conversations?platform=${activeTab}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const conversation = response.data.find(conv => 
          (type === 'group' && conv.group_id === item.id) ||
          (type === 'channel' && conv.channel_id === item.id)
        );
        
        if (conversation) {
          item.conversationId = conversation.id;
          if (type === 'group') {
            setSelectedGroup(item);
            setSelectedContact(null);
            setSelectedChannel(null);
          } else {
            setSelectedChannel(item);
            setSelectedContact(null);
            setSelectedGroup(null);
          }
        }
      }
    } catch (error) {
      console.error('Error selecting chat:', error);
    }
  };

  const sendMessage = async () => {
    const currentChat = selectedContact || selectedGroup || selectedChannel;
    if (!newMessage.trim() || !currentChat || !token) return;

    try {
      await axios.post(
        `${API}/messages`,
        {
          conversation_id: currentChat.conversationId,
          receiver_id: selectedContact ? selectedContact.id : "", // Groups/channels don't need receiver_id
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
    const currentChat = selectedContact || selectedGroup || selectedChannel;
    if (selectedFiles.length === 0 || !currentChat || !token) return;

    setIsUploading(true);
    
    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('conversation_id', currentChat.conversationId);
        formData.append('receiver_id', selectedContact ? selectedContact.id : "");
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
      await axios.post(
        `${API}/connect/${platform}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
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

  const getCurrentChatInfo = () => {
    if (selectedContact) {
      return {
        name: selectedContact.name,
        subtitle: selectedContact.phone,
        avatar: selectedContact.avatar_url,
        type: 'Kişi',
        isOnline: selectedContact.is_online
      };
    } else if (selectedGroup) {
      return {
        name: selectedGroup.name,
        subtitle: `${selectedGroup.member_count} üye`,
        avatar: selectedGroup.avatar_url || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=100&h=100&fit=crop',
        type: 'Grup',
        isOnline: false
      };
    } else if (selectedChannel) {
      return {
        name: selectedChannel.name,
        subtitle: `${selectedChannel.subscriber_count} abone`,
        avatar: selectedChannel.avatar_url || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=100&h=100&fit=crop',
        type: 'Kanal',
        isOnline: false
      };
    }
    return null;
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-500 to-pink-400 flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-6xl font-bold mb-4" data-testid="app-title">WhatGram</h1>
          <p className="text-xl mb-2">WhatsApp, Telegram ve WhatGram'ı birleştiren platform</p>
          <p className="text-lg mb-8 opacity-90">📱 Telefon numaranızla hızlıca başlayın</p>
          <button
            onClick={() => setShowAuth(true)}
            className="px-8 py-4 bg-white text-purple-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors text-lg"
            data-testid="get-started-btn"
          >
            Telefon ile Giriş Yap
          </button>
        </div>
        <PhoneAuthModal 
          isOpen={showAuth} 
          onClose={() => setShowAuth(false)}
          onLogin={handleLogin}
        />
      </div>
    );
  }

  const currentChatInfo = getCurrentChatInfo();

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
          <p className="text-sm opacity-90">📱 {user.phone}</p>
          <p className="text-xs opacity-75">{user.username}</p>
        </div>

        {/* Platform Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex-1 py-3 px-2 text-xs font-medium flex items-center justify-center space-x-1 ${
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
            className={`flex-1 py-3 px-2 text-xs font-medium flex items-center justify-center space-x-1 ${
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
            className={`flex-1 py-3 px-2 text-xs font-medium flex items-center justify-center space-x-1 ${
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

        {/* Content Type Tabs */}
        <div className="flex border-b border-gray-200 bg-gray-50">
          <button
            onClick={() => {
              setContentType('contacts');
              setSelectedContact(null);
              setSelectedGroup(null);
              setSelectedChannel(null);
            }}
            className={`flex-1 py-2 px-3 text-sm font-medium ${
              contentType === 'contacts'
                ? `${getPlatformColor(activeTab)} text-white`
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            data-testid="contacts-tab"
          >
            👥 Kişiler
          </button>
          <button
            onClick={() => {
              setContentType('groups');
              setSelectedContact(null);
              setSelectedGroup(null);
              setSelectedChannel(null);
            }}
            className={`flex-1 py-2 px-3 text-sm font-medium ${
              contentType === 'groups'
                ? `${getPlatformColor(activeTab)} text-white`
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            data-testid="groups-tab"
          >
            👥 Gruplar
          </button>
          <button
            onClick={() => {
              setContentType('channels');
              setSelectedContact(null);
              setSelectedGroup(null);
              setSelectedChannel(null);
            }}
            className={`flex-1 py-2 px-3 text-sm font-medium ${
              contentType === 'channels'
                ? `${getPlatformColor(activeTab)} text-white`
                : 'text-gray-700 hover:bg-gray-100'
            }`}
            data-testid="channels-tab"
          >
            📢 Kanallar
          </button>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            {/* Create Button */}
            <div className="mb-4">
              {contentType === 'groups' && (
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className={`w-full py-2 px-4 ${getPlatformColor(activeTab)} text-white rounded-lg hover:opacity-80 text-sm`}
                  data-testid="create-group-btn"
                >
                  + Yeni Grup Oluştur
                </button>
              )}
              {contentType === 'channels' && (
                <button
                  onClick={() => setShowCreateChannel(true)}
                  className={`w-full py-2 px-4 ${getPlatformColor(activeTab)} text-white rounded-lg hover:opacity-80 text-sm`}
                  data-testid="create-channel-btn"
                >
                  + Yeni Kanal Oluştur
                </button>
              )}
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold mb-3" data-testid="content-title">
              {contentType === 'contacts' && `Kişiler (${contacts.length})`}
              {contentType === 'groups' && `Gruplar (${groups.length})`}
              {contentType === 'channels' && `Kanallar (${channels.length})`}
            </h3>

            {/* List */}
            <div className="space-y-2">
              {contentType === 'contacts' && contacts.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => selectChat(contact, 'contact')}
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
                    <p className="font-medium text-gray-900 truncate">{contact.name}</p>
                    <p className="text-sm text-gray-500 truncate">{contact.phone}</p>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${getPlatformColor(contact.platform)}`}></div>
                </div>
              ))}

              {contentType === 'groups' && groups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => selectChat(group, 'group')}
                  className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedGroup?.id === group.id
                      ? `${getPlatformColor(activeTab).replace('bg-', 'bg-opacity-20 bg-')}`
                      : 'hover:bg-gray-100'
                  }`}
                  data-testid={`group-${group.id}`}
                >
                  <div className="relative">
                    <img
                      src={group.avatar_url || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=100&h=100&fit=crop'}
                      alt={group.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{group.name}</p>
                    <p className="text-sm text-gray-500 truncate">{group.member_count} üye</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400">Grup</span>
                    <div className={`w-3 h-3 rounded-full ${getPlatformColor(group.platform)} mt-1`}></div>
                  </div>
                </div>
              ))}

              {contentType === 'channels' && channels.map((channel) => (
                <div
                  key={channel.id}
                  onClick={() => selectChat(channel, 'channel')}
                  className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedChannel?.id === channel.id
                      ? `${getPlatformColor(activeTab).replace('bg-', 'bg-opacity-20 bg-')}`
                      : 'hover:bg-gray-100'
                  }`}
                  data-testid={`channel-${channel.id}`}
                >
                  <div className="relative">
                    <img
                      src={channel.avatar_url || 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=100&h=100&fit=crop'}
                      alt={channel.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{channel.name}</p>
                    <p className="text-sm text-gray-500 truncate">{channel.subscriber_count} abone</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-gray-400">Kanal</span>
                    <div className={`w-3 h-3 rounded-full ${getPlatformColor(channel.platform)} mt-1`}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentChatInfo ? (
          <>
            {/* Chat Header */}
            <div className={`flex items-center justify-between p-4 border-b border-gray-200 ${getPlatformColor(activeTab)} text-white`}>
              <div className="flex items-center">
                <img
                  src={currentChatInfo.avatar}
                  alt={currentChatInfo.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div className="ml-3">
                  <h4 className="font-medium" data-testid="chat-contact-name">
                    {currentChatInfo.name}
                  </h4>
                  <p className="text-sm opacity-75">
                    {currentChatInfo.subtitle} • {currentChatInfo.type}
                    {activeTab === 'whatgram' && <span className="ml-2">🔒 E2E Şifreli</span>}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-75 capitalize">{activeTab}</p>
                {activeTab === 'whatgram' && (
                  <p className="text-xs opacity-60">Sınırsız Dosya</p>
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
                  <h5 className="text-sm font-medium flex items-center">
                    📎 Seçilen Dosyalar:
                    {activeTab === 'whatgram' && <span className="ml-2 text-purple-600 text-xs">🔒 Şifreli</span>}
                  </h5>
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
                className="flex items-center space-x-2 p-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 transition-colors"
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
                  className={`p-2 rounded-full ${getPlatformColor(activeTab)} hover:opacity-80 text-white transition-opacity`}
                  data-testid="file-upload-btn"
                  title="Dosya ekle"
                >
                  📎
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder={`${currentChatInfo.type.toLowerCase()}'a mesaj yazın...`}
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  data-testid="message-input"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className={`p-2 rounded-full transition-opacity ${
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
                {activeTab === 'whatgram' && ' • Sınırsız dosya boyutu desteklenir'}
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-6xl mb-4">
                {contentType === 'contacts' && '👥'}
                {contentType === 'groups' && '👥'}
                {contentType === 'channels' && '📢'}
              </div>
              <h3 className="text-xl font-medium mb-2">WhatGram ile Başlayın</h3>
              <p className="mb-4">
                {contentType === 'contacts' && 'Bir kişi seçerek mesajlaşmaya başlayın'}
                {contentType === 'groups' && 'Bir grup seçin veya yeni grup oluşturun'}
                {contentType === 'channels' && 'Bir kanal seçin veya yeni kanal oluşturun'}
              </p>
              <div className="space-y-2 text-sm">
                <p className="flex items-center justify-center">
                  <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                  📱 WhatsApp - Klasik mesajlaşma
                </p>
                <p className="flex items-center justify-center">
                  <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                  ✈️ Telegram - Gelişmiş özellikler
                </p>
                <p className="flex items-center justify-center">
                  <span className="inline-block w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
                  💬 WhatGram - Sınırsız dosya & E2E şifreleme
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        activeTab={activeTab}
        token={token}
        onGroupCreated={loadContent}
      />

      <CreateChannelModal
        isOpen={showCreateChannel}
        onClose={() => setShowCreateChannel(false)}
        activeTab={activeTab}
        token={token}
        onChannelCreated={loadContent}
      />
    </div>
  );
};

export default App;