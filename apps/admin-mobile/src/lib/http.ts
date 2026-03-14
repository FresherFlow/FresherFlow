import { Platform } from 'react-native';
import { API_URL } from '../config/api';
import { ADMIN_AUTH_TOKEN_KEY } from './constants';
import { captureException } from './sentry';
import { toast } from './toast';

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
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

let _unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(fn: () => void) {
  _unauthorizedHandler = fn;
}

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
  const timeoutMs = init.timeoutMs ?? 8000;
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
  const isIdempotent = method === 'GET' || method === 'HEAD';
  const maxRetries = isIdempotent ? 1 : 0;
  const baseDelayMs = 800;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * attempt));
    }

    let response: Response;
    try {
      response = await withTimeout(`${API_URL}${path}`, fetchInit);
    } catch (networkErr) {
      lastError = networkErr;
      const msg = networkErr instanceof Error ? networkErr.message : String(networkErr);
      const isTimeout = msg.toLowerCase().includes('timeout') || msg.toLowerCase().includes('abort');
      const label = isTimeout ? 'Request timed out' : 'No connection';

      console.error(`[API] ${method} ${path} -> ${isTimeout ? 'Timeout' : 'Network'} (attempt ${attempt + 1}/${maxRetries + 1}): ${msg}`);
      captureException(networkErr, {
        area: 'admin-mobile-api',
        kind: isTimeout ? 'timeout' : 'network',
        method,
        path,
        attempt: attempt + 1,
      });

      if (attempt === maxRetries) {
        const isAuthCheck = path.includes('/auth/me');
        if (!isAuthCheck) toast.error(label, path);
      }
      continue;
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

      const status = response.status;
      console.error(`[API] ${method} ${path} -> ${status}: ${serverMsg}`);
      if (status >= 500) {
        captureException(new Error(serverMsg), {
          area: 'admin-mobile-api',
          kind: 'server',
          method,
          path,
          status,
        });
      }

      if (status === 401 && !skipAuthRefresh && _unauthorizedHandler) {
        _unauthorizedHandler();
        throw new HttpError(serverMsg, status, payload);
      }

      if (status >= 500 && attempt < maxRetries) {
        toast.warning(`Server error (${status}), retrying...`, path);
        lastError = new HttpError(serverMsg, status, payload);
        continue;
      }

      if (status === 403) toast.error('Access denied', serverMsg);
      else if (status === 404) toast.warning('Not found', path);
      else if (status === 400 || status === 422) toast.warning('Bad request', serverMsg);
      else if (status >= 500) toast.error(`Server error (${status})`, serverMsg);
      else toast.error(`Error (${status})`, serverMsg);

      throw new HttpError(serverMsg, status, payload);
    }

    return payload as T;
  }

  throw lastError;
}
