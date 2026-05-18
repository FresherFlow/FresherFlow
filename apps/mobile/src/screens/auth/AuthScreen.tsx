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
    Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Controller } from 'react-hook-form';
import { Mail, ArrowRight, Apple } from 'lucide-react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useTheme } from '@/contexts/ThemeContext';
import { useLogin } from '@/hooks/useLogin';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { PremiumHeader } from '@/system/components/PremiumPrimitives';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const AuthScreen: React.FC<Props> = memo(({ route }: Props) => {
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();
    const {
        control,
        handleSubmit,
        email,
        otpSent, setOtpSent,
        emailLoading,
        googleLoading,
        appleLoading,
        handleSendOtp,
        handleResend,
        resendTimer,
        errors,
        setValue,
        handleGoogleSignIn,
        handleAppleSignIn,
    } = useLogin(route);
    const [isAppleAvailable, setIsAppleAvailable] = React.useState(false);

    React.useEffect(() => {
        AppleAuthentication.isAvailableAsync().then(setIsAppleAvailable);
    }, []);

    // AuthGate (AuthGate.tsx) handles routing once auth state changes.
    // This screen never navigates anywhere itself.
    const showEmail = false as unknown as boolean;

    return (
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <View style={[styles.stickyHeader, { paddingTop: insets.top + 10 }]}>
                    <PremiumHeader
                        title={otpSent ? "Verify" : "Join"}
                        subtitle={otpSent ? "Authentication" : "Discovery-first platform"}
                        showBack={otpSent}
                        onBack={() => {
                            setOtpSent(false);
                        }}
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
                                    {showEmail ? (
                                        <>
                                            <Controller
                                                control={control}
                                                name="email"
                                                render={({ field: { onChange, onBlur, value } }) => (
                                                    <View>
                                                        <View style={[
                                                            styles.inputGroup, 
                                                            { borderBottomColor: errors.email ? currentTheme.colors.error : alpha(currentTheme.colors.text, 0.1) }
                                                        ]}>
                                                            <Mail size={18} color={alpha(currentTheme.colors.text, 0.4)} />
                                                            <TextInput
                                                                style={[styles.cleanInput, { color: currentTheme.colors.text }]}
                                                                placeholder="Enter your email"
                                                                placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.5)}
                                                                value={value}
                                                                onChangeText={onChange}
                                                                onBlur={onBlur}
                                                                autoCapitalize="none"
                                                                keyboardType="email-address"
                                                                autoComplete="email"
                                                            />
                                                        </View>
                                                        {errors.email && (
                                                            <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>
                                                                {errors.email.message}
                                                            </Text>
                                                        )}
                                                    </View>
                                                )}
                                            />

                                            <TouchableOpacity
                                                style={[
                                                    styles.actionBtn,
                                                    {
                                                        backgroundColor: email && email.trim() ? currentTheme.colors.text : alpha(currentTheme.colors.text, 0.4),
                                                        opacity: emailLoading ? 0.7 : 1
                                                    }
                                                ]}
                                                onPress={handleSubmit((data) => handleSendOtp(data))}
                                                disabled={emailLoading || googleLoading || appleLoading || !email || !email.trim()}
                                                activeOpacity={0.8}
                                            >
                                                {emailLoading ? (
                                                    <View style={styles.btnInner}>
                                                        <ActivityIndicator color={currentTheme.colors.background} />
                                                        <Text style={[styles.actionText, { color: currentTheme.colors.background, marginLeft: 8 }]}>Sending...</Text>
                                                    </View>
                                                ) : (
                                                    <View style={styles.btnInner}>
                                                        <Text style={[styles.actionText, { color: currentTheme.colors.background }]}>Continue</Text>
                                                        <ArrowRight size={16} color={currentTheme.colors.background} />
                                                    </View>
                                                )}
                                            </TouchableOpacity>

                                            <View style={styles.dividerContainer}>
                                                <View style={[styles.divider, { backgroundColor: alpha(currentTheme.colors.text, 0.1) }]} />
                                                <Text style={[styles.dividerText, { color: currentTheme.colors.textMuted }]}>Or continue with</Text>
                                                <View style={[styles.divider, { backgroundColor: alpha(currentTheme.colors.text, 0.1) }]} />
                                            </View>
                                        </>
                                    ) : null}

                                    <View style={{ gap: 16 }}>
                                        <TouchableOpacity
                                            style={[styles.socialBtn, { backgroundColor: currentTheme.colors.text, borderColor: 'transparent' }]}
                                            onPress={handleGoogleSignIn}
                                            disabled={emailLoading || googleLoading || appleLoading}
                                            activeOpacity={0.8}
                                        >
                                            {googleLoading ? (
                                                <ActivityIndicator color={currentTheme.colors.background} />
                                            ) : (
                                                <>
                                                    <Image 
                                                        source={{ uri: 'https://developers.google.com/identity/images/g-logo.png' }} 
                                                        style={{ width: 24, height: 24, marginRight: 4 }} 
                                                    />
                                                    <Text style={[styles.socialText, { color: currentTheme.colors.background, fontSize: 16 }]}>
                                                        Continue with Google
                                                    </Text>
                                                </>
                                            )}
                                        </TouchableOpacity>

                                        {isAppleAvailable && (
                                            <TouchableOpacity
                                                style={[styles.socialBtn, { borderColor: alpha(currentTheme.colors.text, 0.2) }]}
                                                onPress={handleAppleSignIn}
                                                disabled={emailLoading || googleLoading || appleLoading}
                                                activeOpacity={0.8}
                                            >
                                                {appleLoading ? (
                                                    <ActivityIndicator color={currentTheme.colors.text} />
                                                ) : (
                                                    <>
                                                        <Apple size={22} color={currentTheme.colors.text} />
                                                        <Text style={[styles.socialText, { color: currentTheme.colors.text, fontSize: 16 }]}>
                                                            Continue with Apple
                                                        </Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </>
                            ) : (
                                  <>
                                      <View style={styles.otpWrapper}>
                                         <View style={[styles.emailSentIconContainer, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                                             <Mail size={48} color={currentTheme.colors.primary} />
                                         </View>
                                         <Text style={[styles.title, { color: currentTheme.colors.text, textAlign: 'center' }]}>
                                             Magic Link Sent!
                                         </Text>
                                         <Text style={[styles.subtitle, { color: currentTheme.colors.textMuted, textAlign: 'center', marginTop: 12, marginBottom: 20 }]}>
                                             We sent a secure magic sign-in link to{"\n"}
                                             <Text style={{ fontWeight: '700', color: currentTheme.colors.text }}>{email}</Text>.{"\n\n"}
                                             Tap the link inside the email on this device to log in automatically. You can safely close this screen.
                                         </Text>
                                     </View>

                                     <View style={styles.resendContainer}>
                                         {resendTimer > 0 ? (
                                             <View style={styles.timerRow}>
                                                 <ActivityIndicator size="small" color={currentTheme.colors.primary} style={{ transform: [{ scale: 0.6 }] }} />
                                                 <Text style={[styles.timerText, { color: currentTheme.colors.textMuted }]}>
                                                     Resend link in {resendTimer}s
                                                 </Text>
                                             </View>
                                         ) : (
                                              <TouchableOpacity onPress={handleResend}>
                                                 <Text style={[styles.resendLink, { color: currentTheme.colors.primary }]}>
                                                     Resend Link
                                                 </Text>
                                             </TouchableOpacity>
                                         )}
                                         <TouchableOpacity
                                             onPress={() => {
                                                 setOtpSent(false);
                                                 setValue('email', '');
                                             }}
                                             style={styles.changeEmailBtn}
                                         >
                                             <Text style={[styles.changeEmailText, { color: currentTheme.colors.textMuted }]}>
                                                 Change Email
                                             </Text>
                                         </TouchableOpacity>
                                     </View>
                                 </>
                             )}
                        </View>

                        <View style={styles.legalSection}>
                            <Text style={[styles.legalText, { color: currentTheme.colors.textMuted }]}>
                                By continuing, you agree to our Terms and Privacy Policy.
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
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    socialRow: {
        flexDirection: 'row',
        gap: 12,
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
        letterSpacing: 0.5,
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
        letterSpacing: 0.5,
    },
    errorText: {
        fontSize: 12,
        fontWeight: '700',
        marginTop: 8,
        marginLeft: 4,
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
        paddingVertical: 30,
        alignItems: 'center',
    },
    emailSentIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(0,0,0,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
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
    otpInputGroup: {
        width: '80%',
        height: 60,
        borderBottomWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 12,
        alignSelf: 'center',
    },
    otpCleanInput: {
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: 10,
        textAlign: 'center',
        width: '100%',
    },
});

export default AuthScreen;
