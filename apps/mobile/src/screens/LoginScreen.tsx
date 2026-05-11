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
} from 'react-native';
// No icons used
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
                                        {otpSent ? "Verify" : "Continue"}
                                    </Text>
                                )}
                            </TouchableOpacity>

                            {otpSent && (
                                <TouchableOpacity 
                                    onPress={() => setOtpSent(false)}
                                    style={styles.resendBtn}
                                >
                                    <Text style={[styles.resendText, { color: currentTheme.colors.textMuted }]}>
                                        Change email
                                    </Text>
                                </TouchableOpacity>
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
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    resendBtn: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    resendText: {
        fontSize: 14,
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
