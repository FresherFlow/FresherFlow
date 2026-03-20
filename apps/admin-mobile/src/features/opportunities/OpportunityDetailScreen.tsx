import React, { useCallback } from 'react';
import {
    StyleSheet, Text, View, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { OpportunityTimeline } from './components/OpportunityTimeline';
import { theme } from '../../theme';
import { adminOpportunitiesApi } from '@fresherflow/api-client';
import { toast } from '../../lib/toast';

// Hooks
import { useOpportunityDetail } from './hooks/useOpportunityDetail';

// Components
import { DetailHeader } from './components/DetailHeader';
import { DetailGrid } from './components/DetailGrid';

const STATUS_COLOR: Record<string, string> = {
    PUBLISHED: theme.colors.success,
    DRAFT: theme.colors.accent,
    ARCHIVED: theme.colors.textMuted,
    EXPIRED: theme.colors.error,
};

export const OpportunityDetailScreen = ({ route, navigation }: any) => {
    const { opportunityId } = route.params as { opportunityId: string };
    
    const {
        opp,
        events,
        loading,
        refreshing,
        tab,
        setTab,
        fetchAll,
        onRefresh
    } = useOpportunityDetail(opportunityId);

    useFocusEffect(useCallback(() => { void fetchAll(); }, [fetchAll]));

    if (loading) {
        return <View style={styles.loader}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
    }

    if (!opp) {
        return <View style={styles.loader}><Text style={{ color: theme.colors.textMuted }}>Opportunity not found.</Text></View>;
    }

    const sc = STATUS_COLOR[opp.status] ?? theme.colors.textMuted;

    const publishOpportunity = () => {
        Alert.alert('Publish Opportunity?', 'This will make the opportunity live.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Publish',
                onPress: async () => {
                    try {
                        await adminOpportunitiesApi.update(opportunityId, { status: 'PUBLISHED' });
                        toast.success('Published', 'Opportunity is now live.');
                        void fetchAll();
                    } catch (error) {
                        toast.error('Publish failed', error instanceof Error ? error.message : 'Failed to publish');
                    }
                },
            },
        ]);
    };

    const expireOpportunity = () => {
        Alert.prompt('Expire Opportunity', `Reason for expiring "${opp.title}" (optional):`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Expire',
                style: 'destructive',
                onPress: async (reason?: string) => {
                    try {
                        await adminOpportunitiesApi.expire(opportunityId, reason);
                        toast.success('Expired', 'Opportunity moved out of the live feed.');
                        void fetchAll();
                    } catch (error) {
                        toast.error('Expire failed', error instanceof Error ? error.message : 'Failed to expire');
                    }
                },
            },
        ], 'plain-text');
    };

    const restoreOpportunity = () => {
        Alert.alert('Restore Opportunity?', 'This will restore the opportunity back to the active set.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Restore',
                onPress: async () => {
                    try {
                        await adminOpportunitiesApi.restore(opportunityId);
                        toast.success('Restored', 'Opportunity restored successfully.');
                        void fetchAll();
                    } catch (error) {
                        toast.error('Restore failed', error instanceof Error ? error.message : 'Failed to restore');
                    }
                },
            },
        ]);
    };

    const deleteOpportunity = () => {
        Alert.prompt('Delete Opportunity', `Add a reason for deleting "${opp.title}":`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async (reason?: string) => {
                    try {
                        await adminOpportunitiesApi.delete(opportunityId, reason);
                        toast.success('Deleted', 'Opportunity removed.');
                        navigation.goBack();
                    } catch (error) {
                        toast.error('Delete failed', error instanceof Error ? error.message : 'Failed to delete');
                    }
                },
            },
        ], 'plain-text');
    };

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <DetailHeader
                opp={opp}
                navigation={navigation}
                statusColor={sc}
                onPublish={opp.status === 'DRAFT' ? publishOpportunity : undefined}
                onExpire={opp.status === 'PUBLISHED' ? expireOpportunity : undefined}
                onRestore={opp.status === 'EXPIRED' || opp.status === 'ARCHIVED' ? restoreOpportunity : undefined}
                onDelete={deleteOpportunity}
            />

            {/* Tabs */}
            <View style={styles.tabRow}>
                {(['details', 'timeline'] as const).map(t => (
                    <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
                        <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                            {t === 'details' ? 'Details' : `Timeline (${events.length})`}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
                contentContainerStyle={styles.scrollContent}
            >
                {tab === 'details' ? (
                    <DetailGrid opp={opp} />
                ) : (
                    <OpportunityTimeline opportunityId={opportunityId} events={events} onEventChange={fetchAll} />
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
    tabRow: {
        flexDirection: 'row', backgroundColor: theme.colors.surface,
        borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: theme.colors.primary },
    tabText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
    tabTextActive: { color: theme.colors.primary },
    scrollContent: { paddingBottom: 40 },
});


