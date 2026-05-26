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
import Svg, { Path } from 'react-native-svg';
import { useLogin } from '@/hooks/useLogin';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuthStore } from '@/store/useAuthStore';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { PremiumHeader, SecondaryHeader } from '@/system/components/PremiumPrimitives';
import { mScale } from '@/system/constants/dimensions';
import auth from '@/config/firebase';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const GoogleIcon = ({ size = 20 }: { size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={{ marginRight: 10 }}>
        <Path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
        <Path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
        <Path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
        <Path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
    </Svg>
);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const logoBlack = require('../../assets/logo.png');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const logoWhite = require('../../assets/logo-white.png');

const AuthScreen: React.FC<Props> = memo(({ route, navigation }: Props) => {
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
    const logo = currentTheme.mode === 'dark' ? logoWhite : logoBlack;

    React.useEffect(() => {
        AppleAuthentication.isAvailableAsync().then(setIsAppleAvailable);
    }, []);

    const { isAuthenticated, user, skipUsernameSetup, isSyncing } = useAuthStore();
    const isOnboarding = route.params?.isOnboarding;
    const [guestLoading, setGuestLoading] = React.useState(false);
    const handleContinueAsGuest = async () => {
        setGuestLoading(true);
        try {
            await auth().signInAnonymously();
            if (isOnboarding) {
                navigation.replace('ProfileChooseUsername', { isOnboarding: true });
            } else {
                if (navigation.canGoBack()) {
                    navigation.goBack();
                } else {
                    navigation.navigate('Main');
                }
            }
        } catch (err) {
            console.error('[AuthScreen] Guest sign in failed:', err);
        } finally {
            setGuestLoading(false);
        }
    };

    React.useEffect(() => {
        // Wait until Firestore hydration completes before deciding where to route
        if (isSyncing) return;

        if (isAuthenticated && user && !user.isAnonymous) {
            const hasUsername = Boolean(user.username?.trim());
            if (hasUsername || skipUsernameSetup) {
                // Fully onboarded (or skipped), close the auth modal and return to previous screen
                if (isOnboarding) {
                    navigation.replace('Main'); // Or wherever Onboarding leads to if fully setup
                } else if (navigation.canGoBack()) {
                    navigation.goBack();
                } else {
                    navigation.replace('Main');
                }
            } else {
                // New user without a handle — redirect to setup
                navigation.replace('ProfileChooseUsername', isOnboarding ? { isOnboarding: true } : undefined);
            }
        }
    }, [isAuthenticated, user, skipUsernameSetup, isSyncing, navigation, isOnboarding]);

    const showEmail = false;

    return (
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
            
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <View style={[styles.stickyHeader, { paddingTop: insets.top + 10 }]}>
                    <SecondaryHeader
                        title={otpSent ? "Verify Code" : "Sign In"}
                        showBack={!isOnboarding}
                        onBack={() => {
                            if (otpSent) {
                                setOtpSent(false);
                            } else {
                                navigation.goBack();
                            }
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
                            {!otpSent && (
                                <View style={{ alignItems: 'center' }}>
                                    <View style={styles.logoBox}>
                                        <Image source={logo} style={styles.logoImage} />
                                    </View>
                                </View>
                            )}
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
                                            disabled={emailLoading || googleLoading || appleLoading || isSyncing}
                                            activeOpacity={0.8}
                                        >
                                            {googleLoading || (isSyncing && isAuthenticated) ? (
                                                <ActivityIndicator color={currentTheme.colors.background} />
                                            ) : (
                                                <>
                                                    <GoogleIcon size={22} />
                                                    <Text style={[styles.socialText, { color: currentTheme.colors.background, fontSize: mScale(16) }]}>
                                                        Continue with Google
                                                    </Text>
                                                </>
                                            )}
                                        </TouchableOpacity>

                                        {isAppleAvailable && (
                                            <TouchableOpacity
                                                style={[styles.socialBtn, { borderColor: alpha(currentTheme.colors.text, 0.2) }]}
                                                onPress={handleAppleSignIn}
                                                disabled={emailLoading || googleLoading || appleLoading || isSyncing}
                                                activeOpacity={0.8}
                                            >
                                                {appleLoading || (isSyncing && isAuthenticated) ? (
                                                    <ActivityIndicator color={currentTheme.colors.text} />
                                                ) : (
                                                    <>
                                                        <Apple size={22} color={currentTheme.colors.text} />
                                                        <Text style={[styles.socialText, { color: currentTheme.colors.text, fontSize: mScale(16) }]}>
                                                            Continue with Apple
                                                        </Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>
                                        )}

                                        <TouchableOpacity
                                            style={[styles.socialBtn, { borderColor: alpha(currentTheme.colors.text, 0.2) }]}
                                            onPress={handleContinueAsGuest}
                                            disabled={emailLoading || googleLoading || appleLoading || guestLoading}
                                            activeOpacity={0.8}
                                        >
                                            {guestLoading ? (
                                                <ActivityIndicator color={currentTheme.colors.text} />
                                            ) : (
                                                <Text style={[styles.socialText, { color: currentTheme.colors.text, fontSize: mScale(16), fontWeight: '700' }]}>
                                                    Continue as Guest
                                                </Text>
                                            )}
                                        </TouchableOpacity>
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
                                By continuing, you agree to our{' '}
                                <Text
                                    style={{ color: currentTheme.colors.primary, fontWeight: '700', textDecorationLine: 'underline' }}
                                    onPress={() => navigation.navigate('Legal')}
                                >
                                    Terms
                                </Text>{' '}
                                and{' '}
                                <Text
                                    style={{ color: currentTheme.colors.primary, fontWeight: '700', textDecorationLine: 'underline' }}
                                    onPress={() => navigation.navigate('Legal')}
                                >
                                    Privacy Policy
                                </Text>.
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
        width: mScale(44),
        height: mScale(44),
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -10,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: mScale(40),
        paddingTop: mScale(12),
    },
    content: {
        flex: 1,
        paddingHorizontal: mScale(24),
        justifyContent: 'center',
    },
    headerSection: {
        marginBottom: mScale(48),
        marginTop: mScale(20),
    },
    title: {
        fontSize: mScale(32),
        fontWeight: '900',
        letterSpacing: -1.5,
        lineHeight: mScale(38),
    },
    logoBox: {
        width: mScale(100),
        height: mScale(100),
        borderRadius: mScale(24),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: mScale(24),
        overflow: 'hidden',
    },
    logoImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    subtitle: {
        fontSize: mScale(16),
        fontWeight: '500',
        marginTop: mScale(12),
        lineHeight: mScale(24),
        opacity: 0.8,
    },
    form: {
        gap: mScale(20),
    },
    socialBtn: {
        height: mScale(60),
        borderRadius: mScale(20),
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: mScale(12),
    },
    socialText: {
        fontSize: mScale(15),
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    socialRow: {
        flexDirection: 'row',
        gap: mScale(12),
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: mScale(16),
        paddingVertical: mScale(12),
    },
    divider: {
        flex: 1,
        height: 1,
        opacity: 0.5,
    },
    dividerText: {
        fontSize: mScale(10),
        fontWeight: '900',
        letterSpacing: 0.5,
        opacity: 0.4,
    },
    inputGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        height: mScale(60),
        borderBottomWidth: 1,
        gap: mScale(12),
        paddingHorizontal: mScale(4),
    },
    cleanInput: {
        flex: 1,
        fontSize: mScale(18),
        fontWeight: '600',
    },
    actionBtn: {
        height: mScale(60),
        borderRadius: mScale(20),
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: mScale(12),
    },
    btnInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: mScale(8),
    },
    actionText: {
        fontSize: mScale(14),
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    errorText: {
        fontSize: mScale(12),
        fontWeight: '700',
        marginTop: mScale(8),
        marginLeft: mScale(4),
    },
    guestBtn: {
        alignItems: 'center',
        paddingVertical: mScale(16),
    },
    guestText: {
        fontSize: mScale(14),
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
    resendContainer: {
        alignItems: 'center',
        gap: mScale(16),
        marginTop: mScale(24),
    },
    timerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: mScale(4),
    },
    otpWrapper: {
        paddingVertical: mScale(30),
        alignItems: 'center',
    },
    emailSentIconContainer: {
        width: mScale(120),
        height: mScale(120),
        borderRadius: mScale(60),
        backgroundColor: 'rgba(0,0,0,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: mScale(24),
    },
    timerText: {
        fontSize: mScale(13),
        fontWeight: '600',
    },
    resendLink: {
        fontSize: mScale(14),
        fontWeight: '800',
    },
    changeEmailBtn: {
        paddingVertical: mScale(4),
    },
    changeEmailText: {
        fontSize: mScale(13),
        fontWeight: '600',
    },
    legalSection: {
        marginTop: mScale(48),
        alignItems: 'center',
    },
    legalText: {
        fontSize: mScale(12),
        textAlign: 'center',
        lineHeight: mScale(18),
        fontWeight: '500',
    },
});

export default AuthScreen;
