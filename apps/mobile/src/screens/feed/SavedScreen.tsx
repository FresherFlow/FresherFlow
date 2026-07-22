import React, { memo, useCallback, useRef } from 'react';
import { FlashList } from '@shopify/flash-list';

import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ActivityIndicator,
    StatusBar,
    NativeSyntheticEvent,
    NativeScrollEvent,
    Platform,
    Animated,
    Linking,
    Image,
    InteractionManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bookmark, Compass, Bell, ExternalLink, PlayCircle, FolderOpen, Globe, FileText } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useScrollToTop, useFocusEffect } from '@react-navigation/native';
import { useScrollTracker } from '@/hooks/useScrollTracker';
import { useSavedJobs } from '@/hooks/useSavedJobs';
import { useSavedItems } from '@/hooks/useSavedItems';
import { openExternalURL } from '@/utils/browser';
import { Opportunity } from '@fresherflow/types';
import { JobCard } from '@/system/components/OpportunityCard';
import { saveDetailCache } from '@/utils/cache/offlineCache';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { mScale, SPACING, RADIUS } from '@/system/constants/dimensions';
import { TYPOGRAPHY } from '@/system/constants/typography';
import { useNotifications } from '@/hooks/useNotifications';
import { UsernameNudgeCard } from '@/system/components/UsernameNudgeCard';
import { useSectorStore } from '@/store/useSectorStore';
import { GovtJobCard } from '@/system/components/GovtJobCard';
import { ResourcePreviewCard } from '@/system/components/ResourcePreviewCard';
import { useFeedStore } from '@/store/useFeedStore';
import { ResourceCollectionCard } from '@/system/components/ResourceCollectionCard';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { PremiumHeader, PremiumRefreshControl, ScrollToTopButton, SurfaceCard } from '@/system/components/PremiumPrimitives';

type Props = NativeStackScreenProps<RootStackParamList, 'SavedList'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

import { useUI } from '@/contexts/UIContext';
import { useSaved } from '@repo/frontend-core';
import { useToast } from '@/contexts/ToastContext';

const SavedScreen: React.FC<Props> = memo(({ navigation }: Props) => {
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();
    const { sector } = useSectorStore();
    const { savedJobs, savedResources, isSavedResource, toggleSaveResource, loading, refresh } = useSavedJobs();
    const { isItemSaved, toggleSaveItem } = useSavedItems();
    const { hideTabBar, showTabBar } = useUI();
    const { unreadCount } = useNotifications();
    const { isSaved, toggleSave } = useSaved();
    const { showSuccess } = useToast();
    const openedIds = useFeedStore(s => s.openedIds);
    
    const [activeTab, setActiveTab] = React.useState<'JOBS' | 'RESOURCES'>('JOBS');
    const flashListRef = React.useRef<any>(null);

    const { showScrollTop, handleScroll, scrollOffset } = useScrollTracker({
        threshold: 1200,
        scrollUpRequired: 200,
        hideShowTabBar: true
    });

    const smoothScrollToTop = useCallback(() => {
        if (!flashListRef.current) return;
        
        if (scrollOffset.current > 2000) {
            flashListRef.current.scrollToOffset({ offset: 0, animated: false });
        } else {
            flashListRef.current.scrollToOffset({ offset: 0, animated: true });
        }
    }, []);

    const scrollToTopRef = useRef({ scrollToTop: smoothScrollToTop });
    useScrollToTop(scrollToTopRef);

    useFocusEffect(
        useCallback(() => {
            const task = InteractionManager.runAfterInteractions(() => {
                void useFeedStore.getState().refreshBehavioralData();
            });
            return () => task.cancel();
        }, [])
    );

    const handleToggleSave = useCallback((opportunity: Opportunity) => {
        const wasSaved = isSaved(opportunity.id);
        toggleSave(opportunity);
        showSuccess(wasSaved ? 'Opportunity removed from saved' : 'Opportunity saved successfully!');
    }, [isSaved, toggleSave, showSuccess]);

    // scroll handling is coordinated by useScrollTracker above

    const renderEmpty = useCallback(() => {
        return (
            <View style={styles.emptyContainer}>
                {loading ? (
                    <ActivityIndicator size="large" color={currentTheme.colors.primary} />
                ) : (
                    <Animated.View style={{ alignItems: 'center', width: '100%' }}>
                        <View style={[styles.emptyIcon, { backgroundColor: alpha(currentTheme.colors.primary, 0.05) }]}>
                            <Bookmark size={48} color={currentTheme.colors.primary} />
                        </View>
                        <Text style={[styles.emptyTitle, { color: currentTheme.colors.text, textAlign: 'center' }]}>Library Empty</Text>
                        <Text style={[styles.emptySub, { color: currentTheme.colors.textMuted }]}>
                            {activeTab === 'JOBS' ? "Opportunities you save will appear here for quick access later." : "Resources you save will appear here."}
                        </Text>
                        
                        {activeTab === 'JOBS' && (
                            <TouchableOpacity 
                                activeOpacity={0.9} 
                                style={[styles.exploreBtn, { backgroundColor: currentTheme.colors.primary }]}
                                onPress={() => navigation.navigate('Explore')}
                            >
                                <Compass size={18} color={currentTheme.colors.background} />
                                <Text style={[styles.exploreBtnText, { color: currentTheme.colors.background }]}>Explore Roles</Text>
                            </TouchableOpacity>
                        )}
                    </Animated.View>
                )}
            </View>
        );
    }, [loading, currentTheme, navigation, activeTab]);

    const filteredSavedJobs = React.useMemo(() => {
        if (!savedJobs) return [];
        return savedJobs.filter((job) => {
            if (sector === 'GOVERNMENT') {
                return job.type === 'GOVERNMENT';
            } else {
                return job.type !== 'GOVERNMENT';
            }
        });
    }, [savedJobs, sector]);

    const listData = React.useMemo(() => {
        if (activeTab === 'RESOURCES') {
            return [{ id: 'nudge-header-item', isHeader: true } as any, ...savedResources];
        }
        return [{ id: 'nudge-header-item', isHeader: true } as any, ...filteredSavedJobs];
    }, [filteredSavedJobs, savedResources, activeTab]);

    const handleGovtJobPress = useCallback((opportunity: Opportunity) => {
        void useFeedStore.getState().markAsOpened(opportunity.id);
        navigation.navigate('GovtJobDetail', { opportunity, opportunityId: opportunity.id });
    }, [navigation]);

    const handleJobPress = useCallback((opportunity: Opportunity) => {
        void useFeedStore.getState().markAsOpened(opportunity.id);
        navigation.navigate('JobDetail', { opportunity, opportunityId: opportunity.id });
    }, [navigation]);

    const renderItem = useCallback(({ item, index }: { item: any, index: number }) => {
        if (item.isHeader) {
            const currentList = activeTab === 'JOBS' ? filteredSavedJobs : savedResources;
            return (
                <View style={{ paddingBottom: 16 }}>

                    <UsernameNudgeCard />
                    
                    <View style={{ flexDirection: 'row', gap: 12, marginTop: 24, marginBottom: 8, paddingHorizontal: SPACING.lg }}>
                        <TouchableOpacity
                            onPress={() => setActiveTab('JOBS')}
                            style={{
                                paddingHorizontal: 16,
                                paddingVertical: 8,
                                borderRadius: 12,
                                backgroundColor: activeTab === 'JOBS' ? currentTheme.colors.text : 'transparent',
                            }}
                        >
                            <Text style={{
                                fontSize: 13,
                                fontWeight: '800',
                                color: activeTab === 'JOBS' ? currentTheme.colors.background : currentTheme.colors.textMuted
                            }}>Jobs</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            onPress={() => setActiveTab('RESOURCES')}
                            style={{
                                paddingHorizontal: 16,
                                paddingVertical: 8,
                                borderRadius: 12,
                                backgroundColor: activeTab === 'RESOURCES' ? currentTheme.colors.text : 'transparent',
                            }}
                        >
                            <Text style={{
                                fontSize: 13,
                                fontWeight: '800',
                                color: activeTab === 'RESOURCES' ? currentTheme.colors.background : currentTheme.colors.textMuted
                            }}>Resources</Text>
                        </TouchableOpacity>
                    </View>

                    {!loading && currentList.length > 0 ? (
                        <View style={styles.resultsHeader}>
                            <Text style={[styles.resultsText, { color: currentTheme.colors.textMuted }]}>
                                {currentList.length} Saved {activeTab === 'JOBS' ? 'Opportunities' : 'Resources'}
                            </Text>
                        </View>
                    ) : (
                        currentList.length === 0 ? renderEmpty() : null
                    )}
                </View>
            );
        }

        if (activeTab === 'RESOURCES') {
            const res = item;
            return (
                <View style={{ paddingHorizontal: SPACING.lg }}>
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

        if (sector === 'GOVERNMENT') {
            return (
                <GovtJobCard
                    opportunity={item}
                    index={index - 1}
                    onPress={handleGovtJobPress}
                    isSaved={isSaved(item.id)}
                    onSave={handleToggleSave}
                    isViewed={openedIds.has(item.id)}
                />
            );
        }

        return (
            <JobCard
                opportunity={item}
                index={index - 1}
                onPress={handleJobPress}
                isSaved={isSaved(item.id)}
                onSave={handleToggleSave}
                isViewed={openedIds.has(item.id)}
            />
        );
    }, [filteredSavedJobs, savedResources, activeTab, isSavedResource, toggleSaveResource, renderEmpty, loading, currentTheme, isSaved, handleToggleSave, navigation, sector, openedIds, handleGovtJobPress, handleJobPress]);

    return (
        <Screen safe={false}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />

            <FlashList<Opportunity & { isHeader?: boolean }>
                ref={flashListRef}
                data={listData}
                extraData={{ savedJobs, isSaved }}
                keyExtractor={(item) => item.id}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                stickyHeaderIndices={[0]}
                // @ts-expect-error - FlashList typing bug with estimatedItemSize
                estimatedItemSize={180}
                drawDistance={2500}
                renderItem={renderItem}
                ListHeaderComponent={
                    <View style={{
                        backgroundColor: currentTheme.colors.background,
                        paddingTop: insets.top,
                        paddingBottom: 4,
                    }}>
                        <PremiumHeader
                            title="Library"
                            rightSlot={
                                <TouchableOpacity 
                                    onPress={() => navigation.navigate('Notifications')}
                                    style={styles.notificationBtn}
                                >
                                    <Bell size={24} color={currentTheme.colors.text} />
                                    {unreadCount > 0 && (
                                        <View style={[styles.badge, { backgroundColor: currentTheme.colors.primary, borderColor: currentTheme.colors.background }]} />
                                    )}
                                </TouchableOpacity>
                            }
                        />
                    </View>
                }
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <PremiumRefreshControl refreshing={loading} onRefresh={refresh} />
                }
            />

            <ScrollToTopButton visible={showScrollTop} onPress={smoothScrollToTop} bottomOffset={insets.bottom + 110} />
        </Screen>
    );
});

const styles = StyleSheet.create({
    stickyHeader: {
        zIndex: 10,
    },
    notificationBtn: {
        width: mScale(44),
        height: mScale(44),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: -SPACING.sm,
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    scrollContent: {
        paddingBottom: 100,
    },
    resultsHeader: {
        paddingHorizontal: SPACING.lg,
        marginTop: SPACING.md,
        marginBottom: SPACING.sm,
    },
    resultsText: {
        ...TYPOGRAPHY.label,
    },
    cardWrapper: {
        paddingHorizontal: SPACING.lg,
        marginBottom: SPACING.md,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
        paddingHorizontal: 40,
    },
    emptyIcon: {
        width: mScale(100),
        height: mScale(100),
        borderRadius: RADIUS.xl,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.lg,
    },
    emptyTitle: {
        fontSize: mScale(20),
        fontWeight: '800',
        letterSpacing: -0.5,
        marginBottom: 8,
    },
    emptySub: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    exploreBtn: {
        height: 52,
        paddingHorizontal: 24,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    exploreBtnText: {
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 1,
    },

    resourceCard: {
        marginBottom: 16,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    }
});

export default memo(SavedScreen);
