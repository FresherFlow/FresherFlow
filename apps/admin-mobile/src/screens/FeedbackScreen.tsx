import React, { useState, useCallback } from 'react';
import {
    StyleSheet, Text, View, FlatList, TouchableOpacity,
    ActivityIndicator, RefreshControl, Linking, TextInput, KeyboardAvoidingView, Platform
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { MessageSquare, AlertTriangle, ChevronRight, Smartphone, NotebookPen } from 'lucide-react-native';
import { Feedback } from '../lib/api';
import { CompanyLogo } from '../components/CompanyLogo';
import { theme } from '../theme';

type OppFeedbackGroup = {
    opportunity: { id: string; title: string; company: string; type: string } | null;
    feedbackCount: number;
    negativeCount: number;
    feedback: { id: string; reason: string; createdAt: string }[];
};

type AppFeedbackItem = {
    id: string;
    type?: string;
    message: string;
    rating?: number | null;
    category?: string | null;
    createdAt: string;
    user?: { fullName?: string; email?: string } | null;
};

type Tab = 'listing' | 'app' | 'notes';

type AdminNote = {
    id: string;
    text: string;
    createdAt: string;
};

export const FeedbackScreen = () => {
    const navigation = useNavigation<any>();
    const [tab, setTab] = useState<Tab>('listing');
    const [listingGroups, setListingGroups] = useState<OppFeedbackGroup[]>([]);
    const [appFeedback, setAppFeedback] = useState<AppFeedbackItem[]>([]);
    const [notes, setNotes] = useState<AdminNote[]>([]);
    const [newNote, setNewNote] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [submittingNote, setSubmittingNote] = useState(false);

    const fetchAll = useCallback(async () => {
        try {
            const [lData, aData] = await Promise.allSettled([
                Feedback.list({ limit: 100 }),
                Feedback.appFeedback({ limit: 50 }),
            ]);
            if (lData.status === 'fulfilled') {
                // API returns feedbackSummary (grouped by opportunity)
                const val = lData.value as any;
                setListingGroups(val.feedbackSummary ?? []);
            }
            if (aData.status === 'fulfilled') setAppFeedback((aData.value as any).feedback ?? []);
        } catch { /* toast handles it */ } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { void fetchAll(); }, [fetchAll]));
    const onRefresh = () => { setRefreshing(true); void fetchAll(); };

    const handleSaveNote = () => {
        if (!newNote.trim()) return;
        setSubmittingNote(true);
        // Simulate API call for now (can map to a real endpoint later)
        setTimeout(() => {
            const note: AdminNote = {
                id: Date.now().toString(),
                text: newNote.trim(),
                createdAt: new Date().toISOString(),
            };
            setNotes(prev => [note, ...prev]);
            setNewNote('');
            setSubmittingNote(false);
        }, 600);
    };

    const renderListingGroup = ({ item }: { item: OppFeedbackGroup }) => {
        const opp = item.opportunity;
        const hasNegative = item.negativeCount > 0;
        return (
            <TouchableOpacity
                style={[styles.card, hasNegative && styles.cardWarning]}
                activeOpacity={0.8}
                onPress={() => opp && navigation.navigate('OpportunityFeedback', {
                    opportunityId: opp.id,
                    title: opp.title,
                    company: opp.company,
                })}
            >
                <View style={styles.cardRow}>
                    {opp && <CompanyLogo website={null} name={opp.company} size={38} />}
                    <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.oppTitle} numberOfLines={1}>{opp?.title ?? 'Unknown'}</Text>
                        <Text style={styles.oppCompany}>{opp?.company ?? '—'} · {opp?.type ?? ''}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <View style={[styles.countBadge, { backgroundColor: hasNegative ? theme.colors.error + '20' : theme.colors.success + '20' }]}>
                            <Text style={[styles.countNum, { color: hasNegative ? theme.colors.error : theme.colors.success }]}>
                                {item.feedbackCount}
                            </Text>
                        </View>
                        {hasNegative && (
                            <View style={styles.negBadge}>
                                <AlertTriangle size={10} color={theme.colors.error} />
                                <Text style={styles.negText}>{item.negativeCount} issues</Text>
                            </View>
                        )}
                    </View>
                    <ChevronRight size={16} color={theme.colors.textMuted} style={{ marginLeft: 6 }} />
                </View>
                {item.feedback.slice(0, 2).map(f => (
                    <View key={f.id} style={styles.reasonChip}>
                        <Text style={styles.reasonText}>{f.reason.replace(/_/g, ' ')}</Text>
                    </View>
                ))}
            </TouchableOpacity>
        );
    };

    const renderAppItem = ({ item }: { item: AppFeedbackItem }) => (
        <View style={styles.card}>
            <View style={styles.cardRow}>
                <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{(item.user?.fullName || '?')[0].toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.name}>{item.user?.fullName || 'Anonymous'}</Text>
                    <Text style={styles.email}>{item.user?.email || '—'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    {item.type && (
                        <View style={[styles.typeBadge, { backgroundColor: theme.colors.primary + '15' }]}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: theme.colors.primary }}>{item.type}</Text>
                        </View>
                    )}
                    <Text style={styles.date}>
                        {new Date(item.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </Text>
                </View>
            </View>
            {item.category && (
                <View style={styles.reasonChip}>
                    <Text style={styles.reasonText}>{item.category}</Text>
                </View>
            )}
            <Text style={styles.message} numberOfLines={4}>{item.message}</Text>
            {item.user?.email && (
                <TouchableOpacity style={styles.mailBtn} onPress={() => Linking.openURL(`mailto:${item.user!.email}`)}>
                    <Text style={styles.mailText}>📧 Reply</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.tabRow}>
                <TouchableOpacity style={[styles.tab, tab === 'listing' && styles.tabActive]} onPress={() => setTab('listing')}>
                    <MessageSquare size={14} color={tab === 'listing' ? theme.colors.primary : theme.colors.textMuted} />
                    <Text style={[styles.tabText, tab === 'listing' && styles.tabTextActive]}>
                        Listing ({listingGroups.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, tab === 'app' && styles.tabActive]} onPress={() => setTab('app')}>
                    <Smartphone size={14} color={tab === 'app' ? theme.colors.primary : theme.colors.textMuted} />
                    <Text style={[styles.tabText, tab === 'app' && styles.tabTextActive]}>
                        App ({appFeedback.length})
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, tab === 'notes' && styles.tabActive]} onPress={() => setTab('notes')}>
                    <NotebookPen size={14} color={tab === 'notes' ? theme.colors.primary : theme.colors.textMuted} />
                    <Text style={[styles.tabText, tab === 'notes' && styles.tabTextActive]}>
                        Notes
                    </Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color={theme.colors.primary} style={{ marginTop: 60 }} />
            ) : tab === 'listing' ? (
                <FlatList
                    data={listingGroups}
                    keyExtractor={(_, i) => String(i)}
                    renderItem={renderListingGroup}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
                    ListEmptyComponent={<View style={styles.empty}><MessageSquare size={40} color={theme.colors.border} /><Text style={styles.emptyText}>No listing feedback</Text></View>}
                />
            ) : tab === 'app' ? (
                <FlatList
                    data={appFeedback}
                    keyExtractor={i => i.id}
                    renderItem={renderAppItem}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
                    ListEmptyComponent={<View style={styles.empty}><Smartphone size={40} color={theme.colors.border} /><Text style={styles.emptyText}>No app feedback</Text></View>}
                />
            ) : (
                <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <FlatList
                        data={notes}
                        keyExtractor={i => i.id}
                        contentContainerStyle={styles.list}
                        renderItem={({ item }) => (
                            <View style={styles.card}>
                                <Text style={styles.date}>
                                    {new Date(item.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </Text>
                                <Text style={[styles.message, { marginTop: 4 }]}>{item.text}</Text>
                            </View>
                        )}
                        ListEmptyComponent={<View style={styles.empty}><NotebookPen size={40} color={theme.colors.border} /><Text style={styles.emptyText}>No internal notes yet</Text></View>}
                    />
                    <View style={styles.noteInputArea}>
                        <TextInput
                            style={styles.noteInput}
                            placeholder="Write an internal admin note..."
                            placeholderTextColor={theme.colors.textMuted}
                            value={newNote}
                            onChangeText={setNewNote}
                            multiline
                            maxLength={500}
                        />
                        <TouchableOpacity
                            style={[styles.noteBtn, (!newNote.trim() || submittingNote) && { opacity: 0.5 }]}
                            onPress={handleSaveNote}
                            disabled={!newNote.trim() || submittingNote}
                        >
                            {submittingNote ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.noteBtnText}>Save</Text>}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    tabRow: { flexDirection: 'row', backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: theme.colors.primary },
    tabText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
    tabTextActive: { color: theme.colors.primary },
    list: { padding: 14, gap: 12, paddingBottom: 40 },
    card: { backgroundColor: theme.colors.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, padding: 14, gap: 8 },
    cardWarning: { borderColor: theme.colors.error + '50' },
    cardRow: { flexDirection: 'row', alignItems: 'center' },
    oppTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
    oppCompany: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
    countBadge: { minWidth: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
    countNum: { fontSize: 14, fontWeight: '800' },
    negBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    negText: { fontSize: 10, color: theme.colors.error, fontWeight: '600' },
    reasonChip: { alignSelf: 'flex-start', backgroundColor: theme.colors.primary + '12', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    reasonText: { fontSize: 11, fontWeight: '700', color: theme.colors.primary, textTransform: 'capitalize' },
    avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.secondary + '20', alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 14, fontWeight: '700', color: theme.colors.secondary },
    name: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
    email: { fontSize: 12, color: theme.colors.textMuted },
    date: { fontSize: 11, color: theme.colors.textMuted },
    typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    message: { fontSize: 14, color: theme.colors.text, lineHeight: 20 },
    mailBtn: { alignSelf: 'flex-start', paddingTop: 8, borderTopWidth: 1, borderTopColor: theme.colors.border, width: '100%' },
    mailText: { fontSize: 13, fontWeight: '600', color: theme.colors.primary },
    empty: { paddingTop: 80, alignItems: 'center', gap: 12 },
    emptyText: { fontSize: 15, color: theme.colors.textMuted },
    noteInputArea: { padding: 14, backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.border, flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
    noteInput: { flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 22, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: 15, color: theme.colors.text },
    noteBtn: { backgroundColor: theme.colors.primary, height: 44, paddingHorizontal: 16, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    noteBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
