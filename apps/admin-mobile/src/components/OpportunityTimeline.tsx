import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Plus, Clock, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Opportunities } from '../lib/api';
import { useTheme } from '../theme/ThemeProvider';
import { alpha } from '../theme';
import { toast } from '../lib/toast';

export type Event = { id: string; type: string; note?: string | null; createdAt: string; adminEmail?: string | null };

interface OpportunityTimelineProps {
    opportunityId: string;
    events: Event[];
    onEventChange: () => void;
}

const EVENT_TYPES = ['NOTE', 'REVIEW', 'APPROVED', 'FLAGGED', 'EXPIRED_MANUAL', 'RESTORED', 'DELETED'];

export const OpportunityTimeline = ({ opportunityId, events, onEventChange }: OpportunityTimelineProps) => {
    const [addingEvent, setAddingEvent] = useState(false);
    const [eventType, setEventType] = useState('NOTE');
    const [eventNote, setEventNote] = useState('');
    const [savingEvent, setSavingEvent] = useState(false);
    const { currentTheme } = useTheme();
    const { colors } = currentTheme;

    function eventColor(type: string) {
        if (type.includes('DELETE') || type.includes('FLAG') || type.includes('EXPIRED')) return colors.error;
        if (type.includes('APPROVED') || type.includes('RESTORED')) return colors.success;
        if (type === 'REVIEW') return colors.accent;
        return colors.primary;
    }

    const handleAddEvent = async () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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
            <TouchableOpacity 
                style={[styles.addEventBtn, { borderColor: colors.primary }]} 
                onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setAddingEvent(true);
                }}
            >
                <Plus size={16} color={colors.primary} />
                <Text style={[styles.addEventText, { color: colors.primary }]}>Add Timeline Event</Text>
            </TouchableOpacity>

            {events.length === 0 ? (
                <View style={styles.empty}>
                    <Clock size={36} color={colors.border} />
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>No events yet</Text>
                </View>
            ) : (
                <View style={styles.timeline}>
                    {events.map((ev: Event, idx: number) => (
                        <View key={ev.id} style={styles.timelineItem}>
                            <View style={styles.timelineLine}>
                                <View style={[styles.timelineDot, { backgroundColor: eventColor(ev.type) }]} />
                                {idx < events.length - 1 && <View style={[styles.timelineConnector, { backgroundColor: colors.border }]} />}
                            </View>
                            <View style={styles.timelineBody}>
                                <View style={styles.timelineHeader}>
                                    <View style={[styles.eventTypeBadge, { backgroundColor: alpha(eventColor(ev.type), 0.1) }]}>
                                        <Text style={[styles.eventTypeText, { color: eventColor(ev.type) }]}>
                                            {ev.type.replace(/_/g, ' ')}
                                        </Text>
                                    </View>
                                    <TouchableOpacity onPress={() => handleDeleteEvent(ev.id)} style={{ padding: 4 }}>
                                        <X size={13} color={colors.textMuted} />
                                    </TouchableOpacity>
                                </View>
                                {ev.note && <Text style={[styles.eventNote, { color: colors.text }]}>{ev.note}</Text>}
                                <Text style={[styles.eventMeta, { color: colors.textMuted }]}>
                                    {ev.adminEmail ?? 'Admin'} · {new Date(ev.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                </Text>
                            </View>
                        </View>
                    ))}
                </View>
            )}

            <Modal visible={addingEvent} transparent animationType="slide" onRequestClose={() => setAddingEvent(false)}>
                <View style={[styles.modalOverlay, { backgroundColor: colors.blackTranslucent }]}>
                    <View style={[styles.modal, { backgroundColor: colors.surface }]}>
                        <Text style={[styles.modalTitle, { color: colors.text }]}>Add Timeline Event</Text>
                        <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Event Type</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                                {EVENT_TYPES.map(t => (
                                    <TouchableOpacity key={t}
                                        style={[styles.eventChip, { borderColor: colors.border, backgroundColor: colors.background }, eventType === t && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                                        onPress={() => {
                                            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setEventType(t);
                                        }}>
                                        <Text style={[styles.eventChipText, { color: colors.textMuted }, eventType === t && { color: colors.white }]}>
                                            {t.replace(/_/g, ' ')}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>
                        <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Note (optional)</Text>
                        <TextInput
                            style={[styles.modalInput, { backgroundColor: colors.background, borderColor: colors.border, color: colors.text }]}
                            placeholder="Add a note…"
                            placeholderTextColor={colors.textMuted}
                            value={eventNote}
                            onChangeText={setEventNote}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => setAddingEvent(false)}>
                                <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }, savingEvent && { opacity: 0.6 }]} onPress={handleAddEvent} disabled={savingEvent}>
                                {savingEvent ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={[styles.saveBtnText, { color: colors.white }]}>Save</Text>}
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
        borderWidth: 1.5, borderStyle: 'dashed',
        borderRadius: 10, padding: 12, justifyContent: 'center', marginBottom: 16,
    },
    addEventText: { fontSize: 14, fontWeight: '700' },
    empty: { paddingTop: 60, alignItems: 'center', gap: 12 },
    emptyText: { fontSize: 14 },
    timeline: { gap: 0 },
    timelineItem: { flexDirection: 'row', gap: 12 },
    timelineLine: { alignItems: 'center', width: 20 },
    timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 4 },
    timelineConnector: { width: 2, flex: 1, marginVertical: 4, minHeight: 20 },
    timelineBody: { flex: 1, paddingBottom: 18 },
    timelineHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 },
    eventTypeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    eventTypeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
    eventNote: { fontSize: 14, lineHeight: 19, marginBottom: 4 },
    eventMeta: { fontSize: 11 },
    modalOverlay: { flex: 1, justifyContent: 'flex-end' },
    modal: {
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: 20, paddingBottom: 40,
    },
    modalTitle: { fontSize: 17, fontWeight: '800', marginBottom: 16 },
    modalInput: {
        borderWidth: 1,
        borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 16, minHeight: 80,
    },
    modalActions: { flexDirection: 'row', gap: 10 },
    cancelBtn: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 13, alignItems: 'center' },
    cancelBtnText: { fontWeight: '700' },
    saveBtn: { flex: 2, borderRadius: 10, padding: 13, alignItems: 'center' },
    saveBtnText: { fontWeight: '800', fontSize: 15 },
    eventChip: {
        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
        borderWidth: 1,
    },
    eventChipText: { fontSize: 12, fontWeight: '600' },
    fieldLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 },
});
