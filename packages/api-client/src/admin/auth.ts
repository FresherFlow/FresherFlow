import type {
    AuthenticationResponseJSON,
    PublicKeyCredentialCreationOptionsJSON,
    PublicKeyCredentialRequestOptionsJSON,
    RegistrationResponseJSON,
} from '@simplewebauthn/browser';

export type {
    AuthenticationResponseJSON,
    PublicKeyCredentialCreationOptionsJSON,
    PublicKeyCredentialRequestOptionsJSON,
    RegistrationResponseJSON,
};
import type { Admin } from '@fresherflow/types';
import { apiClient } from './apiClient';

export const adminAuthApi = {
    getRegistrationOptions: (email: string) =>
        apiClient<PublicKeyCredentialCreationOptionsJSON>('/api/admin/auth/register/options', {
            method: 'POST',
            body: JSON.stringify({ email }),
        }),

    verifyRegistration: (email: string, body: RegistrationResponseJSON) =>
        apiClient<{ verified: boolean }>('/api/admin/auth/register/verify', {
            method: 'POST',
            body: JSON.stringify({ email, body }),
        }),

    getLoginOptions: (email: string) =>
        apiClient<PublicKeyCredentialRequestOptionsJSON | { registrationRequired: boolean }>('/api/admin/auth/login/options', {
            method: 'POST',
            body: JSON.stringify({ email }),
        }),

    verifyLogin: (email: string, body: AuthenticationResponseJSON) =>
        apiClient<{ verified: boolean; accessToken?: string }>('/api/admin/auth/login/verify', {
            method: 'POST',
            body: JSON.stringify({ email, body }),
        }),

    verifyLoginTotp: (email: string, code: string) =>
        apiClient<{ verified: boolean; accessToken?: string }>('/api/admin/auth/login/totp', {
            method: 'POST',
            body: JSON.stringify({ email, code }),
        }),

    getPasskeys: () =>
        apiClient<{ keys: Array<{ id: string; name: string }> }>('/api/admin/auth/passkeys'),

    deletePasskey: (id: string) =>
        apiClient(`/api/admin/auth/passkeys/${id}`, {
            method: 'DELETE',
        }),

    logout: async () => {
        await apiClient('/api/admin/auth/logout', {
            method: 'POST',
        });
    },

    me: () => apiClient<{ admin: Admin }>('/api/admin/auth/me'),

    getFirebaseToken: () => apiClient<{ firebaseToken: string }>('/api/admin/auth/firebase-token'),

    generateTotp: () =>
        apiClient<{ secret: string; qrCode: string }>('/api/admin/auth/totp/generate', {
            method: 'POST',
        }),

    verifyTotp: (code: string) =>
        apiClient<{ success: boolean }>('/api/admin/auth/totp/verify', {
            method: 'POST',
            body: JSON.stringify({ code }),
        }),

    disableTotp: () =>
        apiClient<{ success: boolean }>('/api/admin/auth/totp/disable', {
            method: 'POST',
        }),
};
