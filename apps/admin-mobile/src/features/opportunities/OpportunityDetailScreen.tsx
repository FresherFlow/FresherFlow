import React, { useCallback, useRef } from 'react';
import {
    StyleSheet, Text, View, 
    ActivityIndicator, RefreshControl, Platform,
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
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

// Hooks
import { useOpportunityDetail } from './hooks/useOpportunityDetail';

import { Screen, ScrollScreen } from '../system/layout/Layout';
import { SegmentedControl } from '../system/components/Controls';
import { DetailHeader } from './components/DetailHeader';
import { DetailGrid } from './components/DetailGrid';
import { PremiumHeader } from '../system/components/PremiumPrimitives';
import { getStatusLabel, getOpportunityStatusColor, buildSocialCaption } from './utils/opportunityUtils';
import { AdminActionSheet, type AdminActionSheetRef, type AdminActionType } from './components/AdminActionSheet';

export const OpportunityDetailScreen = ({ 
    route, 
    navigation 
}: { 
    route: RouteProp<OpportunitiesStackParamList, 'OpportunityDetail'>; 
    navigation: NativeStackNavigationProp<OpportunitiesStackParamList> 
}) => {
    const { opportunityId } = route.params;
    const { currentTheme } = useTheme();
    const adminActionSheetRef = useRef<AdminActionSheetRef>(null);
    
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

    const statusLabel = getStatusLabel(opp);
    const { text: sc } = getOpportunityStatusColor(statusLabel);

    const handleAdminAction = async (action: AdminActionType, reason?: string) => {
        try {
            switch (action) {
                case 'PUBLISH':
                    await adminOpportunitiesApi.update(opportunityId, { status: 'PUBLISHED' });
                    toast.success('Published', 'Opportunity is now live.');
                    break;
                case 'EXPIRE':
                    await adminOpportunitiesApi.expire(opportunityId, reason);
                    toast.success('Expired', 'Opportunity moved out of the live feed.');
                    break;
                case 'RESTORE':
                    await adminOpportunitiesApi.restore(opportunityId);
                    toast.success('Restored', 'Opportunity restored successfully.');
                    break;
                case 'DELETE':
                    await adminOpportunitiesApi.delete(opportunityId, reason);
                    toast.success('Deleted', 'Opportunity removed.');
                    navigation.goBack();
                    return; // Avoid updating state after going back
            }
            void fetchAll();
        } catch (error) {
            const label = action.charAt(0) + action.slice(1).toLowerCase();
            toast.error(`${label} failed`, error instanceof Error ? error.message : `Failed to ${action.toLowerCase()}`);
            throw error;
        }
    };

    const publishOpportunity = () => {
        adminActionSheetRef.current?.show('PUBLISH', opp.title);
    };

    const expireOpportunity = () => {
        adminActionSheetRef.current?.show('EXPIRE', opp.title);
    };

    const restoreOpportunity = () => {
        adminActionSheetRef.current?.show('RESTORE', opp.title);
    };

    const deleteOpportunity = () => {
        adminActionSheetRef.current?.show('DELETE', opp.title);
    };

    const copySocialCaption = async () => {
        try {
            const caption = buildSocialCaption(opp);
            await Clipboard.setStringAsync(caption);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            toast.success('Copied', 'Social caption copied to clipboard!');
        } catch (error) {
            toast.error('Copy failed', error instanceof Error ? error.message : 'Failed to copy');
        }
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
                            dynamicStatus={statusLabel}
                            onPublish={statusLabel === 'DRAFT' ? publishOpportunity : undefined}
                            onExpire={statusLabel === 'LIVE' ? expireOpportunity : undefined}
                            onRestore={statusLabel === 'EXPIRED' || statusLabel === 'ARCHIVED' ? restoreOpportunity : undefined}
                            onDelete={deleteOpportunity}
                            onCopySocial={copySocialCaption}
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
            <AdminActionSheet
                ref={adminActionSheetRef}
                onConfirm={handleAdminAction}
            />
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
