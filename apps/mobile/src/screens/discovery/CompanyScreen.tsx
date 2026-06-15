import React, { memo, useCallback, useState, useMemo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    Animated,
    Image,
} from 'react-native';
import { openExternalURL } from '@/utils/browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Share2, Globe, Building2, Home, Copy, Linkedin, Twitter, Send, Instagram, PlayCircle, FolderOpen, Compass, ExternalLink, Bookmark, FileText } from 'lucide-react-native';
import { WhatsAppIcon, DiscordIcon, ArattaiIcon } from '@/system/components/SocialIcons';
import { useTheme } from '@/contexts/ThemeContext';
import { JobCard } from '@/system/components/OpportunityCard';
import { saveDetailCache } from '@/utils/cache/offlineCache';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { useSaved } from '@repo/frontend-core';
import { CompanyLogo } from '@repo/ui';
import { FlashList } from '@shopify/flash-list';
import { Opportunity } from '@fresherflow/types';
import { slugify } from '@fresherflow/utils';
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
import { useFollows } from '@/hooks/useFollows';
import { useAuthStore } from '@/store/useAuthStore';
import { SecondaryHeader, PremiumRefreshControl, SurfaceCard } from '@/system/components/PremiumPrimitives';
import { useToast } from '@/contexts/ToastContext';
import { ResourceCollectionCard } from '@/system/components/ResourceCollectionCard';
import * as Haptics from 'expo-haptics';
import { useResourcesFeed } from '@/hooks/useResourcesFeed';
import { useSavedJobs } from '@/hooks/useSavedJobs';
import { useSavedItems } from '@/hooks/useSavedItems';

type Props = NativeStackScreenProps<RootStackParamList, 'CompanyDetail'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const CompanyScreen: React.FC<Props> = memo(({ navigation, route }: Props) => {
    const { companyName, companyLogoUrl, website, currentJob, initialTab } = route.params;
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();
    const { isSaved, toggleSave } = useSaved();
    const { jobs, loading, refreshing, onRefresh } = useCompany(companyName, currentJob);
    const { isFollowing, follow, unfollow } = useFollows();
    const { user } = useAuthStore();
    const isAnonymous = !user || user.isAnonymous;
    const { showSuccess } = useToast();
    const fabAnim = React.useRef(new Animated.Value(0)).current;
    const shareSheetRef = React.useRef<BottomSheetModal>(null);

    const [activeTab, setActiveTab] = useState<'JOBS' | 'RESOURCES'>(initialTab || 'JOBS');
    const { getResourcesByGroup, resources } = useResourcesFeed();
    const { isSavedResource, toggleSaveResource } = useSavedJobs();
    const { isItemSaved, toggleSaveItem } = useSavedItems();
    const companyResources = useMemo(() => {
        const companySpecific = getResourcesByGroup('COMPANY', companyName.toLowerCase().replace(/\s+/g, '-'));
        
        if (companySpecific.length > 0) {
            return companySpecific;
        }

        // Fallback: If no company-specific resource guides exist, collect unique skills required by this company's active jobs
        const activeJobSkills = new Set<string>();
        jobs.forEach((job) => {
            if (job.requiredSkills) {
                job.requiredSkills.forEach((skill) => {
                    activeJobSkills.add(skill.toLowerCase().trim());
                });
            }
        });

        if (activeJobSkills.size === 0) return [];

        // Return all resource collections matching these skills
        return resources.filter((res) => 
            res.skills.some((skill) => activeJobSkills.has(skill.toLowerCase().trim()))
        );
    }, [companyName, getResourcesByGroup, jobs, resources]);

    // Derive colour from URL — URL is the single source of truth
    const getColorByUrl = (url: string, opacity: number = 1) => {
        const u = url.toLowerCase();
        let hex = currentTheme.colors.primary;
        if (u.includes('youtube.com') || u.includes('youtu.be')) hex = '#EF4444';
        else if (u.endsWith('.pdf')) hex = '#EA580C';
        else if (u.includes('roadmap.sh')) hex = '#3B82F6';
        else if (
            u.includes('drive.google.com') ||
            u.includes('dropbox.com') ||
            u.includes('onedrive') ||
            u.includes('box.com') ||
            u.includes('sharepoint')
        ) hex = '#10B981';
        else hex = '#8B5CF6';
        return alpha(hex, opacity);
    };

    const getIconByUrl = (url: string) => {
        const size = 20;
        const u = url.toLowerCase();
        const color = getColorByUrl(url, 1);
        if (u.includes('youtube.com') || u.includes('youtu.be')) return <PlayCircle size={size} color={color} />;
        if (u.endsWith('.pdf')) return <FileText size={size} color={color} />;
        if (u.includes('roadmap.sh')) return <Compass size={size} color={color} />;
        if (
            u.includes('drive.google.com') ||
            u.includes('dropbox.com') ||
            u.includes('onedrive') ||
            u.includes('box.com') ||
            u.includes('sharepoint')
        ) {
            return (u.includes('folder') || u.includes('folders') || u.includes('id='))
                ? <FolderOpen size={size} color={color} />
                : <FileText size={size} color={color} />;
        }
        return <Globe size={size} color={color} />;
    };


    const companyKey = React.useMemo(() => website || companyName, [website, companyName]);
    const followingCompany = isFollowing('COMPANY', companyKey);

    const shareUrl = `https://fresherflow.in/companies/${slugify(companyName)}`;

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

    const handleToggleFollow = async () => {
        if (isAnonymous) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            showSuccess('Please sign in to follow companies');
            navigation.navigate('Auth');
            return;
        }

        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            if (followingCompany) {
                const success = await unfollow('COMPANY', companyKey);
                if (success) {
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    showSuccess(`Alerts disabled for ${companyName}`);
                }
            } else {
                const success = await follow('COMPANY', companyKey);
                if (success) {
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    showSuccess(`You will now get alerts for ${companyName}`);
                }
            }
        } catch (error) {
            if (__DEV__) { console.error('Failed to toggle follow:', error) }
        }
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
        const text = `Hey! Check out active opportunities at ${companyName} on FresherFlow:\n${shareUrl}`;
        await shareToInstalledApp({ target: 'whatsapp', message: text, url: shareUrl });
        shareSheetRef.current?.dismiss();
    };

    const handleLinkedIn = async () => {
        const message = `Check out active opportunities at ${companyName} on FresherFlow:\n${shareUrl}`;
        await shareToInstalledApp({ target: 'linkedin', message, url: shareUrl });
        shareSheetRef.current?.dismiss();
    };

    const handleTwitter = async () => {
        const text = `Check out active opportunities at ${companyName} on @Fresherflow:\n${shareUrl}`;
        await shareToInstalledApp({ target: 'twitter', message: text, url: shareUrl });
        shareSheetRef.current?.dismiss();
    };

    const handleTelegram = async () => {
        const text = `Check out active opportunities at ${companyName} on FresherFlow:\n${shareUrl}`;
        await shareToInstalledApp({ target: 'telegram', message: text, url: shareUrl });
        shareSheetRef.current?.dismiss();
    };

    const handleDiscord = async () => {
        await Clipboard.setStringAsync(shareUrl);
        showSuccess('Link copied! Opening Discord...');
        await shareToInstalledApp({ target: 'discord', message: shareUrl, url: shareUrl });
        shareSheetRef.current?.dismiss();
    };

    const handleBack = useCallback(() => {
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            navigation.dispatch(
                CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'Main' }],
                })
            );
        }
    }, [navigation]);

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
                message: `Check out active opportunities at ${companyName} on FresherFlow:\n${shareUrl}`,
                url: shareUrl,
            });
        } catch (error) {
            if (__DEV__) { console.error('System share failed:', error) }
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
                    onBack={handleBack}
                    rightSlot={
                        <TouchableOpacity
                            onPress={handleOpenShare}
                            style={[styles.actionBtn, { backgroundColor: 'transparent' }]}
                        >
                            <Share2 size={20} color={currentTheme.colors.text} />
                        </TouchableOpacity>
                    }
                />
            </View>

            <FlashList<any>
                data={activeTab === 'JOBS' ? jobs : companyResources}
                keyExtractor={(item) => item.id}
                // @ts-expect-error - estimatedItemSize exists but typing is bugged in this setup
                estimatedItemSize={180}
                refreshControl={
                    <PremiumRefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <View style={styles.companyHero}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                            <View style={[styles.logoContainer, { backgroundColor: currentTheme.colors.surface, shadowColor: '#000000', marginBottom: 0 }]}>
                                <CompanyLogo
                                    name={companyName}
                                    logoUrl={companyLogoUrl}
                                    website={website}
                                    size={mScale(96)}
                                />
                            </View>

                            <View style={{ flex: 1 }}>
                                <Text style={[styles.companyTitle, { color: currentTheme.colors.text }]}>
                                    {companyName}
                                </Text>
                            </View>
                        </View>

                        <View style={[styles.badgeRow, { marginTop: 12, justifyContent: 'space-between', alignItems: 'center' }]}>
                            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', flex: 1 }}>
                                <View style={[styles.badge, { backgroundColor: alpha(currentTheme.colors.success, 0.1) }]}>
                                    <Text style={[styles.badgeText, { color: currentTheme.colors.success }]}>OFFICIAL</Text>
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
                            <TouchableOpacity 
                                activeOpacity={0.7}
                                onPress={handleToggleFollow}
                                style={[
                                    styles.badge, 
                                    { 
                                        backgroundColor: followingCompany 
                                            ? currentTheme.colors.primary 
                                            : alpha(currentTheme.colors.primary, 0.1),
                                        marginLeft: 12
                                    }
                                ]}
                            >
                                <Text style={[
                                    styles.badgeText, 
                                    { 
                                        color: followingCompany 
                                            ? currentTheme.colors.background 
                                            : currentTheme.colors.primary 
                                    }
                                ]}>
                                    {followingCompany ? 'Following' : 'Follow'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.companyBio, { color: currentTheme.colors.textMuted }]}>
                            Direct entry-level and internship opportunities from {companyName}'s official career portals.
                        </Text>

                        <View style={[styles.divider, { backgroundColor: alpha(currentTheme.colors.border, 0.1) }]} />

                        {/* Premium Sliding Segmented Tab Controller */}
                        <View style={[styles.tabBar, { backgroundColor: alpha(currentTheme.colors.text, 0.02) }]}>
                            <TouchableOpacity
                                activeOpacity={0.9}
                                onPress={() => {
                                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setActiveTab('JOBS');
                                }}
                                style={[
                                    styles.tabBtn,
                                    activeTab === 'JOBS' && { backgroundColor: currentTheme.colors.background, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
                                ]}
                            >
                                <Text style={[styles.tabBtnText, { color: activeTab === 'JOBS' ? currentTheme.colors.text : currentTheme.colors.textMuted }]}>
                                    Opportunities ({jobs.length})
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                activeOpacity={0.9}
                                onPress={() => {
                                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setActiveTab('RESOURCES');
                                }}
                                style={[
                                    styles.tabBtn,
                                    activeTab === 'RESOURCES' && { backgroundColor: currentTheme.colors.background, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 },
                                ]}
                            >
                                <Text style={[styles.tabBtnText, { color: activeTab === 'RESOURCES' ? currentTheme.colors.text : currentTheme.colors.textMuted }]}>
                                    Prep Pack ({companyResources.length})
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.feedHeader, { marginTop: 20 }]}>
                            {activeTab === 'JOBS' ? (
                                <>
                                    <Building2 size={16} color={currentTheme.colors.textMuted} />
                                    <Text style={[styles.feedTitle, { color: currentTheme.colors.textMuted }]}>
                                        {jobs.length > 0 ? `${jobs.length} ACTIVE OPPORTUNITIES` : 'FETCHING OPPORTUNITIES...'}
                                    </Text>
                                </>
                            ) : (
                                <>
                                    <PlayCircle size={16} color={currentTheme.colors.textMuted} />
                                    <Text style={[styles.feedTitle, { color: currentTheme.colors.textMuted }]}>
                                        {companyResources.length > 0 ? `${companyResources.length} CURATED PREP GUIDES` : 'NO GUIDES ADDED YET'}
                                    </Text>
                                </>
                            )}
                        </View>
                    </View>
                }
                renderItem={({ item, index }) => {
                    if (activeTab === 'JOBS') {
                        const opportunity = item as Opportunity;
                        return (
                            <JobCard
                                opportunity={opportunity}
                                index={index}
                                onPress={() => {
                                    void saveDetailCache(opportunity);
                                    navigation.navigate('JobDetail', { opportunity, opportunityId: opportunity.id });
                                }}
                                onSave={() => handleToggleSave(opportunity)}
                                isSaved={isSaved(opportunity.id)}
                            />
                        );
                    } else {
                        const res = item;
                        return (
                            <View style={{ marginHorizontal: SPACING.lg }}>
                                <ResourceCollectionCard
                                    collection={res}
                                    isSaved={isSavedResource(res.id)}
                                    onToggleSave={() => toggleSaveResource(res)}
                                    onPressTitle={() => navigation.navigate('ResourceCollectionDetail', { collectionId: res.id, collectionTitle: res.title })}
                                    onPressViewAll={() => navigation.navigate('ResourceCollectionDetail', { collectionId: res.id, collectionTitle: res.title })}
                                    isItemSaved={isItemSaved}
                                    onToggleSaveItem={(item) => toggleSaveItem(item.id)}
                                />
                            </View>
                        );
                    }
                }}
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyState}>
                            <Text style={[styles.emptyText, { color: currentTheme.colors.textMuted }]}>
                                {activeTab === 'JOBS' 
                                    ? 'No active listings found for this company right now.'
                                    : 'No prep resources shared for this company yet.'}
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
        width: mScale(96),
        height: mScale(96),
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
    tabBar: {
        height: 48,
        borderRadius: 14,
        flexDirection: 'row',
        padding: 4,
        alignItems: 'center',
    },
    tabBtn: {
        flex: 1,
        height: '100%',
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabBtnText: {
        fontSize: 12,
        fontWeight: '800',
    },
    resourceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        gap: 14,
    },
    iconWrapper: {
        width: 44,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resourceTitle: {
        fontSize: 14,
        fontWeight: '800',
        lineHeight: 18,
    },
    resourceTypeBadge: {
        fontSize: 8,
        fontWeight: '900',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        textTransform: 'uppercase',
    },
    miniSkillTag: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
    },
    miniSkillTagText: {
        fontSize: 8,
        fontWeight: '800',
    },
    youtubePreviewContainer: {
        marginTop: 8,
        borderRadius: 12,
        borderWidth: 1,
        overflow: 'hidden',
        position: 'relative',
        aspectRatio: 16 / 9,
        width: '100%',
    },
    youtubeThumbnail: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    playButtonOverlay: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
    },
    playButtonCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default CompanyScreen;
