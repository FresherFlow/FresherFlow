import React from 'react';
import { StyleSheet, Text, View, TextStyle, Linking, TouchableOpacity } from 'react-native';
import { Globe, MapPin, ShieldCheck, Activity, Calendar, ExternalLink } from 'lucide-react-native';
import { useTheme } from '../../../theme/ThemeProvider';
import { theme, alpha } from '../../../theme';
import { mScale, SPACING, RADIUS } from '../../../theme/dimensions';
import { SurfaceCard } from '../../system/components/PremiumPrimitives';

import { type Opportunity } from '@fresherflow/types';

interface DetailGridProps {
    opp: Opportunity;
}

export const DetailGrid = ({ opp }: DetailGridProps) => {
    const { currentTheme } = useTheme();
    
    type SocialPost = { status: string };
    const socialPosts = (Array.isArray(opp.socialPosts) ? opp.socialPosts : []) as SocialPost[];
    const socialSummary = {
        published: socialPosts.filter((item) => item.status === 'PUBLISHED').length,
        failed: socialPosts.filter((item) => item.status === 'FAILED').length,
        pending: socialPosts.filter((item) => item.status === 'PENDING').length,
    };

    return (
        <View style={styles.grid}>
            <SectionHeader title="Core Details" icon={<Activity size={16} color={currentTheme.colors.primary} />} />
            
            <View style={styles.row}>
                <GridItem label="TYPE" value={String(opp.type)} icon={<Activity size={14} color={currentTheme.colors.primary} />} />
                <GridItem label="MODE" value={String(opp.workMode ?? '-')} icon={<MapPin size={14} color={currentTheme.colors.primary} />} />
            </View>

            <SurfaceCard style={styles.fullWidthCard}>
                <DetailRow label="LOCATIONS" value={Array.isArray(opp.locations) ? opp.locations.join(', ') : '-'} />
                {opp.salaryRange && (
                    <DetailRow label="SALARY" value={`${String(opp.salaryRange)} (${String(opp.salaryPeriod ?? 'YEARLY')})`} />
                )}
                {(opp.experienceMin != null || opp.experienceMax != null) && (
                    <DetailRow label="EXPERIENCE" value={`${opp.experienceMin ?? 0}-${opp.experienceMax ?? '?'} yrs`} />
                )}
            </SurfaceCard>

            {opp.type === 'WALKIN' && opp.walkInDetails && (() => {
                const wd = opp.walkInDetails;
                return (
                    <>
                        <SectionHeader title="Walk-in Event Details" icon={<Calendar size={16} color={currentTheme.colors.primary} />} />
                        <SurfaceCard style={styles.fullWidthCard}>
                            {wd.venueAddress && (
                                <DetailRow 
                                    label="VENUE" 
                                    value={String(wd.venueAddress)} 
                                />
                            )}
                            {wd.venueLink && (
                                <View style={styles.detailRow}>
                                    <Text style={[styles.detailLabel, { color: currentTheme.colors.textMuted }]}>LOCATION LINK</Text>
                                    <TouchableOpacity 
                                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                        onPress={() => Linking.openURL(String(wd.venueLink))}
                                    >
                                        <Text style={{ color: currentTheme.colors.primary, fontSize: mScale(14), fontWeight: '700' }}>View on Maps</Text>
                                        <ExternalLink size={12} color={currentTheme.colors.primary} />
                                    </TouchableOpacity>
                                </View>
                            )}
                            {wd.reportingTime && (
                                <DetailRow 
                                    label="REPORTING TIME" 
                                    value={String(wd.reportingTime)} 
                                />
                            )}
                            {wd.timeRange && (
                                <DetailRow 
                                    label="TIME RANGE" 
                                    value={String(wd.timeRange)} 
                                />
                            )}
                            {Array.isArray(wd.dates) && wd.dates.length > 0 && (
                                <DetailRow 
                                    label="DATES" 
                                    value={wd.dates.map(d => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })).join(', ')} 
                                />
                            )}
                            {wd.dateRange && (
                                <DetailRow 
                                    label="DATE RANGE" 
                                    value={String(wd.dateRange)} 
                                />
                            )}
                            {wd.contactPerson && (
                                <DetailRow 
                                    label="CONTACT PERSON" 
                                    value={String(wd.contactPerson)} 
                                />
                            )}
                            {wd.contactPhone && (
                                <DetailRow 
                                    label="CONTACT PHONE" 
                                    value={String(wd.contactPhone)} 
                                />
                            )}
                            {Array.isArray(wd.requiredDocuments) && wd.requiredDocuments.length > 0 && (
                                <DetailRow 
                                    label="REQUIRED DOCUMENTS" 
                                    value={wd.requiredDocuments.join(', ')} 
                                />
                            )}
                        </SurfaceCard>
                    </>
                );
            })()}

            <SectionHeader title="Requirements" icon={<ShieldCheck size={16} color={currentTheme.colors.primary} />} />
            
            <SurfaceCard style={styles.fullWidthCard}>
                {Array.isArray(opp.requiredSkills) && opp.requiredSkills.length > 0 && (
                    <DetailRow label="SKILLS" value={opp.requiredSkills.join(', ')} />
                )}
                {Array.isArray(opp.allowedDegrees) && opp.allowedDegrees.length > 0 && (
                    <DetailRow label="DEGREES" value={opp.allowedDegrees.join(', ')} />
                )}
                {Array.isArray(opp.allowedPassoutYears) && opp.allowedPassoutYears.length > 0 && (
                    <DetailRow label="PASSOUTS" value={opp.allowedPassoutYears.join(', ')} />
                )}
            </SurfaceCard>

            {socialPosts.length > 0 && (
                <>
                    <SectionHeader title="Social Distribution" icon={<Globe size={16} color={currentTheme.colors.primary} />} />
                    <View style={styles.socialGrid}>
                        <SocialPill label="Published" value={socialSummary.published} color={currentTheme.colors.success} />
                        <SocialPill label="Failed" value={socialSummary.failed} color={currentTheme.colors.error} />
                        <SocialPill label="Pending" value={socialSummary.pending} color={currentTheme.colors.secondary} />
                    </View>
                </>
            )}

            <SectionHeader title="System Insights" icon={<Activity size={16} color={currentTheme.colors.primary} />} />
            
            <SurfaceCard 
                style={[
                    styles.fullWidthCard, 
                    { 
                        borderLeftWidth: 4, 
                        borderLeftColor: opp.linkHealth === 'HEALTHY' ? currentTheme.colors.success : opp.linkHealth === 'BROKEN' ? currentTheme.colors.error : currentTheme.colors.warning 
                    }
                ]}
            >
                <DetailRow 
                    label="LINK HEALTH" 
                    value={String(opp.linkHealth)} 
                    valueStyle={{ 
                        color: opp.linkHealth === 'HEALTHY' ? currentTheme.colors.success : opp.linkHealth === 'BROKEN' ? currentTheme.colors.error : currentTheme.colors.warning 
                    }} 
                />
                {opp.verificationFailures > 0 && (
                    <Text style={[styles.failureText, { color: currentTheme.colors.error }]}>
                        {opp.verificationFailures} recent failures detected
                    </Text>
                )}
                {opp.lastVerifiedAt && (
                    <DetailRow 
                        label="VERIFIED" 
                        value={new Date(opp.lastVerifiedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} 
                    />
                )}
                <DetailRow label="SLUG" value={String(opp.slug)} />
            </SurfaceCard>

            <SectionHeader title="Full Context" icon={<Activity size={16} color={currentTheme.colors.primary} />} />
            
            {opp.description && <DescSection label="DESCRIPTION" value={String(opp.description)} />}
            {opp.notesHighlights && <DescSection label="NOTES & HIGHLIGHTS" value={String(opp.notesHighlights)} />}
            {opp.incentives && <DescSection label="INCENTIVES" value={String(opp.incentives)} />}

            <View style={styles.footerRow}>
                <View style={styles.half}>
                    <Text style={[styles.footerLabel, { color: currentTheme.colors.textMuted }]}>CREATED</Text>
                    <Text style={[styles.footerValue, { color: currentTheme.colors.text }]}>
                        {opp.postedAt ? new Date(opp.postedAt).toLocaleDateString() : '-'}
                    </Text>
                </View>
                <View style={styles.half}>
                    <Text style={[styles.footerLabel, { color: currentTheme.colors.textMuted }]}>EXPIRES</Text>
                    <Text style={[styles.footerValue, { color: currentTheme.colors.text }]}>
                        {opp.expiresAt ? new Date(String(opp.expiresAt)).toLocaleDateString() : 'Never'}
                    </Text>
                </View>
            </View>
        </View>
    );
};

const SectionHeader = ({ title, icon }: { title: string; icon: React.ReactNode }) => {
    const { currentTheme } = useTheme();
    return (
        <View style={styles.sectionHeader}>
            {icon}
            <Text style={[styles.sectionHeaderText, { color: currentTheme.colors.textMuted }]}>
                {title.toUpperCase()}
            </Text>
        </View>
    );
};

const GridItem = ({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) => {
    const { currentTheme } = useTheme();
    return (
        <SurfaceCard style={styles.gridItem}>
            <View style={styles.gridItemHeader}>
                {icon}
                <Text style={[styles.gridItemLabel, { color: currentTheme.colors.textMuted }]}>{label}</Text>
            </View>
            <Text style={[styles.gridItemValue, { color: currentTheme.colors.text }]} numberOfLines={1}>{value}</Text>
        </SurfaceCard>
    );
};

const DetailRow = ({ label, value, valueStyle }: { label: string; value: string; valueStyle?: TextStyle }) => {
    const { currentTheme } = useTheme();
    return (
        <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: currentTheme.colors.textMuted }]}>{label}</Text>
            <Text style={[styles.detailValue, { color: currentTheme.colors.text }, valueStyle]} numberOfLines={2}>{value}</Text>
        </View>
    );
};

const DescSection = ({ label, value }: { label: string; value: string }) => {
    const { currentTheme } = useTheme();
    return (
        <SurfaceCard style={styles.descSection}>
            <Text style={[styles.detailLabel, { color: currentTheme.colors.textMuted, marginBottom: 8 }]}>{label}</Text>
            <Text style={[styles.descText, { color: currentTheme.colors.text }]}>{value}</Text>
        </SurfaceCard>
    );
};

const SocialPill = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <View style={[styles.socialPill, { backgroundColor: alpha(color, 0.1) }]}>
        <Text style={[styles.socialValue, { color }]}>{value}</Text>
        <Text style={[styles.socialLabel, { color }]}>{label.toUpperCase()}</Text>
    </View>
);

const styles = StyleSheet.create({
    grid: { 
        gap: SPACING.md 
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: SPACING.sm,
        marginBottom: 4,
    },
    sectionHeaderText: {
        fontSize: mScale(10),
        fontWeight: '900',
        letterSpacing: 1.5,
    },
    row: {
        flexDirection: 'row',
        gap: SPACING.md,
    },
    gridItem: {
        flex: 1,
        padding: SPACING.md,
    },
    gridItemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },
    gridItemLabel: {
        fontSize: mScale(9),
        fontWeight: '900',
        letterSpacing: 1,
    },
    gridItemValue: {
        fontSize: mScale(16),
        fontWeight: '800',
    },
    fullWidthCard: {
        padding: 0,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.surfaceMuted,
    },
    detailLabel: {
        fontSize: mScale(10),
        fontWeight: '900',
        letterSpacing: 1,
    },
    detailValue: {
        fontSize: mScale(14),
        fontWeight: '700',
        flex: 1,
        textAlign: 'right',
        marginLeft: SPACING.lg,
    },
    descSection: {
        padding: SPACING.lg,
    },
    descText: {
        fontSize: mScale(14),
        lineHeight: mScale(22),
        fontWeight: '500',
    },
    socialGrid: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
    socialPill: {
        flex: 1,
        padding: SPACING.md,
        borderRadius: RADIUS.md,
        alignItems: 'center',
    },
    socialValue: {
        fontSize: mScale(20),
        fontWeight: '900',
    },
    socialLabel: {
        fontSize: mScale(9),
        fontWeight: '900',
        marginTop: 2,
    },
    failureText: {
        fontSize: mScale(11),
        fontWeight: '700',
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.md,
    },
    footerRow: {
        flexDirection: 'row',
        marginTop: SPACING.lg,
        paddingHorizontal: SPACING.xs,
    },
    half: {
        flex: 1,
    },
    footerLabel: {
        fontSize: mScale(9),
        fontWeight: '900',
        letterSpacing: 1.5,
    },
    footerValue: {
        fontSize: mScale(13),
        fontWeight: '700',
        marginTop: 2,
    }
});
