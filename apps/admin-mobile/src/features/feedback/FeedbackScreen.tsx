import React, { useEffect } from 'react';
import {
    ActivityIndicator,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { AlertTriangle, ChartNoAxesColumn, MessageSquare, Smartphone } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { useFeedback, type FeedbackTab } from './hooks/useFeedback';
import { SettingsCard } from '../settings/components/SettingsComponents';
import { MetricCard } from '../system/components/SpecializedCards';
import { Screen } from '../system/layout/Layout';
import { AppButton } from '@repo/ui';
import { SimpleHeader } from '../system/components/SimpleHeader';

const tabs: Array<{ key: FeedbackTab; label: string; icon: typeof ChartNoAxesColumn }> = [
    { key: 'overview', label: 'Overview', icon: ChartNoAxesColumn },
    { key: 'listing', label: 'Listings', icon: MessageSquare },
    { key: 'app', label: 'App', icon: Smartphone },
];

const FeedbackScreen = () => {
    // Using 'any' here is intentional — this screen navigates across nested
    // tab/stack navigators dynamically, which React Navigation can't express statically.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const navigation = useNavigation<any>();
    const { colors, typography, sizes } = useTheme();
    const {
        tab,
        setTab,
        listingGroups,
        appFeedback,
        alerts,
        loading,
        refreshing,
        setRefreshing,
        fetchAll,
        totalListingReports,
        totalNegativeReports,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        negativeGroups,
        topProblemListings,
    } = useFeedback();

    useEffect(() => {
        void fetchAll();
    }, [fetchAll]);

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchAll();
    };

    const openOpportunityFeedback = (opportunityId: string, title: string) => {
        const currentState = navigation.getState?.();
        if (currentState?.routeNames?.includes('OpportunityFeedback')) {
            navigation.navigate('OpportunityFeedback', { opportunityId, title });
            return;
        }

        navigation.getParent?.()?.navigate('Analytics', {
            screen: 'OpportunityFeedback',
            params: { opportunityId, title },
        });
    };

    const renderOverview = () => (
        <ScrollView
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.primary} />}
            showsVerticalScrollIndicator={false}
        >
            <View style={styles.kpiGrid}>
                <MetricCard label="Open Alerts" value={alerts.total} accent={colors.error} />
                <MetricCard label="Listing Reports" value={totalListingReports} accent={colors.primary} />
                <MetricCard label="Negative Reports" value={totalNegativeReports} accent={colors.warning} />
                <MetricCard label="App Feedback" value={appFeedback.length} accent={colors.secondary} />
            </View>

            <SettingsCard title="Priority Listings">
                {topProblemListings.length === 0 ? (
                    <EmptyMessage text="No high-risk listing feedback right now." />
                ) : (
                    topProblemListings.map((group, index) => (
                        <Pressable
                            key={group.opportunity?.id ?? `group-${index}`}
                            onPress={() => {
                                if (group.opportunity?.id) {
                                    openOpportunityFeedback(group.opportunity.id, group.opportunity.title);
                                }
                            }}
                            style={[
                                styles.row,
                                index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                            ]}
                        >
                            <View style={styles.rowContent}>
                                <Text style={[typography.subheadlineStrong, { color: colors.text }]}>
                                    {group.opportunity?.title ?? 'Unknown opportunity'}
                                </Text>
                                <Text style={[typography.footnote, { color: colors.textMuted }]}>
                                    {group.feedbackCount} report{group.feedbackCount === 1 ? '' : 's'}
                                </Text>
                            </View>
                        </Pressable>
                    ))
                )}
            </SettingsCard>
        </ScrollView>
    );

    const renderListingItem = ({ item }: { item: (typeof listingGroups)[number] }) => (
        <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.rowBetween}>
                <Text style={[typography.subheadlineStrong, { color: colors.text }]}>{item.opportunity?.title}</Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                    {item.feedbackCount} reports
                </Text>
            </View>
            <AppButton
                label="View details"
                variant="ghost"
                onPress={() => {
                    if (item.opportunity?.id) {
                        openOpportunityFeedback(item.opportunity.id, item.opportunity.title);
                    }
                }}
            />
        </View>
    );

    const renderAppItem = ({ item }: { item: (typeof appFeedback)[number] }) => (
        <View style={[styles.listCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.rowBetween}>
                <Text style={[typography.subheadlineStrong, { color: colors.text }]}>{item.category ?? item.type}</Text>
                <Text style={[typography.caption, { color: colors.textMuted }]}>
                    {new Date(item.createdAt).toLocaleDateString('en-IN')}
                </Text>
            </View>
            <Text style={[typography.body, { color: colors.textMuted, marginBottom: 10 }]}>{item.message}</Text>
            {item.user?.email ? (
                <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4 }]}>{item.user.email}</Text>
            ) : null}
        </View>
    );

    return (
        <Screen safe={true}>
            <SimpleHeader title="Feedback" />

            <View style={[styles.tabs, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
                {tabs.map(({ key, label, icon: Icon }) => {
                    const active = tab === key;
                    return (
                        <Pressable
                            key={key}
                            onPress={() => setTab(key)}
                            style={[styles.tab, active && { borderBottomColor: colors.primary }]}
                        >
                            <Icon size={sizes.icon.sm} color={active ? colors.primary : colors.textMuted} />
                            <Text style={[typography.tabLabel, { color: active ? colors.primary : colors.textMuted }]}>{label}</Text>
                        </Pressable>
                    );
                })}
            </View>

            {loading ? (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : null}

            {!loading && tab === 'overview' ? renderOverview() : null}

            {!loading && tab === 'listing' ? (
                <FlashList
                    data={listingGroups}
                    keyExtractor={(item, index) => item.opportunity?.id ?? `listing-${index}`}
                    renderItem={renderListingItem}
                    // @ts-expect-error - FlashList typing bug with estimatedItemSize
                    estimatedItemSize={mScale(100)}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.primary} />}
                    ListEmptyComponent={<EmptyState text="No listing feedback yet." />}
                    showsVerticalScrollIndicator={false}
                />
            ) : null}

            {!loading && tab === 'app' ? (
                <FlashList
                    data={appFeedback}
                    keyExtractor={(item) => item.id}
                    renderItem={renderAppItem}
                    // @ts-expect-error - FlashList typing bug with estimatedItemSize
                    estimatedItemSize={mScale(120)}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.primary} />}
                    ListEmptyComponent={<EmptyState text="No app feedback submitted." />}
                    showsVerticalScrollIndicator={false}
                />
            ) : null}
        </Screen>
    );
};

// Removed local MetricCard, now using SpecializedCards

const EmptyState = ({ text }: { text: string }) => {
    const { typography, colors } = useTheme();
    return (
        <View style={styles.empty}>
            <AlertTriangle size={24} color={colors.textMuted} />
            <Text style={[typography.subheadline, { color: colors.textMuted }]}>{text}</Text>
        </View>
    );
};

const EmptyMessage = ({ text }: { text: string }) => {
    const { typography, colors } = useTheme();
    return <Text style={[typography.footnote, { color: colors.textMuted, padding: 20, textAlign: 'center' }]}>{text}</Text>;
};

export { FeedbackScreen };

const styles = StyleSheet.create({
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    loading: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabs: {
        flexDirection: 'row',
        borderBottomWidth: 1,
    },
    tab: {
        flex: 1,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    kpiGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20,
    },
    row: {
        paddingVertical: 14,
    },
    rowContent: {
        gap: 4,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    list: {
        padding: 20,
        gap: 12,
        paddingBottom: 40,
    },
    listCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
    },
    empty: {
        paddingTop: 60,
        alignItems: 'center',
        gap: 12,
    },
});
