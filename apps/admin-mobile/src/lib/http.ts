import { Platform } from 'react-native';
import { API_URL } from '../config/api';
import { ADMIN_AUTH_TOKEN_KEY } from './constants';
import { toast } from './toast';

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  /** Skip the global 401 handler for this request (e.g. the login call itself) */
  skipAuthRefresh?: boolean;
}

export class HttpError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
  }
}

// ─── Global 401 handler ───────────────────────────────────────────────────────
// AuthContext calls setUnauthorizedHandler(logout) on mount so any screen that
// gets a 401 automatically redirects to LoginScreen without a dead-end.

let _unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(fn: () => void) {
  _unauthorizedHandler = fn;
}

// ─── Token storage (SecureStore on native, localStorage on web) ───────────────

async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try { return localStorage.getItem(ADMIN_AUTH_TOKEN_KEY); } catch { return null; }
  }
  try {
    const SecureStore = await import('expo-secure-store');
    return await SecureStore.getItemAsync(ADMIN_AUTH_TOKEN_KEY);
  } catch { return null; }
}

export async function deleteToken(): Promise<void> {
  if (Platform.OS === 'web') {
    try { localStorage.removeItem(ADMIN_AUTH_TOKEN_KEY); } catch { /* noop */ }
    return;
  }
  try {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.deleteItemAsync(ADMIN_AUTH_TOKEN_KEY);
  } catch { /* noop */ }
}

export async function saveToken(value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try { localStorage.setItem(ADMIN_AUTH_TOKEN_KEY, value); } catch { /* noop */ }
    return;
  }
  try {
    const SecureStore = await import('expo-secure-store');
    await SecureStore.setItemAsync(ADMIN_AUTH_TOKEN_KEY, value);
  } catch { /* noop */ }
}

async function withTimeout(input: RequestInfo | URL, init: RequestOptions = {}) {
  const controller = new AbortController();
  const timeoutMs = init.timeoutMs ?? 8000;  // fast-fail: 8s not 30s
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const token = await getToken();

  try {
    try {
      return await fetch(input, {
        ...init,
        credentials: 'include',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-From': 'fresherflow-web',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(init.headers || {}),
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeoutMs}ms`);
      }
      throw error;
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function apiRequest<T>(path: string, init: RequestOptions = {}): Promise<T> {
  const { skipAuthRefresh, ...fetchInit } = init;
  const method = (fetchInit.method ?? 'GET').toUpperCase();
  // Only retry idempotent requests (GET/HEAD) — never retry mutations
  const isIdempotent = method === 'GET' || method === 'HEAD';
  const MAX_RETRIES = isIdempotent ? 1 : 0;  // max 1 retry = 2 total attempts
  const BASE_DELAY_MS = 800;

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 600ms, 1200ms
      await new Promise(r => setTimeout(r, BASE_DELAY_MS * attempt));
    }

    let response: Response;
    try {
      response = await withTimeout(`${API_URL}${path}`, fetchInit);
    } catch (networkErr) {
      lastError = networkErr;
      const msg = networkErr instanceof Error ? networkErr.message : String(networkErr);
      const isTimeout = msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('abort');
      const label = isTimeout ? 'Request timed out' : 'No connection';

      console.error(`[API] ${method} ${path} → ${isTimeout ? 'Timeout' : 'Network'} (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${msg}`);

      if (attempt === MAX_RETRIES) {
        // Don't toast for background auth checks — they'll log out silently if needed
        const isAuthCheck = path.includes('/auth/me');
        if (!isAuthCheck) toast.error(label, path);
      }
      continue; // retry
    }

    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      try { payload = JSON.parse(text); } catch { payload = text; }
    }

    if (!response.ok) {
      const serverMsg =
        payload &&
          typeof payload === 'object' &&
          'message' in payload &&
          typeof (payload as Record<string, unknown>).message === 'string'
          ? (payload as Record<string, unknown>).message as string
          : `Unexpected error (${response.status})`;

      const s = response.status;
      console.error(`[API] ${method} ${path} → ${s}: ${serverMsg}`);

      // 401 — silent logout, no toast
      if (s === 401 && !skipAuthRefresh && _unauthorizedHandler) {
        _unauthorizedHandler();
        throw new HttpError(serverMsg, s, payload);
      }

      // 5xx — retry if idempotent
      if (s >= 500 && attempt < MAX_RETRIES) {
        toast.warning(`Server error (${s}), retrying…`, path);
        lastError = new HttpError(serverMsg, s, payload);
        continue;
      }

      // Categorised toasts
      if (s === 403) toast.error('Access denied', serverMsg);
      else if (s === 404) toast.warning('Not found', path);
      else if (s === 400 || s === 422) toast.warning('Bad request', serverMsg);
      else if (s >= 500) toast.error(`Server error (${s})`, serverMsg);
      else toast.error(`Error (${s})`, serverMsg);

      throw new HttpError(serverMsg, s, payload);
    }

    return payload as T;
  }

  // All retries exhausted — rethrow last network error
  throw lastError;
}
