import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { TextInput, Button } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../config/api';

const DEMO_EMAIL = 'admin12345@bitsathy.ac.in';
const DEMO_PASSWORD = 'admin12345';

export default function AdminLoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);

    const isDemo = email === DEMO_EMAIL && password === DEMO_PASSWORD;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch(buildApiUrl('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await response.json();
      if (!response.ok || !data.success) {
        const msg =
          data.message ||
          (data.errors && data.errors[0] && data.errors[0].msg);
        Alert.alert('Error', msg || 'Invalid credentials');
        setLoading(false);
        return;
      }

      if (data.user.role !== 'admin') {
        Alert.alert('Error', 'This account is not an admin account');
        setLoading(false);
        return;
      }

      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      navigation.replace('AdminDashboard');
    } catch (err) {
      if (isDemo) {
        const demoUser = {
          id: 'demo-admin',
          email: DEMO_EMAIL,
          role: 'admin',
          name: 'Demo Admin',
        };
        await AsyncStorage.setItem('token', 'demo-token-admin');
        await AsyncStorage.setItem('user', JSON.stringify(demoUser));
        navigation.replace('AdminDashboard');
        return;
      }
      const timeoutMsg = err && err.name === 'AbortError'
        ? 'Login timed out. Please try again.'
        : 'Unable to connect to server';
      Alert.alert('Error', timeoutMsg);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
  };

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800' }}
      style={styles.background}
      blurRadius={3}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Admin Login</Text>
          <Text style={styles.subtitle}>Login to admin dashboard</Text>

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
            left={<TextInput.Icon icon="email" />}
          />

          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            mode="outlined"
            secureTextEntry
            style={styles.input}
            left={<TextInput.Icon icon="lock" />}
          />

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            style={styles.buttonPrimary}
            contentStyle={styles.buttonContent}
          >
            Login
          </Button>

          <Button
            mode="outlined"
            onPress={fillDemo}
            style={styles.buttonSecondary}
            contentStyle={styles.buttonContent}
          >
            Use Demo Credentials
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.goBack()}
            style={styles.linkButton}
          >
            Back
          </Button>

          <View style={styles.demoContainer}>
            <Text style={styles.demoTitle}>Demo Credentials</Text>
            <Text style={styles.demoText}>
              {DEMO_EMAIL} / {DEMO_PASSWORD}
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#6200ee',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    marginBottom: 15,
  },
  buttonPrimary: {
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 10,
  },
  buttonSecondary: {
    marginBottom: 10,
    borderRadius: 10,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  linkButton: {
    marginTop: 6,
  },
  demoContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
  },
  demoTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  demoText: {
    fontSize: 12,
    color: '#666',
  },
});
