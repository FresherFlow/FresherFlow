import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { CheckCircle2, XCircle, FileText, User } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Screen } from '../../components/common/Layout';
import { PremiumHeader, AppText, SurfaceCard } from '../../components/common/PremiumPrimitives';
import { useTheme } from '../../theme/ThemeProvider';
import { alpha } from '../../theme';
import { SPACING, RADIUS } from '../../theme/dimensions';

export default function SubmissionsScreen() {
    const { currentTheme } = useTheme();
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchSubmissions = useCallback(async () => {
        try {
            // Mock API fetch
            // const res = await adminModerationApi.listSubmissions();
            // setSubmissions(res.data);
            setSubmissions([]); // empty state instead of mock data
        } catch (error) {
            console.error('[SubmissionsScreen] Failed to fetch:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void fetchSubmissions();
    }, [fetchSubmissions]);

    const handleRefresh = () => {
        setRefreshing(true);
        void fetchSubmissions();
    };

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Optimistic update
        setSubmissions(prev => prev.filter(sub => sub.id !== id));
    };

    const renderItem = ({ item }: { item: any }) => (
        <SurfaceCard style={[styles.card, { borderColor: alpha(currentTheme.colors.border, 0.4), borderWidth: 0.5, borderRadius: RADIUS.lg, backgroundColor: currentTheme.colors.surface }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.iconWrapper, { backgroundColor: alpha(currentTheme.colors.primary, 0.08) }]}>
                    <User size={18} color={currentTheme.colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <AppText variant="label" numberOfLines={1}>{item.userName}</AppText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <View style={[styles.badge, { backgroundColor: alpha(currentTheme.colors.primary, 0.08) }]}>
                            <AppText style={{ fontSize: 9, fontWeight: '800', color: currentTheme.colors.primary }}>STUDENT ID</AppText>
                        </View>
                        <AppText variant="badge" muted>• {item.university}</AppText>
                    </View>
                    <AppText variant="badge" muted style={{ marginTop: 4 }}>Submitted {new Date(item.submittedAt).toLocaleDateString()}</AppText>
                </View>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16, borderTopWidth: 1, borderTopColor: alpha(currentTheme.colors.border, 0.2), paddingTop: 12 }}>
                <TouchableOpacity onPress={() => handleAction(item.id, 'reject')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <XCircle size={18} color="#EF4444" />
                    <AppText style={{ fontSize: 13, fontWeight: '700', color: "#EF4444" }}>Reject</AppText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleAction(item.id, 'approve')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={18} color="#10B981" />
                    <AppText style={{ fontSize: 13, fontWeight: '700', color: "#10B981" }}>Verify</AppText>
                </TouchableOpacity>
            </View>
        </SurfaceCard>
    );

    return (
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <PremiumHeader 
                title="Student Verifications" 
                subtitle="Review Identity Submissions" 
                showBack={true} 
            />

            <View style={{ flex: 1, paddingHorizontal: SPACING.lg }}>
                <AppText variant="sectionTitle" style={{ marginBottom: SPACING.md, marginTop: SPACING.sm }}>
                    Pending Review ({submissions.length})
                </AppText>

                <FlashList
                    data={submissions}
                    renderItem={renderItem}
                    keyExtractor={(item: any) => item.id}
                    {...({ estimatedItemSize: 120 } as any)}
                    onRefresh={handleRefresh}
                    refreshing={refreshing}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    ListEmptyComponent={
                        loading ? (
                            <ActivityIndicator size="large" color={currentTheme.colors.primary} style={{ marginTop: 40 }} />
                        ) : (
                            <View style={{ alignItems: 'center', marginTop: 40 }}>
                                <FileText size={48} color={alpha(currentTheme.colors.textMuted, 0.3)} />
                                <AppText style={{ marginTop: 16, color: currentTheme.colors.textMuted }}>
                                    No pending submissions to review.
                                </AppText>
                            </View>
                        )
                    }
                />
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    card: {
        padding: 16,
        marginBottom: 12,
    },
    iconWrapper: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    }
});
