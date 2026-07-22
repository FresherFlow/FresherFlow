import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, TextInput, TouchableOpacity, StyleSheet, Text, ActivityIndicator, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Search, CheckCircle2, XCircle, Globe, PlayCircle, FolderOpen, Compass, TrendingUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Screen } from '../../components/common/Layout';
import { PremiumHeader, AppText, SurfaceCard } from '../../components/common/PremiumPrimitives';
import { useTheme } from '../../theme/ThemeProvider';
import { alpha } from '../../theme';
import { SPACING, RADIUS } from '../../theme/dimensions';
// Assuming API exists based on standard naming conventions
// import { adminResourcesApi } from '@fresherflow/api-client';

const SUGGESTIONS = ['React Native', 'Google', 'System Design', 'Meta', 'Amazon', 'Frontend', 'Backend', 'Data Science'];

export default function ResourcesScreen() {
    const { currentTheme } = useTheme();
    const [searchQuery, setSearchQuery] = useState('');
    const [resources, setResources] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchResources = useCallback(async () => {
        try {
            // Replace with actual API call:
            // const res = await adminResourcesApi.list({ status: 'PENDING' });
            // setResources(res.data);
            
            // Empty state for now since we removed the hardcoded mock
            setResources([]);
        } catch (error) {
            console.error('[ResourcesScreen] Failed to fetch:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        void fetchResources();
    }, [fetchResources]);

    const handleRefresh = () => {
        setRefreshing(true);
        void fetchResources();
    };

    const handleAction = async (id: string, action: 'approve' | 'reject') => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Alert.alert(
            action === 'approve' ? 'Approve Resource' : 'Reject Resource',
            `Are you sure you want to ${action} this resource?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: action === 'approve' ? 'Approve' : 'Reject', 
                    style: action === 'approve' ? 'default' : 'destructive',
                    onPress: () => {
                        // TODO: call API to approve/reject
                        setResources(prev => prev.filter(r => r.id !== id));
                    }
                }
            ]
        );
    };

    const getResourceColor = (type: string, opacity: number = 1) => {
        let hex = currentTheme.colors.primary;
        if (type === 'YOUTUBE') hex = '#EF4444';
        else if (type === 'GOOGLE_DRIVE') hex = '#10B981';
        else if (type === 'ROADMAP') hex = '#3B82F6';
        else hex = '#8B5CF6';
        return alpha(hex, opacity);
    };

    const getResourceIcon = (type: string, size = 18) => {
        const color = getResourceColor(type, 1);
        switch (type) {
            case 'YOUTUBE': return <PlayCircle size={size} color={color} />;
            case 'GOOGLE_DRIVE': return <FolderOpen size={size} color={color} />;
            case 'ROADMAP': return <Compass size={size} color={color} />;
            default: return <Globe size={size} color={color} />;
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <SurfaceCard style={[styles.resourceCard, { borderColor: alpha(currentTheme.colors.border, 0.4), borderWidth: 0.5, borderRadius: RADIUS.lg, backgroundColor: currentTheme.colors.surface }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.iconWrapper, { backgroundColor: getResourceColor(item.type, 0.08) }]}>
                    {getResourceIcon(item.type)}
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <AppText variant="label" numberOfLines={1}>{item.title}</AppText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <View style={[styles.badge, { backgroundColor: getResourceColor(item.type, 0.08) }]}>
                            <AppText style={{ fontSize: 9, fontWeight: '800', color: getResourceColor(item.type, 1) }}>{item.type}</AppText>
                        </View>
                        {item.company && (
                            <AppText variant="badge" muted>• {item.company}</AppText>
                        )}
                    </View>
                    <AppText variant="badge" muted style={{ marginTop: 4 }}>Submitted by {item.submitter}</AppText>
                </View>
            </View>
            
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16, borderTopWidth: 1, borderTopColor: alpha(currentTheme.colors.border, 0.2), paddingTop: 12 }}>
                <TouchableOpacity onPress={() => handleAction(item.id, 'reject')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <XCircle size={18} color="#EF4444" />
                    <AppText style={{ fontSize: 13, fontWeight: '700', color: "#EF4444" }}>Reject</AppText>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleAction(item.id, 'approve')} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={18} color="#10B981" />
                    <AppText style={{ fontSize: 13, fontWeight: '700', color: "#10B981" }}>Approve</AppText>
                </TouchableOpacity>
            </View>
        </SurfaceCard>
    );

    return (
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <PremiumHeader 
                title="Manage Resources" 
                subtitle="Review & Approve Shared Resources" 
                showBack={true} 
            />
            
            <View style={[styles.searchBar, { backgroundColor: alpha(currentTheme.colors.text, 0.03), borderColor: alpha(currentTheme.colors.border, 0.08) }]}>
                <Search size={18} color={currentTheme.colors.textMuted} style={{ marginRight: 10 }} />
                <TextInput
                    style={[styles.searchInput, { color: currentTheme.colors.text }]}
                    placeholder="Search pending resources..."
                    placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.5)}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <View style={styles.suggestionsContainer}>
                <View style={styles.suggestionsHeader}>
                    <TrendingUp size={14} color={currentTheme.colors.textMuted} />
                    <AppText style={{ fontSize: 12, fontWeight: '600', color: currentTheme.colors.textMuted, marginLeft: 4 }}>
                        Suggested Skills & Companies
                    </AppText>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionsScroll}>
                    {SUGGESTIONS.map((item, index) => (
                        <TouchableOpacity 
                            key={index}
                            onPress={() => setSearchQuery(item)}
                            style={[
                                styles.suggestionChip, 
                                { backgroundColor: alpha(currentTheme.colors.primary, 0.1), borderColor: alpha(currentTheme.colors.primary, 0.2) }
                            ]}
                        >
                            <Text style={[styles.suggestionText, { color: currentTheme.colors.primary }]}>{item}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <View style={{ flex: 1, paddingHorizontal: SPACING.lg }}>
                <AppText variant="sectionTitle" style={{ marginBottom: SPACING.md, marginTop: SPACING.sm }}>
                    Pending Review ({resources.length})
                </AppText>

                <FlashList
                    data={resources}
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
                                <FolderOpen size={48} color={alpha(currentTheme.colors.textMuted, 0.3)} />
                                <AppText style={{ marginTop: 16, color: currentTheme.colors.textMuted }}>
                                    No pending resources to review.
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
    searchBar: {
        height: 50,
        borderRadius: 16,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.md,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        fontSize: 15,
        fontWeight: '600',
    },
    suggestionsContainer: {
        marginBottom: SPACING.md,
    },
    suggestionsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        marginBottom: 8,
    },
    suggestionsScroll: {
        paddingHorizontal: SPACING.lg,
        gap: 8,
    },
    suggestionChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: RADIUS.md,
        borderWidth: 0.5,
    },
    suggestionText: {
        fontSize: 13,
        fontWeight: '600',
    },
    resourceCard: {
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
