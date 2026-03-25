import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { TextInput, Button, HelperText, useTheme } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../config/api';

export default function RegisterScreen({ navigation }) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [registerNumber, setRegisterNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const rules = useMemo(
    () => ({
      name: {
        label: 'Full Name',
        hint: 'UPPERCASE with last initial (e.g., "ARUN K")',
        ok: (value) => /^[A-Z]+(?: [A-Z]+)* [A-Z]\.?$/.test(String(value || '').trim()),
      },
      registerNumber: {
        label: 'Register Number',
        hint: '12 characters, letters + numbers (e.g., ABC123DEF456)',
        ok: (value) => /^(?=.*[A-Z])(?=.*\d)[A-Z0-9]{12}$/.test(String(value || '').trim().toUpperCase()),
      },
      email: {
        label: 'Email',
        hint: 'Must end with @gmail.com or *.ac.in',
        ok: (value) => {
          const v = String(value || '').trim().toLowerCase();
          if (!v.includes('@')) return false;
          return v.endsWith('@gmail.com') || v.endsWith('.ac.in');
        },
      },
      password: {
        label: 'Password',
        hint: 'Min 8 chars with A-Z, a-z, 0-9, and special character',
        ok: (value) =>
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(String(value || '')),
      },
      phone: {
        label: 'Mobile Number',
        hint: '10 digits',
        ok: (value) => /^\d{10}$/.test(String(value || '').trim()),
      },
    }),
    []
  );

  const isValid = {
    name: rules.name.ok(name),
    registerNumber: rules.registerNumber.ok(registerNumber),
    email: rules.email.ok(email),
    password: rules.password.ok(password),
    phone: rules.phone.ok(phone),
  };

  const canRegister =
    isValid.name &&
    isValid.registerNumber &&
    isValid.email &&
    isValid.password &&
    isValid.phone &&
    !loading;

  const normalizeName = (value) => String(value || '').replace(/\s+/g, ' ').toUpperCase();
  const normalizeRegisterNumber = (value) => String(value || '').replace(/\s+/g, '').toUpperCase();
  const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
  const normalizePhone = (value) => String(value || '').replace(/\D/g, '').slice(0, 10);

  const handleRegister = async () => {
    if (!canRegister) {
      Alert.alert('Error', 'Please fix the highlighted fields');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(buildApiUrl('/auth/register'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: normalizeName(name).trim(),
          registerNumber: normalizeRegisterNumber(registerNumber),
          email: normalizeEmail(email),
          password,
          phone,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        const msg = data.message || (data.errors && data.errors[0] && data.errors[0].msg);
        Alert.alert('Error', msg || 'Registration failed');
        setLoading(false);
        return;
      }

      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      navigation.replace('StudentApp');
    } catch (err) {
      Alert.alert('Error', 'Unable to connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={styles.title}>Student Registration</Text>
        <Text style={styles.subtitle}>Create your account</Text>

        <TextInput
          label="Full Name *"
          value={name}
          onChangeText={(v) => {
            setName(normalizeName(v));
          }}
          mode="outlined"
          style={styles.input}
          error={Boolean(name) && !isValid.name}
        />
        <HelperText type={Boolean(name) && !isValid.name ? 'error' : 'info'} visible>
          {rules.name.hint}
        </HelperText>

        <TextInput
          label="Register Number *"
          value={registerNumber}
          onChangeText={(v) => {
            setRegisterNumber(normalizeRegisterNumber(v));
          }}
          mode="outlined"
          style={styles.input}
          error={Boolean(registerNumber) && !isValid.registerNumber}
        />
        <HelperText type={Boolean(registerNumber) && !isValid.registerNumber ? 'error' : 'info'} visible>
          {rules.registerNumber.hint}
        </HelperText>

        <TextInput
          label="Email *"
          value={email}
          onChangeText={(v) => {
            setEmail(normalizeEmail(v));
          }}
          mode="outlined"
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          error={Boolean(email) && !isValid.email}
        />
        <HelperText type={Boolean(email) && !isValid.email ? 'error' : 'info'} visible>
          {rules.email.hint}
        </HelperText>

        <TextInput
          label="Password *"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
          }}
          mode="outlined"
          secureTextEntry={!passwordVisible}
          style={styles.input}
          right={
            <TextInput.Icon
              icon={passwordVisible ? 'eye-off' : 'eye'}
              onPress={() => setPasswordVisible((s) => !s)}
            />
          }
          error={Boolean(password) && !isValid.password}
        />
        <HelperText type={Boolean(password) && !isValid.password ? 'error' : 'info'} visible>
          {rules.password.hint}
        </HelperText>

        <TextInput
          label="Mobile Number *"
          value={phone}
          onChangeText={(v) => {
            setPhone(normalizePhone(v));
          }}
          mode="outlined"
          style={styles.input}
          keyboardType="phone-pad"
          error={Boolean(phone) && !isValid.phone}
        />
        <HelperText type={Boolean(phone) && !isValid.phone ? 'error' : 'info'} visible>
          {rules.phone.hint}
        </HelperText>

        <Button
          mode="contained"
          onPress={handleRegister}
          loading={loading}
          disabled={!canRegister}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          Register
        </Button>

        <Button
          mode="text"
          onPress={() => navigation.navigate('Login')}
          style={styles.linkButton}
        >
          Back
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#6200ee',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    marginBottom: 2,
  },
  button: {
    marginTop: 6,
    borderRadius: 10,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  linkButton: {
    marginTop: 10,
  },
});
