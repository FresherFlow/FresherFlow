import React, { useState, useCallback } from 'react';
import {
    StyleSheet, Text, View, ScrollView, TouchableOpacity,
    ActivityIndicator, RefreshControl, Alert, Linking, TextInput, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
    Edit3, ExternalLink, Clock, CheckCircle2, Archive,
    RotateCcw, Trash2, Plus, X, MessageSquare,
} from 'lucide-react-native';
import { Opportunities } from '../lib/api';
import { CompanyLogo } from '../components/CompanyLogo';
import { theme } from '../theme';
import { toast } from '../lib/toast';

type Event = { id: string; type: string; note?: string | null; createdAt: string; adminEmail?: string | null };
type OppDetail = {
    id: string; title: string; company: string; type: string; status: string;
    workMode?: string; locations?: string[]; description?: string;
    applyLink?: string; salaryMin?: number; salaryMax?: number; stipend?: string;
    allowedPassoutYears?: number[]; allowedDegrees?: string[];
    expiresAt?: string | null; createdAt: string; updatedAt?: string;
    [key: string]: unknown;
};

export const OpportunityDetailScreen = ({ route, navigation }: any) => {
    const { opportunityId } = route.params as { opportunityId: string };

    const [opp, setOpp] = useState<OppDetail | null>(null);
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tab, setTab] = useState<'details' | 'timeline'>('details');

    // Add event modal
    const [addingEvent, setAddingEvent] = useState(false);
    const [eventType, setEventType] = useState('NOTE');
    const [eventNote, setEventNote] = useState('');
    const [savingEvent, setSavingEvent] = useState(false);

    const EVENT_TYPES = ['NOTE', 'REVIEW', 'APPROVED', 'FLAGGED', 'EXPIRED_MANUAL', 'RESTORED', 'DELETED'];

    const fetchAll = useCallback(async () => {
        try {
            const [dRes, eRes] = await Promise.allSettled([
                Opportunities.get(opportunityId),
                Opportunities.events(opportunityId),
            ]);
            if (dRes.status === 'fulfilled') setOpp((dRes.value as any).opportunity ?? null);
            if (eRes.status === 'fulfilled') setEvents((eRes.value as any).events ?? []);
        } catch { /* silent */ } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [opportunityId]);

    useFocusEffect(useCallback(() => { void fetchAll(); }, [fetchAll]));
    const onRefresh = () => { setRefreshing(true); void fetchAll(); };

    const handleAddEvent = async () => {
        setSavingEvent(true);
        try {
            await Opportunities.addEvent(opportunityId, { type: eventType, note: eventNote.trim() || undefined });
            setEventNote('');
            setEventType('NOTE');
            setAddingEvent(false);
            void fetchAll();
        } catch (e) {
            toast.error('Failed', e instanceof Error ? e.message : 'Failed to add event');
        } finally {
            setSavingEvent(false);
        }
    };

    const handleDeleteEvent = (eventId: string) => {
        Alert.alert('Delete Event?', 'Remove this timeline entry?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete', style: 'destructive', onPress: async () => {
                    try {
                        await Opportunities.deleteEvent(opportunityId, eventId);
                        setEvents(prev => prev.filter(e => e.id !== eventId));
                    } catch (e) {
                        toast.error('Delete failed', e instanceof Error ? e.message : 'Failed');
                    }
                }
            }
        ]);
    };

    const STATUS_COLOR: Record<string, string> = {
        PUBLISHED: theme.colors.success,
        DRAFT: theme.colors.accent,
        ARCHIVED: theme.colors.textMuted,
        EXPIRED: theme.colors.error,
    };

    if (loading) {
        return <View style={styles.loader}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
    }

    if (!opp) {
        return <View style={styles.loader}><Text style={{ color: theme.colors.textMuted }}>Opportunity not found.</Text></View>;
    }

    const sc = STATUS_COLOR[opp.status] ?? theme.colors.textMuted;

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            {/* Header card */}
            <View style={styles.headerCard}>
                <View style={styles.headerTop}>
                    <CompanyLogo
                        website={(opp as any).website ?? null}
                        name={String(opp.company)}
                        size={48}
                    />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.title}>{opp.title}</Text>
                        <Text style={styles.company}>{String(opp.company)}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: sc + '20' }]}>
                        <Text style={[styles.statusText, { color: sc }]}>{opp.status}</Text>
                    </View>
                </View>
                <View style={styles.headerActions}>
                    <ActionBtn icon={<Edit3 size={15} color={theme.colors.primary} />} label="Edit"
                        onPress={() => navigation.navigate('PostOpportunity', { opportunityId: opp.id })} />
                    {opp.applyLink &&
                        <ActionBtn icon={<ExternalLink size={15} color={theme.colors.secondary} />} label="Apply Link"
                            onPress={() => Linking.openURL(String(opp.applyLink))} />}
                    <ActionBtn icon={<MessageSquare size={15} color={theme.colors.textMuted} />} label="Feedback"
                        onPress={() => navigation.navigate('OpportunityFeedback', { opportunityId: opp.id, title: opp.title })} />
                </View>
            </View>

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
                    <View style={styles.detailsGrid}>
                        <DetailRow label="Type" value={String(opp.type)} />
                        <DetailRow label="Work Mode" value={String(opp.workMode ?? '—')} />
                        <DetailRow label="Locations" value={Array.isArray(opp.locations) ? opp.locations.join(', ') : '—'} />
                        {opp.salaryRange && <DetailRow label="Salary" value={`${String(opp.salaryRange)} (${String(opp.salaryPeriod ?? 'YEARLY')})`} />}
                        {(opp.experienceMin != null || opp.experienceMax != null) &&
                            <DetailRow label="Experience" value={`${opp.experienceMin ?? 0}–${opp.experienceMax ?? '?'} yrs`} />}
                        {Array.isArray(opp.requiredSkills) && (opp.requiredSkills as string[]).length > 0 &&
                            <DetailRow label="Skills" value={(opp.requiredSkills as string[]).join(', ')} />}
                        {Array.isArray(opp.allowedPassoutYears) && (opp.allowedPassoutYears as number[]).length > 0 &&
                            <DetailRow label="Passout Years" value={(opp.allowedPassoutYears as number[]).join(', ')} />}
                        {Array.isArray(opp.allowedDegrees) && (opp.allowedDegrees as string[]).length > 0 &&
                            <DetailRow label="Degrees" value={(opp.allowedDegrees as string[]).join(', ')} />}
                        {opp.jobFunction && <DetailRow label="Function" value={String(opp.jobFunction)} />}
                        {opp.employmentType && <DetailRow label="Employment" value={String(opp.employmentType)} />}
                        {opp.sourceLink && (
                            <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(String(opp.sourceLink))}>
                                <ExternalLink size={14} color={theme.colors.primary} />
                                <Text style={styles.linkText} numberOfLines={1}>Source Link</Text>
                            </TouchableOpacity>
                        )}
                        {opp.applyLink && (
                            <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(String(opp.applyLink))}>
                                <ExternalLink size={14} color={theme.colors.secondary} />
                                <Text style={styles.linkText} numberOfLines={1}>Apply Link</Text>
                            </TouchableOpacity>
                        )}
                        {opp.expiresAt &&
                            <DetailRow label="Expires" value={new Date(String(opp.expiresAt)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />}
                        <DetailRow label="Created" value={new Date(opp.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />

                        {/* Walk-in details */}
                        {opp.type === 'WALKIN' && (opp as any).walkInDetails && (() => {
                            const wd = (opp as any).walkInDetails;
                            return (
                                <View style={styles.walkInCard}>
                                    <Text style={styles.sectionHeader}>Walk-in Details</Text>
                                    {wd.venueAddress && <DetailRow label="Venue" value={String(wd.venueAddress)} />}
                                    {wd.timeRange && <DetailRow label="Time" value={String(wd.timeRange)} />}
                                    {wd.contactPerson && <DetailRow label="Contact" value={`${wd.contactPerson}${wd.contactPhone ? ' · ' + wd.contactPhone : ''}`} />}
                                    {Array.isArray(wd.requiredDocuments) && wd.requiredDocuments.length > 0 &&
                                        <DetailRow label="Docs" value={(wd.requiredDocuments as string[]).join(', ')} />}
                                    {wd.venueLink && (
                                        <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(String(wd.venueLink))}>
                                            <ExternalLink size={14} color={theme.colors.primary} />
                                            <Text style={styles.linkText}>Maps Link</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            );
                        })()}

                        {/* Extras */}
                        {opp.incentives && <DescCard label="Incentives / Perks" value={String(opp.incentives)} />}
                        {opp.selectionProcess && <DescCard label="Selection Process" value={String(opp.selectionProcess)} />}
                        {opp.notesHighlights && <DescCard label="Notes / Highlights" value={String(opp.notesHighlights)} />}
                        {opp.description && <DescCard label="Description" value={String(opp.description)} />}
                    </View>
                ) : (
                    <View style={{ padding: 16 }}>
                        <TouchableOpacity style={styles.addEventBtn} onPress={() => setAddingEvent(true)}>
                            <Plus size={16} color={theme.colors.primary} />
                            <Text style={styles.addEventText}>Add Timeline Event</Text>
                        </TouchableOpacity>

                        {events.length === 0 ? (
                            <View style={styles.empty}>
                                <Clock size={36} color={theme.colors.border} />
                                <Text style={styles.emptyText}>No events yet</Text>
                            </View>
                        ) : (
                            <View style={styles.timeline}>
                                {events.map((ev, idx) => (
                                    <View key={ev.id} style={styles.timelineItem}>
                                        <View style={styles.timelineLine}>
                                            <View style={[styles.timelineDot, { backgroundColor: eventColor(ev.type) }]} />
                                            {idx < events.length - 1 && <View style={styles.timelineConnector} />}
                                        </View>
                                        <View style={styles.timelineBody}>
                                            <View style={styles.timelineHeader}>
                                                <View style={[styles.eventTypeBadge, { backgroundColor: eventColor(ev.type) + '20' }]}>
                                                    <Text style={[styles.eventTypeText, { color: eventColor(ev.type) }]}>
                                                        {ev.type.replace(/_/g, ' ')}
                                                    </Text>
                                                </View>
                                                <TouchableOpacity onPress={() => handleDeleteEvent(ev.id)} style={{ padding: 4 }}>
                                                    <X size={13} color={theme.colors.textMuted} />
                                                </TouchableOpacity>
                                            </View>
                                            {ev.note && <Text style={styles.eventNote}>{ev.note}</Text>}
                                            <Text style={styles.eventMeta}>
                                                {ev.adminEmail ?? 'Admin'} · {new Date(ev.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Add Event Modal */}
            <Modal visible={addingEvent} transparent animationType="slide" onRequestClose={() => setAddingEvent(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>Add Timeline Event</Text>
                        <Text style={styles.fieldLabel}>Event Type</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {EVENT_TYPES.map(t => (
                                    <TouchableOpacity key={t}
                                        style={[styles.eventChip, eventType === t && { backgroundColor: theme.colors.primary }]}
                                        onPress={() => setEventType(t)}>
                                        <Text style={[styles.eventChipText, eventType === t && { color: '#fff' }]}>
                                            {t.replace(/_/g, ' ')}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                        <Text style={styles.fieldLabel}>Note (optional)</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Add a note…"
                            placeholderTextColor={theme.colors.textMuted}
                            value={eventNote}
                            onChangeText={setEventNote}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setAddingEvent(false)}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.saveBtn, savingEvent && { opacity: 0.6 }]} onPress={handleAddEvent} disabled={savingEvent}>
                                {savingEvent ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Save</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const ActionBtn = ({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) => (
    <TouchableOpacity style={styles.headerActionBtn} onPress={onPress}>
        {icon}
        <Text style={styles.headerActionText}>{label}</Text>
    </TouchableOpacity>
);
const DetailRow = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.detailRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldValue}>{value}</Text>
    </View>
);
const DescCard = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.descCard}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.descText}>{value}</Text>
    </View>
);

function eventColor(type: string) {
    if (type.includes('DELETE') || type.includes('FLAG') || type.includes('EXPIRED')) return theme.colors.error;
    if (type.includes('APPROVED') || type.includes('RESTORED')) return theme.colors.success;
    if (type === 'REVIEW') return theme.colors.accent;
    return theme.colors.primary;
}

const styles = StyleSheet.create({
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
    headerCard: {
        backgroundColor: theme.colors.surface, padding: 16,
        borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    },
    headerTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 12 },
    title: { fontSize: 18, fontWeight: '800', color: theme.colors.text, marginBottom: 3 },
    company: { fontSize: 14, color: theme.colors.textMuted },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
    statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
    headerActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    headerActionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: theme.colors.background, borderRadius: 8,
        paddingHorizontal: 10, paddingVertical: 7,
        borderWidth: 1, borderColor: theme.colors.border,
    },
    headerActionText: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
    tabRow: {
        flexDirection: 'row', backgroundColor: theme.colors.surface,
        borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    },
    tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: theme.colors.primary },
    tabText: { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
    tabTextActive: { color: theme.colors.primary },
    scrollContent: { paddingBottom: 40 },
    detailsGrid: { padding: 16, gap: 10 },
    detailRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
        backgroundColor: theme.colors.surface, borderRadius: 10, padding: 12,
        borderWidth: 1, borderColor: theme.colors.border,
    },
    fieldLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
    fieldValue: { fontSize: 14, fontWeight: '600', color: theme.colors.text, flex: 1, textAlign: 'right' },
    descCard: { backgroundColor: theme.colors.surface, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: theme.colors.border, gap: 8 },
    descText: { fontSize: 14, color: theme.colors.text, lineHeight: 20 },
    walkInCard: { backgroundColor: theme.colors.surface + '80', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: theme.colors.border, gap: 8 },
    sectionHeader: { fontSize: 13, fontWeight: '800', color: theme.colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
    linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.surface, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: theme.colors.border },
    linkText: { fontSize: 14, fontWeight: '600', color: theme.colors.primary, flex: 1 },
    addEventBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        borderWidth: 1.5, borderColor: theme.colors.primary, borderStyle: 'dashed',
        borderRadius: 10, padding: 12, justifyContent: 'center', marginBottom: 16,
    },
    addEventText: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
    empty: { paddingTop: 60, alignItems: 'center', gap: 12 },
    emptyText: { fontSize: 14, color: theme.colors.textMuted },
    timeline: { gap: 0 },
    timelineItem: { flexDirection: 'row', gap: 12 },
    timelineLine: { alignItems: 'center', width: 20 },
    timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
    timelineConnector: { width: 2, flex: 1, backgroundColor: theme.colors.border, marginVertical: 4, minHeight: 20 },
    timelineBody: { flex: 1, paddingBottom: 18 },
    timelineHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
    eventTypeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    eventTypeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
    eventNote: { fontSize: 14, color: theme.colors.text, lineHeight: 19, marginBottom: 4 },
    eventMeta: { fontSize: 11, color: theme.colors.textMuted },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
    modal: {
        backgroundColor: theme.colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: 20, paddingBottom: 40,
    },
    modalTitle: { fontSize: 17, fontWeight: '800', color: theme.colors.text, marginBottom: 16 },
    modalInput: {
        backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border,
        borderRadius: 10, padding: 12, fontSize: 14, color: theme.colors.text, marginBottom: 16, minHeight: 80,
    },
    modalActions: { flexDirection: 'row', gap: 10 },
    cancelBtn: { flex: 1, backgroundColor: theme.colors.background, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, padding: 13, alignItems: 'center' },
    cancelBtnText: { fontWeight: '700', color: theme.colors.textMuted },
    saveBtn: { flex: 2, backgroundColor: theme.colors.primary, borderRadius: 10, padding: 13, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
    eventChip: {
        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
        borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.background,
    },
    eventChipText: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted },
});
