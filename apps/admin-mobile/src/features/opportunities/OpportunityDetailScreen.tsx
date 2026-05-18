import React, { useCallback } from 'react';
import {
    StyleSheet, Text, View, 
    ActivityIndicator, RefreshControl, Alert, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OpportunitiesStackParamList } from '../../navigation/OpportunitiesNavigator';
import { OpportunityTimeline, type Event } from './components/OpportunityTimeline';
import { adminOpportunitiesApi } from '@fresherflow/api-client';
import { toast } from '../../lib/toast';
import { useTheme } from '../../theme/ThemeProvider';
import { mScale, SPACING } from '../../theme/dimensions';

// Hooks
import { useOpportunityDetail } from './hooks/useOpportunityDetail';

import { Screen, ScrollScreen } from '../system/layout/Layout';
import { SegmentedControl } from '../system/components/Controls';
import { DetailHeader } from './components/DetailHeader';
import { DetailGrid } from './components/DetailGrid';
import { PremiumHeader } from '../system/components/PremiumPrimitives';

export const OpportunityDetailScreen = ({ 
    route, 
    navigation 
}: { 
    route: RouteProp<OpportunitiesStackParamList, 'OpportunityDetail'>; 
    navigation: NativeStackNavigationProp<OpportunitiesStackParamList> 
}) => {
    const { opportunityId } = route.params;
    const { currentTheme } = useTheme();
    
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

    const STATUS_COLOR: Record<string, string> = {
        PUBLISHED: currentTheme.colors.success,
        DRAFT: currentTheme.colors.secondary,
        ARCHIVED: currentTheme.colors.muted,
        EXPIRED: currentTheme.colors.error,
    };

    useFocusEffect(useCallback(() => { void fetchAll(); }, [fetchAll]));

    if (loading) {
        return (
            <Screen safe={false}>
                <View style={[styles.loader, { paddingTop: Platform.OS === 'ios' ? mScale(50) : mScale(20) }]}>
                    <ActivityIndicator size="large" color={currentTheme.colors.primary} />
                </View>
            </Screen>
        );
    }

    if (!opp) {
        return (
            <Screen safe={false}>
                <View style={{ paddingTop: Platform.OS === 'ios' ? mScale(50) : mScale(20) }}>
                    <PremiumHeader title="Not Found" showBack />
                </View>
                <View style={styles.loader}>
                    <Text style={{ color: currentTheme.colors.textMuted }}>Opportunity not found.</Text>
                </View>
            </Screen>
        );
    }

    const sc = STATUS_COLOR[opp.status] || currentTheme.colors.muted;

    const publishOpportunity = () => {
        Alert.alert('Publish Opportunity?', 'This will make the opportunity live for all users.', [
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
        <Screen safe={false}>
            <View style={{ paddingTop: Platform.OS === 'ios' ? mScale(50) : mScale(20) }}>
                <PremiumHeader 
                    title="Signal Detail" 
                    subtitle={opp.company}
                    showBack 
                />
            </View>

            <View style={styles.tabContainer}>
                <SegmentedControl
                    options={[
                        { label: 'Details', value: 'details' },
                        { label: `Timeline (${events.length})`, value: 'timeline' },
                    ]}
                    selectedValue={tab}
                    onChange={(value) => setTab(value as 'details' | 'timeline')}
                />
            </View>

            <ScrollScreen
                refreshControl={
                    <RefreshControl 
                        refreshing={refreshing} 
                        onRefresh={onRefresh} 
                        tintColor={currentTheme.colors.primary} 
                    />
                }
                contentContainerStyle={styles.scrollContent}
            >
                {tab === 'details' ? (
                    <>
                        <DetailHeader
                            opp={opp}
                            navigation={navigation}
                            statusColor={sc}
                            onPublish={opp.status === 'DRAFT' ? publishOpportunity : undefined}
                            onExpire={opp.status === 'PUBLISHED' ? expireOpportunity : undefined}
                            onRestore={opp.status === 'EXPIRED' || opp.status === 'ARCHIVED' ? restoreOpportunity : undefined}
                            onDelete={deleteOpportunity}
                        />
                        <View style={styles.gridWrapper}>
                            <DetailGrid opp={opp} />
                        </View>
                    </>
                ) : (
                    <OpportunityTimeline 
                        opportunityId={opportunityId} 
                        events={events as Event[]} 
                        onEventChange={fetchAll} 
                    />
                )}
            </ScrollScreen>
        </Screen>
    );
};

const styles = StyleSheet.create({
    loader: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    tabContainer: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.md,
        marginTop: SPACING.xs,
    },
    scrollContent: { 
        paddingBottom: 60, 
        paddingHorizontal: SPACING.lg 
    },
    gridWrapper: {
        marginTop: SPACING.lg,
    }
});
