import React, { forwardRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Share, Image } from 'react-native';
import { 
    BottomSheetModal, 
    BottomSheetView, 
    BottomSheetBackdrop,
    BottomSheetBackdropProps 
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { Share2, Copy, Linkedin, Twitter, Send, Instagram } from 'lucide-react-native';
import { WhatsAppIcon, DiscordIcon } from '@/system/components/SocialIcons';
import { CompanyLogo } from '@repo/ui';
import { useTheme } from '@/contexts/ThemeContext';
import { alpha } from '@/theme';
import { RADIUS } from '@/system/constants/dimensions';
import { useToast } from '@/contexts/ToastContext';
import { shareToInstalledApp } from '@/utils/shareTargets';
import { MOBILE_SITE_URL } from '@/utils/runtime';

export const SHARE_APP_MESSAGE = `Join the FresherFlow community! 🚀\n\nFresherFlow is a community-first platform where students and freshers help each other discover verified job opportunities, internships, and referrals. No spam, no fluff — just pure opportunities.\n\nJoin us here:\n${MOBILE_SITE_URL}/app`;

export const ShareAppBottomSheet = forwardRef<BottomSheetModal>((props, ref) => {
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();
    const { showToast } = useToast();

    const renderBackdrop = useCallback(
        (props: BottomSheetBackdropProps) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.5}
            />
        ),
        []
    );

    const dismissSheet = () => {
        if (ref && 'current' in ref && ref.current) {
            ref.current.dismiss();
        }
    };

    const handleWhatsApp = useCallback(async () => {
        await shareToInstalledApp({ target: 'whatsapp', message: SHARE_APP_MESSAGE, url: `${MOBILE_SITE_URL}/app` });
        dismissSheet();
    }, []);

    const handleLinkedIn = useCallback(async () => {
        await shareToInstalledApp({ target: 'linkedin', message: SHARE_APP_MESSAGE, url: `${MOBILE_SITE_URL}/app` });
        dismissSheet();
    }, []);

    const handleTwitter = useCallback(async () => {
        await shareToInstalledApp({ target: 'twitter', message: SHARE_APP_MESSAGE, url: `${MOBILE_SITE_URL}/app` });
        dismissSheet();
    }, []);

    const handleTelegram = useCallback(async () => {
        await shareToInstalledApp({ target: 'telegram', message: SHARE_APP_MESSAGE, url: `${MOBILE_SITE_URL}/app` });
        dismissSheet();
    }, []);

    const handleDiscord = useCallback(async () => {
        await shareToInstalledApp({ target: 'discord', message: SHARE_APP_MESSAGE, url: `${MOBILE_SITE_URL}/app` });
        dismissSheet();
    }, []);

    const handleInstagram = useCallback(async () => {
        await shareToInstalledApp({ target: 'instagram', message: SHARE_APP_MESSAGE, url: `${MOBILE_SITE_URL}/app` });
        dismissSheet();
    }, []);

    const handleArattai = useCallback(async () => {
        await shareToInstalledApp({ target: 'arattai', message: SHARE_APP_MESSAGE, url: `${MOBILE_SITE_URL}/app` });
        dismissSheet();
    }, []);

    const handleCopyLink = useCallback(async () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await Clipboard.setStringAsync(`${MOBILE_SITE_URL}/app`);
        showToast('Link copied to clipboard', 'success');
        dismissSheet();
    }, [showToast]);

    const handleSystemShare = useCallback(async () => {
        try {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await Share.share({
                message: SHARE_APP_MESSAGE,
            });
            dismissSheet();
        } catch (error) {
            console.error('Failed to share app', error);
        }
    }, []);

    return (
        <BottomSheetModal
            ref={ref}
            snapPoints={['48%']}
            index={0}
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            backgroundStyle={{ 
                backgroundColor: currentTheme.colors.surface,
                borderTopLeftRadius: RADIUS.xl * 1.5,
                borderTopRightRadius: RADIUS.xl * 1.5,
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: -4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
                elevation: 10,
            }}
            handleIndicatorStyle={{ 
                backgroundColor: alpha(currentTheme.colors.text, 0.15),
                width: 36,
                height: 5,
                borderRadius: 2.5,
            }}
        >
            <BottomSheetView style={[styles.shareSheetContent, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                    <View style={[styles.logoContainer, { width: 52, height: 52, borderRadius: 16, backgroundColor: currentTheme.colors.surface, shadowColor: '#000000', marginBottom: 0, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, elevation: 2, overflow: 'hidden' }]}>
                        <Image source={require('../../../assets/icon.png')} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.shareSheetTitle, { color: currentTheme.colors.text }]} numberOfLines={1}>FresherFlow</Text>
                        <Text style={[styles.shareSheetSubtitle, { color: currentTheme.colors.textMuted, marginTop: 2, marginBottom: 0 }]} numberOfLines={2}>
                            Share the ultimate app for freshers and early professionals
                        </Text>
                    </View>
                </View>
                
                <TouchableOpacity 
                    onPress={handleCopyLink} 
                    style={[styles.copyLinkBtn, { backgroundColor: alpha(currentTheme.colors.text, 0.04), borderColor: alpha(currentTheme.colors.text, 0.08) }]}
                >
                    <View style={styles.copyLinkContent}>
                        <View style={[styles.copyLinkIcon, { backgroundColor: currentTheme.colors.surface }]}>
                            <Copy size={20} color={currentTheme.colors.text} />
                        </View>
                        <Text style={[styles.copyLinkText, { color: currentTheme.colors.text }]}>Copy Link</Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.shareGrid}>
                    <TouchableOpacity onPress={handleArattai} style={styles.shareItem}>
                        <View style={[styles.shareIconBox, { backgroundColor: alpha('#0A7CFF', 0.08), borderColor: alpha('#0A7CFF', 0.1), borderWidth: 1, padding: 0 }]}>
                            <CompanyLogo name="Arattai" website="https://arattai.in" size={26} />
                        </View>
                        <Text style={[styles.shareItemLabel, { color: currentTheme.colors.text }]} numberOfLines={1}>Arattai</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleDiscord} style={styles.shareItem}>
                        <View style={[styles.shareIconBox, { backgroundColor: alpha('#5865F2', 0.08), borderColor: alpha('#5865F2', 0.1), borderWidth: 1 }]}>
                            <DiscordIcon size={26} color="#5865F2" />
                        </View>
                        <Text style={[styles.shareItemLabel, { color: currentTheme.colors.text }]} numberOfLines={1}>Discord</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleInstagram} style={styles.shareItem}>
                        <View style={[styles.shareIconBox, { backgroundColor: alpha(currentTheme.colors.social?.instagram || '#E1306C', 0.08), borderColor: alpha(currentTheme.colors.social?.instagram || '#E1306C', 0.1), borderWidth: 1 }]}>
                            <Instagram size={26} color={currentTheme.colors.social?.instagram || '#E1306C'} />
                        </View>
                        <Text style={[styles.shareItemLabel, { color: currentTheme.colors.text }]} numberOfLines={1}>Instagram</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleLinkedIn} style={styles.shareItem}>
                        <View style={[styles.shareIconBox, { backgroundColor: alpha('#0077B5', 0.08), borderColor: alpha('#0077B5', 0.1), borderWidth: 1 }]}>
                            <Linkedin size={26} color="#0077B5" />
                        </View>
                        <Text style={[styles.shareItemLabel, { color: currentTheme.colors.text }]} numberOfLines={1}>LinkedIn</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleTelegram} style={styles.shareItem}>
                        <View style={[styles.shareIconBox, { backgroundColor: alpha(currentTheme.colors.social?.telegram || '#0088cc', 0.08), borderColor: alpha(currentTheme.colors.social?.telegram || '#0088cc', 0.1), borderWidth: 1 }]}>
                            <Send size={26} color={currentTheme.colors.social?.telegram || '#0088cc'} />
                        </View>
                        <Text style={[styles.shareItemLabel, { color: currentTheme.colors.text }]} numberOfLines={1}>Telegram</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleTwitter} style={styles.shareItem}>
                        <View style={[styles.shareIconBox, { backgroundColor: alpha(currentTheme.colors.social?.twitter || '#1DA1F2', 0.08), borderColor: alpha(currentTheme.colors.social?.twitter || '#1DA1F2', 0.1), borderWidth: 1 }]}>
                            <Twitter size={26} color={currentTheme.colors.social?.twitter || '#1DA1F2'} />
                        </View>
                        <Text style={[styles.shareItemLabel, { color: currentTheme.colors.text }]} numberOfLines={1}>Twitter / X</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleWhatsApp} style={styles.shareItem}>
                        <View style={[styles.shareIconBox, { backgroundColor: alpha('#25D366', 0.08), borderColor: alpha('#25D366', 0.1), borderWidth: 1 }]}>
                            <WhatsAppIcon size={26} color="#25D366" />
                        </View>
                        <Text style={[styles.shareItemLabel, { color: currentTheme.colors.text }]} numberOfLines={1}>WhatsApp</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={handleSystemShare} style={styles.shareItem}>
                        <View style={[styles.shareIconBox, { backgroundColor: alpha(currentTheme.colors.primary, 0.08), borderColor: alpha(currentTheme.colors.primary, 0.1), borderWidth: 1 }]}>
                            <Share2 size={26} color={currentTheme.colors.primary} />
                        </View>
                        <Text style={[styles.shareItemLabel, { color: currentTheme.colors.text }]} numberOfLines={1}>More</Text>
                    </TouchableOpacity>
                </View>
            </BottomSheetView>
        </BottomSheetModal>
    );
});

ShareAppBottomSheet.displayName = 'ShareAppBottomSheet';

const styles = StyleSheet.create({
    shareSheetContent: {
        paddingHorizontal: 20,
        paddingTop: 12,
        flex: 1,
    },
    logoContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    shareSheetTitle: {
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    shareSheetSubtitle: {
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
    },
    shareGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: 24,
    },
    shareItem: {
        width: '25%',
        alignItems: 'center',
    },
    shareIconBox: {
        width: 52,
        height: 52,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
        overflow: 'hidden',
    },
    shareItemLabel: {
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center',
    },
    copyLinkBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 24,
    },
    copyLinkContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    copyLinkIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    copyLinkText: {
        fontSize: 15,
        fontWeight: '700',
    }
});
