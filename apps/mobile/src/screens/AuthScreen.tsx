import React, { memo, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    ScrollView,
    Alert,
} from 'react-native';
import { Chrome, Mail, ArrowRight, ShieldCheck, ChevronLeft } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLogin } from '@/hooks/useLogin';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import * as Haptics from 'expo-haptics';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { PremiumHeader } from '@/system/components/PremiumPrimitives';
import { PremiumOtpInput } from '@/system/components/PremiumOtpInput';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const AuthScreen: React.FC<Props> = memo(({ navigation, route }: Props) => {
    const { currentTheme } = useTheme();
    const {
        email, setEmail,
        otp, setOtp,
        otpSent, setOtpSent,
        loading,
        handleSendOtp,
        handleVerifyOtp,
        handleResend,
        resendTimer,
    } = useLogin(route);

    // Auto-verify when OTP is 6 digits
    useEffect(() => {
        if (otp.length === 6 && !loading) {
            void handleVerifyOtp();
        }
    }, [handleVerifyOtp, loading, otp]);

    const onGuestContinue = () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        navigation.navigate('Main');
    };

    return (
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={[styles.stickyHeader, { paddingTop: Platform.OS === 'ios' ? 50 : 20 }]}>
                    <PremiumHeader
                        title={otpSent ? "Verify" : "Join"}
                        subtitle={otpSent ? "Authentication" : "Discovery-first platform"}
                        leftSlot={otpSent ? (
                            <TouchableOpacity
                                onPress={() => {
                                    setOtpSent(false);
                                    setOtp('');
                                }}
                                style={styles.backBtn}
                            >
                                <ChevronLeft size={24} color={currentTheme.colors.text} />
                            </TouchableOpacity>
                        ) : undefined}
                    />
                </View>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="always"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.content}>
                        <View style={styles.headerSection}>
                            <Text style={[styles.title, { color: currentTheme.colors.text }]}>
                                {otpSent ? "Check your email" : "Continue to FresherFlow"}
                            </Text>
                            <Text style={[styles.subtitle, { color: currentTheme.colors.textMuted }]}>
                                {otpSent
                                    ? `Enter the 6-digit code we sent to ${email}`
                                    : "Join the community to save opportunities and get personalized alerts."}
                            </Text>
                        </View>

                        <View style={styles.form}>
                            {!otpSent ? (
                                <>
                                    <View style={[styles.inputGroup, { borderBottomColor: alpha(currentTheme.colors.text, 0.1) }]}>
                                        <Mail size={18} color={alpha(currentTheme.colors.text, 0.4)} />
                                        <TextInput
                                            style={[styles.cleanInput, { color: currentTheme.colors.text }]}
                                            placeholder="Enter your email"
                                            placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.5)}
                                            value={email}
                                            onChangeText={setEmail}
                                            autoCapitalize="none"
                                            keyboardType="email-address"
                                            autoComplete="email"
                                        />
                                    </View>

                                     <TouchableOpacity
                                        style={[
                                            styles.actionBtn,
                                            {
                                                backgroundColor: email ? currentTheme.colors.text : alpha(currentTheme.colors.text, 0.4),
                                                opacity: loading ? 0.7 : 1
                                            }
                                        ]}
                                        onPress={() => {
                                            try {
                                                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                            } catch (e) {
                                                console.warn('[Auth] Haptics failed:', e);
                                            }
                                            void handleSendOtp();
                                        }}
                                        disabled={loading || !email}
                                        activeOpacity={0.8}
                                    >
                                        {loading ? (
                                            <View style={styles.btnInner}>
                                                <ActivityIndicator color={currentTheme.colors.background} />
                                                <Text style={[styles.actionText, { color: currentTheme.colors.background, marginLeft: 8 }]}>SENDING...</Text>
                                            </View>
                                        ) : (
                                            <View style={styles.btnInner}>
                                                <Text style={[styles.actionText, { color: currentTheme.colors.background }]}>CONTINUE</Text>
                                                <ArrowRight size={16} color={currentTheme.colors.background} />
                                            </View>
                                        )}
                                    </TouchableOpacity>

                                    <View style={styles.dividerContainer}>
                                        <View style={[styles.divider, { backgroundColor: alpha(currentTheme.colors.text, 0.1) }]} />
                                        <Text style={[styles.dividerText, { color: currentTheme.colors.textMuted }]}>OR CONTINUE WITH</Text>
                                        <View style={[styles.divider, { backgroundColor: alpha(currentTheme.colors.text, 0.1) }]} />
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.socialBtn, { borderColor: alpha(currentTheme.colors.text, 0.1) }]}
                                        onPress={() => Alert.alert("Coming Soon", "Native Google Sign-In is being optimized.")}
                                        activeOpacity={0.8}
                                    >
                                        <Chrome size={20} color={currentTheme.colors.text} />
                                        <Text style={[styles.socialText, { color: currentTheme.colors.text }]}>
                                            Continue with Google
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.guestBtn}
                                        onPress={onGuestContinue}
                                    >
                                        <Text style={[styles.guestText, { color: currentTheme.colors.textMuted }]}>Continue as Guest</Text>
                                    </TouchableOpacity>
                                </>
                            ) : (
                                 <>
                                    <View style={styles.otpWrapper}>
                                        <PremiumOtpInput
                                            value={otp}
                                            onChangeText={setOtp}
                                            theme={currentTheme}
                                            autoFocus
                                        />
                                    </View>

                                    <TouchableOpacity
                                        style={[styles.actionBtn, { backgroundColor: currentTheme.colors.text }]}
                                        onPress={handleVerifyOtp}
                                        disabled={loading || otp.length < 6}
                                        activeOpacity={0.9}
                                    >
                                        {loading ? (
                                            <ActivityIndicator color={currentTheme.colors.background} />
                                        ) : (
                                            <View style={styles.btnInner}>
                                                <Text style={[styles.actionText, { color: currentTheme.colors.background }]}>VERIFY & JOIN</Text>
                                                <ShieldCheck size={16} color={currentTheme.colors.background} />
                                            </View>
                                        )}
                                    </TouchableOpacity>

                                    <View style={styles.resendContainer}>
                                        {resendTimer > 0 ? (
                                            <View style={styles.timerRow}>
                                                <ActivityIndicator size="small" color={currentTheme.colors.primary} style={{ transform: [{ scale: 0.6 }] }} />
                                                <Text style={[styles.timerText, { color: currentTheme.colors.textMuted }]}>
                                                    Resend in {resendTimer}s
                                                </Text>
                                            </View>
                                        ) : (
                                            <TouchableOpacity onPress={handleResend}>
                                                <Text style={[styles.resendLink, { color: currentTheme.colors.primary }]}>
                                                    Resend verification code
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                        <TouchableOpacity
                                            onPress={() => {
                                                setOtpSent(false);
                                                setOtp('');
                                            }}
                                            style={styles.changeEmailBtn}
                                        >
                                            <Text style={[styles.changeEmailText, { color: currentTheme.colors.textMuted }]}>
                                                Change email
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </View>

                        <View style={styles.legalSection}>
                            <Text style={[styles.legalText, { color: currentTheme.colors.textMuted }]}>
                                By continuing, you agree to our{' '}
                                <Text style={{ color: currentTheme.colors.text, fontWeight: '700' }}>Terms</Text> and{' '}
                                <Text style={{ color: currentTheme.colors.text, fontWeight: '700' }}>Privacy Policy</Text>.
                            </Text>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </Screen>
    );
});

const styles = StyleSheet.create({
    stickyHeader: {
        zIndex: 10,
    },
    backBtn: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -10,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 40,
        paddingTop: 12,
    },
    content: {
        flex: 1,
        paddingHorizontal: 24,
        justifyContent: 'center',
    },
    headerSection: {
        marginBottom: 48,
        marginTop: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: -1.5,
        lineHeight: 38,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '500',
        marginTop: 12,
        lineHeight: 24,
        opacity: 0.8,
    },
    form: {
        gap: 20,
    },
    socialBtn: {
        height: 60,
        borderRadius: 20,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    socialText: {
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingVertical: 12,
    },
    divider: {
        flex: 1,
        height: 1,
        opacity: 0.5,
    },
    dividerText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1.5,
        opacity: 0.4,
    },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 60,
        borderBottomWidth: 1,
        gap: 12,
        paddingHorizontal: 4,
    },
    cleanInput: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
    },
    actionBtn: {
        height: 60,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
    },
    btnInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    actionText: {
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 1,
    },
    guestBtn: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    guestText: {
        fontSize: 14,
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
    resendContainer: {
        alignItems: 'center',
        gap: 16,
        marginTop: 24,
    },
    timerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    otpWrapper: {
        paddingVertical: 10,
    },
    timerText: {
        fontSize: 13,
        fontWeight: '600',
    },
    resendLink: {
        fontSize: 14,
        fontWeight: '800',
    },
    changeEmailBtn: {
        paddingVertical: 4,
    },
    changeEmailText: {
        fontSize: 13,
        fontWeight: '600',
    },
    legalSection: {
        marginTop: 48,
        alignItems: 'center',
    },
    legalText: {
        fontSize: 12,
        textAlign: 'center',
        lineHeight: 18,
        fontWeight: '500',
    },
});

export default AuthScreen;
