import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import api from '../services/api';
import { PLATFORM_COLORS, PLATFORM_ICONS } from '../config';
import { useNavigation } from '@react-navigation/native';

const UnifiedInboxScreen = () => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      const response = await api.get('/unified-inbox');
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Error loading inbox:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadMessages();
  };

  const openChat = (message) => {
    navigation.navigate('Chat', {
      conversationId: message.conversation_id,
      chatInfo: message.chat_info
    });
  };

  const renderMessage = ({ item }) => (
    <TouchableOpacity 
      style={styles.messageItem}
      onPress={() => openChat(item)}
    >
      <View style={styles.messageHeader}>
        <Text style={styles.platformIcon}>{PLATFORM_ICONS[item.platform]}</Text>
        <View style={styles.messageInfo}>
          <Text style={styles.chatName}>
            {item.chat_info?.name || 'Unknown'}
          </Text>
          <Text style={styles.timestamp}>
            {new Date(item.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
      <Text style={styles.messageContent} numberOfLines={2}>
        {item.content || '[Medya mesajı]'}
      </Text>
      {item.chat_info?.type === 'group' && (
        <Text style={styles.groupInfo}>
          👥 {item.chat_info.member_count} üye
        </Text>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6B46C1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent=(
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📬</Text>
            <Text style={styles.emptyText}>Henüz mesaj yok</Text>
            <Text style={styles.emptySubtext}>Platformları keşfedin ve mesajlaşmaya başlayın!</Text>
          </View>
        )
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageItem: {
    backgroundColor: 'white',
    padding: 15,
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  platformIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  messageInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  messageContent: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  groupInfo: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default UnifiedInboxScreen;
