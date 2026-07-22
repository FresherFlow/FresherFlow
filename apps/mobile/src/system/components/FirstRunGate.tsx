import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
    StyleSheet, 
    View, 
    Text, 
    TouchableOpacity, 
    FlatList, 
    NativeScrollEvent, 
    NativeSyntheticEvent,
    Platform,
    Image
} from 'react-native';
import { MotiView } from 'moti';
import { ChevronRight, Compass, BellRing, Share2, Clipboard, ShieldCheck, Check, Bell } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { SCREEN_WIDTH, SPACING, RADIUS, mScale } from '@/system/constants/dimensions';
import { alpha } from '@/theme';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNotifications } from '@repo/frontend-core';
import { SurfaceCard } from '@/system/components/PremiumPrimitives';

import LogoImage from '../../../assets/logo.png';
import LogoWhiteImage from '../../../assets/logo-white.png';

const FIRST_RUN_KEY = 'ff_first_run_done';

interface Slide {
    id: string;
    title: string;
    description: string;
}

interface FirstRunGateProps {
    children: React.ReactNode;
    onDismiss?: () => void;
}

export const FirstRunGate: React.FC<FirstRunGateProps> = ({ children, onDismiss }) => {
    const [isVisible, setIsVisible] = useState<boolean | null>(null);
    const [activeIndex, setActiveIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const { currentTheme } = useTheme();
    const insets = useSafeAreaInsets();
    const { requestPushPermission } = useNotifications();
    const [isRequestingPush, setIsRequestingPush] = useState(false);

    const SLIDES: Slide[] = useMemo(() => [
        {
            id: '1',
            title: 'Welcome to FresherFlow',
            description: 'We help you find verified jobs and internships directly. No spam, just active career links.',
        },
        {
            id: '2',
            title: 'How It Works',
            description: 'Simple three-step discovery feed tracking:',
        },
        {
            id: '3',
            title: 'Share & Help Others',
            description: 'Found a live opportunity? Share the hiring link with your peers:',
        },
        {
            id: '4',
            title: 'Never Miss Out',
            description: 'Get instantly notified when new Govt jobs or walk-ins match your profile and skills.',
        },
    ], [currentTheme]);

    useEffect(() => {
        const checkFirstRun = async () => {
            try {
                const done = await AsyncStorage.getItem(FIRST_RUN_KEY);
                setIsVisible(done !== 'true');
            } catch {
                setIsVisible(false);
            }
        };
        void checkFirstRun();
    }, []);

    const handleDismiss = async () => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setIsVisible(false);
        try {
            await AsyncStorage.setItem(FIRST_RUN_KEY, 'true');
        } catch (e) {
            console.error('[FirstRunGate] Failed to save flag', e);
        }
        if (onDismiss) {
            onDismiss();
        }
    };

    const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const contentOffset = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffset / SCREEN_WIDTH);
        if (index !== activeIndex) {
            setActiveIndex(index);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    }, [activeIndex]);

    const renderSlide = ({ item, index }: { item: Slide, index: number }) => {
        return (
            <View style={styles.slide}>
                <View style={styles.contentCard}>
                    {index === 0 ? (
                        <MotiView
                            from={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', damping: 15 }}
                            style={styles.logoContainer}
                        >
                            <Image
                                source={currentTheme.mode === 'dark' ? LogoWhiteImage : LogoImage}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                        </MotiView>
                    ) : null}

                    <MotiView
                        from={{ opacity: 0, translateY: 10 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ delay: 100 }}
                        style={styles.textContainer}
                    >
                        <Text style={[styles.title, { color: currentTheme.colors.text }]}>
                            {item.title}
                        </Text>
                        <Text style={[styles.description, { color: currentTheme.colors.textMuted }]}>
                            {item.description}
                        </Text>
                    </MotiView>

                    {index === 1 && (
                        <View style={styles.stepsContainer}>
                            <View style={styles.stepItem}>
                                <View style={[styles.stepIconWrapper, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                                    <Compass size={18} color={currentTheme.colors.primary} />
                                </View>
                                <View style={styles.stepTextWrapper}>
                                    <Text style={[styles.stepTitle, { color: currentTheme.colors.text }]}>Browse live listings</Text>
                                    <Text style={[styles.stepDescription, { color: currentTheme.colors.textMuted }]}>Explore verified jobs and internships feed</Text>
                                </View>
                            </View>

                            <View style={styles.stepItem}>
                                <View style={[styles.stepIconWrapper, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                                    <ChevronRight size={18} color={currentTheme.colors.primary} />
                                </View>
                                <View style={styles.stepTextWrapper}>
                                    <Text style={[styles.stepTitle, { color: currentTheme.colors.text }]}>Apply directly</Text>
                                    <Text style={[styles.stepDescription, { color: currentTheme.colors.textMuted }]}>Tap listing to apply directly to company pages</Text>
                                </View>
                            </View>

                            <View style={styles.stepItem}>
                                <View style={[styles.stepIconWrapper, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                                    <BellRing size={18} color={currentTheme.colors.primary} />
                                </View>
                                <View style={styles.stepTextWrapper}>
                                    <Text style={[styles.stepTitle, { color: currentTheme.colors.text }]}>Stay updated</Text>
                                    <Text style={[styles.stepDescription, { color: currentTheme.colors.textMuted }]}>Enable notifications to catch new links early</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {index === 2 && (
                        <View style={styles.stepsContainer}>
                            <View style={styles.stepItem}>
                                <View style={[styles.stepIconWrapper, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                                    <Clipboard size={18} color={currentTheme.colors.primary} />
                                </View>
                                <View style={styles.stepTextWrapper}>
                                    <Text style={[styles.stepTitle, { color: currentTheme.colors.text }]}>Paste job link</Text>
                                    <Text style={[styles.stepDescription, { color: currentTheme.colors.textMuted }]}>Copy and paste any active application URL</Text>
                                </View>
                            </View>

                            <View style={styles.stepItem}>
                                <View style={[styles.stepIconWrapper, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                                    <ShieldCheck size={18} color={currentTheme.colors.primary} />
                                </View>
                                <View style={styles.stepTextWrapper}>
                                    <Text style={[styles.stepTitle, { color: currentTheme.colors.text }]}>Get verified</Text>
                                    <Text style={[styles.stepDescription, { color: currentTheme.colors.textMuted }]}>Community members check and confirm the link</Text>
                                </View>
                            </View>

                            <View style={styles.stepItem}>
                                <View style={[styles.stepIconWrapper, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                                    <Check size={18} color={currentTheme.colors.primary} />
                                </View>
                                <View style={styles.stepTextWrapper}>
                                    <Text style={[styles.stepTitle, { color: currentTheme.colors.text }]}>Help the community</Text>
                                    <Text style={[styles.stepDescription, { color: currentTheme.colors.textMuted }]}>Verified links are published instantly to the feed</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {index === 3 && (
                        <View style={{ width: '100%', alignItems: 'center', marginTop: SPACING.md }}>
                            <View style={[styles.bellIconContainer, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                                <Bell size={40} color={currentTheme.colors.primary} />
                            </View>
                            <SurfaceCard style={styles.benefitsCard}>
                                <View style={styles.benefitRow}>
                                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: currentTheme.colors.primary }} />
                                    <Text style={[styles.benefitText, { color: currentTheme.colors.text }]}>Real-time job alerts</Text>
                                </View>
                                <View style={styles.benefitRow}>
                                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: currentTheme.colors.primary }} />
                                    <Text style={[styles.benefitText, { color: currentTheme.colors.text }]}>Application status updates</Text>
                                </View>
                                <View style={styles.benefitRow}>
                                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: currentTheme.colors.primary }} />
                                    <Text style={[styles.benefitText, { color: currentTheme.colors.text }]}>Interview reminders</Text>
                                </View>
                            </SurfaceCard>
                        </View>
                    )}
                </View>
            </View>
        );
    };

    if (isVisible === null) return null; // Wait for storage check

    if (isVisible) {
        return (
            <View style={[styles.container, { backgroundColor: currentTheme.colors.background, paddingTop: insets.top }]}>
                <ExpoStatusBar 
                    style={currentTheme.mode === 'dark' ? "light" : "dark"} 
                />
                <TouchableOpacity 
                    style={[styles.skipBtn, { top: insets.top + SPACING.sm }]}
                    onPress={handleDismiss}
                    hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                    <Text style={[styles.skipText, { color: currentTheme.colors.textMuted }]}>
                        {activeIndex === SLIDES.length - 1 ? 'Not Now' : 'Skip'}
                    </Text>
                </TouchableOpacity>

                <FlatList
                    ref={flatListRef}
                    data={SLIDES}
                    renderItem={renderSlide}
                    keyExtractor={(item) => item.id}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    decelerationRate="fast"
                    style={styles.list}
                />

                <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                    <View style={styles.pagination}>
                        {SLIDES.map((_, i) => (
                            <View 
                                key={i} 
                                style={[
                                    styles.dot, 
                                    { 
                                        backgroundColor: i === activeIndex ? currentTheme.colors.primary : alpha(currentTheme.colors.text, 0.1),
                                        width: i === activeIndex ? 24 : 8
                                    }
                                ]} 
                            />
                        ))}
                    </View>

                    <TouchableOpacity
                        activeOpacity={0.8}
                        disabled={isRequestingPush}
                        style={[
                            styles.ctaBtn, 
                            { 
                                backgroundColor: activeIndex === SLIDES.length - 1 ? currentTheme.colors.primary : alpha(currentTheme.colors.text, 0.05) 
                            }
                        ]}
                        onPress={async () => {
                            if (activeIndex === SLIDES.length - 1) {
                                setIsRequestingPush(true);
                                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                try {
                                    await requestPushPermission();
                                } catch (e) {
                                    console.warn('Push permission error', e);
                                } finally {
                                    setIsRequestingPush(false);
                                    void handleDismiss();
                                }
                            } else {
                                flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
                            }
                        }}
                    >
                        <Text style={[
                            styles.ctaText, 
                            { 
                                color: activeIndex === SLIDES.length - 1 ? currentTheme.colors.background : currentTheme.colors.text 
                            }
                        ]}>
                            {activeIndex === SLIDES.length - 1 
                                ? (isRequestingPush ? 'Setting up...' : 'Allow Notifications') 
                                : 'Next'}
                        </Text>
                        {activeIndex !== SLIDES.length - 1 && (
                            <ChevronRight size={18} color={currentTheme.colors.text} />
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return <>{children}</>;
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    skipBtn: {
        position: 'absolute',
        right: SPACING.lg,
        zIndex: 10,
        padding: SPACING.sm,
    },
    skipText: {
        fontSize: mScale(14),
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    list: {
        flex: 1,
    },
    slide: {
        width: SCREEN_WIDTH,
        paddingHorizontal: SPACING.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    contentCard: {
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
    },
    logoContainer: {
        width: mScale(100),
        height: mScale(100),
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.xxl,
    },
    logo: {
        width: '100%',
        height: '100%',
    },
    textContainer: {
        alignItems: 'center',
        width: '100%',
        marginBottom: SPACING.xl,
    },
    title: {
        fontSize: mScale(28),
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: SPACING.md,
        letterSpacing: -0.8,
    },
    description: {
        fontSize: mScale(15),
        textAlign: 'center',
        lineHeight: mScale(24),
        opacity: 0.85,
        fontWeight: '500',
    },
    stepsContainer: {
        width: '100%',
        gap: 16,
        marginTop: 10,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        width: '100%',
    },
    stepIconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepTextWrapper: {
        flex: 1,
        alignItems: 'flex-start',
    },
    stepTitle: {
        fontSize: mScale(15),
        fontWeight: '800',
        textAlign: 'left',
    },
    stepDescription: {
        fontSize: mScale(12),
        fontWeight: '500',
        marginTop: 2,
        textAlign: 'left',
    },
    footer: {
        paddingHorizontal: SPACING.xl,
        gap: SPACING.lg,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    dot: {
        height: 8,
        borderRadius: 4,
    },
    ctaBtn: {
        height: 56,
        borderRadius: RADIUS.lg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 36,
    },
    ctaText: {
        fontSize: mScale(15),
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    bellIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.xl,
        alignSelf: 'center',
    },
    benefitsCard: {
        padding: SPACING.lg,
        borderRadius: RADIUS.xl,
        gap: SPACING.md,
        width: '100%',
    },
    benefitRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    benefitText: {
        fontSize: mScale(14),
        fontWeight: '600',
    }
});
