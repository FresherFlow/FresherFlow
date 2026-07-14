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
import { Image } from 'expo-image';
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
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, Easing } from 'react-native-reanimated';
import { useRandomCompanyLogos } from '@/hooks/useRandomCompanyLogos';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { SecondaryHeader } from '@/system/components/PremiumPrimitives';
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
const logoBlack = require('../../../assets/logo.png');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const logoWhite = require('../../../assets/logo-white.png');

interface CubeProps {
    logoUrl?: string;
    isCenter?: boolean;
    centerLogo?: any;
    currentTheme: any;
    onLogoError?: (url: string) => void;
}

const Cube: React.FC<CubeProps> = memo(({ logoUrl, isCenter, centerLogo, currentTheme, onLogoError }) => {
    // The center cube must exactly equal 2 outer cubes + 1 gap to perfectly fill the hole
    const boxSize = mScale(44);
    const gap = mScale(10);
    const centerSpan = (boxSize * 2) + gap;
    const cubeSize = isCenter ? centerSpan : boxSize;

    if (isCenter) {
        return (
            <View style={[
                styles.cubeContainer,
                {
                    width: cubeSize,
                    height: cubeSize,
                    backgroundColor: 'transparent',
                    borderWidth: 0,
                    justifyContent: 'center',
                    alignItems: 'center'
                }
            ]}>
                <Image 
                    source={currentTheme.mode === 'dark' ? logoWhite : logoBlack} 
                    style={{ width: '90%', height: '90%' }} 
                    contentFit="contain"
                />
            </View>
        );
    }

    return (
        <View style={[
            styles.cubeContainer,
            {
                width: cubeSize,
                height: cubeSize,
                backgroundColor: 'transparent',
                borderWidth: 0,
                justifyContent: 'center',
                alignItems: 'center',
            }
        ]}>
            {logoUrl ? (
                <View style={{
                    width: '85%',
                    height: '85%',
                    position: 'absolute',
                    backgroundColor: '#FFFFFF',
                    borderRadius: mScale(12),
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: '#000',
                    shadowOpacity: 0.05,
                    shadowRadius: 3,
                    shadowOffset: { width: 0, height: 1 },
                    elevation: 1,
                    overflow: 'hidden',
                    padding: mScale(4),
                }}>
                    <Image
                        source={{ uri: logoUrl }}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="contain"
                        transition={1000}
                        cachePolicy="memory-disk"
                        onError={() => {
                            if (onLogoError) onLogoError(logoUrl);
                        }}
                    />
                </View>
            ) : null}
        </View>
    );
});

const CompanyLogosGrid: React.FC<{ logo: any; currentTheme: any }> = memo(({ logo, currentTheme }) => {
    const pool = useRandomCompanyLogos();
    const poolRef = React.useRef(pool);
    // Track 12 boxes instead of 8
    const [gridLogos, setGridLogos] = React.useState<string[]>(() => pool.slice(0, 12));
    const rotationCursor = React.useRef(0);

    const handleLogoError = React.useCallback((brokenUrl: string) => {
        setGridLogos(prev => {
            const next = [...prev];
            const idx = next.indexOf(brokenUrl);
            if (idx === -1) return prev;
            
            const currentPool = poolRef.current;
            const unused = currentPool.filter(l => !next.includes(l) && l !== brokenUrl);
            if (unused.length === 0) return prev;
            
            next[idx] = unused[Math.floor(Math.random() * unused.length)];
            return next;
        });
    }, []);

    React.useEffect(() => {
        poolRef.current = pool;

        if (pool.length >= 12) {
            setGridLogos(prev => {
                const next = [...prev];
                let changed = false;
                const inUse = new Set(next.filter(Boolean));
                for (let i = 0; i < 12; i++) {
                    if (!next[i]) {
                        const fresh = pool.find(u => !inUse.has(u));
                        if (fresh) { next[i] = fresh; inUse.add(fresh); changed = true; }
                    }
                }
                return changed ? next : prev;
            });
        }
    }, [pool]);

    React.useEffect(() => {
        const interval = setInterval(() => {
            setGridLogos(prev => {
                const currentPool = poolRef.current;
                if (currentPool.length < 12) return prev;

                const unused = currentPool.filter(l => !prev.includes(l));
                if (unused.length < 3) return prev;

                const nextGrid = [...prev];
                for (let i = 0; i < 3; i++) {
                    // Update 3 random cubes out of 12
                    const slot = (rotationCursor.current + i) % 12;
                    const randomIdx = Math.floor(Math.random() * unused.length);
                    nextGrid[slot] = unused[randomIdx];
                    unused.splice(randomIdx, 1);
                }
                rotationCursor.current += 3;
                
                return nextGrid;
            });
        }, 2200);

        return () => clearInterval(interval);
    }, []);

    // Layout math for 12 cubes
    const boxSize = mScale(44);
    const gap = mScale(10);
    // The center spans 2 boxes and 1 gap, perfectly filling the middle hole
    const centerSpan = (boxSize * 2) + gap;

    return (
        <View style={styles.gridContainer}>
            {/* Massive absolute center box perfectly overlaid on the hole */}
            <View style={{ position: 'absolute', top: boxSize + gap, left: boxSize + gap, zIndex: 10 }}>
                <Cube isCenter centerLogo={logo} currentTheme={currentTheme} />
            </View>

            <View style={styles.gridRow}>
                <Cube logoUrl={gridLogos[0]} currentTheme={currentTheme} onLogoError={handleLogoError} />
                <Cube logoUrl={gridLogos[1]} currentTheme={currentTheme} onLogoError={handleLogoError} />
                <Cube logoUrl={gridLogos[2]} currentTheme={currentTheme} onLogoError={handleLogoError} />
                <Cube logoUrl={gridLogos[3]} currentTheme={currentTheme} onLogoError={handleLogoError} />
            </View>
            <View style={styles.gridRow}>
                <Cube logoUrl={gridLogos[4]} currentTheme={currentTheme} onLogoError={handleLogoError} />
                <View style={{ width: centerSpan, height: boxSize }} />
                <Cube logoUrl={gridLogos[5]} currentTheme={currentTheme} onLogoError={handleLogoError} />
            </View>
            <View style={styles.gridRow}>
                <Cube logoUrl={gridLogos[6]} currentTheme={currentTheme} onLogoError={handleLogoError} />
                <View style={{ width: centerSpan, height: boxSize }} />
                <Cube logoUrl={gridLogos[7]} currentTheme={currentTheme} onLogoError={handleLogoError} />
            </View>
            <View style={styles.gridRow}>
                <Cube logoUrl={gridLogos[8]} currentTheme={currentTheme} onLogoError={handleLogoError} />
                <Cube logoUrl={gridLogos[9]} currentTheme={currentTheme} onLogoError={handleLogoError} />
                <Cube logoUrl={gridLogos[10]} currentTheme={currentTheme} onLogoError={handleLogoError} />
                <Cube logoUrl={gridLogos[11]} currentTheme={currentTheme} onLogoError={handleLogoError} />
            </View>
        </View>
    );
});

const AuthScreen: React.FC<Props & { isOnboarding?: boolean }> = memo(({ route, navigation, isOnboarding: propIsOnboarding }: Props & { isOnboarding?: boolean }) => {
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

    const { isAuthenticated, user, skipUsernameSetup, isSyncing, isHandshaking } = useAuthStore();
    const isOnboarding = propIsOnboarding ?? route.params?.isOnboarding;
    const [guestLoading, setGuestLoading] = React.useState(false);
    const handleContinueAsGuest = async () => {
        setGuestLoading(true);
        try {
            await auth().signInAnonymously();
            if (isOnboarding) {
                navigation.replace('TaskSetupList');
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
            if (isOnboarding) {
                navigation.replace('TaskSetupList');
                return;
            }

            const hasUsername = Boolean(user.username?.trim());
            if (hasUsername) {
                // Fully onboarded, close the auth modal and return to previous screen
                if (navigation.canGoBack()) {
                    navigation.goBack();
                } else {
                    navigation.replace('Main');
                }
            } else {
                // If a backend handshake is running, wait for it to complete or fail
                // to see if we can resolve the user's username before prompting for a new one.
                if (isHandshaking || user.isOptimistic) return;

                // New user without a handle
                navigation.replace('ProfileChooseUsername');
            }
        }
    }, [isAuthenticated, user, skipUsernameSetup, isSyncing, isHandshaking, navigation, isOnboarding]);

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
                                <CompanyLogosGrid logo={logo} currentTheme={currentTheme} />
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

                                    <View style={{ gap: mScale(16) }}>
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
        paddingTop: mScale(4),
    },
    content: {
        flex: 1,
        paddingHorizontal: mScale(24),
        justifyContent: 'center',
    },
    headerSection: {
        marginBottom: mScale(20),
        marginTop: mScale(0),
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
    gridContainer: {
        alignSelf: 'center',
        gap: mScale(10),
        marginBottom: mScale(16),
        marginTop: mScale(0),
        transform: [{ translateY: mScale(-30) }], // Shifts ONLY the 9 cards up
    },
    gridRow: {
        flexDirection: 'row',
        gap: mScale(10),
        alignItems: 'center',
        justifyContent: 'center',
    },
    cubeContainer: {
        borderRadius: mScale(14),
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    cubePlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: mScale(14),
    },
});

export default AuthScreen;
