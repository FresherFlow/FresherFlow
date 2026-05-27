import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import superjson from 'superjson';
import { getInferredBaseUrl } from './config';

export interface RequestOptions extends AxiosRequestConfig {
    timeoutMs?: number;
    body?: unknown;
    useSuperJson?: boolean;
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
    private axiosInstance: AxiosInstance;
    private storage?: SecureStorage;
    private onErrorCallback?: (error: HttpError | Error, endpoint: string) => void;

    constructor(baseUrl: string, storage?: SecureStorage, options?: {
        onError?: (error: HttpError | Error, endpoint: string) => void;
        defaultHeaders?: Record<string, string>;
    }) {
        this.storage = storage;
        this.onErrorCallback = options?.onError;

        this.axiosInstance = axios.create({
            baseURL: baseUrl.replace(/\/+$/, ''),
            timeout: 10000,
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                'X-Requested-From': 'fresherflow-client',
                ...options?.defaultHeaders,
            },
        });

        // Request Interceptor for Token and Anon ID injection
        this.axiosInstance.interceptors.request.use(async (config) => {
            // Ensure X-Requested-From is always set to bypass the CSRF gate
            config.headers['X-Requested-From'] = 'fresherflow-client';

            if (this.storage) {
                const [token, anonId] = await Promise.all([
                    this.storage.getItem('ff_auth_token_v1'),
                    this.storage.getItem('ff_anon_user_id')
                ]);

                if (token && !config.headers.Authorization) {
                    config.headers.Authorization = `Bearer ${token}`;
                }

                if (anonId) {
                    config.headers['x-fresherflow-anon-id'] = anonId;
                }
            }
            return config;
        });

        // Response Interceptor for Error normalization
        this.axiosInstance.interceptors.response.use(
            (response) => response,
            (error: AxiosError) => {
                let normalizedError: Error;

                if (!error.response) {
                    normalizedError = new OfflineError();
                } else {
                    const status = error.response.status;
                    const body = error.response.data as { error?: { message?: string }; message?: string } | null | undefined;
                    const message = body?.error?.message || body?.message || `Request failed (${status})`;
                    normalizedError = new HttpError(message, status, body);
                }

                if (this.onErrorCallback) {
                    this.onErrorCallback(normalizedError, error.config?.url || 'unknown');
                }

                return Promise.reject(normalizedError);
            }
        );
    }

    async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
        const { timeoutMs, body, ...axiosOptions } = options;
        
        // Handle Request Payload with SuperJSON if enabled
        if (body && !axiosOptions.data) {
            if (typeof body === 'string') {
                try {
                    axiosOptions.data = JSON.parse(body);
                } catch {
                    axiosOptions.data = body;
                }
            } else {
                axiosOptions.data = body;
            }
        }

        const response = await this.axiosInstance.request<T>({
            url: endpoint,
            timeout: timeoutMs,
            ...axiosOptions,
            // If the backend sends SuperJSON envelope, we need to parse it.
            // For now, we'll try to deserialize the response data if it looks like SuperJSON.
            transformResponse: [
                (data) => {
                    if (!data) return data;
                    try {
                        const parsed = JSON.parse(data);
                        // If it's a SuperJSON envelope (json/meta), parse it
                        if (parsed && typeof parsed === 'object' && parsed.json && parsed.meta) {
                            return superjson.deserialize(parsed);
                        }
                        // Fallback to standard parse
                        return parsed;
                    } catch {
                        return data;
                    }
                }
            ]
        });

        return response.data as T;
    }
}

let globalClient: ApiClient | null = null;

export function configureClient(baseUrl?: string, storage?: SecureStorage, options?: {
    onError?: (error: HttpError | Error, endpoint: string) => void;
}) {
    const finalBaseUrl = baseUrl || getInferredBaseUrl();
    globalClient = new ApiClient(finalBaseUrl, storage, options);
}

export async function apiClient<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    if (!globalClient) {
        throw new Error('ApiClient not configured. Call configureClient(...) before using endpoints.');
    }
    return globalClient.request<T>(endpoint, options);
}
