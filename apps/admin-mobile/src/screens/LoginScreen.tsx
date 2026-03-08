import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, KeyRound, ArrowRight, AlertCircle, ChevronLeft } from 'lucide-react-native';
import { Passkey } from 'react-native-passkey';
import { theme } from '../theme';
import { useAuth } from '../context/AuthContext';
import { toast } from '../lib/toast';

type Step = 'email' | 'totp';

export const LoginScreen = () => {
    const { verifyTotp, getPasskeyOptions, verifyPasskey } = useAuth();
    const [step, setStep] = useState<Step>('email');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [_, setPasskeyLoading] = useState(false);
    const [error, setError] = useState('');

    const passkeySupported = Passkey.isSupported();

    // ── Step 1: email → try passkey, fallback to TOTP ──────────────────────
    const handleContinue = async () => {
        setError('');
        if (!email.trim() || !email.includes('@')) {
            setError('Enter a valid admin email.');
            return;
        }
        setLoading(true);
        try {
            if (passkeySupported) {
                // Quick check first — if no passkey registered, go to TOTP immediately
                let options: any;
                try {
                    options = await getPasskeyOptions(email.trim());
                } catch {
                    // API error or no passkey — skip straight to TOTP
                    setStep('totp');
                    return;
                }
                if (!options?.challenge) {
                    setStep('totp');
                    return;
                }
                await handlePasskeyLogin(options);
            } else {
                setStep('totp');
            }
        } finally {
            setLoading(false);
        }
    };

    // ── Passkey auth ────────────────────────────────────────────────────────
    const handlePasskeyLogin = async (options: any) => {
        setPasskeyLoading(true);
        try {
            const assertion = await Passkey.get(options);
            await verifyPasskey(email.trim(), assertion);
        } catch (e: any) {
            const msg: string = e?.message ?? '';
            if (
                msg === 'no_passkey' ||
                msg.includes('not found') ||
                msg.includes('cancel') ||
                msg.includes('USER_CANCELED') ||
                msg.includes('No credentials')
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

    // ── Step 2: TOTP code submission ────────────────────────────────────────
    const handleVerifyOtp = async () => {
        setError('');
        if (!otp.trim() || otp.trim().length !== 6) {
            setError('Enter your 6-digit code from the Authenticator app.');
            return;
        }
        setLoading(true);
        try {
            await verifyTotp(email.trim(), otp.trim());
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Login failed. Check your code and try again.');
        } finally {
            setLoading(false);
        }
    };


    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.content}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Image
                            source={require('../../assets/logo.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={styles.title}>Admin Portal</Text>
                        <Text style={styles.subtitle}>
                            {step === 'email'
                                ? 'Enter your admin email to continue'
                                : 'Enter the 6-digit code from your Authenticator'}
                        </Text>
                    </View>

                    <View style={styles.form}>
                        {/* Email field — always shown */}
                        <View style={styles.inputGroup}>
                            <Mail size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
                            <TextInput
                                style={[styles.input, step === 'totp' && styles.inputLocked]}
                                placeholder="Admin Email"
                                placeholderTextColor={theme.colors.textMuted}
                                value={email}
                                onChangeText={t => { setEmail(t); setError(''); }}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={step === 'email'}
                            />
                        </View>

                        {/* TOTP field — only on step 2 */}
                        {step === 'totp' && (
                            <View style={styles.inputGroup}>
                                <KeyRound size={20} color={theme.colors.textMuted} style={styles.inputIcon} />
                                <TextInput
                                    style={styles.input}
                                    placeholder="6-digit TOTP Code"
                                    placeholderTextColor={theme.colors.textMuted}
                                    value={otp}
                                    onChangeText={t => { setOtp(t); setError(''); }}
                                    keyboardType="number-pad"
                                    maxLength={6}
                                    autoFocus
                                />
                            </View>
                        )}

                        {/* Error banner */}
                        {error ? (
                            <View style={styles.errorBanner}>
                                <AlertCircle size={15} color={theme.colors.error} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        ) : null}

                        {/* Primary action */}
                        <TouchableOpacity
                            style={[styles.primaryBtn, loading && styles.buttonDisabled]}
                            onPress={step === 'email' ? handleContinue : handleVerifyOtp}
                            disabled={loading}
                        >
                            {loading
                                ? <ActivityIndicator color="white" />
                                : <>
                                    <Text style={styles.primaryBtnText}>
                                        {step === 'email' ? 'Continue' : 'Sign In'}
                                    </Text>
                                    <ArrowRight size={20} color="white" />
                                </>
                            }
                        </TouchableOpacity>

                        {/* Back to email step */}
                        {step === 'totp' && (
                            <TouchableOpacity
                                style={styles.backBtn}
                                onPress={() => { setStep('email'); setOtp(''); setError(''); }}
                            >
                                <ChevronLeft size={16} color={theme.colors.textMuted} />
                                <Text style={styles.backBtnText}>Use a different email</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    keyboardView: {
        flex: 1,
    },
    content: {
        flex: 1,
        padding: theme.spacing.xl,
        justifyContent: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl * 2,
        marginTop: -40,
    },
    logo: {
        width: 160,
        height: 36,
        marginBottom: theme.spacing.xl,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: theme.spacing.sm,
    },
    subtitle: {
        fontSize: 15,
        color: theme.colors.textMuted,
        textAlign: 'center',
        lineHeight: 22,
    },
    form: {
        gap: theme.spacing.lg,
    },
    inputGroup: {
        position: 'relative',
        justifyContent: 'center',
    },
    inputIcon: {
        position: 'absolute',
        left: 16,
        zIndex: 1,
    },
    input: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.roundness.lg,
        padding: theme.spacing.lg,
        paddingLeft: 48,
        fontSize: 16,
        color: theme.colors.text,
    },
    inputLocked: {
        opacity: 0.6,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: theme.colors.error + '15',
        borderWidth: 1,
        borderColor: theme.colors.error + '40',
        borderRadius: theme.roundness.md,
        padding: 12,
    },
    errorText: {
        color: theme.colors.error,
        fontSize: 13,
        fontWeight: '600',
        flex: 1,
    },
    primaryBtn: {
        backgroundColor: theme.colors.primary,
        paddingVertical: 16,
        paddingHorizontal: theme.spacing.lg,
        borderRadius: theme.roundness.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: theme.spacing.sm,
        marginTop: theme.spacing.md,
        minHeight: 52,
    },
    primaryBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 8,
    },
    backBtnText: {
        color: theme.colors.textMuted,
        fontSize: 14,
    },
});
