import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  Text,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { Button, TextInput, Snackbar, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildApiUrl } from '../config/api';

const LOGO_IMAGE = require('../assets/logo.png');

export default function LoginScreen({ navigation, route }) {
  const theme = useTheme();
  const [role, setRole] = useState('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '' });

  const hero = useMemo(
    () => ({
      title: 'Placement Eligibility App',
      subtitle: 'Apply. Track. Get Placed.',
      quote: '"Opportunities come to those who are prepared."',
      avatarFallback: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400',
    }),
    []
  );

  const logoUrl = process.env.EXPO_PUBLIC_LOGO_URL;

  useEffect(() => {
    const msg = route?.params?.toast;
    if (msg) {
      setToast({ visible: true, message: String(msg) });
      navigation.setParams({ toast: undefined });
    }
  }, [navigation, route?.params?.toast]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(buildApiUrl('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await response.json();
      if (!response.ok || !data.success) {
        Alert.alert('Error', data.message || 'Invalid credentials');
        return;
      }

      if (data.user.role !== role) {
        Alert.alert('Error', `This account is not a ${role} account`);
        return;
      }

      await AsyncStorage.setItem('token', data.token);
      await AsyncStorage.setItem('user', JSON.stringify(data.user));
      navigation.replace(role === 'admin' ? 'AdminApp' : 'StudentApp');
    } catch (err) {
      const msg =
        err && err.name === 'AbortError'
          ? 'Login timed out. Please try again.'
          : 'Unable to connect to server';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const isWeb = Platform.OS === 'web';
  const Container = isWeb ? View : KeyboardAvoidingView;
  const containerProps = isWeb
    ? { style: styles.webInner }
    : { behavior: Platform.OS === 'ios' ? 'padding' : 'height', style: styles.container };

  const card = (
    <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.hero}>
        <View style={[styles.avatarWrap, { borderColor: '#e9ddc6' }]}>
          {LOGO_IMAGE ? (
            <Image source={LOGO_IMAGE} style={styles.avatar} resizeMode="cover" />
          ) : logoUrl ? (
            <Image source={{ uri: logoUrl }} style={styles.avatar} resizeMode="cover" />
          ) : (
            <View style={styles.avatarFallback}>
              <MaterialCommunityIcons name="briefcase-outline" size={44} color={theme.colors.primary} />
              <Text style={[styles.avatarFallbackText, { color: theme.colors.primary }]}>PE</Text>
            </View>
          )}
        </View>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>{hero.title}</Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>{hero.subtitle}</Text>
        <Text style={[styles.quote, { color: theme.colors.onSurfaceVariant }]}>{hero.quote}</Text>
      </View>

      <View style={styles.roleRow}>
        <Button
          mode={role === 'student' ? 'contained' : 'outlined'}
          onPress={() => setRole('student')}
          style={styles.segmentButton}
        >
          Student
        </Button>
        <Button
          mode={role === 'admin' ? 'contained' : 'outlined'}
          onPress={() => setRole('admin')}
          style={styles.segmentButton}
        >
          Admin
        </Button>
      </View>

      <TextInput
        label="Username or email"
        value={email}
        onChangeText={setEmail}
        mode="outlined"
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
        left={<TextInput.Icon icon="email" />}
        outlineColor={theme.colors.outline}
        activeOutlineColor={theme.colors.primary}
        textColor={theme.colors.onSurface}
      />

      <TextInput
        label="Password"
        value={password}
        onChangeText={setPassword}
        mode="outlined"
        secureTextEntry
        style={styles.input}
        left={<TextInput.Icon icon="lock" />}
        outlineColor={theme.colors.outline}
        activeOutlineColor={theme.colors.primary}
        textColor={theme.colors.onSurface}
      />

      <Button
        mode="contained"
        onPress={handleLogin}
        loading={loading}
        style={styles.loginButton}
        contentStyle={styles.loginButtonContent}
      >
        Login
      </Button>

      <View style={styles.bottomLinks}>
        {role === 'student' && (
          <Button mode="text" onPress={() => navigation.navigate('Register')}>
            New student? Register
          </Button>
        )}
      </View>
    </View>
  );

  const content = (
    <Container {...containerProps}>
      {card}
    </Container>
  );

  if (isWeb) {
    return (
      <ScrollView
        style={[styles.webBackground, { backgroundColor: theme.colors.background }]}
        contentContainerStyle={[styles.webContent, { backgroundColor: theme.colors.background }]}
      >
        {content}
      </ScrollView>
    );
  }

  return (
    <View style={[styles.background, { backgroundColor: theme.colors.background }]}>
      {content}
      <Snackbar
        visible={toast.visible}
        onDismiss={() => setToast({ visible: false, message: '' })}
        duration={2500}
        style={{ backgroundColor: theme.colors.inverseSurface }}
      >
        {toast.message}
      </Snackbar>
    </View>
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
    backgroundColor: 'transparent',
  },
  webBackground: {
    flex: 1,
    width: '100%',
  },
  webContent: {
    minHeight: '100vh',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  webInner: {
    width: '100%',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    padding: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarWrap: {
    width: 92,
    height: 92,
    borderRadius: 46,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#e9ddc6',
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  avatarFallbackText: {
    position: 'absolute',
    bottom: 8,
    right: 10,
    fontWeight: '800',
    color: '#5B2EFF',
    fontSize: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  quote: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
  roleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 10,
  },
  segmentButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
  },
  input: {
    marginBottom: 12,
  },
  loginButton: {
    borderRadius: 12,
    marginTop: 4,
  },
  loginButtonContent: {
    paddingVertical: 8,
  },
  bottomLinks: {
    marginTop: 8,
    alignItems: 'center',
  },
});
