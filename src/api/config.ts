import Constants from 'expo-constants';
import { Platform } from 'react-native';

const API_PORT = 4000;

/**
 * Where the Ulé API lives.
 *
 * 1. `EXPO_PUBLIC_API_URL` in `ule/.env` always wins (needed when the phone uses `--tunnel`,
 *    or for a deployed server), e.g. `EXPO_PUBLIC_API_URL=https://api.example.com`.
 * 2. Otherwise, in development, the computer running Metro on port 4000 — this works when the
 *    phone and computer share Wi-Fi and Expo runs in LAN mode.
 */
function resolveApiUrl() {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');

  if (Platform.OS === 'web') return `http://localhost:${API_PORT}`;

  // hostUri is "192.168.1.5:8081" in LAN mode; in tunnel mode it's an Expo tunnel host,
  // which can't reach the API, so EXPO_PUBLIC_API_URL must be set then.
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host && !host.includes('exp.direct')) return `http://${host}:${API_PORT}`;

  return Platform.OS === 'android' ? `http://10.0.2.2:${API_PORT}` : `http://localhost:${API_PORT}`;
}

export const API_URL = resolveApiUrl();
