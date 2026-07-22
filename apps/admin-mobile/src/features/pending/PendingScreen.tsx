import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Alert,
    Platform
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import { RefreshCw, Check, X, Eye } from 'lucide-react-native';
import { Screen } from '../../components/common/Layout';
import { PremiumHeader, AppText } from '../../components/common/PremiumPrimitives';
import { useTheme } from '../../theme/ThemeProvider';
import { alpha } from '../../theme';
import { adminOpportunitiesApi } from '@fresherflow/api-client';
import { Opportunity } from '@fresherflow/types';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OpportunitiesStackParamList } from '../../navigation/OpportunitiesNavigator';

type NavigationProp = NativeStackNavigationProp<OpportunitiesStackParamList, 'OpportunitiesList'>;

export default function PendingScreen() {
    const { currentTheme } = useTheme();
    const navigation = useNavigation<NavigationProp>();
    const [jobs, setJobs] = useState<Opportunity[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchPending = useCallback(async () => {
        try {
            const response = await adminOpportunitiesApi.list({ limit: 50, status: 'PENDING' });
            if (response && response.opportunities) {
                setJobs(response.opportunities);
            }
        } catch (error) {
            console.error('[PendingScreen] Failed to fetch pending jobs:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void fetchPending();
    }, [fetchPending]);

    const handleRefresh = useCallback(() => {
        setRefreshing(true);
        void fetchPending();
    }, [fetchPending]);

    const handleView = (job: Opportunity) => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        navigation.navigate('OpportunityDetail', { opportunityId: job.id });
    };

    const handleApprove = (job: Opportunity) => {
        Alert.alert('Approve Job', `Publish ${job.company}?`, [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Publish', 
                style: 'default',
                onPress: async () => {
                    setProcessingId(job.id);
                    try {
                        // Assuming update API exists
                        await adminOpportunitiesApi.update(job.id, { status: 'PUBLISHED' });
                        void fetchPending();
                    } catch (e) {
                        Alert.alert('Error', 'Failed to approve');
                    } finally {
                        setProcessingId(null);
                    }
                }
            }
        ]);
    };

    const handleReject = (job: Opportunity) => {
        Alert.alert('Reject Job', `Delete ${job.company}?`, [
            { text: 'Cancel', style: 'cancel' },
            { 
                text: 'Delete', 
                style: 'destructive',
                onPress: async () => {
                    setProcessingId(job.id);
                    try {
                        await adminOpportunitiesApi.delete(job.id);
                        void fetchPending();
                    } catch (e) {
                        Alert.alert('Error', 'Failed to delete');
                    } finally {
                        setProcessingId(null);
                    }
                }
            }
        ]);
    };

    const renderHeader = () => (
        <View style={[styles.tableHeader, { backgroundColor: alpha(currentTheme.colors.surface, 0.5), borderBottomColor: alpha(currentTheme.colors.border, 0.5) }]}>
            <Text style={[styles.headerCell, { flex: 2, color: currentTheme.colors.textMuted }]}>Company</Text>
            <Text style={[styles.headerCell, { flex: 3, color: currentTheme.colors.textMuted }]}>Title</Text>
            <Text style={[styles.headerCell, { flex: 1.5, color: currentTheme.colors.textMuted }]}>Status</Text>
            <Text style={[styles.headerCell, { width: 90, textAlign: 'right', color: currentTheme.colors.textMuted }]}>Actions</Text>
        </View>
    );

    const renderItem = ({ item }: { item: Opportunity }) => {
        const isProcessing = processingId === item.id;
        return (
            <View style={[styles.tableRow, { borderBottomColor: alpha(currentTheme.colors.border, 0.2) }]}>
                <Text style={[styles.cell, styles.boldCell, { flex: 2, color: currentTheme.colors.text }]} numberOfLines={2}>
                    {item.company}
                </Text>
                <Text style={[styles.cell, { flex: 3, color: currentTheme.colors.text }]} numberOfLines={2}>
                    {item.title}
                </Text>
                <Text style={[styles.cell, { flex: 1.5, color: currentTheme.colors.textMuted }]} numberOfLines={1}>
                    {item.status}
                </Text>
                <View style={[styles.cell, styles.actionCell, { width: 90 }]}>
                    {isProcessing ? (
                        <ActivityIndicator size="small" color={currentTheme.colors.primary} />
                    ) : (
                        <>
                            <TouchableOpacity onPress={() => handleView(item)} style={[styles.actionBtn, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                                <Eye size={16} color={currentTheme.colors.primary} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleApprove(item)} style={[styles.actionBtn, { backgroundColor: alpha(currentTheme.colors.success, 0.1) }]}>
                                <Check size={16} color={currentTheme.colors.success} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleReject(item)} style={[styles.actionBtn, { backgroundColor: alpha(currentTheme.colors.error, 0.1) }]}>
                                <X size={16} color={currentTheme.colors.error} />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        );
    };

    return (
        <Screen safe={false} style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
            <PremiumHeader
                title="Pending Jobs"
                subtitle="Review database jobs"
                showBack={false}
                rightSlot={
                    <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn}>
                        <RefreshCw size={20} color={currentTheme.colors.text} />
                    </TouchableOpacity>
                }
            />

            <View style={styles.tableContainer}>
                {renderHeader()}
                <FlashList<Opportunity>
                    data={jobs}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    {...({ estimatedItemSize: 60 } as any)}
                    onRefresh={handleRefresh}
                    refreshing={refreshing}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        loading ? (
                            <ActivityIndicator style={{ marginTop: 40 }} />
                        ) : (
                            <AppText style={{ textAlign: 'center', marginTop: 40 }}>No pending jobs found.</AppText>
                        )
                    }
                />
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    refreshBtn: { padding: 8 },
    tableContainer: {
        flex: 1,
        marginTop: 8,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    headerCell: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    tableRow: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        alignItems: 'center',
    },
    cell: {
        fontSize: 13,
        paddingRight: 8,
    },
    boldCell: {
        fontWeight: '600',
    },
    actionCell: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 6,
        paddingRight: 0,
    },
    actionBtn: {
        padding: 6,
        borderRadius: 6,
    },
    listContent: {
        paddingBottom: 100,
    }
});
