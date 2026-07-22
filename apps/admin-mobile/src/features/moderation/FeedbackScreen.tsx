import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { MessageSquare, Trash2, CheckCircle2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Screen } from '../../components/common/Layout';
import { PremiumHeader, AppText, SurfaceCard } from '../../components/common/PremiumPrimitives';
import { useTheme } from '../../theme/ThemeProvider';
import { alpha } from '../../theme';
import { SPACING, RADIUS } from '../../theme/dimensions';

export default function FeedbackScreen() {
    const { currentTheme } = useTheme();
    const [feedbacks, setFeedbacks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchFeedbacks = useCallback(async () => {
        try {
            // Mock API fetch
            // const res = await adminModerationApi.listFeedback();
            // setFeedbacks(res.data);
            setFeedbacks([]); // empty state instead of mock data
        } catch (error) {
            console.error('[FeedbackScreen] Failed to fetch:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void fetchFeedbacks();
    }, [fetchFeedbacks]);

    const handleRefresh = () => {
        setRefreshing(true);
        void fetchFeedbacks();
    };

    const handleAction = async (id: string, action: 'resolve' | 'delete') => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        // Optimistic update
        setFeedbacks(prev => prev.filter(item => item.id !== id));
    };

    const renderItem = ({ item }: { item: any }) => (
        <SurfaceCard style={[styles.card, { borderColor: alpha(currentTheme.colors.border, 0.4), borderWidth: 0.5, borderRadius: RADIUS.lg, backgroundColor: currentTheme.colors.surface }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                <View style={[styles.iconWrapper, { backgroundColor: alpha(currentTheme.colors.primary, 0.08) }]}>
                    <MessageSquare size={18} color={currentTheme.colors.primary} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <AppText variant="label" numberOfLines={1}>{item.category || 'General Feedback'}</AppText>
                    <AppText variant="body" style={{ marginTop: 4, color: currentTheme.colors.text }}>{item.message}</AppText>
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                        <AppText variant="badge" muted>From: {item.userEmail || 'Anonymous'}</AppText>
                        <AppText variant="badge" muted>• {new Date(item.createdAt).toLocaleDateString()}</AppText>
                    </View>
                </View>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16, borderTopWidth: 1, borderTopColor: alpha(currentTheme.colors.border, 0.2), paddingTop: 12 }}>
                <TouchableOpacity onPress={() => handleAction(item.id, 'delete')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Trash2 size={18} color={currentTheme.colors.textMuted} />
                    <AppText style={{ fontSize: 13, fontWeight: '700', color: currentTheme.colors.textMuted }}>Delete</AppText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleAction(item.id, 'resolve')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={18} color="#10B981" />
                    <AppText style={{ fontSize: 13, fontWeight: '700', color: "#10B981" }}>Resolve</AppText>
                </TouchableOpacity>
            </View>
        </SurfaceCard>
    );

    return (
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <PremiumHeader 
                title="User Feedback" 
                subtitle="Review App Comments" 
                showBack={true} 
            />

            <View style={{ flex: 1, paddingHorizontal: SPACING.lg }}>
                <AppText variant="sectionTitle" style={{ marginBottom: SPACING.md, marginTop: SPACING.sm }}>
                    Unresolved ({feedbacks.length})
                </AppText>

                <FlashList
                    data={feedbacks}
                    renderItem={renderItem}
                    keyExtractor={(item: any) => item.id}
                    {...({ estimatedItemSize: 140 } as any)}
                    onRefresh={handleRefresh}
                    refreshing={refreshing}
                    contentContainerStyle={{ paddingBottom: 100 }}
                    ListEmptyComponent={
                        loading ? (
                            <ActivityIndicator size="large" color={currentTheme.colors.primary} style={{ marginTop: 40 }} />
                        ) : (
                            <View style={{ alignItems: 'center', marginTop: 40 }}>
                                <MessageSquare size={48} color={alpha(currentTheme.colors.textMuted, 0.3)} />
                                <AppText style={{ marginTop: 16, color: currentTheme.colors.textMuted }}>
                                    No unresolved feedback.
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
});
