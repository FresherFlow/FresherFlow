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

export const WhatsAppIcon = ({ size = 22, color }: { size?: number, color?: string }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M12.004 2C6.48 2 2 6.48 2 12.004c0 1.956.562 3.86 1.625 5.518L2.012 22l4.63-1.613a9.98 9.98 0 0 0 5.358 1.62c5.525 0 10.004-4.484 10.004-10.003C22.008 6.48 17.53 2 12.004 2zm0 18.003c-1.742 0-3.418-.466-4.887-1.348l-.35-.208-2.738.954.97-2.673-.228-.363a8.005 8.005 0 0 1-1.228-4.361c0-4.417 3.592-8.004 8.007-8.004 4.414 0 8.003 3.587 8.003 8.004 0 4.418-3.59 8.003-8.007 8.003zm4.39-6.002c-.24-.12-1.423-.7-1.644-.78-.22-.08-.382-.12-.544.12-.162.24-.626.78-.767.94-.14.162-.282.18-.523.06a7.35 7.35 0 0 1-1.942-1.2c-.752-.67-1.26-1.5-1.407-1.75-.147-.25-.015-.386.106-.505.11-.11.24-.28.36-.42.12-.14.162-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.544-1.31-.746-1.8-.198-.475-.4-.41-.544-.417l-.465-.008c-.162 0-.425.06-.648.3-.22.24-.85.83-.85 2.02 0 1.192.87 2.343.99 2.505.12.162 1.71 2.611 4.143 3.658.58.249 1.03.398 1.382.51.583.185 1.113.159 1.532.096.467-.07 1.423-.58 1.624-1.14.2-.56.2-1.04.14-1.14-.06-.1-.22-.16-.46-.28z"
            fill={color}
        />
    </Svg>
);

export const DiscordIcon = ({ size = 22, color }: { size?: number, color?: string }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
            d="M19.27 4.73a16.14 16.14 0 0 0-3.97-1.23.08.08 0 0 0-.08.04c-.17.3-.37.72-.5 1.03a14.88 14.88 0 0 0-5.44 0c-.13-.31-.33-.73-.5-1.03a.08.08 0 0 0-.08-.04 16.14 16.14 0 0 0-3.97 1.23.08.08 0 0 0-.03.03C1.66 9.77.92 14.67 1.3 19.54a.08.08 0 0 0 .03.05 16.27 16.27 0 0 0 4.9 2.48.08.08 0 0 0 .09-.03c.38-.52.72-1.07 1-1.66a.08.08 0 0 0-.04-.1 10.74 10.74 0 0 1-1.53-.73.08.08 0 0 1-.01-.13c.1-.07.2-.15.3-.23a.08.08 0 0 1 .08-.01c3.2 1.47 6.67 1.47 9.8 0a.08.08 0 0 1 .08.01c.1.08.2.16.3.23a.08.08 0 0 1-.01.13c-.48.28-.99.53-1.53.73a.08.08 0 0 0-.04.1c.29.59.63 1.14 1 1.66a.08.08 0 0 0 .09.03 16.26 16.26 0 0 0 4.9-2.48.08.08 0 0 0 .03-.05c.46-5.59-.78-10.45-3.32-14.78a.08.08 0 0 0-.03-.03zM8.52 14.83c-.92 0-1.69-.85-1.69-1.9s.75-1.89 1.69-1.89c.95 0 1.71.85 1.7 1.9-.01 1.05-.76 1.9-1.7 1.9zm6.97 0c-.93 0-1.69-.85-1.69-1.9s.75-1.89 1.69-1.89c.95 0 1.71.85 1.7 1.9-.01 1.05-.76 1.9-1.7 1.9z"
            fill={color}
        />
    </Svg>
);

// eslint-disable-next-line @typescript-eslint/no-require-imports
const logoBlack = require('../../assets/logo.png');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const logoWhite = require('../../assets/logo-white.png');


type Props = NativeStackScreenProps<RootStackParamList, 'About'>;

const AboutScreen: React.FC<Props> = memo(({ navigation }: Props) => {
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();
    const logo = currentTheme.mode === 'dark' ? logoWhite : logoBlack;

    const SOCIAL_DATA = useMemo(() => [
        { icon: Linkedin, color: currentTheme.colors.social.linkedin, url: 'https://www.linkedin.com/company/fresherflow-in' },
        { icon: Twitter, color: currentTheme.colors.social.twitter, url: 'https://twitter.com/Fresherflow' },
        { icon: DiscordIcon, color: '#5865F2', url: 'https://discord.gg/CcPAnWSHD' },
        { icon: WhatsAppIcon, color: '#25D366', url: 'https://whatsapp.com/channel/0029VbCkZu6FHWq0qJOOU73D' },
        { icon: Instagram, color: currentTheme.colors.social.instagram, url: 'https://instagram.com/fresherflow' },
        { icon: Facebook, color: currentTheme.colors.social.facebook, url: 'https://www.facebook.com/FresherFlow.in' },
        { icon: Send, color: currentTheme.colors.social.telegram, url: 'https://t.me/fresherflowin' },
    ], [currentTheme]);

    // Interactive Marquee Animation
    const translateX = useSharedValue(0);
    const startX = useSharedValue(0);
    const itemWidth = 56 + 12; // width + gap
    const totalWidth = itemWidth * SOCIAL_DATA.length;
    const isInteracting = useSharedValue(false);

    const startAutoScroll = useCallback(() => {
        if (isInteracting.value) return;
        
        // Wrap translateX to be within [-totalWidth, 0] cleanly
        let currentX = translateX.value % totalWidth;
        if (currentX > 0) currentX -= totalWidth;
        translateX.value = currentX;

        translateX.value = withRepeat(
            withTiming(currentX - totalWidth, { 
                duration: 20000, 
                easing: Easing.linear 
            }),
            -1,
            false
        );
    }, [totalWidth]);

    React.useEffect(() => {
        startAutoScroll();
        return () => cancelAnimation(translateX);
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
                    subtitle={`FresherFlow v${Constants.expoConfig?.version || '1.0.0'}`}
                    onBack={() => navigation.goBack()}
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
        marginBottom: 32,
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
        marginBottom: 40,
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
