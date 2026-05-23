import React, { memo, useRef, useCallback } from 'react';
import { FlashList } from '@shopify/flash-list';
import { Opportunity } from '@fresherflow/types';

import * as Haptics from 'expo-haptics';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    StatusBar,
    NativeSyntheticEvent,
    NativeScrollEvent,
    ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    LayoutDashboard,
    Search,
    Bookmark,
    Send,
    Trophy,
    Calendar
} from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { PremiumHeader, PremiumRefreshControl } from '@/system/components/PremiumPrimitives';

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Dashboard'>;


import { useUI } from '@/contexts/UIContext';
import { useProfile } from '@/hooks/useProfile';

import { useDashboard } from '@/hooks/useDashboard';
import { JobCard } from '@/system/components/OpportunityCard';
import { saveDetailCache } from '@/utils/offlineCache';
import { useSaved } from '@repo/frontend-core';

import { useStreak } from '@/hooks/useStreak';
import { Flame } from 'lucide-react-native';

import { useAuthStore } from '@/store/useAuthStore';
import { UsernameNudgeCard } from '@/system/components/UsernameNudgeCard';

const getContributorRank = (sharesCount: number) => {
    if (sharesCount === 0) return 'Newbie';
    if (sharesCount < 5) return 'Seed';
    if (sharesCount < 10) return 'Active';
    if (sharesCount < 25) return 'Star';
    return 'Champion';
};

const DashboardScreen: React.FC<Props> = memo(({ navigation }: Props) => {
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();
    const { hideTabBar, showTabBar } = useUI();
    const { user } = useAuthStore();
    const { highlights, recentActivity, latestJobs, appliedJobs, loading, refresh } = useDashboard();
    const { isSaved, toggleSave } = useSaved();
    const { shareStats } = useProfile();
    const [activeTab, setActiveTab] = React.useState<'featured' | 'latest' | 'expiring' | 'applied'>('featured');
    
    // Track daily login streak
    const { streakCount } = useStreak();

    // Track scroll position for hide/show tab bar
    const scrollOffset = useRef(0);

    const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const currentOffset = event.nativeEvent.contentOffset.y;
        const direction = currentOffset > scrollOffset.current ? 'down' : 'up';

        if (Math.abs(currentOffset - scrollOffset.current) > 20) {
            if (direction === 'down' && currentOffset > 100) {
                hideTabBar();
            } else if (direction === 'up' || currentOffset < 50) {
                showTabBar();
            }
            scrollOffset.current = currentOffset;
        }
    }, [hideTabBar, showTabBar]);

    const filteredItems = React.useMemo(() => {
        switch (activeTab) {
            case 'latest': return latestJobs;
            case 'applied': return appliedJobs;
            case 'expiring': return highlights?.urgent?.deadlines || [];
            default: return recentActivity.length > 0 ? recentActivity : latestJobs.slice(0, 5);
        }
    }, [activeTab, latestJobs, appliedJobs, highlights, recentActivity]);

    const renderHeader = () => (
        <View style={{ backgroundColor: currentTheme.colors.background }}>
            <View style={styles.headerArea}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 24 }}>
                    <View style={{ flex: 1 }}>
                        <PremiumHeader
                            title="Dashboard"
                            subtitle="Your Career Pulse"
                        />
                    </View>
                    {streakCount > 0 && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: alpha(currentTheme.colors.error, 0.1), paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: alpha(currentTheme.colors.error, 0.2) }}>
                            <Flame size={16} color={currentTheme.colors.error} style={{ marginRight: 4 }} />
                            <Text style={{ color: currentTheme.colors.error, fontWeight: '800', fontSize: 13 }}>{streakCount} Day</Text>
                        </View>
                    )}
                </View>

                <View style={styles.statsGrid}>
                    <TouchableOpacity
                        onPress={() => setActiveTab('featured')}
                        style={[styles.statCard, { backgroundColor: alpha(currentTheme.colors.primary, 0.05), borderRadius: 16, borderWidth: activeTab === 'featured' ? 1 : 0, borderColor: currentTheme.colors.primary }]}
                    >
                        <View style={[styles.statIcon, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                            <Bookmark size={16} color={currentTheme.colors.primary} />
                        </View>
                        <Text style={[styles.statValue, { color: currentTheme.colors.text }]}>{recentActivity.length}</Text>
                        <Text style={[styles.statLabel, { color: currentTheme.colors.textMuted }]}>Saved</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => setActiveTab('applied')}
                        style={[styles.statCard, { backgroundColor: alpha(currentTheme.colors.success, 0.05), borderRadius: 16, borderWidth: activeTab === 'applied' ? 1 : 0, borderColor: currentTheme.colors.success }]}
                    >
                        <View style={[styles.statIcon, { backgroundColor: alpha(currentTheme.colors.success, 0.1) }]}>
                            <Send size={16} color={currentTheme.colors.success} />
                        </View>
                        <Text style={[styles.statValue, { color: currentTheme.colors.text }]}>
                            {appliedJobs.length}
                        </Text>
                        <Text style={[styles.statLabel, { color: currentTheme.colors.textMuted }]}>Applied</Text>
                    </TouchableOpacity>
                    {user?.username && (
                        <View style={[styles.statCard, { backgroundColor: alpha(currentTheme.colors.warning, 0.05), borderRadius: 16 }]}>
                            <View style={[styles.statIcon, { backgroundColor: alpha(currentTheme.colors.warning, 0.1) }]}>
                                <Trophy size={16} color={currentTheme.colors.warning} />
                            </View>
                            <Text style={[styles.statValue, { color: currentTheme.colors.text }]} numberOfLines={1}>
                                {getContributorRank(shareStats.totalShared)}
                            </Text>
                            <Text style={[styles.statLabel, { color: currentTheme.colors.textMuted }]}>Rank</Text>
                        </View>
                    )}
                </View>

                {!user?.username && (
                    <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
                        <UsernameNudgeCard />
                    </View>
                )}

                {/* Dashboard Tabs (Parity with Web) */}
                <View style={styles.tabContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
                        {[
                            { id: 'featured', label: 'Featured' },
                            { id: 'latest', label: 'Latest' },
                            { id: 'expiring', label: 'Expiring' },
                            { id: 'applied', label: 'Applied' }
                        ].map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <TouchableOpacity
                                    key={tab.id}
                                    onPress={() => {
                                        setActiveTab(tab.id as 'featured' | 'latest' | 'expiring' | 'applied');
                                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }}
                                    style={[styles.tab, isActive && { backgroundColor: currentTheme.colors.text }]}
                                >
                                    <Text style={[styles.tabText, { color: isActive ? currentTheme.colors.background : currentTheme.colors.textMuted }]}>
                                        {tab.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* Deadline Radar Section - Only show if not on expiring tab */}
                {activeTab !== 'expiring' && highlights?.urgent?.deadlines && highlights.urgent.deadlines.length > 0 && (
                    <View style={styles.discoverySection}>
                        <View style={styles.sectionHeaderNoPad}>
                            <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Deadline Radar</Text>
                            <TouchableOpacity onPress={() => setActiveTab('expiring')}>
                                <Text style={[styles.seeAll, { color: currentTheme.colors.primary }]}>See All</Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.deadlineScroll}
                        >
                            {highlights.urgent.deadlines.slice(0, 5).map((opp) => (
                                <TouchableOpacity
                                    key={opp.id}
                                    activeOpacity={0.8}
                                    style={[styles.deadlineCard, { backgroundColor: alpha(currentTheme.colors.error, 0.05), borderColor: alpha(currentTheme.colors.error, 0.1) }]}
                                    onPress={() => {
                                        void saveDetailCache(opp);
                                        navigation.navigate('JobDetail', { opportunity: opp, opportunityId: opp.id });
                                    }}
                                >
                                    <View style={[styles.deadlineBadge, { backgroundColor: alpha(currentTheme.colors.inverseText, 0.1) }]}>
                                        <Text style={[styles.deadlineBadgeText, { color: currentTheme.colors.error }]}>Urgent</Text>
                                    </View>
                                    <Text style={[styles.deadlineTitle, { color: currentTheme.colors.text }]} numberOfLines={1}>{opp.title}</Text>
                                    <Text style={[styles.deadlineCompany, { color: currentTheme.colors.textMuted }]} numberOfLines={1}>{opp.company}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                )}

                {/* Active Hiring Drives Section */}
                {highlights?.driveMilestones && highlights.driveMilestones.length > 0 && (
                    <View style={styles.discoverySection}>
                        <View style={styles.sectionHeaderNoPad}>
                            <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>Active Hiring Drives</Text>
                            <View style={[styles.deadlineBadge, { backgroundColor: alpha(currentTheme.colors.primary, 0.1), paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }]}>
                                <Text style={[styles.deadlineBadgeText, { color: currentTheme.colors.primary }]}>MEGA DRIVES</Text>
                            </View>
                        </View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.deadlineScroll}
                        >
                            {highlights.driveMilestones.map((milestone) => {
                                const formattedDate = milestone.eventDate 
                                    ? new Date(milestone.eventDate).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric'
                                      })
                                    : 'Ongoing';
                                return (
                                    <TouchableOpacity
                                        key={milestone.eventId}
                                        activeOpacity={0.8}
                                        style={[
                                            styles.deadlineCard,
                                            { 
                                                backgroundColor: alpha(currentTheme.colors.primary, 0.03), 
                                                borderColor: alpha(currentTheme.colors.primary, 0.15),
                                                borderWidth: 1,
                                                width: 220 
                                            }
                                        ]}
                                        onPress={() => {
                                            if (milestone.opportunity) {
                                                void saveDetailCache(milestone.opportunity as Opportunity);
                                                navigation.navigate('JobDetail', { 
                                                    opportunity: milestone.opportunity as Opportunity, 
                                                    opportunityId: milestone.opportunityId 
                                                });
                                            }
                                        }}
                                    >
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                            <View style={[styles.deadlineBadge, { backgroundColor: alpha(currentTheme.colors.warning, 0.1), paddingHorizontal: 6, paddingVertical: 2 }]}>
                                                <Text style={[styles.deadlineBadgeText, { color: currentTheme.colors.warning }]}>
                                                    {milestone.eventType.replace('_', ' ')}
                                                </Text>
                                            </View>
                                            <Calendar size={12} color={currentTheme.colors.primary} />
                                        </View>
                                        <Text style={[styles.deadlineTitle, { color: currentTheme.colors.text }]} numberOfLines={1}>
                                            {milestone.opportunity?.company || 'Drive Milestone'}
                                        </Text>
                                        <Text style={[styles.deadlineCompany, { color: currentTheme.colors.textMuted, marginBottom: 4 }]} numberOfLines={1}>
                                            {milestone.opportunity?.title || milestone.eventTitle}
                                        </Text>
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: currentTheme.colors.primary }}>
                                            📅 {milestone.eventTitle}: {formattedDate}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: currentTheme.colors.text }]}>
                        {activeTab === 'featured' ? 'Recently Activity' : activeTab === 'latest' ? 'Latest Openings' : activeTab === 'applied' ? 'Applied Jobs' : 'Closing Soon'}
                    </Text>
                </View>
            </View>
        </View>
    );

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconBox, { backgroundColor: alpha(currentTheme.colors.primary, 0.05) }]}>
                <LayoutDashboard size={48} color={currentTheme.colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: currentTheme.colors.text }]}>No Activity Yet</Text>
            <Text style={[styles.emptySub, { color: currentTheme.colors.textMuted }]}>
                {activeTab === 'applied' ? "You haven't applied to any jobs yet." : "No jobs found in this category."}
            </Text>
            <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: currentTheme.colors.primary }]}
                onPress={() => navigation.navigate('Explore')}
            >
                <Search size={18} color={currentTheme.colors.background} />
                <Text style={[styles.actionBtnText, { color: currentTheme.colors.background }]}>Find Jobs</Text>
            </TouchableOpacity>
        </View>
    );

    const paddingTopOs = insets.top + 10;


    return (
        <Screen safe={false}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />

            <FlashList<Opportunity>
                data={filteredItems}
                keyExtractor={(item) => item.id}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                // @ts-expect-error - FlashList typing bug with estimatedItemSize
                estimatedItemSize={160}
                renderItem={({ item, index }) => (
                    <JobCard
                        opportunity={item}
                        index={index}
                        onPress={() => {
                            void saveDetailCache(item);
                            navigation.navigate('JobDetail', { opportunity: item, opportunityId: item.id });
                        }}
                        onSave={() => toggleSave(item)}
                        isSaved={isSaved(item.id)}
                    />
                )}
                ListHeaderComponent={renderHeader}
                ListEmptyComponent={renderEmpty}
                contentContainerStyle={[styles.scrollContent, { paddingTop: paddingTopOs + 20 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <PremiumRefreshControl refreshing={loading} onRefresh={refresh} />
                }
            />
        </Screen>
    );
});

const styles = StyleSheet.create({
    stickyHeader: {
        zIndex: 10,
    },
    scrollContent: {
        paddingBottom: 100,
        paddingTop: 12,
    },
    headerArea: {
        marginBottom: 8,
    },
    tabContainer: {
        marginTop: 24,
        marginBottom: 8,
    },
    tabScroll: {
        paddingHorizontal: 20,
        gap: 8,
    },
    tab: {
        borderRadius: 20,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    statsGrid: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 12,
        marginTop: 20,
    },
    statCard: {
        flex: 1,
        padding: 16,
        alignItems: 'center',
    },
    statIcon: {
        width: 32,
        height: 32,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    statValue: {
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    statLabel: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
        marginTop: 4,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginTop: 32,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.5,
    },
    seeAll: {
        fontSize: 13,
        fontWeight: '700',
    },
    applicationWrapper: {
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 40,
        paddingHorizontal: 40,
    },
    emptyIconBox: {
        width: 100,
        height: 100,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.5,
        marginBottom: 8,
    },
    emptySub: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    actionBtn: {
        height: 54,
        paddingHorizontal: 24,
        borderRadius: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    actionBtnText: {
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 1,
    },
    discoverySection: {
        marginTop: 32,
    },
    sectionHeaderNoPad: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    deadlineScroll: {
        paddingHorizontal: 20,
        gap: 12,
    },
    deadlineCard: {
        width: 180,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
    },
    deadlineBadge: {
        borderRadius: 6,
        alignSelf: 'flex-start',
        marginBottom: 8,
    },
    deadlineBadgeText: {
        fontSize: 8,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    deadlineTitle: {
        fontSize: 14,
        fontWeight: '800',
        marginBottom: 4,
    },
    deadlineCompany: {
        fontSize: 11,
        fontWeight: '600',
    }
});

export default DashboardScreen;
