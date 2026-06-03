import React, { memo, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { Screen } from '@/system/layout/Layout';
import { SecondaryHeader, SurfaceCard } from '@/system/components/PremiumPrimitives';
import { ShieldCheck, Github, Twitter, Linkedin, Instagram, ExternalLink, Facebook, Send, MessageSquare } from 'lucide-react-native';
import { MenuRow } from '../profile/SettingsScreen';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { Image, Dimensions } from 'react-native';
import { openExternalURL } from '@/utils/browser';
import Animated, { 
    useSharedValue, 
    useAnimatedStyle, 
    withRepeat, 
    withTiming, 
    Easing,
    cancelAnimation,
    runOnJS
} from 'react-native-reanimated';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import { alpha } from '@/theme';
import Svg, { Path } from 'react-native-svg';
import Constants from 'expo-constants';
import { version as appVersion } from '../../../package.json';
import { WhatsAppIcon, DiscordIcon } from '@/system/components/SocialIcons';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const logoBlack = require('../../../assets/logo.png');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const logoWhite = require('../../../assets/logo-white.png');


type Props = NativeStackScreenProps<RootStackParamList, 'About'>;

const AboutScreen: React.FC<Props> = memo(({ navigation }: Props) => {
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();
    const logo = currentTheme.mode === 'dark' ? logoWhite : logoBlack;

    const SOCIAL_DATA = useMemo(() => [
        { icon: DiscordIcon, color: '#5865F2', url: 'https://discord.gg/CcPAnWSHD' },
        { icon: Facebook, color: currentTheme.colors.social.facebook, url: 'https://www.facebook.com/FresherFlow.in' },
        { icon: Instagram, color: currentTheme.colors.social.instagram, url: 'https://instagram.com/fresherflow' },
        { icon: Linkedin, color: currentTheme.colors.social.linkedin, url: 'https://www.linkedin.com/company/fresherflow-in' },
        { icon: Send, color: currentTheme.colors.social.telegram, url: 'https://t.me/fresherflowin' },
        { icon: Twitter, color: currentTheme.colors.social.twitter, url: 'https://twitter.com/Fresherflow' },
        { icon: WhatsAppIcon, color: '#25D366', url: 'https://whatsapp.com/channel/0029VbCkZu6FHWq0qJOOU73D' },
    ], [currentTheme]);

    // Interactive Marquee Animation
    const translateX = useSharedValue(0);
    const startX = useSharedValue(0);
    const itemWidth = 56 + 12; // width + gap
    const totalWidth = itemWidth * SOCIAL_DATA.length;
    const isInteracting = useSharedValue(false);

    const startAutoScroll = useCallback(() => {
        if (isInteracting.value) return;
        
        cancelAnimation(translateX);

        // Wrap translateX to be within [-totalWidth, 0] cleanly
        let currentX = translateX.value % totalWidth;
        if (currentX > 0) currentX -= totalWidth;
        translateX.value = currentX;

        // Calculate remaining distance and proportional duration
        const targetX = currentX - totalWidth;
        const remainingDistance = Math.abs(targetX - currentX);
        const fraction = remainingDistance / totalWidth;
        const duration = Math.max(100, 20000 * fraction);

        // Animate the rest of this cycle smoothly, then start the infinite loop
        translateX.value = withTiming(targetX, {
            duration: duration,
            easing: Easing.linear
        }, (finished) => {
            if (finished && !isInteracting.value) {
                translateX.value = 0;
                translateX.value = withRepeat(
                    withTiming(-totalWidth, { 
                        duration: 20000, 
                        easing: Easing.linear 
                    }),
                    -1,
                    false
                );
            }
        });
    }, [totalWidth]);

    React.useEffect(() => {
        startAutoScroll();
        
        // Safety guard: check every 3 seconds to ensure the marquee never gets stuck stopped
        const interval = setInterval(() => {
            if (isInteracting.value) {
                isInteracting.value = false;
                startAutoScroll();
            }
        }, 3000);

        return () => {
            cancelAnimation(translateX);
            clearInterval(interval);
        };
    }, [startAutoScroll]);

    const onGestureEvent = (event: PanGestureHandlerGestureEvent) => {
        "worklet";
        if (!isInteracting.value) {
            isInteracting.value = true;
            cancelAnimation(translateX);
            startX.value = translateX.value;
        }
        
        let targetX = startX.value + event.nativeEvent.translationX;
        // Infinite wrap around math during active drag
        while (targetX > 0) {
            targetX -= totalWidth;
            startX.value -= totalWidth;
        }
        while (targetX < -totalWidth * 2) {
            targetX += totalWidth;
            startX.value += totalWidth;
        }
        translateX.value = targetX;
    };

    const onHandlerStateChange = (event: { nativeEvent: { state: number; velocityX: number } }) => {
        "worklet";
        if (event.nativeEvent.state === 5 || event.nativeEvent.state === 3 || event.nativeEvent.state === 1) { // END, CANCELLED, or FAILED
            isInteracting.value = false;
            runOnJS(startAutoScroll)();
        }
    };

    const animatedStyle = useAnimatedStyle(() => {
        // Infinite wrap logic
        let displayX = translateX.value % totalWidth;
        if (displayX > 0) displayX -= totalWidth;
        
        return {
            transform: [{ translateX: displayX }],
        };
    });

    return (
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
            
            <View style={{ paddingTop: insets.top + 10 }}>
                <SecondaryHeader 
                    title="About" 
                    subtitle={`FresherFlow v${Constants.expoConfig?.version || appVersion}`}
                    onBack={() => {
                        if (navigation.canGoBack()) {
                            navigation.goBack();
                        } else {
                            navigation.navigate('Main' as never);
                        }
                    }}
                />
            </View>

            <ScrollView 
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.heroSection}>
                    <View style={styles.logoBox}>
                        <Image source={logo} style={styles.logoImage} />
                    </View>
                    <Text style={[styles.title, { color: currentTheme.colors.text }]}>FresherFlow</Text>
                    <Text style={[styles.tagline, { color: currentTheme.colors.textMuted }]}>
                        Empowering freshers to discover their first professional opportunity.
                    </Text>
                </View>

                <View style={styles.missionSection}>
                    <Text style={[styles.sectionLabel, { color: currentTheme.colors.textMuted }]}>Our Mission</Text>
                    <Text style={[styles.missionText, { color: currentTheme.colors.text }]}>
                        FresherFlow started with a simple observation: the best job opportunities are often hidden in plain sight or buried under noise.
                        {'\n\n'}
                        We built this as a community-first platform where students and freshers help each other by sharing verified links and referrals. No spam, no fluff—just pure opportunities.
                    </Text>
                </View>

                <Text style={[styles.sectionLabel, { color: currentTheme.colors.textMuted }]}>Join the Community</Text>
                <View style={styles.marqueeContainer}>
                    <PanGestureHandler
                        onGestureEvent={onGestureEvent}
                        onHandlerStateChange={onHandlerStateChange}
                    >
                        <Animated.View style={[styles.socialRow, animatedStyle]}>
                            {[...SOCIAL_DATA, ...SOCIAL_DATA, ...SOCIAL_DATA].map((item, index) => (
                                <SocialIcon 
                                    key={`${item.url}-${index}`}
                                    icon={item.icon} 
                                    color={item.color} 
                                    onPress={() => openExternalURL(item.url, currentTheme.colors)} 
                                />
                            ))}
                        </Animated.View>
                    </PanGestureHandler>
                </View>

                <TouchableOpacity 
                    activeOpacity={0.8}
                    onPress={() => openExternalURL('https://github.com/MukeshCheekatla/fresherflow', currentTheme.colors)}
                    style={[styles.githubCard, { backgroundColor: alpha(currentTheme.colors.text, 0.03), borderColor: alpha(currentTheme.colors.border, 0.1) }]}
                >
                    <View style={styles.githubLeft}>
                        <View style={[styles.githubIconBox, { backgroundColor: currentTheme.colors.text }]}>
                            <Github size={24} color={currentTheme.colors.background} />
                        </View>
                        <View>
                            <Text style={[styles.githubTitle, { color: currentTheme.colors.text }]}>Open Source & Repo</Text>
                            <Text style={[styles.githubSub, { color: currentTheme.colors.textMuted }]}>Star us on GitHub to support</Text>
                        </View>
                    </View>
                    <ExternalLink size={18} color={alpha(currentTheme.colors.textMuted, 0.4)} />
                </TouchableOpacity>

                <TouchableOpacity 
                    activeOpacity={0.8}
                    onPress={() => openExternalURL('https://fresherflow.in', currentTheme.colors)}
                    style={[styles.websiteCard, { backgroundColor: alpha(currentTheme.colors.primary, 0.05), borderColor: alpha(currentTheme.colors.primary, 0.1) }]}
                >
                    <View style={styles.githubLeft}>
                        <View style={[styles.githubIconBox, { backgroundColor: currentTheme.colors.primary }]}>
                            <Image source={logo} style={{ width: 26, height: 26, resizeMode: 'contain', tintColor: currentTheme.colors.background }} />
                        </View>
                        <View>
                            <Text style={[styles.githubTitle, { color: currentTheme.colors.text }]}>Visit our Website</Text>
                            <Text style={[styles.githubSub, { color: currentTheme.colors.textMuted }]}>fresherflow.in</Text>
                        </View>
                    </View>
                    <ExternalLink size={18} color={alpha(currentTheme.colors.textMuted, 0.4)} />
                </TouchableOpacity>

                <SurfaceCard style={styles.groupCard}>
                    <MenuRow
                        icon={MessageSquare}
                        label="Share Feedback & Support"
                        subtitle="Report a bug, suggest features or share love"
                        onPress={() => navigation.navigate('Feedback')}
                        currentTheme={currentTheme}
                    />
                    <MenuRow
                        icon={ShieldCheck}
                        label="Privacy & Terms"
                        subtitle="Data usage and community guidelines"
                        onPress={() => navigation.navigate('Legal')}
                        currentTheme={currentTheme}
                        isLast
                    />
                </SurfaceCard>

                <View style={styles.footer}>
                    <Text style={[styles.footerText, { color: currentTheme.colors.textMuted }]}>
                        Made with ❤️ for the Community
                    </Text>
                    <Text style={[styles.copyright, { color: currentTheme.colors.textMuted }]}>
                        © 2026 FresherFlow Team
                    </Text>
                </View>
            </ScrollView>
        </Screen>
    );
});

export const SocialIcon = ({ icon: Icon, color, onPress }: { icon: React.ElementType, color: string, onPress: () => void }) => (
    <TouchableOpacity 
        onPress={onPress}
        activeOpacity={0.7}
        style={[styles.socialBtn, { backgroundColor: alpha(color, 0.08), borderColor: alpha(color, 0.1) }]}
    >
        <Icon size={22} color={color} />
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: 32,
        marginTop: 20,
    },
    logoBox: {
        width: 100,
        height: 100,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        overflow: 'hidden',
    },
    logoImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        letterSpacing: -1,
    },
    tagline: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 12,
        lineHeight: 20,
        paddingHorizontal: 40,
        fontWeight: '500',
    },
    groupCard: {
        padding: 0,
        borderRadius: 16,
        marginBottom: 40,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginLeft: 12,
        marginBottom: 16,
    },
    marqueeContainer: {
        width: Dimensions.get('window').width,
        marginLeft: -20,
        marginRight: -20,
        overflow: 'hidden',
        marginBottom: 32,
    },
    socialRow: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
    },
    socialBtn: {
        width: 56,
        height: 56,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    githubCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 16,
    },
    websiteCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 16,
    },
    githubLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    githubIconBox: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    githubTitle: {
        fontSize: 16,
        fontWeight: '900',
    },
    githubSub: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2,
    },
    footer: {
        marginTop: 20,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 4,
    },
    copyright: {
        fontSize: 10,
        fontWeight: '600',
        opacity: 0.5,
    },
    missionSection: {
        marginBottom: 40,
        paddingHorizontal: 4,
    },
    missionText: {
        fontSize: 15,
        lineHeight: 24,
        fontWeight: '500',
        opacity: 0.9,
    }
});

export default AboutScreen;
