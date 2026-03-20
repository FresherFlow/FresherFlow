import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { CheckCircle2, Clock, Edit3, ExternalLink, MessageSquare, RotateCcw, Trash2 } from 'lucide-react-native';
import { CompanyLogo } from '@/components/CompanyLogo';
import { theme } from '@/theme';

import { type Opportunity } from '@/lib/api';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OpportunitiesStackParamList } from '@/navigation/OpportunitiesNavigator';

interface DetailHeaderProps {
    opp: Opportunity;
    navigation: NativeStackNavigationProp<OpportunitiesStackParamList>;
    statusColor: string;
    onPublish?: () => void;
    onExpire?: () => void;
    onRestore?: () => void;
    onDelete?: () => void;
}

export const DetailHeader = ({ opp, navigation, statusColor, onPublish, onExpire, onRestore, onDelete }: DetailHeaderProps) => {
    return (
        <View style={styles.headerCard}>
            <View style={styles.headerTop}>
                <CompanyLogo
                    website={opp.website ?? null}
                    name={String(opp.company)}
                    size={48}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.title}>{opp.title}</Text>
                    <Text style={styles.company}>{String(opp.company)}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{opp.status}</Text>
                </View>
            </View>
            <View style={styles.headerActions}>
                <ActionBtn icon={<Edit3 size={15} color={theme.colors.primary} />} label="Edit"
                    onPress={() => navigation.navigate('PostOpportunity', { opportunityId: opp.id })} />
                {opp.status === 'DRAFT' && onPublish ? (
                    <ActionBtn icon={<CheckCircle2 size={15} color={theme.colors.success} />} label="Publish" onPress={onPublish} />
                ) : null}
                {opp.status === 'PUBLISHED' && onExpire ? (
                    <ActionBtn icon={<Clock size={15} color={theme.colors.accent} />} label="Expire" onPress={onExpire} />
                ) : null}
                {(opp.status === 'EXPIRED' || opp.status === 'ARCHIVED') && onRestore ? (
                    <ActionBtn icon={<RotateCcw size={15} color={theme.colors.primary} />} label="Restore" onPress={onRestore} />
                ) : null}
                {opp.applyLink &&
                    <ActionBtn icon={<ExternalLink size={15} color={theme.colors.secondary} />} label="Apply Link"
                        onPress={() => Linking.openURL(String(opp.applyLink))} />}
                {opp.sourceLink &&
                    <ActionBtn icon={<ExternalLink size={15} color={theme.colors.primary} />} label="Source Link"
                        onPress={() => Linking.openURL(String(opp.sourceLink))} />}
                <ActionBtn icon={<MessageSquare size={15} color={theme.colors.textMuted} />} label="Feedback"
                    onPress={() => navigation.navigate('OpportunityFeedback', {
                        opportunityId: opp.id,
                        title: opp.title,
                        company: opp.company,
                        website: opp.website ?? opp.companyWebsite ?? null,
                    })}
                />
                {onDelete ? (
                    <ActionBtn icon={<Trash2 size={15} color={theme.colors.error} />} label="Delete" onPress={onDelete} />
                ) : null}
            </View>
        </View>
    );
};

const ActionBtn = ({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) => (
    <TouchableOpacity style={styles.headerActionBtn} onPress={onPress}>
        {icon}
        <Text style={styles.headerActionText}>{label}</Text>
    </TouchableOpacity>
);

const styles = StyleSheet.create({
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
});


