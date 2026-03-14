import React, { useCallback } from 'react';
import {
    StyleSheet, Text, View, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { OpportunityTimeline } from '../components/OpportunityTimeline';
import { theme } from '../theme';

// Hooks
import { useOpportunityDetail } from '../hooks/useOpportunityDetail';

// Components
import { DetailHeader } from '../components/opportunities/DetailHeader';
import { DetailGrid } from '../components/opportunities/DetailGrid';

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

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <DetailHeader opp={opp} navigation={navigation} statusColor={sc} />

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
