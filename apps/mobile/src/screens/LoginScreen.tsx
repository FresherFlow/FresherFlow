import React, { memo } from 'react';
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
import { Chrome } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLogin } from '@/hooks/useLogin';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { PremiumHeader } from '@/system/components/PremiumPrimitives';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const LoginScreen: React.FC<Props> = memo(({ route, navigation }: Props) => {
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

    return (
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={[styles.stickyHeader, { paddingTop: Platform.OS === 'ios' ? 50 : 20 }]}>
                    <PremiumHeader 
                        title={otpSent ? "Verification" : "Welcome"} 
                        subtitle={otpSent ? "Enter the code sent to you" : "Authentication Required"} 
                    />
                </View>

                <ScrollView 
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.content}>
                        <View style={styles.headerSection}>
                            <Text style={[styles.brandName, { color: currentTheme.colors.text }]}>
                                {otpSent ? "Check Email" : "Sign In"}
                            </Text>
                            <Text style={[styles.brandTagline, { color: currentTheme.colors.textMuted }]}>
                                {otpSent 
                                    ? `Enter the 6-digit code we sent to ${email}` 
                                    : "Enter your email to continue to your dashboard."}
                            </Text>
                        </View>

                        <View style={styles.form}>
                            {!otpSent ? (
                                <View style={styles.inputGroup}>
                                    <TextInput
                                        style={[styles.cleanInput, { color: currentTheme.colors.text, borderBottomColor: alpha(currentTheme.colors.text, 0.1) }]}
                                        placeholder="Email address"
                                        placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.5)}
                                        value={email}
                                        onChangeText={setEmail}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                        autoComplete="email"
                                    />
                                </View>
                            ) : (
                                <View style={styles.inputGroup}>
                                    <TextInput
                                        style={[styles.cleanInput, { color: currentTheme.colors.text, borderBottomColor: alpha(currentTheme.colors.text, 0.1) }]}
                                        placeholder="Verification code"
                                        placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.5)}
                                        value={otp}
                                        onChangeText={setOtp}
                                        keyboardType="number-pad"
                                        maxLength={6}
                                        autoFocus
                                        textContentType="oneTimeCode"
                                        autoComplete="one-time-code"
                                    />
                                </View>
                            )}

                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: currentTheme.colors.text }]}
                                onPress={otpSent ? handleVerifyOtp : handleSendOtp}
                                disabled={loading}
                                activeOpacity={0.9}
                            >
                                {loading ? (
                                    <ActivityIndicator color={currentTheme.colors.background} />
                                ) : (
                                    <Text style={[styles.actionText, { color: currentTheme.colors.background }]}>
                                        {otpSent ? "VERIFY CODE" : "CONTINUE WITH EMAIL"}
                                    </Text>
                                )}
                            </TouchableOpacity>

                            {!otpSent && (
                                <View style={styles.dividerContainer}>
                                    <View style={[styles.divider, { backgroundColor: alpha(currentTheme.colors.text, 0.1) }]} />
                                    <Text style={[styles.dividerText, { color: currentTheme.colors.textMuted }]}>OR</Text>
                                    <View style={[styles.divider, { backgroundColor: alpha(currentTheme.colors.text, 0.1) }]} />
                                </View>
                            )}

                            {!otpSent && (
                                <TouchableOpacity
                                    style={[styles.socialBtn, { borderColor: alpha(currentTheme.colors.text, 0.1) }]}
                                    onPress={() => Alert.alert("Coming Soon", "Native Google Sign-In is being optimized for reliability.")}
                                    activeOpacity={0.8}
                                >
                                    <Chrome size={20} color={currentTheme.colors.text} />
                                    <Text style={[styles.socialText, { color: currentTheme.colors.text }]}>
                                        Continue with Google
                                    </Text>
                                </TouchableOpacity>
                            )}

                            {otpSent && (
                                <View style={styles.resendContainer}>
                                    {resendTimer > 0 ? (
                                        <Text style={[styles.timerText, { color: currentTheme.colors.textMuted }]}>
                                            Resend code in {resendTimer}s
                                        </Text>
                                    ) : (
                                        <TouchableOpacity onPress={handleResend}>
                                            <Text style={[styles.resendLink, { color: currentTheme.colors.primary }]}>
                                                Resend verification code
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                    <TouchableOpacity 
                                        onPress={() => setOtpSent(false)}
                                        style={styles.changeEmailBtn}
                                    >
                                        <Text style={[styles.changeEmailText, { color: currentTheme.colors.textMuted }]}>
                                            Change email
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        {!otpSent && (
                            <View style={styles.footer}>
                                <Text style={[styles.footerText, { color: currentTheme.colors.textMuted }]}>New here?</Text>
                                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                                    <Text style={[styles.link, { color: currentTheme.colors.text }]}> Create an account</Text>
                                </TouchableOpacity>
                            </View>
                        )}
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
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 40,
        paddingTop: 12,
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
        justifyContent: 'center',
    },
    headerSection: {
        marginBottom: 60,
        marginTop: 40,
    },
    brandName: {
        fontSize: 34,
        fontWeight: '800',
        letterSpacing: -1,
    },
    brandTagline: {
        fontSize: 16,
        fontWeight: '500',
        marginTop: 12,
        lineHeight: 24,
    },
    form: {
        gap: 32,
    },
    inputGroup: {
        gap: 8,
    },
    cleanInput: {
        height: 56,
        fontSize: 18,
        fontWeight: '600',
        borderBottomWidth: 1,
        paddingHorizontal: 4,
    },
    actionBtn: {
        height: 60,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
    },
    actionText: {
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 1,
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingVertical: 8,
    },
    divider: {
        flex: 1,
        height: 1,
    },
    dividerText: {
        fontSize: 12,
        fontWeight: '800',
        opacity: 0.5,
    },
    socialBtn: {
        height: 60,
        borderRadius: 16,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    socialText: {
        fontSize: 15,
        fontWeight: '700',
    },
    resendContainer: {
        alignItems: 'center',
        gap: 16,
    },
    timerText: {
        fontSize: 13,
        fontWeight: '600',
        opacity: 0.6,
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
        textDecorationLine: 'underline',
    },
    footer: {
        flexDirection: 'row',
        marginTop: 40,
    },
    footerText: {
        fontSize: 15,
        fontWeight: '500',
    },
    link: {
        fontSize: 15,
        fontWeight: '700',
    },
});

export default memo(LoginScreen);
