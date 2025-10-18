import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import AuthScreen from './src/screens/AuthScreen';
import UnifiedInboxScreen from './src/screens/UnifiedInboxScreen';
import PlatformScreen from './src/screens/PlatformScreen';
import ChatScreen from './src/screens/ChatScreen';
import { Text, View, ActivityIndicator } from 'react-native';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: '#6B46C1',
        tabBarStyle: { paddingBottom: 5, paddingTop: 5, height: 60 },
      }}
    >
      <Tab.Screen 
        name="UnifiedInbox" 
        component={UnifiedInboxScreen}
        options={{
          title: 'Birleşik Gelen Kutusu',
          tabBarLabel: 'Gelen Kutusu',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>📬</Text>,
        }}
      />
      <Tab.Screen 
        name="WhatsAppTab" 
        component={PlatformScreen}
        initialParams={{ platform: 'whatsapp' }}
        options={{
          title: 'WhatsApp',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>💬</Text>,
        }}
      />
      <Tab.Screen 
        name="TelegramTab" 
        component={PlatformScreen}
        initialParams={{ platform: 'telegram' }}
        options={{
          title: 'Telegram',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>✈️</Text>,
        }}
      />
      <Tab.Screen 
        name="WhatGramTab" 
        component={PlatformScreen}
        initialParams={{ platform: 'whatgram' }}
        options={{
          title: 'WhatGram',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 24 }}>📱</Text>,
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6B46C1" />
      </View>
    );
  }

  return (
    <Stack.Navigator>
      {!user ? (
        <Stack.Screen 
          name="Auth" 
          component={AuthScreen}
          options={{ headerShown: false }}
        />
      ) : (
        <>
          <Stack.Screen 
            name="Main" 
            component={MainTabs}
            options={{ headerShown: false }}
          />
          <Stack.Screen 
            name="Chat" 
            component={ChatScreen}
            options={({ route }) => ({
              title: route.params?.chatInfo?.name || 'Sohbet',
            })}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
