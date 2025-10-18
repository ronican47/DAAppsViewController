import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const requestOTP = async (phone) => {
  const response = await api.post('/auth/request-code', { phone });
  return response.data;
};

export const verifyOTP = async (phone, code) => {
  const response = await api.post('/auth/verify-code', { phone, code });
  const { access_token, user } = response.data;
  
  // Store token and user
  await AsyncStorage.setItem('token', access_token);
  await AsyncStorage.setItem('user', JSON.stringify(user));
  
  return { token: access_token, user };
};

export const logout = async () => {
  await AsyncStorage.removeItem('token');
  await AsyncStorage.removeItem('user');
};

export const getCurrentUser = async () => {
  const userStr = await AsyncStorage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
};

export const getToken = async () => {
  return await AsyncStorage.getItem('token');
};
