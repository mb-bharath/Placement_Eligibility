import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// Allow override via Expo env: EXPO_PUBLIC_API_BASE_URL
// Example: http://<your-lan-ip>:5000/api
const ENV_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || process.env.API_BASE_URL;

const getDevServerHost = () => {
  const hostUri =
    Constants?.expoConfig?.hostUri ||
    Constants?.manifest2?.extra?.expoClient?.hostUri ||
    Constants?.manifest?.hostUri ||
    Constants?.manifest?.debuggerHost ||
    Constants?.expoConfig?.debuggerHost;

  if (!hostUri) return null;

  const hostPort = String(hostUri)
    .replace(/^[a-z]+:\/\//i, '')
    .split('/')[0];

  const host = hostPort.split(':')[0];
  return host || null;
};

const isLikelyLocalHost = (hostname) => {
  const h = String(hostname || '').toLowerCase();
  if (!h) return false;
  if (h === 'localhost' || h === '127.0.0.1' || h === '10.0.2.2') return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  return false;
};

const resolveApiBaseUrl = () => {
  const fallback = Platform.select({
    // Android emulator -> 10.0.2.2 (host machine)
    android: 'http://10.0.2.2:5000/api',
    // iOS simulator -> localhost (host machine)
    ios: 'http://localhost:5000/api',
    // Web/desktop
    default: 'http://localhost:5000/api',
  });

  const base = ENV_BASE_URL || fallback;

  if (!__DEV__) return base;

  const devHost = getDevServerHost();
  if (!devHost) return base;

  try {
    const url = new URL(base);
    if (isLikelyLocalHost(url.hostname) && url.hostname !== devHost) {
      url.hostname = devHost;
      return url.toString().replace(/\/$/, '');
    }
  } catch {
    // If parsing fails, keep the configured base URL as-is.
  }

  // If no explicit env URL is set, prefer using the Expo dev host on native.
  if (!ENV_BASE_URL && Platform.OS !== 'web') {
    return `http://${devHost}:5000/api`;
  }

  return base;
};

export const API_BASE_URL = resolveApiBaseUrl();
// Debug: log resolved base URL at startup (visible in Metro/Expo logs)
// Remove if too noisy.
console.log('API_BASE_URL ->', API_BASE_URL);

export const buildApiUrl = (path) => {
  if (!path) return API_BASE_URL;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

export const getAuthToken = async () => {
  return AsyncStorage.getItem('token');
};

export const fetchWithTimeout = async (url, options = {}, timeoutMs = 20000) => {
  if (options.signal) {
    return fetch(url, options);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
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
