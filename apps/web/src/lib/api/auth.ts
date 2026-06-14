import { AuthResponse, Admin } from '@fresherflow/types';
import type {
    PublicKeyCredentialCreationOptionsJSON,
    RegistrationResponseJSON,
    PublicKeyCredentialRequestOptionsJSON,
    AuthenticationResponseJSON
} from '@simplewebauthn/browser';
import { apiClient } from './_core';

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

    handshake: (idToken: string, ref?: string) =>
        apiClient<AuthResponse>('/api/auth/handshake', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${idToken}`
            },
            body: JSON.stringify({ ref })
        })
};

// Admin Auth API calls
export const adminAuthApi = {
    getRegistrationOptions: (email: string, bootstrapSecret?: string) =>
        apiClient<PublicKeyCredentialCreationOptionsJSON>('/api/admin/auth/register/options', {
            method: 'POST',
            body: JSON.stringify({ email, bootstrapSecret })
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
        apiClient<{ verified: boolean; accessToken?: string }>('/api/admin/auth/login/verify', {
            method: 'POST',
            body: JSON.stringify({ email, body })
        }),

    verifyLoginTotp: (email: string, code: string) =>
        apiClient<{ verified: boolean; accessToken?: string }>('/api/admin/auth/login/totp', {
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
