import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { CheckCircle2, Clock, Edit3, ExternalLink, MessageSquare, RotateCcw, Trash2, Copy, MoreHorizontal } from 'lucide-react-native';
import { CompanyLogo } from '@repo/ui';
import { useTheme } from '../../../theme/ThemeProvider';
import { alpha } from '../../../theme';
import { mScale, SPACING, RADIUS } from '../../../theme/dimensions';
import { SurfaceCard } from '../../system/components/PremiumPrimitives';

import { type Opportunity } from '@fresherflow/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OpportunitiesStackParamList } from '../../../navigation/OpportunitiesNavigator';

// Native Menu Import
import { MenuView } from '@react-native-menu/menu';

interface DetailHeaderProps {
    opp: Opportunity;
    navigation: NativeStackNavigationProp<OpportunitiesStackParamList>;
    statusColor: string;
    dynamicStatus: string;
    onPublish?: () => void;
    onExpire?: () => void;
    onRestore?: () => void;
    onDelete?: () => void;
    onCopySocial?: () => void;
}

export const DetailHeader = ({ 
    opp, 
    navigation, 
    statusColor, 
    dynamicStatus, 
    onPublish, 
    onExpire, 
    onRestore, 
    onDelete, 
    onCopySocial 
}: DetailHeaderProps) => {
    const { currentTheme } = useTheme();

    const menuActions = [
        ...(dynamicStatus === 'DRAFT' && onPublish ? [{ id: 'publish', title: 'Publish Opportunity' }] : []),
        ...(dynamicStatus === 'LIVE' && onExpire ? [{ id: 'expire', title: 'Expire Opportunity' }] : []),
        ...((dynamicStatus === 'EXPIRED' || dynamicStatus === 'ARCHIVED') && onRestore ? [{ id: 'restore', title: 'Restore Opportunity' }] : []),
        ...(onCopySocial ? [{ id: 'copy_social', title: 'Copy Social Caption' }] : []),
        ...(onDelete ? [{ id: 'delete', title: 'Delete Signal', attributes: { destructive: true } }] : []),
    ];

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
                        <View style={[styles.statusBadge, { backgroundColor: alpha(statusColor, 0.1), borderColor: alpha(statusColor, 0.3), borderWidth: 1 }]}>
                            <Text style={[styles.statusText, { color: statusColor }]}>{dynamicStatus}</Text>
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
                
                <ActionBtn icon={<MessageSquare size={14} color={currentTheme.colors.textMuted} />} label="Feedback"
                    onPress={() => navigation.navigate('OpportunityFeedback', {
                        opportunityId: opp.id,
                        title: opp.title,
                        company: opp.company,
                        website: (opp as Opportunity & { companyWebsite?: string | null }).companyWebsite ?? null,
                    })}
                />

                {opp.applyLink && (
                    <ActionBtn icon={<ExternalLink size={14} color={currentTheme.colors.secondary} />} label="Apply"
                        onPress={() => Linking.openURL(String(opp.applyLink))} />
                )}

                {menuActions.length > 0 && (
                    <MenuView
                        title="Manage Signal"
                        onPressAction={({ nativeEvent }) => {
                            const actionId = nativeEvent.event;
                            if (actionId === 'publish' && onPublish) onPublish();
                            else if (actionId === 'expire' && onExpire) onExpire();
                            else if (actionId === 'restore' && onRestore) onRestore();
                            else if (actionId === 'copy_social' && onCopySocial) onCopySocial();
                            else if (actionId === 'delete' && onDelete) onDelete();
                        }}
                        actions={menuActions}
                    >
                        <View style={[styles.headerActionBtn, { backgroundColor: alpha(currentTheme.colors.primary, 0.05) }]}>
                            <MoreHorizontal size={14} color={currentTheme.colors.primary} />
                            <Text style={[styles.headerActionText, { color: currentTheme.colors.text }]}>Actions</Text>
                        </View>
                    </MenuView>
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
