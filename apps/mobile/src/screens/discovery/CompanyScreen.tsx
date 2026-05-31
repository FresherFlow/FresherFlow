import React, { memo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    Animated,
} from 'react-native';
import { openExternalURL } from '@/utils/browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Share2, Globe, Building2, Home, Copy, Linkedin, Twitter, Send, Instagram } from 'lucide-react-native';
import { WhatsAppIcon, DiscordIcon, ArattaiIcon } from '@/screens/settings/AboutScreen';
import { useTheme } from '@/contexts/ThemeContext';
import { JobCard } from '@/system/components/OpportunityCard';
import { saveDetailCache } from '@/utils/offlineCache';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { useSaved } from '@repo/frontend-core';
import { CompanyLogo } from '@repo/ui';
import { FlashList } from '@shopify/flash-list';
import { Opportunity } from '@fresherflow/types';
import { CommonActions } from '@react-navigation/native';
import { 
    BottomSheetModal, 
    BottomSheetView, 
    BottomSheetBackdrop,
    BottomSheetBackdropProps 
} from '@gorhom/bottom-sheet';
import * as Clipboard from 'expo-clipboard';
import { Share } from 'react-native';
import { shareToInstalledApp } from '@/utils/shareTargets';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { SPACING, mScale, RADIUS } from '@/system/constants/dimensions';
import { useCompany } from '@/hooks/useCompany';
import { SecondaryHeader, PremiumRefreshControl } from '@/system/components/PremiumPrimitives';
import { useToast } from '@/contexts/ToastContext';
import * as Haptics from 'expo-haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'CompanyDetail'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const CompanyScreen: React.FC<Props> = memo(({ navigation, route }: Props) => {
    const { companyName, companyLogoUrl, website, currentJob } = route.params;
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();
    const { isSaved, toggleSave } = useSaved();
    const { jobs, loading, refreshing, onRefresh } = useCompany(companyName, currentJob);
    const { showSuccess } = useToast();
    const fabAnim = React.useRef(new Animated.Value(0)).current;
    const shareSheetRef = React.useRef<BottomSheetModal>(null);

    const shareUrl = `https://fresherflow.in/company/${encodeURIComponent(companyName)}`;

    React.useEffect(() => {
        Animated.sequence([
            Animated.delay(600),
            Animated.spring(fabAnim, {
                toValue: 1,
                tension: 40,
                friction: 7,
                useNativeDriver: false,
            })
        ]).start();
    }, []);

    const handleToggleSave = (opportunity: Opportunity) => {
        const wasSaved = isSaved(opportunity.id);
        toggleSave(opportunity);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        showSuccess(wasSaved ? 'Opportunity removed from saves' : 'Opportunity saved successfully!');
    };

    const handleOpenShare = () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        shareSheetRef.current?.present();
    };

    const handleCopyLink = async () => {
        await Clipboard.setStringAsync(shareUrl);
        showSuccess('Company link copied to clipboard!');
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        shareSheetRef.current?.dismiss();
    };

    const handleWhatsApp = async () => {
        const text = `Hey! Check out active opportunities at ${companyName} on FresherFlow: ${shareUrl}`;
        await shareToInstalledApp({ target: 'whatsapp', message: text, url: shareUrl });
        shareSheetRef.current?.dismiss();
    };

    const handleLinkedIn = async () => {
        const message = `Check out active opportunities at ${companyName} on FresherFlow: ${shareUrl}`;
        await shareToInstalledApp({ target: 'linkedin', message, url: shareUrl });
        shareSheetRef.current?.dismiss();
    };

    const handleTwitter = async () => {
        const text = `Check out active opportunities at ${companyName} on @Fresherflow: ${shareUrl}`;
        await shareToInstalledApp({ target: 'twitter', message: text, url: shareUrl });
        shareSheetRef.current?.dismiss();
    };

    const handleTelegram = async () => {
        const text = `Check out active opportunities at ${companyName} on FresherFlow: ${shareUrl}`;
        await shareToInstalledApp({ target: 'telegram', message: text, url: shareUrl });
        shareSheetRef.current?.dismiss();
    };

    const handleDiscord = async () => {
        await Clipboard.setStringAsync(shareUrl);
        showSuccess('Link copied! Opening Discord...');
        await shareToInstalledApp({ target: 'discord', message: shareUrl, url: shareUrl });
        shareSheetRef.current?.dismiss();
    };

    const handleInstagram = async () => {
        await Clipboard.setStringAsync(shareUrl);
        showSuccess('Link copied! Opening Instagram...');
        await shareToInstalledApp({ target: 'instagram', message: shareUrl, url: shareUrl });
        shareSheetRef.current?.dismiss();
    };

    const handleArattai = async () => {
        await Clipboard.setStringAsync(shareUrl);
        showSuccess('Link copied! Opening Arattai...');
        await shareToInstalledApp({ target: 'arattai', message: shareUrl, url: shareUrl });
        shareSheetRef.current?.dismiss();
    };

    const handleSystemShare = async () => {
        try {
            await Share.share({
                message: `Check out active opportunities at ${companyName} on FresherFlow: ${shareUrl}`,
                url: shareUrl,
            });
        } catch (error) {
            console.error('System share failed:', error);
        }
        shareSheetRef.current?.dismiss();
    };

    const renderBackdrop = React.useCallback(
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
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />

            <View style={{ paddingTop: insets.top + 10, backgroundColor: currentTheme.colors.background }}>
                <SecondaryHeader
                    title=""
                    showBack={true}
                    onBack={() => navigation.goBack()}
                    rightSlot={
                        <TouchableOpacity
                            onPress={handleOpenShare}
                            style={[styles.actionBtn, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}
                        >
                            <Share2 size={20} color={currentTheme.colors.text} />
                        </TouchableOpacity>
                    }
                />
            </View>

            <FlashList<Opportunity>
                data={jobs}
                keyExtractor={(item) => item.id}
                // @ts-expect-error - estimatedItemSize exists but typing is bugged in this setup
                estimatedItemSize={180}
                refreshControl={
                    <PremiumRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <View style={styles.companyHero}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.companyTitle, { color: currentTheme.colors.text }]}>
                                    {companyName}
                                </Text>

                                <View style={styles.badgeRow}>
                                    <View style={[styles.badge, { backgroundColor: alpha(currentTheme.colors.success, 0.1) }]}>
                                        <Text style={[styles.badgeText, { color: currentTheme.colors.success }]}>OFFICIAL SOURCE</Text>
                                    </View>
                                    {website && (
                                        <TouchableOpacity 
                                            activeOpacity={0.7}
                                            onPress={() => {
                                                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                void openExternalURL(website, currentTheme.colors);
                                            }}
                                            style={[styles.badge, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}
                                        >
                                            <Globe size={10} color={currentTheme.colors.primary} />
                                            <Text style={[styles.badgeText, { color: currentTheme.colors.primary }]}>WEBSITE</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </View>

                            <View style={[styles.logoContainer, { backgroundColor: currentTheme.colors.surface, shadowColor: '#000000', marginBottom: 0 }]}>
                                <CompanyLogo
                                    name={companyName}
                                    logoUrl={companyLogoUrl}
                                    website={website}
                                    size={mScale(72)}
                                />
                            </View>
                        </View>

                        <Text style={[styles.companyBio, { color: currentTheme.colors.textMuted }]}>
                            Direct entry-level and internship opportunities from {companyName}'s official career portals.
                        </Text>

                        <View style={[styles.divider, { backgroundColor: alpha(currentTheme.colors.border, 0.1) }]} />

                        <View style={styles.feedHeader}>
                            <Building2 size={16} color={currentTheme.colors.textMuted} />
                            <Text style={[styles.feedTitle, { color: currentTheme.colors.textMuted }]}>
                                {jobs.length > 0 ? `${jobs.length} ACTIVE OPPORTUNITIES` : 'FETCHING OPPORTUNITIES...'}
                            </Text>
                        </View>
                    </View>
                }
                renderItem={({ item, index }) => (
                    <JobCard
                        opportunity={item}
                        index={index}
                        onPress={() => {
                            void saveDetailCache(item);
                            navigation.navigate('JobDetail', { opportunity: item, opportunityId: item.id });
                        }}
                        onSave={() => handleToggleSave(item)}
                        isSaved={isSaved(item.id)}
                    />
                )}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyState}>
                            <Text style={[styles.emptyText, { color: currentTheme.colors.textMuted }]}>
                                No active listings found for this company right now.
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.loadingState}>
                            <ActivityIndicator size="large" color={currentTheme.colors.primary} />
                        </View>
                    )
                }
                contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
            />

            {/* Back to Home FAB */}
            <Animated.View
                style={[
                    styles.fabContainer,
                    {
                        bottom: insets.bottom + 20,
                        width: fabAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [56, 180]
                        })
                    }
                ]}
            >
                <TouchableOpacity
                    activeOpacity={0.9}
                    style={[styles.homeFab, { backgroundColor: currentTheme.colors.primary }]}
                    onPress={() => {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                        navigation.dispatch(
                            CommonActions.reset({
                                index: 0,
                                routes: [{ name: 'Main' }],
                            })
                        );
                    }}
                >
                    <View style={styles.fabInner}>
                        <Animated.View style={{
                            overflow: 'hidden',
                            width: fabAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 110]
                            }),
                            opacity: fabAnim,
                            marginRight: fabAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0, 8]
                            })
                        }}>
                            <Text style={[styles.homeFabText, { color: currentTheme.colors.background }]} numberOfLines={1}>
                                BACK TO FEED
                            </Text>
                        </Animated.View>
                        <Home size={20} color={currentTheme.colors.background} />
                    </View>
                </TouchableOpacity>
            </Animated.View>

            {/* Share Bottom Sheet */}
            <BottomSheetModal
                ref={shareSheetRef}
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
                        <View style={[styles.logoContainer, { width: 52, height: 52, borderRadius: 16, backgroundColor: currentTheme.colors.surface, shadowColor: '#000000', marginBottom: 0, shadowOffset: { width: 0, height: 4 }, shadowRadius: 8, elevation: 2 }]}>
                            <CompanyLogo
                                name={companyName}
                                logoUrl={companyLogoUrl}
                                website={website}
                                size={mScale(36)}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.shareSheetTitle, { color: currentTheme.colors.text }]} numberOfLines={1}>Share {companyName}</Text>
                            <Text style={[styles.shareSheetSubtitle, { color: currentTheme.colors.textMuted, marginTop: 2, marginBottom: 0 }]} numberOfLines={1}>
                                Share active opportunities at this company
                            </Text>
                        </View>
                    </View>
                    
                    <View style={styles.shareGrid}>
                        <TouchableOpacity onPress={handleWhatsApp} style={styles.shareItem}>
                            <View style={[styles.shareIconBox, { backgroundColor: alpha('#25D366', 0.08), borderColor: alpha('#25D366', 0.1), borderWidth: 1 }]}>
                                <WhatsAppIcon size={26} color="#25D366" />
                            </View>
                            <Text style={[styles.shareItemLabel, { color: currentTheme.colors.text }]} numberOfLines={1}>WhatsApp</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleLinkedIn} style={styles.shareItem}>
                            <View style={[styles.shareIconBox, { backgroundColor: alpha('#0077B5', 0.08), borderColor: alpha('#0077B5', 0.1), borderWidth: 1 }]}>
                                <Linkedin size={26} color="#0077B5" />
                            </View>
                            <Text style={[styles.shareItemLabel, { color: currentTheme.colors.text }]} numberOfLines={1}>LinkedIn</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleTwitter} style={styles.shareItem}>
                            <View style={[styles.shareIconBox, { backgroundColor: alpha(currentTheme.colors.social?.twitter || '#1DA1F2', 0.08), borderColor: alpha(currentTheme.colors.social?.twitter || '#1DA1F2', 0.1), borderWidth: 1 }]}>
                                <Twitter size={26} color={currentTheme.colors.social?.twitter || '#1DA1F2'} />
                            </View>
                            <Text style={[styles.shareItemLabel, { color: currentTheme.colors.text }]} numberOfLines={1}>Twitter / X</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleTelegram} style={styles.shareItem}>
                            <View style={[styles.shareIconBox, { backgroundColor: alpha(currentTheme.colors.social?.telegram || '#0088cc', 0.08), borderColor: alpha(currentTheme.colors.social?.telegram || '#0088cc', 0.1), borderWidth: 1 }]}>
                                <Send size={26} color={currentTheme.colors.social?.telegram || '#0088cc'} />
                            </View>
                            <Text style={[styles.shareItemLabel, { color: currentTheme.colors.text }]} numberOfLines={1}>Telegram</Text>
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

                        <TouchableOpacity onPress={handleArattai} style={styles.shareItem}>
                            <View style={[styles.shareIconBox, { backgroundColor: alpha('#0A7CFF', 0.08), borderColor: alpha('#0A7CFF', 0.1), borderWidth: 1 }]}>
                                <ArattaiIcon size={26} color="#F9B21D" />
                            </View>
                            <Text style={[styles.shareItemLabel, { color: currentTheme.colors.text }]} numberOfLines={1}>Arattai</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={handleCopyLink} style={styles.shareItem}>
                            <View style={[styles.shareIconBox, { backgroundColor: alpha(currentTheme.colors.text, 0.05), borderColor: alpha(currentTheme.colors.text, 0.08), borderWidth: 1 }]}>
                                <Copy size={26} color={currentTheme.colors.text} />
                            </View>
                            <Text style={[styles.shareItemLabel, { color: currentTheme.colors.text }]} numberOfLines={1}>Copy Link</Text>
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
        </Screen>
    );
});

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingBottom: 12,
        zIndex: 10,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    companyHero: {
        paddingHorizontal: SPACING.lg,
        paddingTop: 20,
        paddingBottom: 24,
    },
    logoContainer: {
        width: mScale(80),
        height: mScale(80),
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
        // shadowColor removed as it is overridden dynamically
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 3,
    },
    companyTitle: {
        fontSize: mScale(30),
        fontWeight: '900',
        letterSpacing: -1.0,
        lineHeight: mScale(36),
    },
    badgeRow: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    companyBio: {
        fontSize: 15,
        lineHeight: 22,
        marginTop: 20,
        opacity: 0.8,
    },
    divider: {
        height: 1,
        width: '100%',
        marginTop: 32,
        marginBottom: 24,
    },
    feedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    feedTitle: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
    },
    emptyState: {
        paddingTop: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        textAlign: 'center',
    },
    loadingState: {
        paddingTop: 40,
    },
    fabContainer: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        alignItems: 'flex-end',
        zIndex: 100,
    },
    homeFab: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 56,
        borderRadius: 28,
    },
    fabInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingHorizontal: 16,
    },
    homeFabText: {
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 1,
    },
    shareSheetContent: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 8,
    },
    shareSheetTitle: {
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    shareSheetSubtitle: {
        fontSize: 14,
        marginTop: 4,
        opacity: 0.7,
        marginBottom: 24,
    },
    shareGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 4,
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

export default CompanyScreen;
