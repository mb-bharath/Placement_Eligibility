import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Allow override via Expo env: EXPO_PUBLIC_API_BASE_URL
// Example: http://<your-lan-ip>:5000/api
const ENV_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || process.env.API_BASE_URL;

export const API_BASE_URL = ENV_BASE_URL || Platform.select({
  // Android emulator -> 10.0.2.2 (host machine)
  android: 'http://10.0.2.2:5000/api',
  // iOS simulator -> localhost (host machine)
  ios: 'http://localhost:5000/api',
  // Web/desktop
  default: 'http://localhost:5000/api',
});

export const buildApiUrl = (path) => {
  if (!path) return API_BASE_URL;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

export const getAuthToken = async () => {
  return AsyncStorage.getItem('token');
};

export const apiFetch = async (path, options = {}) => {
  const token = await getAuthToken();
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const response = await fetch(buildApiUrl(path), {
    ...options,
    headers,
  });

  const data = await response.json();
  return { response, data };
};

export const apiJson = async (path, method = 'GET', body) => {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  };
  return apiFetch(path, options);
};
