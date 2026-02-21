import { AuthResponse, Profile, Admin, ActionType } from '@fresherflow/types';
import type {
    PublicKeyCredentialCreationOptionsJSON,
    RegistrationResponseJSON,
    PublicKeyCredentialRequestOptionsJSON,
    AuthenticationResponseJSON
} from '@simplewebauthn/browser';
import { markDetailSyncedNow, markFeedSyncedNow } from '@/lib/offline/syncStatus';

// Thrown when a request is made with no network connectivity.
// Callers can check `err instanceof OfflineError` to skip toast notifications.
export class OfflineError extends Error {
    constructor() {
        super('You are offline. Please check your connection.');
        this.name = 'OfflineError';
    }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Singleton promise to handle concurrent refresh requests
let isRefreshing: Promise<void> | null = null;

// API Client with automatic cookie handling
export async function apiClient<T = unknown>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Requested-From': 'fresherflow-web', // Basic CSRF protection against cross-site forms
        'X-Request-Id': `web-${Math.random().toString(36).slice(2, 10)}`, // Tracing
        ...(options.headers as Record<string, string> || {}),
    };

    // Short-circuit immediately when offline — avoids misleading errors / toast spam
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new OfflineError();
    }

    // Defaults: credentials include for cookies
    const fetchOptions: RequestInit = {
        ...options,
        headers,
        credentials: 'include', // CRITICAL: This sends/receives cookies
        cache: 'no-store', // CRITICAL: Prevent caching of API responses
        next: { revalidate: 0 }
    };
    const requestUrl = `${API_URL}${endpoint}`;
    const method = (fetchOptions.method || 'GET').toUpperCase();
    const canRetry = method === 'GET';

    const fetchWithRetry = async () => {
        let lastError: unknown;
        const maxRetries = 3;
        const baseDelay = 300;
        const DEFAULT_TIMEOUT = 10000; // 10 seconds

        for (let i = 0; i < maxRetries; i++) {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

            try {
                const response = await fetch(requestUrl, {
                    ...fetchOptions,
                    signal: controller.signal
                });
                clearTimeout(id);

                if (response.ok || response.status < i * 100 || !canRetry) return response;

                // Only retry on potential transient errors (5xx or network failures)
                if (response.status < 500 && response.status !== 429) return response;

                lastError = new Error(`Request failed with status ${response.status}`);
            } catch (error: unknown) {
                clearTimeout(id);
                if (error instanceof Error && error.name === 'AbortError') {
                    lastError = new Error('Gateway Timeout: The server took too long to respond.');
                    (lastError as { code?: string }).code = 'TIMEOUT';
                } else {
                    lastError = error;
                }
                if (!canRetry) throw lastError;
            }

            // Exponential backoff: 300, 900, 2700ms
            const delay = baseDelay * Math.pow(3, i);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
        throw lastError;
    };

    try {
        let response = await fetchWithRetry();

        // If 401, handle token refresh with a singleton lock (mutex)
        const isLoggingOut = typeof window !== 'undefined' && (window as unknown as { __isLoggingOut?: boolean }).__isLoggingOut;

        if (response.status === 401 && !isLoggingOut &&
            !endpoint.includes('/auth/login') &&
            !endpoint.includes('/auth/register') &&
            !endpoint.includes('/auth/refresh')) {

            if (!isRefreshing) {
                isRefreshing = (async () => {
                    try {
                        const refreshResponse = await fetch(`${API_URL}/api/auth/refresh`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include'
                        });

                        if (!refreshResponse.ok) {
                            throw new Error('Refresh failed');
                        }
                        // Refresh successful
                    } catch (error) {
                        console.error('[Auth] Refresh failed:', error);
                        // Let the error propagate to the waiting requests so they can throw proper 401
                        throw error;
                    } finally {
                        isRefreshing = null; // Release lock
                    }
                })();
            } else {
                // Refresh in progress, waiting
            }

            // Wait for the single refresh to complete (success or fail)
            try {
                await isRefreshing;
                // Retry original request
                response = await fetchWithRetry();
            } catch {
                console.error('[Auth] Refresh failed, session expired.');
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('fresherflow-unauthorized'));
                }
                throw new Error('Session expired');
            }
        }

        if (!response.ok) {
            let errorMessage = 'Request failed';
            let errorData: { error?: { message?: string } | string; completionPercentage?: number; requiredCompletion?: number } = {};

            try {
                errorData = await response.json();
                const errorObj = errorData.error;
                errorMessage = typeof errorObj === 'object' && errorObj !== null ? errorObj.message || errorMessage : (typeof errorObj === 'string' ? errorObj : errorMessage);
            } catch {
                // Fallback if response is not JSON
                if (response.status === 429) {
                    errorMessage = 'Too many requests. Please wait a moment and try again.';
                } else if (response.status >= 500) {
                    errorMessage = 'Server is temporarily unavailable. Please try again.';
                } else {
                    errorMessage = `Request failed (${response.status})`;
                }
            }

            // Special handling for 403 profile incomplete errors
            if (response.status === 403 && errorData.completionPercentage !== undefined) {
                const error = new Error(errorMessage) as Error & { code: string; completionPercentage: number; requiredCompletion: number };
                error.code = 'PROFILE_INCOMPLETE';
                error.completionPercentage = errorData.completionPercentage;
                error.requiredCompletion = errorData.requiredCompletion || 100;
                throw error;
            }

            throw new Error(errorMessage);
        }

        if (method === 'GET') {
            if (endpoint.startsWith('/api/opportunities') || endpoint.startsWith('/api/dashboard')) {
                markFeedSyncedNow();
            }
            if (/^\/api\/opportunities\/[^/?]+/.test(endpoint)) {
                markDetailSyncedNow();
            }
        }

        return await response.json();
    } catch (error: unknown) {
        console.error('API Error:', error);
        // Only report to Sentry if it's a server error or a critical unexpected error
        const err = error as { statusCode?: number; code?: string };
        if (err.statusCode && err.statusCode >= 500 || err.code === 'TIMEOUT' || !err.statusCode) {
            import('@sentry/nextjs').then(Sentry => {
                Sentry.captureException(error, {
                    extra: { endpoint, method }
                });
            });
        }
        throw error;
    }
}

// Auth API calls
export const authApi = {
    login: (email: string, password: string) =>
        apiClient<AuthResponse>('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        }),



    sendOtp: (email: string) =>
        apiClient('/api/auth/otp/send', {
            method: 'POST',
            body: JSON.stringify({ email })
        }),

    verifyOtp: (email: string, code: string, source?: string) =>
        apiClient<AuthResponse>('/api/auth/otp/verify', {
            method: 'POST',
            body: JSON.stringify({ email, code, source })
        }),

    googleLogin: (token: string, source?: string) =>
        apiClient<AuthResponse>('/api/auth/google', {
            method: 'POST',
            body: JSON.stringify({ token, source })
        }),

    logout: async () => {
        await apiClient('/api/auth/logout', {
            method: 'POST'
        });
    },

    me: () => apiClient('/api/auth/me')
};

// Admin Auth API calls
export const adminAuthApi = {
    getRegistrationOptions: (email: string) =>
        apiClient<PublicKeyCredentialCreationOptionsJSON>('/api/admin/auth/register/options', {
            method: 'POST',
            body: JSON.stringify({ email })
        }),

    verifyRegistration: (email: string, body: RegistrationResponseJSON) =>
        apiClient<{ verified: boolean }>('/api/admin/auth/register/verify', {
            method: 'POST',
            body: JSON.stringify({ email, body })
        }),

    getLoginOptions: (email: string) =>
        apiClient<PublicKeyCredentialRequestOptionsJSON | { registrationRequired: boolean }>('/api/admin/auth/login/options', {
            method: 'POST',
            body: JSON.stringify({ email })
        }),

    verifyLogin: (email: string, body: AuthenticationResponseJSON) =>
        apiClient<{ verified: boolean }>('/api/admin/auth/login/verify', {
            method: 'POST',
            body: JSON.stringify({ email, body })
        }),

    verifyLoginTotp: (email: string, code: string) =>
        apiClient<{ verified: boolean }>('/api/admin/auth/login/totp', {
            method: 'POST',
            body: JSON.stringify({ email, code })
        }),

    getPasskeys: () =>
        apiClient<{ keys: Array<{ id: string, name: string }> }>('/api/admin/auth/passkeys'),

    deletePasskey: (id: string) =>
        apiClient(`/api/admin/auth/passkeys/${id}`, {
            method: 'DELETE'
        }),

    logout: async () => {
        await apiClient('/api/admin/auth/logout', {
            method: 'POST'
        });
    },

    me: () => apiClient<{ admin: Admin }>('/api/admin/auth/me'),

    generateTotp: () =>
        apiClient<{ secret: string; qrCode: string }>('/api/admin/auth/totp/generate', {
            method: 'POST'
        }),

    verifyTotp: (code: string) =>
        apiClient<{ success: boolean }>('/api/admin/auth/totp/verify', {
            method: 'POST',
            body: JSON.stringify({ code })
        }),

    disableTotp: () =>
        apiClient<{ success: boolean }>('/api/admin/auth/totp/disable', {
            method: 'POST'
        })
};

// Profile API calls
export const profileApi = {
    get: () => apiClient('/api/profile'),

    updateProfile: (data: Partial<Profile> & { fullName?: string }) =>
        apiClient('/api/profile', {
            method: 'PUT',
            body: JSON.stringify(data)
        }),

    updateEducation: (data: {
        fullName?: string;
        educationLevel: string;
        tenthYear: number;
        twelfthYear: number;
        gradCourse: string;
        gradSpecialization: string;
        gradYear: number;
        // Optional PG fields
        pgCourse?: string;
        pgSpecialization?: string;
        pgYear?: number;
    }) =>
        apiClient('/api/profile/education', {
            method: 'PUT',
            body: JSON.stringify(data)
        }),

    updatePreferences: (data: {
        interestedIn: string[];
        preferredCities: string[];
        workModes: string[];
    }) =>
        apiClient('/api/profile/preferences', {
            method: 'PUT',
            body: JSON.stringify(data)
        }),

    updateReadiness: (data: { availability: string; skills: string[] }) =>
        apiClient('/api/profile/readiness', {
            method: 'PUT',
            body: JSON.stringify(data)
        }),

    getCompletion: () => apiClient('/api/profile/completion')
};

export const growthApi = {
    trackEvent: (event: 'DETAIL_VIEW' | 'LOGIN_VIEW' | 'SAVE_JOB' | 'APPLY_CLICK' | 'SHARE_JOB' | 'SIGNUP_VIEW', source = 'unknown') =>
        apiClient('/api/public/growth/event', {
            method: 'POST',
            body: JSON.stringify({ event, source })
        })
};

const OPPORTUNITY_CLICK_SESSION_KEY = 'ff_click_session_id';

function getOpportunityClickSessionId(): string {
    if (typeof window === 'undefined') return 'server';
    try {
        const existing = window.localStorage.getItem(OPPORTUNITY_CLICK_SESSION_KEY);
        if (existing && existing.length > 0) return existing;
        const next = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        window.localStorage.setItem(OPPORTUNITY_CLICK_SESSION_KEY, next);
        return next;
    } catch {
        return 'browser-session-unavailable';
    }
}

export const opportunityClicksApi = {
    trackApplyClick: (opportunityId: string, source = 'opportunity_detail', targetUrl?: string | null) =>
        apiClient(`/api/public/opportunities/${opportunityId}/click`, {
            method: 'POST',
            body: JSON.stringify({
                source,
                sessionId: getOpportunityClickSessionId(),
                targetUrl: targetUrl || null,
            })
        }),
};

// Opportunities API calls
export const opportunitiesApi = {
    list: (params?: { type?: string; city?: string; company?: string; closingSoon?: boolean; minSalary?: number; maxSalary?: number; page?: number; sort?: string }) => {
        const query = new URLSearchParams();
        if (params?.type) query.append('type', params.type);
        if (params?.city) query.append('city', params.city);
        if (params?.company) query.append('company', params.company);
        if (params?.closingSoon) query.append('closingSoon', 'true');
        if (params?.minSalary) query.append('minSalary', String(params.minSalary));
        if (params?.maxSalary) query.append('maxSalary', String(params.maxSalary));
        if (params?.page) query.append('page', String(params.page));
        if (params?.sort) query.append('sort', params.sort);

        const queryString = query.toString();
        return apiClient(`/api/opportunities${queryString ? `?${queryString}` : ''}`);
    },

    getById: (id: string) => apiClient(`/api/opportunities/${id}`)
};

// Companies API calls
export const companiesApi = {
    search: (query: string) => apiClient(`/api/public/companies/search?q=${encodeURIComponent(query)}`),
    getByName: (name: string) => apiClient(`/api/public/companies/${encodeURIComponent(name)}`)
};

// Actions API calls
export const actionsApi = {
    list: () => apiClient('/api/actions'),
    summary: () => apiClient('/api/actions/summary'),

    track: (opportunityId: string, actionType: ActionType) =>
        apiClient(`/api/actions/${opportunityId}/action`, {
            method: 'POST',
            body: JSON.stringify({ actionType })
        }),

    remove: (opportunityId: string) =>
        apiClient(`/api/actions/${opportunityId}`, {
            method: 'DELETE'
        })
};

// Feedback API calls
export const feedbackApi = {
    submit: (opportunityId: string, reason: string) =>
        apiClient(`/api/opportunities/${opportunityId}/feedback`, {
            method: 'POST',
            body: JSON.stringify({ reason })
        })
};

export const appFeedbackApi = {
    submit: (data: { type: string; rating?: number; message: string; pageUrl?: string }) =>
        apiClient('/api/feedback', {
            method: 'POST',
            body: JSON.stringify(data)
        })
};

// Saved API calls
export const savedApi = {
    list: () => apiClient('/api/saved'),
    toggle: (opportunityId: string) =>
        apiClient(`/api/saved/${opportunityId}`, {
            method: 'POST'
        })
};

// Dashboard API calls
export const dashboardApi = {
    getHighlights: () => apiClient('/api/dashboard/highlights')
};

// Alerts API calls
export const alertsApi = {
    getPreferences: () => apiClient('/api/alerts/preferences'),
    getFeed: (kind: 'all' | 'DAILY_DIGEST' | 'CLOSING_SOON' | 'HIGHLIGHT' | 'APP_UPDATE' | 'NEW_JOB' | 'EVENT_REMINDER' = 'all', limit = 50) => {
        const query = new URLSearchParams();
        query.set('kind', kind);
        query.set('limit', String(limit));
        return apiClient(`/api/alerts/feed?${query.toString()}`);
    },
    updatePreferences: (data: {
        enabled?: boolean;
        emailEnabled?: boolean;
        dailyDigest?: boolean;
        closingSoon?: boolean;
        minRelevanceScore?: number;
        preferredHour?: number;
        timezone?: string;
    }) =>
        apiClient('/api/alerts/preferences', {
            method: 'PUT',
            body: JSON.stringify(data)
        }),
    getUnreadCount: () => apiClient<{ count: number }>('/api/alerts/unread-count'),
    markAllRead: () => apiClient('/api/alerts/mark-all-read', { method: 'POST' }),
    markRead: (id: string) => apiClient(`/api/alerts/${id}/read`, { method: 'POST' }),
    seedTest: () => apiClient('/api/alerts/seed-test', { method: 'POST' }),
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const setTokens = (_a: string, _b: string) => { }; // Deprecated: No-op
export const getTokens = () => ({ accessToken: null, refreshToken: null }); // Deprecated: No-op
export const clearTokens = () => { }; // Deprecated: No-op
