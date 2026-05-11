import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Edit3, CheckCircle2, Trash2, RotateCcw, Clock } from 'lucide-react-native';
import { CompanyLogo } from '@repo/ui';
import { theme } from '@/theme';
import { type Opportunity } from '@/lib/api';
import type { NavigationProp } from '@react-navigation/native';

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    PUBLISHED: { bg: theme.colors.success + '20', text: theme.colors.success },
    DRAFT:     { bg: theme.colors.accent  + '20', text: theme.colors.accent  },
    ARCHIVED:  { bg: theme.colors.textMuted + '20', text: theme.colors.textMuted },
    EXPIRED:   { bg: theme.colors.error   + '20', text: theme.colors.error   },
};

interface JobCardProps {
    item: Opportunity;
    navigation: NavigationProp<Record<string, unknown>>;
    handlePublish: (id: string) => void;
    handleExpire: (id: string, title: string) => void;
    handleRestore: (id: string) => void;
    handleDelete: (id: string, title: string) => void;
}

export const JobCard = ({ 
    item, 
    navigation, 
    handlePublish, 
    handleExpire, 
    handleRestore, 
    handleDelete 
}: JobCardProps) => {
    const sc = STATUS_COLORS[item.status] ?? STATUS_COLORS.ARCHIVED;
    const isExpired = item.status === 'EXPIRED' || item.status === 'ARCHIVED';

    return (
        <View style={styles.jobCard}>
            <View style={styles.jobHeader}>
                <CompanyLogo website={(item as { website?: string | null }).website ?? null} name={String(item.company)} size={38} />
                <TouchableOpacity style={{ flex: 1, paddingRight: 8, marginLeft: 4 }} onPress={() => navigation.navigate('OpportunityDetail', { opportunityId: item.id })}>
                    <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.jobCompany}>{String(item.company)}</Text>
                </TouchableOpacity>
                <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusText, { color: sc.text }]}>{item.status}</Text>
                </View>
            </View>
            <View style={styles.jobFooter}>
                <Text style={styles.jobDate}>
                    {item.postedAt ? new Date(String(item.postedAt)).toLocaleDateString('en-IN') : '—'}
                    {' · '}{String(item.type)}
                </Text>
                <View style={styles.actionRow}>
                    {item.status === 'DRAFT' && (
                        <ActionBtn icon={<CheckCircle2 size={15} color={theme.colors.success} />} onPress={() => handlePublish(String(item.id))} />
                    )}
                    {item.status === 'PUBLISHED' && (
                        <ActionBtn icon={<Clock size={15} color={theme.colors.accent} />} onPress={() => handleExpire(String(item.id), String(item.title))} />
                    )}
                    {isExpired && (
                        <ActionBtn icon={<RotateCcw size={15} color={theme.colors.primary} />} onPress={() => handleRestore(String(item.id))} />
                    )}
                    <ActionBtn icon={<Edit3 size={15} color={theme.colors.primary} />} onPress={() => navigation.navigate('PostOpportunity', { opportunityId: item.id })} />
                    <ActionBtn icon={<Trash2 size={15} color={theme.colors.error} />} onPress={() => handleDelete(String(item.id), String(item.title))} />
                </View>
            </View>
        </View>
    );
};

const ActionBtn = ({ icon, onPress }: { icon: React.ReactNode; onPress: () => void }) => (
    <TouchableOpacity style={styles.actionBtn} onPress={onPress}>{icon}</TouchableOpacity>
);

const styles = StyleSheet.create({
    jobCard: {
        backgroundColor: theme.colors.surface, borderRadius: 12,
        borderWidth: 1, borderColor: theme.colors.border, padding: 14,
    },
    jobHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    jobTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text, marginBottom: 3 },
    jobCompany: { fontSize: 13, color: theme.colors.textMuted },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
    jobFooter: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 10,
    },
    jobDate: { fontSize: 12, color: theme.colors.textMuted, flex: 1 },
    actionRow: { flexDirection: 'row', gap: 4 },
    actionBtn: { padding: 7, borderRadius: 8, backgroundColor: theme.colors.background },
});
