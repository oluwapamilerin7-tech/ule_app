import { API_URL } from './config';
import { clearSession, readSession, writeSession, type StoredSession } from './token-store';

/** The server answered with an error (4xx/5xx). */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: {
      fields?: Record<string, string>;
      attemptsLeft?: number;
      current?: unknown;
      lockedUntil?: string;
    },
  ) {
    super(message);
  }
}

/** The server couldn't be reached at all — offline, or the wrong API address. */
export class NetworkError extends Error {
  constructor(cause?: unknown) {
    super(`Can't reach the Ulé server at ${API_URL}.`);
    this.cause = cause;
  }
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/** A readable message for any failure, suitable for showing on screen. */
export function errorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof NetworkError) return error.message;
  return 'Something went wrong. Please try again.';
}

let session: StoredSession | null = null;
let refreshing: Promise<boolean> | null = null;
/** Called when the session can't be refreshed any more (signed out elsewhere, expired). */
let onSignedOut: (() => void) | null = null;

export const auth = {
  async restore() {
    session = await readSession();
    return session;
  },
  get current() {
    return session;
  },
  async save(next: StoredSession) {
    session = next;
    await writeSession(next);
  },
  async setHousehold(householdId: string | null) {
    if (!session) return;
    await auth.save({ ...session, householdId });
  },
  async clear() {
    session = null;
    await clearSession();
  },
  onSignedOut(listener: (() => void) | null) {
    onSignedOut = listener;
  },
};

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Skip the Authorization header (sign-in, sign-up, invite preview). */
  anonymous?: boolean;
};

const TIMEOUT_MS = 20_000;

async function send(path: string, options: RequestOptions, accessToken?: string) {
  // Built by hand: React Native's URL class doesn't implement searchParams.
  const query = Object.entries(options.query ?? {})
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  const url = `${API_URL}/v1${path}${query ? `?${query}` : ''}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    throw new NetworkError(error);
  } finally {
    clearTimeout(timer);
  }
}

/** Swaps the refresh token for a new pair. Concurrent callers share one refresh. */
async function refreshSession() {
  if (!session) return false;
  refreshing ??= (async () => {
    const current = session;
    if (!current) return false;
    const res = await send('/auth/refresh', { method: 'POST', body: { refreshToken: current.refreshToken } });
    if (!res.ok) return false;
    const tokens = (await res.json()) as { accessToken: string; refreshToken: string };
    await auth.save({ ...current, ...tokens });
    return true;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function parseError(res: Response) {
  try {
    const body = (await res.json()) as { error?: { code?: string; message?: string; details?: ApiError['details'] } };
    return new ApiError(
      res.status,
      body.error?.code ?? 'error',
      body.error?.message ?? `Request failed (${res.status}).`,
      body.error?.details,
    );
  } catch {
    return new ApiError(res.status, 'error', `Request failed (${res.status}).`);
  }
}

/** JSON request to the Ulé API. Retries once after refreshing an expired access token. */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let res = await send(path, options, options.anonymous ? undefined : session?.accessToken);

  if (res.status === 401 && !options.anonymous && session) {
    if (await refreshSession()) {
      res = await send(path, options, session?.accessToken);
    } else {
      await auth.clear();
      onSignedOut?.();
    }
  }

  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
