// Shared mobile-only auth transport. Access tokens never go to AsyncStorage.
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { API_URL } from '../constants/api';
const TOKEN_KEY = 'eman.mobile.access-token.v1';
const ROLE_KEY = 'eman.mobile.token-role.v1';
export type MobileRole = 'user' | 'worker';
export async function storeMobileToken(token: string, role: MobileRole) {
  if (!token || typeof token !== 'string') throw new Error('Login did not return access token');
  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await SecureStore.setItemAsync(ROLE_KEY, role);
}
export async function getMobileToken() { return SecureStore.getItemAsync(TOKEN_KEY); }
export async function clearMobileToken() {
  await Promise.all([SecureStore.deleteItemAsync(TOKEN_KEY), SecureStore.deleteItemAsync(ROLE_KEY)]);
}
// Local logout must not depend on a working presence API. Preserve language/cache keys.
const SESSION_KEYS = ['customerSession', 'workerSession', 'activeRole', 'newBookingDraft'];
export async function clearMobileSession() {
  try {
    await clearMobileToken();
  } finally {
    await AsyncStorage.multiRemove(SESSION_KEYS);
  }
}

export async function logoutMobileSession(notifyCustomerPresence = false) {
  if (notifyCustomerPresence) {
    try {
      const session = await AsyncStorage.getItem('customerSession');
      const customerId = Number(session ? JSON.parse(session)?.id : 0);
      const token = await getMobileToken();
      if (token && Number.isSafeInteger(customerId) && customerId > 0) {
        // Best effort only: a network failure must not prevent local logout.
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        void fetch(`${API_URL}/user/presence`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ customerId, online: false }), signal: controller.signal,
        }).catch(() => {}).finally(() => clearTimeout(timeout));
      }
    } catch (_) { /* Missing/invalid session or unavailable secure storage. */ }
  }
  await clearMobileSession();
}

// Install once, before the screen tree mounts. Axios calls remain unchanged.
axios.interceptors.request.use(async (config) => {
  const url = String(config.url || '');
  // Do not leak bearer token to Razorpay, Expo Push or arbitrary external hosts.
  if (url === API_URL || url.startsWith(`${API_URL}/`)) {
    const token = await getMobileToken();
    if (token) config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// Expired/invalid sessions never fall back to userId-only access.
let handlingExpiry = false;
axios.interceptors.response.use(response => response, async (error) => {
  const url = String(error?.config?.url || '');
  const isOurApi = url.startsWith(`${API_URL}/`);
  const isLoginEndpoint = /\/(?:send-otp|verify-otp|login)$/.test(url);
  if (isOurApi && !isLoginEndpoint && error?.response?.status === 401 && !handlingExpiry) {
    handlingExpiry = true;
    try {
      await clearMobileSession();
      router.replace('/');
    } finally { handlingExpiry = false; }
  }
  return Promise.reject(error);
});
