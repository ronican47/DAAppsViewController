import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import api from '../services/api';
import { PLATFORM_COLORS } from '../config';
import { useNavigation } from '@react-navigation/native';

const Tab = createMaterialTopTabNavigator();

const ContactsList = ({ platform }) => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    loadContacts();
  }, [platform]);

  const loadContacts = async () => {
    try {
      const response = await api.get(`/mock/${platform}/contacts`);
      setContacts(response.data.contacts || []);
    } catch (error) {
      console.error('Error loading contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderContact = ({ item }) => (
    <TouchableOpacity style={styles.listItem}>
      <View style={[styles.avatar, { backgroundColor: PLATFORM_COLORS[platform] }]}>
        <Text style={styles.avatarText}>{item.name[0]}</Text>
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemSubtext}>{item.phone}</Text>
      </View>
      {item.is_online && <View style={styles.onlineDot} />}
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator /></View>;
  }

  return (
    <FlatList
      data={contacts}
      renderItem={renderContact}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
    />
  );
};

const GroupsList = ({ platform }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, [platform]);

  const loadGroups = async () => {
    try {
      const response = await api.get(`/mock/${platform}/groups`);
      setGroups(response.data.groups || []);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderGroup = ({ item }) => (
    <TouchableOpacity style={styles.listItem}>
      <View style={[styles.avatar, { backgroundColor: PLATFORM_COLORS[platform] }]}>
        <Text style={styles.avatarText}>👥</Text>
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemSubtext}>{item.member_count} üye</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator /></View>;
  }

  return (
    <FlatList
      data={groups}
      renderItem={renderGroup}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
    />
  );
};

const ChannelsList = ({ platform }) => {
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChannels();
  }, [platform]);

  const loadChannels = async () => {
    try {
      const response = await api.get(`/mock/${platform}/channels`);
      setChannels(response.data.channels || []);
    } catch (error) {
      console.error('Error loading channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderChannel = ({ item }) => (
    <TouchableOpacity style={styles.listItem}>
      <View style={[styles.avatar, { backgroundColor: PLATFORM_COLORS[platform] }]}>
        <Text style={styles.avatarText}>📢</Text>
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemSubtext}>{item.subscriber_count} abone</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator /></View>;
  }

  return (
    <FlatList
      data={channels}
      renderItem={renderChannel}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.listContainer}
    />
  );
};

const PlatformScreen = ({ route }) => {
  const { platform } = route.params;

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: PLATFORM_COLORS[platform],
        tabBarIndicatorStyle: { backgroundColor: PLATFORM_COLORS[platform] },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tab.Screen 
        name="Contacts" 
        children={() => <ContactsList platform={platform} />}
        options={{ title: 'Kişiler' }}
      />
      <Tab.Screen 
        name="Groups" 
        children={() => <GroupsList platform={platform} />}
        options={{ title: 'Gruplar' }}
      />
      {platform === 'telegram' && (
        <Tab.Screen 
          name="Channels" 
          children={() => <ChannelsList platform={platform} />}
          options={{ title: 'Kanallar' }}
        />
      )}
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  listContainer: {
    padding: 10,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    marginBottom: 8,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: '600',
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  itemSubtext: {
    fontSize: 13,
    color: '#999',
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
  },
});

export default PlatformScreen;
