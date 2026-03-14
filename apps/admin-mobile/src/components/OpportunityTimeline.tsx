import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Plus, Clock, X } from 'lucide-react-native';
import { Opportunities } from '../lib/api';
import { theme } from '../theme';
import { toast } from '../lib/toast';

export type Event = { id: string; type: string; note?: string | null; createdAt: string; adminEmail?: string | null };

const EVENT_TYPES = ['NOTE', 'REVIEW', 'APPROVED', 'FLAGGED', 'EXPIRED_MANUAL', 'RESTORED', 'DELETED'];

function eventColor(type: string) {
    if (type.includes('DELETE') || type.includes('FLAG') || type.includes('EXPIRED')) return theme.colors.error;
    if (type.includes('APPROVED') || type.includes('RESTORED')) return theme.colors.success;
    if (type === 'REVIEW') return theme.colors.accent;
    return theme.colors.primary;
}

interface OpportunityTimelineProps {
    opportunityId: string;
    events: Event[];
    onEventChange: () => void;
}

export const OpportunityTimeline = ({ opportunityId, events, onEventChange }: OpportunityTimelineProps) => {
    const [addingEvent, setAddingEvent] = useState(false);
    const [eventType, setEventType] = useState('NOTE');
    const [eventNote, setEventNote] = useState('');
    const [savingEvent, setSavingEvent] = useState(false);

    const handleAddEvent = async () => {
        setSavingEvent(true);
        try {
            await Opportunities.addEvent(opportunityId, { type: eventType, note: eventNote.trim() || undefined });
            setEventNote('');
            setEventType('NOTE');
            setAddingEvent(false);
            onEventChange();
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
                        onEventChange();
                    } catch (e) {
                        toast.error('Delete failed', e instanceof Error ? e.message : 'Failed');
                    }
                }
            }
        ]);
    };

    return (
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

const styles = StyleSheet.create({
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
    fieldLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
});
