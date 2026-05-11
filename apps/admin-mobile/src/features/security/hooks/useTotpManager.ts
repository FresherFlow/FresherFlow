import { useReducer, useCallback } from 'react';
import { Alert } from 'react-native';
import { useAdminAuth as useAuth } from '@repo/frontend-core';
import { toast } from '../../../lib/toast';

export type TotpSetupStatus = 'idle' | 'loading' | 'qr' | 'verifying' | 'done';

export type TotpState = {
    status: TotpSetupStatus;
    secret: string;
    qrUrl: string;
    code: string;
    error: string;
    isEnabled: boolean;
    configuredAt: string | null;
};

type TotpAction =
    | { type: 'INIT'; payload: { isEnabled: boolean; configuredAt: string | null } }
    | { type: 'GENERATE_START' }
    | { type: 'GENERATE_SUCCESS'; payload: { secret: string; qrUrl: string } }
    | { type: 'GENERATE_FAIL'; payload: { error: string } }
    | { type: 'VERIFY_START'; payload: { code: string } }
    | { type: 'VERIFY_SUCCESS'; payload: { configuredAt: string } }
    | { type: 'VERIFY_FAIL'; payload: { error: string } }
    | { type: 'DISABLE_SUCCESS' }
    | { type: 'RESET' }
    | { type: 'SET_CODE'; payload: { code: string } };

const initialState: TotpState = {
    status: 'idle',
    secret: '',
    qrUrl: '',
    code: '',
    error: '',
    isEnabled: false,
    configuredAt: null,
};

const totpReducer = (state: TotpState, action: TotpAction): TotpState => {
    switch (action.type) {
        case 'INIT':
            return {
                ...state,
                isEnabled: action.payload.isEnabled,
                configuredAt: action.payload.configuredAt,
            };
        case 'GENERATE_START':
            return { ...state, status: 'loading', error: '' };
        case 'GENERATE_SUCCESS':
            return {
                ...state,
                status: 'qr',
                secret: action.payload.secret,
                qrUrl: action.payload.qrUrl,
            };
        case 'GENERATE_FAIL':
            return { ...state, status: 'idle', error: action.payload.error };
        case 'VERIFY_START':
            return { ...state, status: 'verifying', error: '', code: action.payload.code };
        case 'VERIFY_SUCCESS':
            return {
                ...state,
                status: 'done',
                isEnabled: true,
                configuredAt: action.payload.configuredAt,
                code: '',
            };
        case 'VERIFY_FAIL':
            return { ...state, status: 'qr', error: action.payload.error };
        case 'DISABLE_SUCCESS':
            return {
                ...state,
                status: 'idle',
                isEnabled: false,
                secret: '',
                qrUrl: '',
                code: '',
                error: '',
            };
        case 'SET_CODE':
            return { ...state, code: action.payload.code };
        case 'RESET':
            return { ...state, status: 'idle', secret: '', qrUrl: '', code: '', error: '' };
        default:
            return state;
    }
};

export const useTotpManager = () => {
    const { totpGenerate, totpVerifySetup, totpDisable, admin } = useAuth();
    const [state, dispatch] = useReducer(totpReducer, {
        ...initialState,
        isEnabled: Boolean(admin?.totpEnabled),
        configuredAt: admin?.totpEnabledAt ? new Date(admin.totpEnabledAt).toISOString() : null,
    });

    const init = useCallback((isEnabled: boolean, configuredAt: string | null) => {
        dispatch({ type: 'INIT', payload: { isEnabled, configuredAt } });
    }, []);

    const setup = useCallback(async () => {
        dispatch({ type: 'GENERATE_START' });
        try {
            const data = await totpGenerate();
            dispatch({
                type: 'GENERATE_SUCCESS',
                payload: { secret: data.secret, qrUrl: data.qrCode ?? (data as { otpauthUrl?: string }).otpauthUrl ?? '' }
            });
        } catch (e: unknown) {
            const errorMsg = e instanceof Error ? e.message : 'Failed to generate TOTP';
            toast.error('TOTP setup failed', errorMsg);
            dispatch({ type: 'GENERATE_FAIL', payload: { error: errorMsg } });
        }
    }, [totpGenerate]);

    const confirm = useCallback(async (code: string) => {
        if (!code.trim() || code.trim().length !== 6) {
            dispatch({ type: 'VERIFY_FAIL', payload: { error: 'Enter the 6-digit code from your Authenticator app.' } });
            return;
        }
        dispatch({ type: 'VERIFY_START', payload: { code: code.trim() } });
        try {
            await totpVerifySetup(code.trim());
            dispatch({ type: 'VERIFY_SUCCESS', payload: { configuredAt: new Date().toISOString() } });
        } catch (e: unknown) {
            dispatch({ type: 'VERIFY_FAIL', payload: { error: e instanceof Error ? e.message : 'Invalid code, try again.' } });
        }
    }, [totpVerifySetup]);

    const disable = useCallback(() => {
        Alert.alert('Disable TOTP?', 'This will remove two-factor authentication. Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Disable', style: 'destructive', onPress: async () => {
                    try {
                        await totpDisable();
                        dispatch({ type: 'DISABLE_SUCCESS' });
                        toast.success('TOTP disabled', 'Two-factor authentication removed.');
                    } catch (e: unknown) {
                        toast.error('Failed', e instanceof Error ? e.message : 'Failed');
                    }
                }
            }
        ]);
    }, [totpDisable]);

    const setCode = useCallback((code: string) => dispatch({ type: 'SET_CODE', payload: { code } }), []);
    const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

    return {
        state,
        init,
        setup,
        confirm,
        disable,
        reset,
        setCode,
    };
};
