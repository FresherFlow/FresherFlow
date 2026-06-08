import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { useTheme } from '@/contexts/ThemeContext';
import { useMyShares, SharedResource } from '@/hooks/useMyShares';
import { useSavedJobs } from '@/hooks/useSavedJobs';
import { Screen } from '@/system/layout/Layout';
import { SecondaryHeader, PremiumRefreshControl } from '@/system/components/PremiumPrimitives';
import { ContributionPreviewCard } from '@/system/components/ContributionPreviewCard';
import { ResourcePreviewCard } from '@/system/components/ResourcePreviewCard';
import { saveDetailCache } from '@/utils/cache/offlineCache';
import { SPACING, mScale } from '@/system/constants/dimensions';
import { Zap, BookOpen, Link2, ExternalLink } from 'lucide-react-native';
import * as Linking from 'expo-linking';
import { TouchableOpacity } from 'react-native-gesture-handler';

type Props = NativeStackScreenProps<RootStackParamList, 'MyShares'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const MySharesScreen: React.FC<Props> = ({ route, navigation }) => {
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();
    const { shares, resources, stats, loading, refreshing, loadMore, refresh } = useMyShares();
    const { isSavedResource, toggleSaveResource } = useSavedJobs();

    const [activeTab, setActiveTab] = React.useState<'JOBS' | 'RESOURCES'>(route.params?.initialTab || 'JOBS');

    const renderHeader = () => (
        <View style={styles.headerStats}>
            <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: currentTheme.colors.text }]}>{stats.totalShared}</Text>
                    <Text style={[styles.statLabel, { color: currentTheme.colors.textMuted }]}>Shared</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: currentTheme.colors.border }]} />
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: currentTheme.colors.text }]}>{stats.totalPublished}</Text>
                    <Text style={[styles.statLabel, { color: currentTheme.colors.textMuted }]}>Live</Text>
                </View>
                <View style={[styles.statDivider, { backgroundColor: currentTheme.colors.border }]} />
                <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: currentTheme.colors.text }]}>{stats.approvalRate}%</Text>
                    <Text style={[styles.statLabel, { color: currentTheme.colors.textMuted }]}>Approval</Text>
                </View>
            </View>
        </View>
    );

    const renderJobItem = ({ item }: { item: import('@/hooks/useMyShares').Share }) => {
        return (
            <ContributionPreviewCard
                share={item}
                onPress={() => {
                    if (item.mappedOpportunity) {
                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        const opp = item.mappedOpportunity as unknown as import('@fresherflow/types').Opportunity;
                        void saveDetailCache(opp);
                        navigation.navigate('JobDetail', { opportunity: opp, opportunityId: item.mappedOpportunity.id });
                    }
                }}
            />
        );
    };

    const renderResourceItem = ({ item }: { item: SharedResource }) => {
        let statusColor = currentTheme.colors.warning;
        let statusText = 'PENDING';
        if (item.status === 'PUBLISHED') { statusColor = currentTheme.colors.success; statusText = 'LIVE'; }
        if (item.status === 'REJECTED') { statusColor = currentTheme.colors.error; statusText = 'REJECTED'; }

        return (
            <TouchableOpacity 
                style={[styles.card, { borderColor: currentTheme.colors.border, backgroundColor: currentTheme.colors.surface }]}
                activeOpacity={0.7}
                onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    void Linking.openURL(item.url);
                }}
            >
                <View style={[styles.statusBadge, { backgroundColor: alpha(statusColor, 0.1), alignSelf: 'flex-start', marginBottom: 12 }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
                </View>

                <View pointerEvents="box-none">
                    <ResourcePreviewCard 
                        url={item.url} 
                        style={{ borderWidth: 0, borderRadius: 8 }} 
                        isSaved={isSavedResource(item.id)}
                        onSave={() => {
                            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            toggleSaveResource(item);
                        }}
                        addedByUsername={(item as any).addedByUsername}
                    />
                </View>

                <View style={[styles.cardFooter, { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: alpha(currentTheme.colors.border, 0.5) }]}>
                    <View style={styles.impactRow}>
                        <ExternalLink size={14} color={currentTheme.colors.textMuted} />
                        <Text style={[styles.impactText, { color: currentTheme.colors.textMuted }]}>Resource Link</Text>
                    </View>
                    <Text style={[styles.dateText, { color: currentTheme.colors.textMuted }]}>
                        {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderTabs = () => (
        <View style={[styles.tabContainer, { backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }]}>
            <TouchableOpacity
                style={[styles.tabButton, activeTab === 'JOBS' && { backgroundColor: currentTheme.colors.primary }]}
                onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveTab('JOBS');
                }}
            >
                <Text style={[styles.tabText, { color: activeTab === 'JOBS' ? currentTheme.colors.background : currentTheme.colors.textMuted }]}>
                    Jobs & Referrals
                </Text>
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.tabButton, activeTab === 'RESOURCES' && { backgroundColor: currentTheme.colors.primary }]}
                onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setActiveTab('RESOURCES');
                }}
            >
                <Text style={[styles.tabText, { color: activeTab === 'RESOURCES' ? currentTheme.colors.background : currentTheme.colors.textMuted }]}>
                    Resources
                </Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <Screen safe={false}>
            <View style={{ paddingTop: insets.top + 10 }}>
                <SecondaryHeader
                    title="My Shares"
                    onBack={() => navigation.goBack()}
                />
            </View>

            <FlashList
                data={activeTab === 'JOBS' ? shares : resources}
                keyExtractor={(item) => item.id}
                renderItem={activeTab === 'JOBS' ? renderJobItem : renderResourceItem as any}
                ListHeaderComponent={
                    <>
                        {renderHeader()}
                        {renderTabs()}
                    </>
                }
                // @ts-expect-error - FlashList typing bug with estimatedItemSize
                estimatedItemSize={120}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                onEndReached={activeTab === 'JOBS' ? loadMore : undefined}
                onEndReachedThreshold={0.5}
                refreshControl={
                    <PremiumRefreshControl refreshing={refreshing} onRefresh={refresh} />
                }
                ListEmptyComponent={
                    !loading ? (
                        <View style={styles.emptyContainer}>
                            {activeTab === 'JOBS' ? (
                                <Zap size={48} color={alpha(currentTheme.colors.textMuted, 0.2)} />
                            ) : (
                                <BookOpen size={48} color={alpha(currentTheme.colors.textMuted, 0.2)} />
                            )}
                            <Text style={[styles.emptyTitle, { color: currentTheme.colors.text }]}>
                                No {activeTab === 'JOBS' ? 'shares' : 'resources'} yet
                            </Text>
                            <Text style={[styles.emptyDesc, { color: currentTheme.colors.textMuted }]}>
                                {activeTab === 'JOBS' 
                                    ? 'Help the community by sharing verified job links you find.'
                                    : 'Share useful preparation resources, roadmaps, and guides.'}
                            </Text>
                        </View>
                    ) : null
                }
                removeClippedSubviews={Platform.OS === 'android'}
            />
        </Screen>
    );
};

const styles = StyleSheet.create({
    listContent: {
        padding: SPACING.md,
        paddingBottom: 100,
    },
    headerStats: {
        marginBottom: SPACING.lg,
    },
    statsGrid: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: SPACING.lg,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: mScale(20),
        fontWeight: '900',
    },
    statLabel: {
        fontSize: mScale(11),
        fontWeight: '800',
        letterSpacing: 0.5,
        marginTop: 4,
    },
    statDivider: {
        width: 1,
        height: 24,
        opacity: 0.1,
    },
    card: {
        padding: SPACING.md,
        marginBottom: SPACING.md,
        borderWidth: 1,
        borderRadius: 16,
    },
    tabContainer: {
        flexDirection: 'row',
        borderWidth: 1,
        borderRadius: 12,
        padding: 4,
        marginBottom: SPACING.lg,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },
    tabText: {
        fontSize: mScale(13),
        fontWeight: '800',
    },
    cardMain: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.md,
    },
    cardTitle: {
        fontSize: mScale(15),
        fontWeight: '800',
    },
    cardCompany: {
        fontSize: mScale(13),
        fontWeight: '600',
        marginTop: 2,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        gap: 6,
    },
    statusText: {
        fontSize: mScale(11),
        fontWeight: '900',
    },
    impactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    impactText: {
        fontSize: mScale(11),
        fontWeight: '600',
    },
    dateText: {
        fontSize: mScale(10),
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
        gap: 12,
    },
    emptyTitle: {
        fontSize: mScale(18),
        fontWeight: '800',
    },
    emptyDesc: {
        fontSize: mScale(14),
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 40,
    }
});

export default MySharesScreen;
