import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Building2, MapPin, Briefcase, IndianRupee, Clock, ChevronRight } from 'lucide-react-native';
import { SurfaceCard, AppText } from '../common/PremiumPrimitives';
import { useTheme } from '../../theme/ThemeProvider';
import { alpha } from '../../theme';
import { SPACING, RADIUS } from '../../theme/dimensions';
import { Opportunity } from '@fresherflow/types';

interface JobCardProps {
    job: Opportunity;
    onPress?: () => void;
}

export const JobCard = ({ job, onPress }: JobCardProps) => {
    const { currentTheme } = useTheme();

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PUBLISHED': return currentTheme.colors.success;
            case 'PENDING': return currentTheme.colors.warning;
            case 'REJECTED': return currentTheme.colors.error;
            case 'DRAFT': return currentTheme.colors.textMuted;
            default: return currentTheme.colors.primary;
        }
    };

    return (
        <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.container}>
            <SurfaceCard 
                style={[
                    styles.card, 
                    { 
                        backgroundColor: currentTheme.colors.surface,
                        borderColor: alpha(currentTheme.colors.border, 0.4) 
                    }
                ]}
            >
                {/* Header Row: Company & Status */}
                <View style={styles.headerRow}>
                    <View style={styles.companyInfo}>
                        <View style={[styles.avatar, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                            <Building2 size={16} color={currentTheme.colors.primary} />
                        </View>
                        <AppText variant="label" style={{ color: currentTheme.colors.textMuted }}>
                            {job.company}
                        </AppText>
                    </View>
                    
                    <View style={[
                        styles.badge, 
                        { backgroundColor: alpha(getStatusColor(job.status), 0.1) }
                    ]}>
                        <AppText 
                            style={[
                                styles.badgeText, 
                                { color: getStatusColor(job.status) }
                            ]}
                        >
                            {job.status}
                        </AppText>
                    </View>
                </View>

                {/* Title */}
                <AppText variant="h2" style={styles.title} numberOfLines={2}>
                    {job.title}
                </AppText>

                {/* Meta Tags Row */}
                <View style={styles.metaRow}>
                    {(job.locations && job.locations.length > 0) ? (
                        <View style={styles.metaItem}>
                            <MapPin size={14} color={currentTheme.colors.textMuted} />
                            <AppText variant="body" muted style={styles.metaText} numberOfLines={1}>
                                {job.locations[0]}{job.locations.length > 1 ? ` +${job.locations.length - 1}` : ''}
                            </AppText>
                        </View>
                    ) : null}

                    {job.workMode ? (
                        <View style={styles.metaItem}>
                            <Briefcase size={14} color={currentTheme.colors.textMuted} />
                            <AppText variant="body" muted style={styles.metaText}>
                                {job.workMode}
                            </AppText>
                        </View>
                    ) : null}

                    {(job.salaryMin !== undefined) ? (
                        <View style={styles.metaItem}>
                            <IndianRupee size={14} color={currentTheme.colors.textMuted} />
                            <AppText variant="body" muted style={styles.metaText}>
                                {job.salaryMax ? `${job.salaryMin} - ${job.salaryMax} LPA` : `${job.salaryMin} LPA`}
                            </AppText>
                        </View>
                    ) : null}
                </View>

                {/* Footer Divider */}
                <View style={[styles.divider, { backgroundColor: alpha(currentTheme.colors.border, 0.2) }]} />

                {/* Footer Row */}
                <View style={styles.footerRow}>
                    <View style={styles.footerLeft}>
                        <Clock size={14} color={currentTheme.colors.textMuted} />
                        <AppText variant="body" muted style={styles.footerText}>
                            Added {new Date(job.postedAt).toLocaleDateString()}
                        </AppText>
                    </View>
                    
                    <View style={styles.footerRight}>
                        <AppText style={{ color: currentTheme.colors.primary, fontWeight: '600', fontSize: 13, marginRight: 4 }}>
                            Manage
                        </AppText>
                        <ChevronRight size={16} color={currentTheme.colors.primary} />
                    </View>
                </View>

            </SurfaceCard>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: SPACING.md,
    },
    card: {
        padding: SPACING.lg,
        borderWidth: 1,
        borderRadius: RADIUS.lg,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    companyInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    avatar: {
        width: 24,
        height: 24,
        borderRadius: RADIUS.sm,
        justifyContent: 'center',
        alignItems: 'center',
    },
    badge: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: RADIUS.full,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    title: {
        marginBottom: SPACING.md,
        lineHeight: 24,
    },
    metaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.md,
        marginBottom: SPACING.md,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: 13,
    },
    divider: {
        height: 1,
        width: '100%',
        marginBottom: SPACING.md,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    footerText: {
        fontSize: 12,
    },
    footerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    }
});
