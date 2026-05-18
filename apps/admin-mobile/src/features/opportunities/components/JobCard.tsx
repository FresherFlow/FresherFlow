import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, StyleProp, ViewStyle } from 'react-native';
import { CheckCircle2, Clock, Edit3, RotateCcw, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { type Opportunity } from '@/lib/api';

import { useTheme } from '@/theme/ThemeProvider';
import { alpha } from '@/theme';
import { mScale, SPACING, RADIUS } from '@/theme/dimensions';
import { CompanyLogo } from '@repo/ui';
import { SurfaceCard } from '../../system/components/PremiumPrimitives';

interface JobCardProps {
    item: Opportunity;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    navigation: any;
    handlePublish: (id: string) => void;
    handleExpire: (id: string, title: string) => void;
    handleRestore: (id: string) => void;
    handleDelete: (id: string, title: string) => void;
    style?: StyleProp<ViewStyle>;
}

export const JobCard = ({
    item,
    navigation,
    handlePublish,
    handleExpire,
    handleRestore,
    handleDelete,
    style,
}: JobCardProps) => {
    const { colors } = useTheme();
    const dense = false;
    const statusPalette: Record<string, { bg: string; text: string }> = {
        PUBLISHED: { bg: alpha(colors.success, 0.08), text: colors.success },
        DRAFT: { bg: alpha(colors.warning, 0.1), text: colors.warning },
        ARCHIVED: { bg: colors.muted, text: colors.textMuted },
        EXPIRED: { bg: alpha(colors.error, 0.08), text: colors.error },
    };
    const statusColors = statusPalette[item.status] ?? statusPalette.ARCHIVED;
    const isExpired = item.status === 'EXPIRED' || item.status === 'ARCHIVED';

    return (
        <SurfaceCard
            style={[
                styles.jobCard,
                dense && styles.jobCardDense,
                style
            ]}
        >
            <View style={[styles.jobHeader, dense && styles.jobHeaderDense]}>
                <CompanyLogo 
                    website={(item as { website?: string | null }).website ?? null} 
                    logoUrl={item.companyLogoUrl}
                    applyLink={item.applyLink}
                    name={String(item.company)} 
                    size={mScale(40)} 
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
                            backgroundColor: alpha(statusColors.text, 0.08),
                            borderColor: alpha(statusColors.text, 0.1),
                        },
                    ]}
                >
                    <Text style={[styles.statusText, { color: statusColors.text }]}>{item.status}</Text>
                </View>
            </View>

            <View style={[styles.jobFooter, dense && styles.jobFooterDense, { borderTopColor: alpha(colors.border, 0.5) }]}>
                <Text style={[styles.jobDate, dense && styles.jobDateDense, { color: colors.textMuted }]}>
                    {item.postedAt ? new Date(String(item.postedAt)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '-'}
                    {' · '}
                    {String(item.type)}
                </Text>
                <View style={styles.actionRow}>
                    {item.status === 'DRAFT' ? (
                        <ActionBtn
                            icon={<CheckCircle2 size={mScale(15)} color={colors.success} />}
                            onPress={() => handlePublish(String(item.id))}
                            backgroundColor={alpha(colors.success, 0.05)}
                        />
                    ) : null}
                    {item.status === 'PUBLISHED' ? (
                        <ActionBtn
                            icon={<Clock size={mScale(15)} color={colors.warning} />}
                            onPress={() => handleExpire(String(item.id), String(item.title))}
                            backgroundColor={alpha(colors.warning, 0.05)}
                        />
                    ) : null}
                    {isExpired ? (
                        <ActionBtn
                            icon={<RotateCcw size={mScale(15)} color={colors.primary} />}
                            onPress={() => handleRestore(String(item.id))}
                            backgroundColor={alpha(colors.primary, 0.05)}
                        />
                    ) : null}
                    <ActionBtn
                        icon={<Edit3 size={mScale(15)} color={colors.primary} />}
                        onPress={() => navigation.navigate('PostOpportunity', { opportunityId: item.id })}
                        backgroundColor={alpha(colors.primary, 0.05)}
                    />
                    <ActionBtn
                        icon={<Trash2 size={mScale(15)} color={colors.error} />}
                        onPress={() => handleDelete(String(item.id), String(item.title))}
                        backgroundColor={alpha(colors.error, 0.05)}
                    />
                </View>
            </View>
        </SurfaceCard>
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
    <TouchableOpacity 
        style={[styles.actionBtn, { backgroundColor }]} 
        onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress();
        }}
    >
        {icon}
    </TouchableOpacity>
);

const styles = StyleSheet.create({
    jobCard: {
        marginBottom: SPACING.md,
    },
    jobCardDense: {
        marginBottom: SPACING.sm,
    },
    jobHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
        gap: SPACING.md,
    },
    jobHeaderDense: {
        marginBottom: SPACING.sm,
    },
    titleWrap: {
        flex: 1,
    },
    jobTitle: {
        fontSize: mScale(16),
        fontWeight: '900',
        letterSpacing: -0.5,
        marginBottom: 2,
    },
    jobTitleDense: {
        fontSize: mScale(14),
    },
    jobCompany: {
        fontSize: mScale(13),
        fontWeight: '500',
    },
    jobCompanyDense: {
        fontSize: mScale(12),
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
    },
    statusText: {
        fontSize: mScale(9),
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    jobFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        paddingTop: SPACING.md,
        marginTop: SPACING.xs,
    },
    jobFooterDense: {
        paddingTop: SPACING.sm,
    },
    jobDate: {
        fontSize: mScale(11),
        fontWeight: '700',
        flex: 1,
    },
    jobDateDense: {
        fontSize: mScale(10),
    },
    actionRow: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtn: {
        padding: 8,
        borderRadius: 10,
    },
});


