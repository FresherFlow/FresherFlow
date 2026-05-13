import { getInferredBaseUrl } from './config';

export interface RequestOptions extends RequestInit {
    timeoutMs?: number;
}

export interface SecureStorage {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
}

export class OfflineError extends Error {
    status = 0;
    constructor() {
        super('You are offline. Please check your connection.');
        this.name = 'OfflineError';
    }
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

export class ApiClient {
    private baseUrl: string;
    private storage?: SecureStorage;
    private defaultHeaders: Record<string, string>;
    private onErrorCallback?: (error: HttpError | Error, endpoint: string) => void;
    private onResponseCallback?: (response: Response, endpoint: string) => void;

    constructor(baseUrl: string, storage?: SecureStorage, options?: {
        onError?: (error: HttpError | Error, endpoint: string) => void;
        onResponse?: (response: Response, endpoint: string) => void;
        defaultHeaders?: Record<string, string>;
    }) {
        this.baseUrl = baseUrl.replace(/\/+$/, '');
        this.storage = storage;
        this.onErrorCallback = options?.onError;
        this.onResponseCallback = options?.onResponse;
        this.defaultHeaders = options?.defaultHeaders || {};
    }

    async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;


        const headers: Record<string, string> = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-From': 'fresherflow-client',
            ...this.defaultHeaders,
            ...(options.headers as Record<string, string> || {}),
        };

        if (this.storage) {
            const token = await this.storage.getItem('ff_auth_token_v1');
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }
        }

        const controller = new AbortController();
        const timeoutMs = options.timeoutMs ?? 10000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(url, {
                ...options,
                headers,
                credentials: 'include',
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (this.onResponseCallback) {
                this.onResponseCallback(response, endpoint);
            }

            const text = await response.text();
            let payload: unknown = null;
            try { if (text) payload = JSON.parse(text); } catch { payload = text; }

            if (!response.ok) {
                const message = payload && typeof payload === 'object' && (payload as Record<string, unknown>).message
                    ? (payload as Record<string, unknown>).message as string
                    : `Request failed (${response.status})`;
                const error = new HttpError(message, response.status, payload);
                if (this.onErrorCallback) this.onErrorCallback(error, endpoint);
                throw error;
            }

            return payload as T;
        } catch (error: unknown) {
            clearTimeout(timeoutId);
            if (this.onErrorCallback && (error instanceof Error)) this.onErrorCallback(error, endpoint);
            throw error;
        }
    }
}

let globalClient: ApiClient | null = null;

export function configureClient(baseUrl?: string, storage?: SecureStorage, options?: {
    onError?: (error: HttpError | Error, endpoint: string) => void;
    onResponse?: (response: Response, endpoint: string) => void;
}) {
    const finalBaseUrl = baseUrl || getInferredBaseUrl();
    globalClient = new ApiClient(finalBaseUrl, storage, options);
}

/**
 * Shared API Caller wrapper used by all module endpoints declarations.
 */
export async function apiClient<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    if (!globalClient) {
        throw new Error('ApiClient not configured. Call configureClient(...) before using endpoints.');
    }
    return globalClient.request<T>(endpoint, options);
}
