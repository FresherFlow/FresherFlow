import React, { useState, useCallback } from 'react';
import {
    StyleSheet, Text, View, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, Linking,
} from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { MessageSquare, Star, Mail, ChevronDown, ChevronUp } from 'lucide-react-native';
import { Feedback } from '../lib/api';
import { CompanyLogo } from '../components/CompanyLogo';
import { theme } from '../theme';

type FeedbackItem = {
    id: string;
    message: string;
    rating?: number | null;
    category?: string | null;
    createdAt: string;
    user?: { fullName?: string; email?: string } | null;
};

export const OpportunityFeedbackScreen = () => {
    const route = useRoute<any>();
    const { opportunityId, title, company, website } = route.params ?? {};

    const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const fetchFeedback = useCallback(async () => {
        if (!opportunityId) return;
        try {
            const data = await Feedback.opportunityFeedback(opportunityId) as any;
            setFeedback(data.feedback ?? []);
        } catch { /* toast handles it */ } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [opportunityId]);

    useFocusEffect(useCallback(() => { void fetchFeedback(); }, [opportunityId]));
    const onRefresh = () => { setRefreshing(true); void fetchFeedback(); };

    const toggleExpand = (id: string) => {
        setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    };

    const avgRating = (() => {
        const rated = feedback.filter(f => f.rating != null);
        if (!rated.length) return null;
        return (rated.reduce((s, f) => s + (f.rating ?? 0), 0) / rated.length).toFixed(1);
    })();

    const renderItem = ({ item }: { item: FeedbackItem }) => {
        const isExpanded = expanded.has(item.id);
        return (
            <TouchableOpacity style={styles.card} activeOpacity={0.85} onPress={() => toggleExpand(item.id)}>
                <View style={styles.cardHeader}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{(item.user?.fullName || '?')[0].toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{item.user?.fullName || 'Anonymous'}</Text>
                        <Text style={styles.email}>{item.user?.email || '—'}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        {item.rating != null && <StarRow rating={item.rating} />}
                        <Text style={styles.date}>
                            {new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                        </Text>
                    </View>
                </View>
                {item.category && (
                    <View style={styles.categoryChip}>
                        <Text style={styles.categoryText}>{item.category}</Text>
                    </View>
                )}
                <Text style={styles.message}>
                    {item.message.length > 120 && !isExpanded ? item.message.slice(0, 120) + '…' : item.message}
                </Text>
                {item.message.length > 120 && (
                    <View style={styles.expandRow}>
                        {isExpanded ? <ChevronUp size={14} color={theme.colors.textMuted} /> : <ChevronDown size={14} color={theme.colors.textMuted} />}
                        <Text style={styles.expandText}>{isExpanded ? 'Show less' : 'Show more'}</Text>
                    </View>
                )}
                {item.user?.email && (
                    <TouchableOpacity style={styles.mailBtn} onPress={() => Linking.openURL(`mailto:${item.user!.email}`)}>
                        <Mail size={13} color={theme.colors.primary} />
                        <Text style={styles.mailText}>Reply via Email</Text>
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerCard}>
                <CompanyLogo website={website ?? null} name={company ?? '?'} size={40} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.oppTitle} numberOfLines={1}>{title ?? 'Opportunity'}</Text>
                    <Text style={styles.oppCompany}>{company ?? '—'}</Text>
                </View>
                {avgRating && (
                    <View style={styles.ratingBadge}>
                        <Text style={styles.ratingText}>⭐ {avgRating}</Text>
                        <Text style={styles.ratingCount}>{feedback.filter(f => f.rating != null).length} ratings</Text>
                    </View>
                )}
            </View>
            <View style={styles.countBar}>
                <Text style={styles.countText}>{feedback.length} feedback item{feedback.length !== 1 ? 's' : ''}</Text>
            </View>
            {loading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 60 }} />
            ) : (
                <FlatList
                    data={feedback}
                    keyExtractor={i => i.id}
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

const StarRow = ({ rating }: { rating: number }) => (
    <View style={{ flexDirection: 'row', gap: 2 }}>
        {[1, 2, 3, 4, 5].map(i => (
            <Star key={i} size={12} color={i <= rating ? '#FBBF24' : theme.colors.border} fill={i <= rating ? '#FBBF24' : 'none'} />
        ))}
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    headerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, padding: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
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
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.secondary + '20', alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 14, fontWeight: '700', color: theme.colors.secondary },
    name: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
    email: { fontSize: 12, color: theme.colors.textMuted, marginTop: 1 },
    date: { fontSize: 11, color: theme.colors.textMuted },
    categoryChip: { alignSelf: 'flex-start', backgroundColor: theme.colors.primary + '15', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 8 },
    categoryText: { fontSize: 11, fontWeight: '700', color: theme.colors.primary, textTransform: 'capitalize' },
    message: { fontSize: 14, color: theme.colors.text, lineHeight: 20 },
    expandRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
    expandText: { fontSize: 12, color: theme.colors.textMuted, fontWeight: '600' },
    mailBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border },
    mailText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
    empty: { paddingTop: 80, alignItems: 'center', gap: 12 },
    emptyText: { fontSize: 15, color: theme.colors.textMuted },
});
