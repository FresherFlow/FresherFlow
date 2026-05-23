import React, { memo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Clock, CheckCircle2, XCircle, History, ChevronRight, Zap, Link as LinkIcon } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { alpha } from '@/theme';
import { SurfaceCard } from './PremiumPrimitives';
import { mScale, SPACING, RADIUS } from '../constants/dimensions';
import { haptic } from '@/utils/haptics';

export interface ContributionShare {
    id: string;
    createdAt: string;
    sourceLink?: string;
    mappedOpportunity?: {
        id: string;
        title: string;
        company: string;
        status: string;
        publishedAt?: string;
        expiredAt?: string;
        deletionReason?: string | null;
        clicksCount: number;
        savesCount: number;
        type?: string;
        locations?: string[];
    } | null;
}

interface Props {
    share: ContributionShare;
    onPress?: () => void;
}

export const ContributionPreviewCard = memo(({ share, onPress }: Props) => {
    const { currentTheme } = useTheme();
    const opp = share.mappedOpportunity;
    const status = opp?.status || 'PENDING';

    const getStatusConfig = () => {
        switch (status) {
            case 'PUBLISHED':
                return {
                    icon: CheckCircle2,
                    color: currentTheme.colors.success,
                    label: 'Live',
                    description: 'Approved & posted live on the opportunity feed'
                };
            case 'ARCHIVED':
                return {
                    icon: XCircle,
                    color: currentTheme.colors.error,
                    label: 'Rejected',
                    description: opp?.deletionReason || 'Submission declined by admin'
                };
            case 'EXPIRED':
                return {
                    icon: History,
                    color: currentTheme.colors.textMuted,
                    label: 'Closed',
                    description: 'Opportunity has reached its deadline'
                };
            case 'OFFLINE':
                return {
                    icon: Clock,
                    color: currentTheme.colors.warning,
                    label: 'Reviewing',
                    description: 'In verification queue by our team'
                };
            default:
                return {
                    icon: Clock,
                    color: currentTheme.colors.warning,
                    label: 'Reviewing',
                    description: 'In verification queue by our team'
                };
        }
    };

    const config = getStatusConfig();
    const isLive = status === 'PUBLISHED' && opp;

    const handlePress = () => {
        if (isLive && onPress) {
            haptic.light();
            onPress();
        }
    };

    return (
        <TouchableOpacity
            activeOpacity={isLive ? 0.9 : 1}
            disabled={!isLive}
            onPress={handlePress}
            style={styles.touchable}
        >
            <SurfaceCard
                style={[
                    styles.card,
                    {
                        borderLeftColor: config.color,
                        borderLeftWidth: 4,
                    }
                ]}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.statusBadgeRow}>
                        <View style={[styles.statusBadge, { backgroundColor: alpha(config.color, 0.08) }]}>
                            <config.icon size={mScale(11)} color={config.color} />
                            <Text style={[styles.statusText, { color: config.color }]}>
                                {config.label}
                            </Text>
                        </View>
                        <Text style={[styles.dateText, { color: currentTheme.colors.textMuted }]}>
                            {new Date(share.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                            })}
                        </Text>
                    </View>

                    {isLive && (
                        <View style={styles.viewsBadge}>
                            <Zap size={mScale(11)} color={currentTheme.colors.primary} />
                            <Text style={[styles.viewsText, { color: currentTheme.colors.primary }]}>
                                {opp.clicksCount || 0} views
                            </Text>
                        </View>
                    )}
                </View>

                {isLive ? (
                    // 1. LIVE / PUBLISHED STATE: Standard High-Fidelity Job Card
                    <View style={styles.contentContainer}>
                        <View style={styles.detailsRow}>
                            <View style={styles.textColumn}>
                                <Text style={[styles.jobTitle, { color: currentTheme.colors.text }]} numberOfLines={1}>
                                    {opp.title}
                                </Text>
                                <Text style={[styles.companyName, { color: currentTheme.colors.textMuted }]} numberOfLines={1}>
                                    {opp.company}
                                </Text>
                                <View style={styles.metaBadgeRow}>
                                    {opp.locations && opp.locations[0] && (
                                        <View style={[styles.metaBadge, { backgroundColor: alpha(currentTheme.colors.text, 0.04) }]}>
                                            <Text style={[styles.metaBadgeText, { color: currentTheme.colors.textMuted }]}>
                                                {opp.locations[0]}
                                            </Text>
                                        </View>
                                    )}
                                    {opp.type && (
                                        <View style={[styles.metaBadge, { backgroundColor: alpha(currentTheme.colors.text, 0.04) }]}>
                                            <Text style={[styles.metaBadgeText, { color: currentTheme.colors.textMuted }]}>
                                                {opp.type}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                            <View style={[styles.viewDetailsButton, { backgroundColor: alpha(currentTheme.colors.primary, 0.06) }]}>
                                <ChevronRight size={mScale(16)} color={currentTheme.colors.primary} />
                            </View>
                        </View>
                    </View>
                ) : (
                    // 2. QUEUED / UNDER REVIEW STATE: Lean Preview Card
                    <View style={styles.queueContainer}>
                        <View style={styles.linkRow}>
                            <LinkIcon size={mScale(13)} color={currentTheme.colors.textMuted} />
                            <Text style={[styles.linkText, { color: currentTheme.colors.text }]} numberOfLines={2}>
                                {share.sourceLink || (opp?.company ? `Referral at ${opp.company}` : 'Referral Request Submitted')}
                            </Text>
                        </View>
                        <Text style={[styles.descriptionText, { color: currentTheme.colors.textMuted }]}>
                            {config.description}
                        </Text>
                    </View>
                )}
            </SurfaceCard>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    touchable: {
        marginBottom: SPACING.md,
    },
    card: {
        padding: SPACING.md,
        borderRadius: RADIUS.md,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    statusBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: RADIUS.xs,
    },
    statusText: {
        fontSize: mScale(10),
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    dateText: {
        fontSize: mScale(10),
        fontWeight: '600',
    },
    viewsBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    viewsText: {
        fontSize: mScale(11),
        fontWeight: '700',
    },
    contentContainer: {
        marginTop: SPACING.xs,
    },
    detailsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    textColumn: {
        flex: 1,
        marginRight: SPACING.md,
    },
    jobTitle: {
        fontSize: mScale(15),
        fontWeight: '900',
        letterSpacing: -0.3,
    },
    companyName: {
        fontSize: mScale(13),
        fontWeight: '600',
        marginTop: 2,
    },
    metaBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        marginTop: SPACING.xs,
    },
    metaBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    metaBadgeText: {
        fontSize: mScale(9),
        fontWeight: '800',
    },
    viewDetailsButton: {
        width: mScale(30),
        height: mScale(30),
        borderRadius: RADIUS.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    queueContainer: {
        marginTop: SPACING.xs,
        gap: 4,
    },
    linkRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.xs,
    },
    linkText: {
        flex: 1,
        fontSize: mScale(13),
        fontWeight: '600',
        lineHeight: 18,
    },
    descriptionText: {
        fontSize: mScale(11),
        fontWeight: '500',
        marginTop: 2,
        opacity: 0.8,
    }
});
