import { AuthResponse } from '@fresherflow/types';
import { apiClient } from './apiClient';
// Optional types fallback placeholder
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

    verifyOtp: (email: string, code: string, source?: string, ref?: string) =>
        apiClient<AuthResponse>('/api/auth/otp/verify', {
            method: 'POST',
            body: JSON.stringify({ email, code, source, ref })
        }),

    googleLogin: (token: string, source?: string, ref?: string) =>
        apiClient<AuthResponse>('/api/auth/google', {
            method: 'POST',
            body: JSON.stringify({ token, source, ref })
        }),

    logout: async () => {
        await apiClient('/api/auth/logout', { method: 'POST' });
    },

    me: () => apiClient('/api/auth/me'),
    
    handshake: (firebaseToken: string, anonSessionId?: string | null) =>
        apiClient<AuthResponse>('/api/auth/handshake', {
            method: 'POST',
            body: JSON.stringify({ token: firebaseToken, anon_session_id: anonSessionId })
        }),
};


