import React, { useMemo, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Image } from 'expo-image';
import { AlertCircle, ArrowRight, ChevronLeft, KeyRound, Mail } from 'lucide-react-native';
import { useAdminAuth as useAuth } from '@repo/frontend-core';
import { alpha, theme } from '../../theme';
import { useTheme } from '../../theme/ThemeProvider';
import { AppButton, AppInput } from '@repo/ui';
import { SurfaceCard } from '../system/components/PremiumPrimitives';
import { Screen } from '../system/layout/Layout';
import { toast } from '../../lib/toast';
import { mScale, SPACING, RADIUS } from '../../theme/dimensions';

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
    const { currentTheme } = useTheme();
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
        if (!validateEmail()) return;

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
        if (!validateEmail()) return;

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
        <Screen safe>
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                style={styles.flex}
            >
                <View style={styles.container}>
                    <View style={styles.hero}>
                        <Image 
                            // eslint-disable-next-line @typescript-eslint/no-require-imports
                            source={require('../../../assets/logo-white.png')} 
                            style={styles.logo} 
                            contentFit="contain" 
                        />
                        <Text style={[styles.heroTitle, { color: currentTheme.colors.text }]}>
                            Admin Console
                        </Text>
                        <Text style={[styles.heroSubtitle, { color: currentTheme.colors.textMuted }]}>
                            {step === 'email'
                                ? 'Authenticate with passkey or TOTP'
                                : 'Enter your 6-digit authenticator code'}
                        </Text>
                    </View>

                    <SurfaceCard accent style={styles.loginCard}>
                        <View style={styles.field}>
                            <Text style={[styles.label, { color: currentTheme.colors.textMuted }]}>
                                ADMIN EMAIL
                            </Text>
                            <View style={styles.inputWrapper}>
                                <Mail size={18} color={currentTheme.colors.primary} style={styles.inputIcon} />
                                <AppInput
                                    style={styles.input}
                                    value={email}
                                    onChangeText={(value) => {
                                        setEmail(value);
                                        setError('');
                                    }}
                                    editable={step === 'email'}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    placeholder="admin@fresherflow.in"
                                    placeholderTextColor={alpha(currentTheme.colors.text, 0.3)}
                                />
                            </View>
                        </View>

                        {step === 'totp' && (
                            <View style={styles.field}>
                                <Text style={[styles.label, { color: currentTheme.colors.textMuted }]}>
                                    SECURITY CODE
                                </Text>
                                <View style={styles.inputWrapper}>
                                    <KeyRound size={18} color={currentTheme.colors.primary} style={styles.inputIcon} />
                                    <AppInput
                                        style={styles.input}
                                        value={otp}
                                        onChangeText={(value) => {
                                            setOtp(value);
                                            setError('');
                                        }}
                                        keyboardType="number-pad"
                                        maxLength={6}
                                        autoFocus
                                        placeholder="123456"
                                        placeholderTextColor={alpha(currentTheme.colors.text, 0.3)}
                                    />
                                </View>
                            </View>
                        )}

                        {error ? (
                            <View style={[styles.errorBox, { backgroundColor: alpha(currentTheme.colors.error, 0.1) }]}>
                                <AlertCircle size={16} color={currentTheme.colors.error} />
                                <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>{error}</Text>
                            </View>
                        ) : null}

                        <AppButton
                            label={step === 'email' ? 'Continue' : 'Sign In'}
                            onPress={step === 'email' ? handleContinue : handleVerifyOtp}
                            loading={loading}
                            icon={!loading ? <ArrowRight size={20} color={currentTheme.colors.background} /> : undefined}
                            style={styles.actionBtn}
                        />

                        {step === 'email' ? (
                            <TouchableOpacity 
                                onPress={() => void handlePasskeyLoginExplicit()}
                                disabled={loading}
                                style={styles.passkeyBtn}
                            >
                                <KeyRound size={16} color={currentTheme.colors.primary} />
                                <Text style={[styles.passkeyText, { color: currentTheme.colors.primary }]}>
                                    {passkeyLoading ? 'Authenticating...' : 'Sign in with Passkey'}
                                </Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity
                                style={styles.backLink}
                                onPress={() => {
                                    setStep('email');
                                    setOtp('');
                                    setError('');
                                }}
                            >
                                <ChevronLeft size={16} color={currentTheme.colors.textMuted} />
                                <Text style={[styles.backLinkText, { color: currentTheme.colors.textMuted }]}>
                                    Use a different email
                                </Text>
                            </TouchableOpacity>
                        )}
                    </SurfaceCard>

                    <View style={styles.footer}>
                        <Text style={[styles.footerText, { color: alpha(currentTheme.colors.text, 0.3) }]}>
                            SECURE ADMIN ACCESS ONLY
                        </Text>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Screen>
    );
};

const styles = StyleSheet.create({
    flex: {
        flex: 1,
    },
    container: {
        flex: 1,
        paddingHorizontal: SPACING.lg,
        justifyContent: 'center',
    },
    hero: {
        alignItems: 'center',
        marginBottom: SPACING.xl,
    },
    logo: {
        width: mScale(160),
        height: mScale(40),
        marginBottom: SPACING.lg,
        opacity: 0.9,
    },
    heroTitle: {
        fontSize: mScale(28),
        fontWeight: '900',
        letterSpacing: -1.2,
        marginBottom: 8,
    },
    heroSubtitle: {
        fontSize: mScale(15),
        textAlign: 'center',
        opacity: 0.8,
    },
    loginCard: {
        padding: SPACING.lg,
    },
    field: {
        marginBottom: SPACING.lg,
    },
    label: {
        fontSize: mScale(10),
        fontWeight: '900',
        letterSpacing: 1.5,
        marginBottom: SPACING.sm,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: alpha(theme.colors.text, 0.1),
        paddingVertical: 8,
    },
    inputIcon: {
        marginRight: SPACING.md,
        opacity: 0.7,
    },
    input: {
        flex: 1,
        fontSize: mScale(16),
        fontWeight: '700',
        padding: 0,
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: SPACING.md,
        borderRadius: 12,
        marginBottom: SPACING.lg,
        gap: SPACING.sm,
    },
    errorText: {
        fontSize: mScale(13),
        fontWeight: '600',
        flex: 1,
    },
    actionBtn: {
        height: mScale(52),
        borderRadius: RADIUS.lg,
    },
    passkeyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.lg,
        gap: 8,
    },
    passkeyText: {
        fontSize: mScale(14),
        fontWeight: '700',
    },
    backLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.lg,
        gap: 4,
    },
    backLinkText: {
        fontSize: mScale(14),
        fontWeight: '500',
    },
    footer: {
        marginTop: SPACING.xl,
        alignItems: 'center',
    },
    footerText: {
        fontSize: mScale(10),
        fontWeight: '900',
        letterSpacing: 2,
    },
});
