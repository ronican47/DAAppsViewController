import React, { useState, useEffect, useRef } from 'react';
import './App.css';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const App = () => {
  const [activeTab, setActiveTab] = useState('whatsapp');
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    initMockData();
  }, []);

  useEffect(() => {
    loadContacts();
  }, [activeTab]);

  useEffect(() => {
    if (selectedContact) {
      loadMessages();
    }
  }, [selectedContact]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const initMockData = async () => {
    try {
      await axios.post(`${API}/init-mock-data`);
      console.log('Mock data initialized');
    } catch (error) {
      console.error('Error initializing mock data:', error);
    }
  };

  const loadContacts = async () => {
    try {
      const response = await axios.get(`${API}/contacts?platform=${activeTab}`);
      setContacts(response.data);
    } catch (error) {
      console.error('Error loading contacts:', error);
    }
  };

  const loadMessages = async () => {
    try {
      if (!selectedContact || !selectedContact.conversationId) return;
      
      const response = await axios.get(`${API}/conversations/${selectedContact.conversationId}/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const selectContact = async (contact) => {
    try {
      // Find or create conversation
      const convResponse = await axios.get(`${API}/conversations?platform=${activeTab}`);
      let conversation = convResponse.data.find(conv => 
        conv.participant_ids.includes(contact.id)
      );

      if (conversation) {
        contact.conversationId = conversation.id;
        setSelectedContact(contact);
      }
    } catch (error) {
      console.error('Error selecting contact:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedContact) return;

    try {
      await axios.post(`${API}/messages`, {
        conversation_id: selectedContact.conversationId,
        sender_id: 'user',
        content: newMessage,
        platform: activeTab
      });

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
    if (selectedFiles.length === 0 || !selectedContact) return;

    setIsUploading(true);
    
    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('conversation_id', selectedContact.conversationId);
        formData.append('sender_id', 'user');
        formData.append('platform', activeTab);

        await axios.post(`${API}/upload`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      setSelectedFiles([]);
      loadMessages();
    } catch (error) {
      console.error('Error uploading files:', error);
    } finally {
      setIsUploading(false);
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
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-1/3 bg-white border-r border-gray-300 flex flex-col">
        {/* Platform Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`flex-1 py-3 px-4 text-sm font-medium ${
              activeTab === 'whatsapp'
                ? 'bg-green-500 text-white'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
            data-testid="whatsapp-tab"
          >
            📱 WhatsApp
          </button>
          <button
            onClick={() => setActiveTab('telegram')}
            className={`flex-1 py-3 px-4 text-sm font-medium ${
              activeTab === 'telegram'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
            }`}
            data-testid="telegram-tab"
          >
            ✈️ Telegram
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
                      ? activeTab === 'whatsapp' ? 'bg-green-100' : 'bg-blue-100'
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
                  <div className={`w-2 h-2 rounded-full ${
                    activeTab === 'whatsapp' ? 'bg-green-500' : 'bg-blue-500'
                  }`}></div>
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
            <div className={`flex items-center p-4 border-b border-gray-200 ${
              activeTab === 'whatsapp' ? 'bg-green-500' : 'bg-blue-500'
            }`}>
              <img
                src={selectedContact.avatar_url}
                alt={selectedContact.name}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="ml-3">
                <h4 className="font-medium text-white" data-testid="chat-contact-name">
                  {selectedContact.name}
                </h4>
                <p className="text-sm text-white opacity-75">
                  {selectedContact.is_online ? 'Çevrimiçi' : 'Son görülme: az önce'}
                </p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="messages-container">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender_id === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      message.sender_id === 'user'
                        ? activeTab === 'whatsapp'
                          ? 'bg-green-500 text-white'
                          : 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-900'
                    }`}
                    data-testid={`message-${message.id}`}
                  >
                    {message.file_message ? (
                      <div className="space-y-2">
                        {renderFileMessage(message.file_message)}
                      </div>
                    ) : (
                      <p className="text-sm">{message.content}</p>
                    )}
                    <p className={`text-xs mt-1 ${
                      message.sender_id === 'user' ? 'text-white opacity-75' : 'text-gray-500'
                    }`}>
                      {formatTime(message.timestamp)}
                    </p>
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
                          : activeTab === 'whatsapp' 
                            ? 'bg-green-500 hover:bg-green-600' 
                            : 'bg-blue-500 hover:bg-blue-600'
                      }`}
                      data-testid="upload-files-btn"
                    >
                      {isUploading ? 'Yükleniyor...' : 'Dosyaları Gönder'}
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
                  className={`p-2 rounded-full ${
                    activeTab === 'whatsapp' 
                      ? 'bg-green-500 hover:bg-green-600' 
                      : 'bg-blue-500 hover:bg-blue-600'
                  } text-white`}
                  data-testid="file-upload-btn"
                >
                  📎
                </button>
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Mesaj yazın veya dosya sürükleyip bırakın..."
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  data-testid="message-input"
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className={`p-2 rounded-full ${
                    !newMessage.trim()
                      ? 'bg-gray-300 cursor-not-allowed'
                      : activeTab === 'whatsapp'
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-blue-500 hover:bg-blue-600'
                  } text-white`}
                  data-testid="send-message-btn"
                >
                  ➤
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Dosya sürükleyip bırakın veya 📎 butonuna tıklayarak dosya seçin
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-xl font-medium mb-2">Sohbet Başlatın</h3>
              <p>Sol taraftan bir kişi seçerek mesajlaşmaya başlayın</p>
              <p className="text-sm mt-2">
                {activeTab === 'whatsapp' ? '📱 WhatsApp' : '✈️ Telegram'} 
                {' '}modunda dosya paylaşımı yapabilirsiniz
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;