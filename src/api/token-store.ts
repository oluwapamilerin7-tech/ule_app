import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'ule.session';

export type StoredSession = {
  accessToken: string;
  refreshToken: string;
  /** The household this phone last used. */
  householdId?: string | null;
};

// SecureStore (Keychain / Keystore) isn't available on web; fall back to localStorage there.
const web = {
  async get() {
    try {
      return globalThis.localStorage?.getItem(KEY) ?? null;
    } catch {
      return null;
    }
  },
  async set(value: string) {
    try {
      globalThis.localStorage?.setItem(KEY, value);
    } catch {
      // Private mode etc. — the session just won't survive a reload.
    }
  },
  async remove() {
    try {
      globalThis.localStorage?.removeItem(KEY);
    } catch {
      // ignore
    }
  },
};

export async function readSession(): Promise<StoredSession | null> {
  const raw = Platform.OS === 'web' ? await web.get() : await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export async function writeSession(session: StoredSession) {
  const raw = JSON.stringify(session);
  if (Platform.OS === 'web') await web.set(raw);
  else await SecureStore.setItemAsync(KEY, raw);
}

export async function clearSession() {
  if (Platform.OS === 'web') await web.remove();
  else await SecureStore.deleteItemAsync(KEY);
}
