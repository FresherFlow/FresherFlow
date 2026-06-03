import React, { useCallback, useMemo, useRef, useEffect } from 'react';
import { View, BackHandler, StyleSheet, Text, TouchableOpacity, Share } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView, BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OpportunityActionSheetContent } from './OpportunityActionSheet';
import { useUIStore } from '@/store/useUIStore';
import { useTheme } from '@/contexts/ThemeContext';
import { alpha } from '@/theme';
import { RADIUS, SPACING, mScale } from '../constants/dimensions';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useToast } from '@/contexts/ToastContext';
import { CompanyLogo } from '@repo/ui';
import { WhatsAppIcon, DiscordIcon, ArattaiIcon } from '@/system/components/SocialIcons';
import { Copy, Linkedin, Twitter, Send, Instagram, Share2, X } from 'lucide-react-native';
import { Opportunity } from '@fresherflow/types';
import { shareToInstalledApp } from '@/utils/shareTargets';

export const GlobalActionSheet = () => {
    const { currentTheme } = useTheme();
    const insets = useSafeAreaInsets();
    const { isOpen, opportunity, close } = useUIStore(s => s.actionSheet);
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['65%'], []);

    useEffect(() => {
        if (isOpen && opportunity) {
            bottomSheetModalRef.current?.present();
        } else {
            bottomSheetModalRef.current?.dismiss();
        }
    }, [isOpen, opportunity]);

    useEffect(() => {
        const handleBackPress = () => {
            if (isOpen) {
                close();
                return true;
            }
            return false;
        };

        const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
        return () => subscription.remove();
    }, [isOpen, close]);

    const handleSheetChanges = useCallback((index: number) => {
        if (index <= -1) {
            close();
        }
    }, [close]);

    const renderBackdrop = useCallback(
        (props: BottomSheetBackdropProps) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.4}
                pressBehavior="close"
            />
        ),
        []
    );

    return (
        <>
            <BottomSheetModal
                ref={bottomSheetModalRef}
                snapPoints={snapPoints}
                index={0}
                enablePanDownToClose
                backdropComponent={renderBackdrop}
                onChange={handleSheetChanges}
                key={opportunity?.id || 'empty-action-sheet'}
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
                <BottomSheetView style={{ flex: 1, paddingBottom: Math.max(insets.bottom, SPACING.lg) }}>
                    {opportunity ? (
                        <OpportunityActionSheetContent 
                            opportunity={opportunity} 
                            onClose={close}
                        />
                    ) : (
                        <View style={{ height: 100 }} />
                    )}
                </BottomSheetView>
            </BottomSheetModal>
            <GlobalShareSheet />
        </>
    );
};

const GlobalShareSheet = () => {
    const { currentTheme } = useTheme();
    const insets = useSafeAreaInsets();
    const { showSuccess } = useToast();
    const { isOpen, opportunity, fromScreen, close } = useUIStore(s => s.shareSheet);
    const bottomSheetModalRef = useRef<BottomSheetModal>(null);
    
    // Dynamically adjust height depending on whether we show the Copy Link card
    const snapPoints = useMemo(() => {
        return fromScreen === 'inside' ? ['58%'] : ['46%'];
    }, [fromScreen]);

    useEffect(() => {
        if (isOpen && opportunity) {
            bottomSheetModalRef.current?.present();
        } else {
            bottomSheetModalRef.current?.dismiss();
        }
    }, [isOpen, opportunity]);

    useEffect(() => {
        const handleBackPress = () => {
            if (isOpen) {
                close();
                return true;
            }
            return false;
        };

        const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
        return () => subscription.remove();
    }, [isOpen, close]);

    const handleSheetChanges = useCallback((index: number) => {
        if (index <= -1) {
            close();
        }
    }, [close]);

    const getPublicOpportunityPath = (opp: Opportunity) => {
        const slugOrId = encodeURIComponent(opp.slug || opp.id);
        if (opp.type === 'INTERNSHIP') return `/internships/${slugOrId}`;
        if (opp.type === 'WALKIN') return `/walk-ins/details/${slugOrId}`;
        return `/jobs/${slugOrId}`;
    };

    const shareUrl = useMemo(() => {
        if (!opportunity) return '';
        return `https://fresherflow.in${getPublicOpportunityPath(opportunity)}`;
    }, [opportunity]);

    const handleCopyLink = async () => {
        if (!shareUrl) return;
        await Clipboard.setStringAsync(shareUrl);
        showSuccess('Opportunity link copied to clipboard!');
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        close();
    };

    const handleCopyApplyLink = async () => {
        if (!opportunity?.applyLink) return;
        await Clipboard.setStringAsync(opportunity.applyLink);
        showSuccess('Apply link copied to clipboard!');
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        close();
    };

    const handleWhatsApp = async () => {
        if (!opportunity || !shareUrl) return;
        const text = `Hey! Check out this opportunity at ${opportunity.company}: ${opportunity.title} on FresherFlow:\n${shareUrl}`;
        await shareToInstalledApp({ target: 'whatsapp', message: text, url: shareUrl });
        close();
    };

    const handleLinkedIn = async () => {
        if (!opportunity || !shareUrl) return;
        const text = `Check out this opportunity at ${opportunity.company}: ${opportunity.title} on FresherFlow:\n${shareUrl}`;
        await shareToInstalledApp({ target: 'linkedin', message: text, url: shareUrl });
        close();
    };

    const handleTwitter = async () => {
        if (!opportunity || !shareUrl) return;
        const text = `Check out this opportunity at ${opportunity.company}: ${opportunity.title} on @Fresherflow:\n${shareUrl}`;
        await shareToInstalledApp({ target: 'twitter', message: text, url: shareUrl });
        close();
    };

    const handleTelegram = async () => {
        if (!opportunity || !shareUrl) return;
        const text = `Check out this opportunity at ${opportunity.company}: ${opportunity.title} on FresherFlow:\n${shareUrl}`;
        await shareToInstalledApp({ target: 'telegram', message: text, url: shareUrl });
        close();
    };

    const handleDiscord = async () => {
        if (!shareUrl) return;
        await Clipboard.setStringAsync(shareUrl);
        showSuccess('Link copied! Opening Discord...');
        await shareToInstalledApp({ target: 'discord', message: shareUrl, url: shareUrl });
        close();
    };

    const handleInstagram = async () => {
        if (!shareUrl) return;
        await Clipboard.setStringAsync(shareUrl);
        showSuccess('Link copied! Opening Instagram...');
        await shareToInstalledApp({ target: 'instagram', message: shareUrl, url: shareUrl });
        close();
    };

    const handleArattai = async () => {
        if (!shareUrl) return;
        await Clipboard.setStringAsync(shareUrl);
        showSuccess('Link copied! Opening Arattai...');
        await shareToInstalledApp({ target: 'arattai', message: shareUrl, url: shareUrl });
        close();
    };

    const handleSystemShare = async () => {
        if (!opportunity || !shareUrl) return;
        try {
            await Share.share({
                message: `Check out this opportunity at ${opportunity.company}: ${opportunity.title} on FresherFlow:\n${shareUrl}`,
                url: shareUrl,
            });
        } catch (error) {
            console.error('System share failed:', error);
        }
        close();
    };

    const renderBackdrop = useCallback(
        (props: BottomSheetBackdropProps) => (
            <BottomSheetBackdrop
                {...props}
                disappearsOnIndex={-1}
                appearsOnIndex={0}
                opacity={0.4}
                pressBehavior="close"
            />
        ),
        []
    );

    if (!opportunity) return null;

    const shareItems = [
        { label: 'Arattai', icon: ArattaiIcon, color: '#F9B21D', onPress: handleArattai },
        { label: 'Discord', icon: DiscordIcon, color: '#5865F2', onPress: handleDiscord },
        { label: 'Instagram', icon: Instagram, color: currentTheme.colors.social?.instagram || '#E1306C', onPress: handleInstagram },
        { label: 'LinkedIn', icon: Linkedin, color: '#0077B5', onPress: handleLinkedIn },
        { label: 'Telegram', icon: Send, color: currentTheme.colors.social?.telegram || '#0088cc', onPress: handleTelegram },
        { label: 'Twitter / X', icon: Twitter, color: currentTheme.colors.social?.twitter || '#1DA1F2', onPress: handleTwitter },
        { label: 'WhatsApp', icon: WhatsAppIcon, color: '#25D366', onPress: handleWhatsApp },
        { label: 'More', icon: Share2, color: currentTheme.colors.primary, onPress: handleSystemShare },
    ];

    return (
        <BottomSheetModal
            ref={bottomSheetModalRef}
            snapPoints={snapPoints}
            index={0}
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            onChange={handleSheetChanges}
            key={opportunity?.id ? `share-${opportunity.id}` : 'empty-share-sheet'}
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
                {/* 100% Symmetrical Header matching step 0 exactly */}
                <View style={styles.header}>
                    <CompanyLogo
                        name={opportunity.company}
                        logoUrl={opportunity.companyLogoUrl ?? undefined}
                        website={opportunity.companyWebsite ?? undefined}
                        size={mScale(52)}
                    />
                    <View style={styles.headerText}>
                        <Text style={[styles.title, { color: currentTheme.colors.text }]} numberOfLines={2}>
                            {opportunity.title}
                        </Text>
                        <Text style={[styles.company, { color: currentTheme.colors.textMuted }]}>
                            {opportunity.company}
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={close}
                        style={[styles.closeBtn, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}
                    >
                        <X size={20} color={currentTheme.colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Show Copy Link horizontal card ONLY when opened from Inside */}
                {fromScreen === 'inside' && opportunity.applyLink && (
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={handleCopyApplyLink}
                        style={[styles.linkPreview, { backgroundColor: alpha(currentTheme.colors.text, 0.03), borderColor: alpha(currentTheme.colors.border, 0.1) }]}
                    >
                        <View style={styles.linkIconBox}>
                            <Copy size={16} color={currentTheme.colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.linkLabel, { color: currentTheme.colors.textMuted }]}>APPLY LINK (TAP TO COPY)</Text>
                            <Text style={[styles.linkText, { color: currentTheme.colors.primary }]} numberOfLines={2}>
                                {opportunity.applyLink}
                            </Text>
                        </View>
                    </TouchableOpacity>
                )}
                
                <View style={styles.shareGrid}>
                    {shareItems.map((item, idx) => {
                        const IconComponent = item.icon;
                        return (
                            <TouchableOpacity key={idx} onPress={item.onPress} style={styles.shareItem} activeOpacity={0.8}>
                                <View style={[styles.shareIconBox, { backgroundColor: alpha(item.color, 0.08), borderColor: alpha(item.color, 0.1), borderWidth: 1 }]}>
                                    <IconComponent size={26} color={item.color} />
                                </View>
                                <Text style={[styles.shareItemLabel, { color: currentTheme.colors.text }]} numberOfLines={1}>{item.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </BottomSheetView>
        </BottomSheetModal>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        gap: 16,
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontSize: mScale(18),
        fontWeight: '800',
        letterSpacing: -0.5,
        lineHeight: 24,
    },
    company: {
        fontSize: mScale(14),
        fontWeight: '500',
        marginTop: 2,
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    linkPreview: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        flexDirection: 'row',
        gap: 12,
        marginHorizontal: 24,
        marginBottom: 20,
    },
    linkIconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    linkLabel: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 4,
    },
    linkText: {
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 18,
    },
    shareSheetContent: {
        flex: 1,
        paddingTop: 8,
    },
    shareGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 28,
        rowGap: 22,
    },
    shareItem: {
        alignItems: 'center',
        width: '22%',
        gap: 6,
    },
    shareIconBox: {
        width: 58,
        height: 58,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    shareItemLabel: {
        fontSize: 11,
        fontWeight: '700',
        textAlign: 'center',
        width: '100%',
    },
});
