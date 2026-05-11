import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CheckCircle2, Clock, Edit3, RotateCcw, Trash2 } from 'lucide-react-native';

import { type Opportunity } from '@/lib/api';

import { useTheme } from '@/theme/ThemeProvider';
import { CompanyLogo } from '@repo/ui';

interface JobCardProps {
    item: Opportunity;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigation: any;
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
    handleDelete,
}: JobCardProps) => {
    const { colors } = useTheme();
    const dense = false;
    const statusPalette: Record<string, { bg: string; text: string }> = {
        PUBLISHED: { bg: colors.success + '16', text: colors.success },
        DRAFT: { bg: colors.warning + '18', text: colors.warning },
        ARCHIVED: { bg: colors.muted, text: colors.textMuted },
        EXPIRED: { bg: colors.error + '16', text: colors.error },
    };
    const statusColors = statusPalette[item.status] ?? statusPalette.ARCHIVED;
    const isExpired = item.status === 'EXPIRED' || item.status === 'ARCHIVED';

    return (
        <View
            style={[
                styles.jobCard,
                dense && styles.jobCardDense,
                { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
        >
            <View style={[styles.jobHeader, dense && styles.jobHeaderDense]}>
                <CompanyLogo 
                    website={(item as { website?: string | null }).website ?? null} 
                    logoUrl={item.companyLogoUrl}
                    applyLink={item.applyLink}
                    name={String(item.company)} 
                    size={38} 
                />
                <TouchableOpacity
                    style={styles.titleWrap}
                    onPress={() => navigation.navigate('OpportunityDetail', { opportunityId: item.id })}
                >
                    <Text style={[styles.jobTitle, dense && styles.jobTitleDense, { color: colors.text }]} numberOfLines={1}>
                        {item.title}
                    </Text>
                    <Text style={[styles.jobCompany, dense && styles.jobCompanyDense, { color: colors.textMuted }]}>
                        {String(item.company)}
                    </Text>
                </TouchableOpacity>
                <View
                    style={[
                        styles.statusBadge,
                        {
                            backgroundColor: statusColors.bg,
                            borderColor: statusColors.text + '22',
                        },
                    ]}
                >
                    <Text style={[styles.statusText, { color: statusColors.text }]}>{item.status}</Text>
                </View>
            </View>

            <View style={[styles.jobFooter, dense && styles.jobFooterDense, { borderTopColor: colors.border }]}>
                <Text style={[styles.jobDate, dense && styles.jobDateDense, { color: colors.textMuted }]}>
                    {item.postedAt ? new Date(String(item.postedAt)).toLocaleDateString('en-IN') : '-'}
                    {' · '}
                    {String(item.type)}
                </Text>
                <View style={styles.actionRow}>
                    {item.status === 'DRAFT' ? (
                        <ActionBtn
                            icon={<CheckCircle2 size={15} color={colors.success} />}
                            onPress={() => handlePublish(String(item.id))}
                            backgroundColor={colors.background}
                        />
                    ) : null}
                    {item.status === 'PUBLISHED' ? (
                        <ActionBtn
                            icon={<Clock size={15} color={colors.warning} />}
                            onPress={() => handleExpire(String(item.id), String(item.title))}
                            backgroundColor={colors.background}
                        />
                    ) : null}
                    {isExpired ? (
                        <ActionBtn
                            icon={<RotateCcw size={15} color={colors.primary} />}
                            onPress={() => handleRestore(String(item.id))}
                            backgroundColor={colors.background}
                        />
                    ) : null}
                    <ActionBtn
                        icon={<Edit3 size={15} color={colors.primary} />}
                        onPress={() => navigation.navigate('PostOpportunity', { opportunityId: item.id })}
                        backgroundColor={colors.background}
                    />
                    <ActionBtn
                        icon={<Trash2 size={15} color={colors.error} />}
                        onPress={() => handleDelete(String(item.id), String(item.title))}
                        backgroundColor={colors.background}
                    />
                </View>
            </View>
        </View>
    );
};

const ActionBtn = ({
    icon,
    onPress,
    backgroundColor,
}: {
    icon: React.ReactNode;
    onPress: () => void;
    backgroundColor: string;
}) => (
    <TouchableOpacity style={[styles.actionBtn, { backgroundColor }]} onPress={onPress}>
        {icon}
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    jobCard: {
        borderRadius: 12,
        borderWidth: 1,
        padding: 14,
    },
    jobCardDense: {
        padding: 12,
        borderRadius: 10,
    },
    jobHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    jobHeaderDense: {
        marginBottom: 8,
    },
    titleWrap: {
        flex: 1,
        paddingRight: 8,
        marginLeft: 4,
    },
    jobTitle: {
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 3,
    },
    jobTitleDense: {
        fontSize: 14,
        marginBottom: 2,
    },
    jobCompany: {
        fontSize: 13,
    },
    jobCompanyDense: {
        fontSize: 12,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    jobFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        paddingTop: 10,
    },
    jobFooterDense: {
        paddingTop: 8,
    },
    jobDate: {
        fontSize: 12,
        flex: 1,
    },
    jobDateDense: {
        fontSize: 11,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 4,
    },
    actionBtn: {
        padding: 7,
        borderRadius: 8,
    },
});


