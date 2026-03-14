import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, type ViewStyle } from 'react-native';
import { Edit3, ExternalLink, MessageSquare } from 'lucide-react-native';
import { CompanyLogo } from '../CompanyLogo';
import { theme } from '../../theme';

interface DetailHeaderProps {
    opp: any;
    navigation: any;
    statusColor: string;
}

export const DetailHeader = ({ opp, navigation, statusColor }: DetailHeaderProps) => {
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
                {opp.applyLink &&
                    <ActionBtn icon={<ExternalLink size={15} color={theme.colors.secondary} />} label="Apply Link"
                        onPress={() => Linking.openURL(String(opp.applyLink))} />}
                <ActionBtn icon={<MessageSquare size={15} color={theme.colors.textMuted} />} label="Feedback"
                    onPress={() => navigation.navigate('OpportunityFeedback', { opportunityId: opp.id, title: opp.title })} />
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
