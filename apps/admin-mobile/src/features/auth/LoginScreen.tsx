import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertCircle, ArrowRight, ChevronLeft, KeyRound, Mail } from 'lucide-react-native';
import { useAdminAuth as useAuth } from '@repo/frontend-core';
import { alpha } from '../../theme';
import { useTheme } from '../../theme/ThemeProvider';
import { AppButton, AppInput } from '@repo/ui';
import { SurfaceCard } from '../system/components/SpecializedCards';
import { FieldLabel } from '../system/components/Controls';
import { toast } from '../../lib/toast';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Passkey = Platform.OS !== 'web' ? require('react-native-passkey').Passkey : {
    isSupported: () => false,
    get: async () => {
        throw new Error('Not supported on web');
    },
};

type Step = 'email' | 'totp';

export const LoginScreen = () => {
    const { verifyTotp, getPasskeyOptions, verifyPasskey } = useAuth();
    const { colors, spacing, sizes, typography } = useTheme();
    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [passkeyLoading, setPasskeyLoading] = useState(false);
    const [error, setError] = useState('');

    const passkeySupported = useMemo(() => Passkey.isSupported(), []);

    const validateEmail = () => {
        if (!email.trim() || !email.includes('@')) {
            setError('Enter a valid admin email.');
            return false;
        }

        return true;
    };

    const handlePasskeyLogin = async (options: unknown) => {
        setPasskeyLoading(true);

        try {
            const assertion = await Passkey.get(options);
            await verifyPasskey(email.trim(), assertion);
        } catch (errorValue) {
            const message = errorValue instanceof Error ? errorValue.message : String(errorValue);
            if (
                message === 'no_passkey' ||
                message.includes('not found') ||
                message.includes('cancel') ||
                message.includes('USER_CANCELED') ||
                message.includes('No credentials')
            ) {
                setStep('totp');
            } else {
                toast.error('Passkey failed', 'Use TOTP to sign in.');
                setStep('totp');
            }
        } finally {
            setPasskeyLoading(false);
        }
    };

    const handleContinue = async () => {
        setError('');
        if (!validateEmail()) {
            return;
        }

        setLoading(true);
        try {
            if (!passkeySupported) {
                setStep('totp');
                return;
            }

            let options: { challenge?: string } | null = null;
            try {
                options = await getPasskeyOptions(email.trim()) as { challenge?: string };
            } catch {
                setStep('totp');
                return;
            }

            if (!options?.challenge) {
                setStep('totp');
                return;
            }

            await handlePasskeyLogin(options);
        } finally {
            setLoading(false);
        }
    };

    const handlePasskeyLoginExplicit = async () => {
        setError('');
        if (!validateEmail()) {
            return;
        }

        setLoading(true);
        try {
            const options = await getPasskeyOptions(email.trim()) as { challenge?: string };
            if (!options?.challenge) {
                setError('No passkey is registered for this email.');
                return;
            }

            await handlePasskeyLogin(options);
        } catch (errorValue) {
            console.error('[LoginScreen] Failed to fetch passkey options', errorValue);
            setError('Failed to fetch passkey options.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async () => {
        setError('');
        if (!otp.trim() || otp.trim().length !== 6) {
            setError('Enter the 6-digit code from your authenticator app.');
            return;
        }

        setLoading(true);
        try {
            await verifyTotp(email.trim(), otp.trim());
        } catch (errorValue) {
            setError(errorValue instanceof Error ? errorValue.message : 'Login failed. Check your code and try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
                <View style={[styles.content, { padding: spacing.xl }]}>
                    <View style={[styles.hero, { marginBottom: sizes.card.xl.padding, gap: sizes.card.sm.gap }]}>
                        {/* eslint-disable-next-line @typescript-eslint/no-require-imports */}
                        <Image source={require('../../../assets/logo-white.png')} style={styles.logo} resizeMode="contain" />
                        <Text style={[typography.title1, { color: colors.text }]}>Admin mobile</Text>
                        <Text style={[typography.body, { color: colors.textMuted, textAlign: 'center' }]}>
                            {step === 'email'
                                ? 'Use your admin email to continue with passkey or TOTP.'
                                : 'Enter the current 6-digit TOTP code from your authenticator app.'}
                        </Text>
                    </View>

                    <SurfaceCard style={{ padding: spacing.lg }}>
                        <FieldLabel>Email</FieldLabel>
                        <View style={[styles.inputRow, { gap: sizes.card.md.gap, marginBottom: sizes.card.md.padding }]}>
                            <Mail size={sizes.icon.md} color={colors.textMuted} />
                            <AppInput
                                style={styles.flexInput}
                                value={email}
                                onChangeText={(value) => {
                                    setEmail(value);
                                    setError('');
                                }}
                                editable={step === 'email'}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                placeholder="admin@fresherflow.in"
                            />
                        </View>

                        {step === 'totp' ? (
                            <>
                                <FieldLabel>Authenticator code</FieldLabel>
                                <View style={[styles.inputRow, { gap: sizes.card.md.gap, marginBottom: sizes.card.md.padding }]}>
                                    <KeyRound size={sizes.icon.md} color={colors.textMuted} />
                                    <AppInput
                                        style={styles.flexInput}
                                        value={otp}
                                        onChangeText={(value) => {
                                            setOtp(value);
                                            setError('');
                                        }}
                                        keyboardType="number-pad"
                                        maxLength={6}
                                        autoFocus
                                        placeholder="123456"
                                    />
                                </View>
                            </>
                        ) : null}

                        {error ? (
                            <View
                                style={[
                                    styles.errorBanner,
                                    {
                                        backgroundColor: alpha(colors.error, 0.12),
                                        borderColor: alpha(colors.error, 0.25),
                                        borderRadius: sizes.card.sm.borderRadius,
                                        padding: sizes.card.sm.padding,
                                        gap: sizes.card.sm.gap,
                                        marginTop: sizes.card.sm.gap,
                                        marginBottom: sizes.card.md.gap,
                                    },
                                ]}
                            >
                                <AlertCircle size={sizes.icon.sm} color={colors.error} />
                                <Text style={[typography.footnoteStrong, { color: colors.error, flex: 1 }]}>{error}</Text>
                            </View>
                        ) : null}

                        <AppButton
                            label={step === 'email' ? 'Continue' : 'Sign In'}
                            onPress={step === 'email' ? handleContinue : handleVerifyOtp}
                            loading={loading}
                            icon={!loading ? <ArrowRight size={sizes.icon.md} color={colors.background} /> : undefined}
                            style={{ marginTop: sizes.card.sm.gap }}
                        />

                        {step === 'email' ? (
                            <AppButton
                                label={passkeyLoading ? 'Opening passkey...' : 'Use passkey now'}
                                onPress={() => void handlePasskeyLoginExplicit()}
                                variant="ghost"
                                disabled={loading}
                                icon={!passkeyLoading ? <KeyRound size={sizes.icon.md} color={colors.primary} /> : undefined}
                                style={{ marginTop: sizes.card.sm.gap }}
                            />
                        ) : (
                            <TouchableOpacity
                                style={[styles.backButton, { marginTop: sizes.card.md.padding, gap: sizes.card.sm.gap }]}
                                onPress={() => {
                                    setStep('email');
                                    setOtp('');
                                    setError('');
                                }}
                            >
                                <ChevronLeft size={sizes.icon.sm} color={colors.textMuted} />
                                <Text style={[typography.subheadline, { color: colors.textMuted }]}>Use a different email</Text>
                            </TouchableOpacity>
                        )}
                    </SurfaceCard>

                    {(loading || passkeyLoading) && !error ? (
                        <View style={styles.loadingRow}>
                            <ActivityIndicator size="small" color={colors.primary} />
                        </View>
                    ) : null}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    hero: {
        alignItems: 'center',
    },
    logo: {
        width: 168,
        height: 42,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    flexInput: {
        flex: 1,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingRow: {
        alignItems: 'center',
        marginTop: 16,
    },
});


