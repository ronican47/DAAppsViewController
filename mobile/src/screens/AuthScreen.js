import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { requestOTP, verifyOTP } from '../services/authService';
import { useAuth } from '../context/AuthContext';

const AuthScreen = () => {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' or 'code'
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleRequestOTP = async () => {
    if (!phone || phone.length < 10) {
      Alert.alert('Hata', 'Geçerli bir telefon numarası girin');
      return;
    }

    setLoading(true);
    try {
      await requestOTP(phone);
      Alert.alert('Başarılı', 'Doğrulama kodu gönderildi!');
      setStep('code');
    } catch (error) {
      Alert.alert('Hata', error.response?.data?.detail || 'Kod gönderilemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!code || code.length !== 6) {
      Alert.alert('Hata', '6 haneli kodu girin');
      return;
    }

    setLoading(true);
    try {
      const { user } = await verifyOTP(phone, code);
      login(user);
    } catch (error) {
      Alert.alert('Hata', error.response?.data?.detail || 'Kod doğrulanamadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.logo}>💬 WhatGram</Text>
        <Text style={styles.subtitle}>Unified Messaging Platform</Text>

        {step === 'phone' ? (
          <>
            <Text style={styles.label}>Telefon Numaranız</Text>
            <TextInput
              style={styles.input}
              placeholder="+90 5XX XXX XX XX"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRequestOTP}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Gönderiliyor...' : 'Kod Gönder'}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.label}>Doğrulama Kodu</Text>
            <TextInput
              style={styles.input}
              placeholder="6 haneli kod"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
            />
            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleVerifyOTP}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Doğrulanıyor...' : 'Doğrula'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStep('phone')}>
              <Text style={styles.linkText}>Telefon numarasını değiştir</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logo: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
    marginBottom: 40,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  input: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#6B46C1',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  linkText: {
    color: '#6B46C1',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
});

export default AuthScreen;
