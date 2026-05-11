import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Linking,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { OpportunitiesStackParamList } from '@/navigation/OpportunitiesNavigator';
import { ChevronDown, ChevronUp, Mail, MessageSquare, Star } from 'lucide-react-native';
import { adminFeedbackApi } from '@fresherflow/api-client';
import { CompanyLogo } from '@repo/ui';
import { theme } from '../../theme';

type FeedbackItem = {
    id: string;
    message?: string | null;
    rating?: number | null;
    category?: string | null;
    createdAt: string | Date;
    user?: { fullName?: string; email?: string } | null;
};

const StarRow = ({ rating }: { rating: number }) => (
    <View style={styles.starRow}>
        {[1, 2, 3, 4, 5].map((index) => (
            <Star
                key={index}
                size={12}
                color={index <= rating ? '#FBBF24' : theme.colors.border}
                fill={index <= rating ? '#FBBF24' : 'none'}
            />
        ))}
    </View>
);

export const OpportunityFeedbackScreen = () => {
    const route = useRoute<RouteProp<OpportunitiesStackParamList, 'OpportunityFeedback'>>();
    const { opportunityId, title, company, website } = route.params;

    const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const fetchFeedback = useCallback(async () => {
        if (!opportunityId) {
            setLoading(false);
            setRefreshing(false);
            return;
        }

        try {
            const data = await adminFeedbackApi.opportunityFeedback(opportunityId) as { feedback?: FeedbackItem[] };
            setFeedback(data.feedback ?? []);
        } catch {
            // toast is handled in the api layer
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [opportunityId]);

    useFocusEffect(useCallback(() => {
        void fetchFeedback();
    }, [fetchFeedback]));

    const onRefresh = () => {
        setRefreshing(true);
        void fetchFeedback();
    };

    const toggleExpand = (id: string) => {
        setExpanded((previous) => {
            const next = new Set(previous);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const ratedFeedback = feedback.filter((item) => item.rating != null);
    const avgRating = ratedFeedback.length
        ? (ratedFeedback.reduce((sum, item) => sum + (item.rating ?? 0), 0) / ratedFeedback.length).toFixed(1)
        : null;

    const renderItem = ({ item }: { item: FeedbackItem }) => {
        const isExpanded = expanded.has(item.id);
        const message = item.message?.trim() || 'No message provided';
        const isLongMessage = message.length > 120;

        return (
            <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => toggleExpand(item.id)}>
                <View style={styles.cardHeader}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{(item.user?.fullName || '?')[0].toUpperCase()}</Text>
                    </View>
                    <View style={styles.cardBody}>
                        <Text style={styles.name}>{item.user?.fullName || 'Anonymous'}</Text>
                        <Text style={styles.email}>{item.user?.email || '-'}</Text>
                    </View>
                    <View style={styles.metaColumn}>
                        {item.rating != null ? <StarRow rating={item.rating} /> : null}
                        <Text style={styles.date}>
                            {new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </Text>
                    </View>
                </View>

                {item.category ? (
                    <View style={styles.categoryChip}>
                        <Text style={styles.categoryText}>{item.category}</Text>
                    </View>
                ) : null}

                <Text style={styles.message}>
                    {isLongMessage && !isExpanded ? `${message.slice(0, 120)}...` : message}
                </Text>

                {isLongMessage ? (
                    <View style={styles.expandRow}>
                        {isExpanded ? <ChevronUp size={14} color={theme.colors.textMuted} /> : <ChevronDown size={14} color={theme.colors.textMuted} />}
                        <Text style={styles.expandText}>{isExpanded ? 'Show less' : 'Show more'}</Text>
                    </View>
                ) : null}

                {item.user?.email ? (
                    <TouchableOpacity style={styles.mailButton} onPress={() => Linking.openURL(`mailto:${item.user?.email}`)}>
                        <Mail size={13} color={theme.colors.primary} />
                        <Text style={styles.mailText}>Reply via email</Text>
                    </TouchableOpacity>
                ) : null}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerCard}>
                <CompanyLogo website={website ?? null} name={company ?? '?'} size={40} />
                <View style={styles.headerBody}>
                    <Text style={styles.oppTitle} numberOfLines={1}>{title ?? 'Opportunity'}</Text>
                    <Text style={styles.oppCompany}>{company ?? '-'}</Text>
                </View>
                {avgRating ? (
                    <View style={styles.ratingBadge}>
                        <Text style={styles.ratingText}>* {avgRating}</Text>
                        <Text style={styles.ratingCount}>{ratedFeedback.length} ratings</Text>
                    </View>
                ) : null}
            </View>

            <View style={styles.countBar}>
                <Text style={styles.countText}>
                    {feedback.length} feedback item{feedback.length !== 1 ? 's' : ''}
                </Text>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 60 }} />
            ) : (
                <FlatList
                    data={feedback}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <MessageSquare size={40} color={theme.colors.border} />
                            <Text style={styles.emptyText}>No feedback for this opportunity</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    headerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    headerBody: { flex: 1, marginLeft: 10 },
    oppTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
    oppCompany: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
    ratingBadge: { alignItems: 'center', padding: 8, backgroundColor: '#FEF9C3', borderRadius: 10 },
    ratingText: { fontSize: 16, fontWeight: '800', color: '#92400E' },
    ratingCount: { fontSize: 10, color: '#92400E', marginTop: 1 },
    countBar: { paddingHorizontal: 16, paddingVertical: 8 },
    countText: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '600' },
    list: { padding: 14, gap: 12, paddingBottom: 40 },
    card: { backgroundColor: theme.colors.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, padding: 14 },
    cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
    cardBody: { flex: 1 },
    metaColumn: { alignItems: 'flex-end', gap: 4 },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: `${theme.colors.secondary}20`, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 14, fontWeight: '700', color: theme.colors.secondary },
    name: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
    email: { fontSize: 12, color: theme.colors.textMuted, marginTop: 1 },
    date: { fontSize: 11, color: theme.colors.textMuted },
    starRow: { flexDirection: 'row', gap: 2 },
    categoryChip: { alignSelf: 'flex-start', backgroundColor: `${theme.colors.primary}15`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
    categoryText: { fontSize: 11, fontWeight: '700', color: theme.colors.primary, textTransform: 'capitalize' },
    message: { fontSize: 14, color: theme.colors.text, lineHeight: 20 },
    expandRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
    expandText: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '600' },
    mailButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border },
    mailText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
    empty: { paddingTop: 80, alignItems: 'center', gap: 12 },
    emptyText: { fontSize: 15, color: theme.colors.textMuted },
});


