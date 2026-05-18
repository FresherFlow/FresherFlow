import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { CheckCircle2, Clock, Edit3, ExternalLink, MessageSquare, RotateCcw, Trash2 } from 'lucide-react-native';
import { CompanyLogo } from '@repo/ui';
import { useTheme } from '../../../theme/ThemeProvider';
import { alpha } from '../../../theme';
import { mScale, SPACING, RADIUS } from '../../../theme/dimensions';
import { SurfaceCard } from '../../system/components/PremiumPrimitives';

import { type Opportunity } from '@fresherflow/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OpportunitiesStackParamList } from '../../../navigation/OpportunitiesNavigator';

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
    const { currentTheme } = useTheme();

    return (
        <SurfaceCard accent style={styles.headerCard}>
            <View style={styles.headerTop}>
                <CompanyLogo
                    website={(opp as Opportunity & { companyWebsite?: string | null }).companyWebsite ?? null}
                    logoUrl={opp.companyLogoUrl}
                    applyLink={opp.applyLink}
                    name={String(opp.company)}
                    size={mScale(56)}
                />
                <View style={styles.titleWrapper}>
                    <View style={styles.titleRow}>
                        <Text style={[styles.title, { color: currentTheme.colors.text }]} numberOfLines={2}>
                            {opp.title}
                        </Text>
                        <View style={[styles.statusBadge, { backgroundColor: alpha(statusColor, 0.1) }]}>
                            <Text style={[styles.statusText, { color: statusColor }]}>{opp.status}</Text>
                        </View>
                    </View>
                    <Text style={[styles.company, { color: currentTheme.colors.textMuted }]}>{String(opp.company)}</Text>
                </View>
            </View>
            
            <View style={styles.headerActions}>
                <ActionBtn 
                    icon={<Edit3 size={14} color={currentTheme.colors.primary} />} 
                    label="Edit"
                    onPress={() => navigation.navigate('PostOpportunity', { opportunityId: opp.id })} 
                />
                {opp.status === 'DRAFT' && onPublish && (
                    <ActionBtn icon={<CheckCircle2 size={14} color={currentTheme.colors.success} />} label="Publish" onPress={onPublish} />
                )}
                {opp.status === 'PUBLISHED' && onExpire && (
                    <ActionBtn icon={<Clock size={14} color={currentTheme.colors.warning} />} label="Expire" onPress={onExpire} />
                )}
                {(opp.status === 'EXPIRED' || opp.status === 'ARCHIVED') && onRestore && (
                    <ActionBtn icon={<RotateCcw size={14} color={currentTheme.colors.primary} />} label="Restore" onPress={onRestore} />
                )}
                <ActionBtn icon={<MessageSquare size={14} color={currentTheme.colors.textMuted} />} label="Feedback"
                    onPress={() => navigation.navigate('OpportunityFeedback', {
                        opportunityId: opp.id,
                        title: opp.title,
                        company: opp.company,
                    website: (opp as Opportunity & { companyWebsite?: string | null }).companyWebsite ?? null,
                    })}
                />
                {opp.applyLink &&
                    <ActionBtn icon={<ExternalLink size={14} color={currentTheme.colors.secondary} />} label="Apply"
                        onPress={() => Linking.openURL(String(opp.applyLink))} />}
                {onDelete && (
                    <ActionBtn icon={<Trash2 size={14} color={currentTheme.colors.error} />} label="Delete" onPress={onDelete} />
                )}
            </View>
        </SurfaceCard>
    );
};

const ActionBtn = ({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void }) => {
    const { currentTheme } = useTheme();
    return (
        <TouchableOpacity 
            style={[styles.headerActionBtn, { backgroundColor: alpha(currentTheme.colors.primary, 0.05) }]} 
            onPress={onPress}
        >
            {icon}
            <Text style={[styles.headerActionText, { color: currentTheme.colors.text }]}>{label}</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    headerCard: {
        padding: SPACING.lg,
    },
    headerTop: { 
        flexDirection: 'row', 
        alignItems: 'flex-start', 
        gap: SPACING.md, 
        marginBottom: SPACING.lg 
    },
    titleWrapper: {
        flex: 1,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: SPACING.sm,
    },
    title: { 
        fontSize: mScale(20), 
        fontWeight: '900', 
        letterSpacing: -0.5, 
        flex: 1,
        lineHeight: mScale(26),
    },
    company: { 
        fontSize: mScale(14), 
        fontWeight: '600', 
        marginTop: 4 
    },
    statusBadge: { 
        paddingHorizontal: 8, 
        paddingVertical: 4, 
        borderRadius: RADIUS.sm 
    },
    statusText: { 
        fontSize: mScale(9), 
        fontWeight: '900', 
        letterSpacing: 0.5, 
        textTransform: 'uppercase' 
    },
    headerActions: { 
        flexDirection: 'row', 
        gap: SPACING.sm, 
        flexWrap: 'wrap' 
    },
    headerActionBtn: {
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 6,
        borderRadius: RADIUS.md,
        paddingHorizontal: 12, 
        paddingVertical: 8,
    },
    headerActionText: { 
        fontSize: mScale(12), 
        fontWeight: '700',
    },
});
