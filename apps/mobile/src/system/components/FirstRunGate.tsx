import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
    StyleSheet, 
    View, 
    Text, 
    TouchableOpacity, 
    FlatList, 
    NativeScrollEvent, 
    NativeSyntheticEvent,
    StatusBar,
    Platform
} from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { Zap, Share2, ShieldCheck, ChevronRight } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { useTheme } from '@/contexts/ThemeContext';
import { SCREEN_WIDTH, SPACING, RADIUS, mScale } from '@/system/constants/dimensions';
import { alpha } from '@/theme';

const FIRST_RUN_KEY = 'ff_first_run_done';

interface Slide {
    id: string;
    title: string;
    description: string;
    Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
    color: string;
}


export const FirstRunGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isVisible, setIsVisible] = useState<boolean | null>(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const flatListRef = useRef<FlatList>(null);
    const { currentTheme } = useTheme();

    const SLIDES: Slide[] = useMemo(() => [
        {
            id: '1',
            title: 'Jobs, Instantly',
            description: 'A lightning-fast feed of fresh opportunities, updated by the community in real-time.',
            Icon: Zap,
            color: currentTheme.colors.indigo,
        },
        {
            id: '2',
            title: 'Share to Earn Trust',
            description: 'Contributing valid links builds your reputation. Verified contributors get priority features.',
            Icon: Share2,
            color: currentTheme.colors.emerald,
        },
        {
            id: '3',
            title: 'Privacy First',
            description: 'Your username is your identity. No trackers, no spam, just pure career growth.',
            Icon: ShieldCheck,
            color: currentTheme.colors.amber,
        },
    ], [currentTheme]);

    useEffect(() => {
        const checkFirstRun = async () => {
            try {
                // Muted the Get Started onboarding intro for sometime as requested
                setIsVisible(false);
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
    };

    const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const contentOffset = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffset / SCREEN_WIDTH);
        if (index !== activeIndex) {
            setActiveIndex(index);
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    }, [activeIndex]);

    const renderSlide = ({ item }: { item: Slide }) => (
        <View style={styles.slide}>
            <MotiView
                from={{ scale: 0.5, opacity: 0, translateY: 20 }}
                animate={{ scale: 1, opacity: 1, translateY: 0 }}
                transition={{ type: 'spring', damping: 15 }}
                style={[styles.iconBox, { backgroundColor: alpha(item.color, 0.15) }]}
            >
                <item.Icon size={mScale(64)} color={item.color} strokeWidth={2.5} />
            </MotiView>
            <MotiView
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{ delay: 100 }}
            >
                <Text style={[styles.title, { color: currentTheme.colors.text }]}>{item.title}</Text>
                <Text style={[styles.description, { color: currentTheme.colors.textMuted }]}>{item.description}</Text>
            </MotiView>
        </View>
    );

    if (isVisible === null) return null; // Wait for storage check

    return (
        <>
            {children}
            <AnimatePresence>
                {isVisible && (
                    <MotiView
                        from={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        style={StyleSheet.absoluteFill}
                    >
                        <BlurView 
                            intensity={Platform.OS === 'ios' ? 80 : 100} 
                            tint={currentTheme.mode === 'dark' ? 'dark' : 'light'} 
                            style={StyleSheet.absoluteFill} 
                        />
                        <View style={[styles.container, { backgroundColor: alpha(currentTheme.colors.background, 0.6) }]}>
                            <TouchableOpacity 
                                style={styles.skipBtn}
                                onPress={handleDismiss}
                            >
                                <Text style={[styles.skipText, { color: currentTheme.colors.textMuted }]}>Skip</Text>
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

                            <View style={styles.footer}>
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
                                    style={[
                                        styles.ctaBtn, 
                                        { 
                                            backgroundColor: activeIndex === SLIDES.length - 1 ? currentTheme.colors.primary : alpha(currentTheme.colors.text, 0.05) 
                                        }
                                    ]}
                                    onPress={() => {
                                        if (activeIndex === SLIDES.length - 1) {
                                            void handleDismiss();
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
                                        {activeIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'}
                                    </Text>
                                    {activeIndex !== SLIDES.length - 1 && (
                                        <ChevronRight size={18} color={currentTheme.colors.text} />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </MotiView>
                )}
            </AnimatePresence>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: StatusBar.currentHeight || 44,
    },
    skipBtn: {
        position: 'absolute',
        top: (StatusBar.currentHeight || 44) + SPACING.md,
        right: SPACING.lg,
        zIndex: 10,
        padding: SPACING.sm,
    },
    skipText: {
        fontSize: mScale(14),
        fontWeight: '700',
    },
    list: {
        flex: 1,
    },
    slide: {
        width: SCREEN_WIDTH,
        paddingHorizontal: SPACING.xxl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconBox: {
        width: mScale(160),
        height: mScale(160),
        borderRadius: RADIUS.xl * 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xxl,
    },
    title: {
        fontSize: mScale(32),
        fontWeight: '900',
        textAlign: 'center',
        marginBottom: SPACING.md,
        letterSpacing: -1,
    },
    description: {
        fontSize: mScale(16),
        textAlign: 'center',
        lineHeight: mScale(24),
        opacity: 0.8,
    },
    footer: {
        paddingHorizontal: SPACING.xl,
        paddingBottom: Platform.OS === 'ios' ? 60 : 40,
        gap: SPACING.xl,
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
    },
    ctaText: {
        fontSize: mScale(16),
        fontWeight: '800',
        letterSpacing: 0.5,
    }
});
