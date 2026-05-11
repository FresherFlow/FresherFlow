import React from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ExternalLink } from 'lucide-react-native';

import { theme, alpha } from '@/theme';

import { type Opportunity } from '@/lib/api';

interface DetailGridProps {
    opp: Opportunity;
}

export const DetailGrid = ({ opp }: DetailGridProps) => {
    type SocialPost = { status: string };
    const socialPosts = (Array.isArray(opp.socialPosts) ? opp.socialPosts : []) as SocialPost[];
    const socialSummary = {
        published: socialPosts.filter((item) => item.status === 'PUBLISHED').length,
        failed: socialPosts.filter((item) => item.status === 'FAILED').length,
        pending: socialPosts.filter((item) => item.status === 'PENDING').length,
    };

    return (
        <View style={styles.detailsGrid}>
            <DetailRow label="Type" value={String(opp.type)} />
            <DetailRow label="Work Mode" value={String(opp.workMode ?? '-')} />
            <DetailRow label="Locations" value={Array.isArray(opp.locations) ? opp.locations.join(', ') : '-'} />
            {opp.salaryRange ? (
                <DetailRow label="Salary" value={`${String(opp.salaryRange)} (${String(opp.salaryPeriod ?? 'YEARLY')})`} />
            ) : null}
            {(opp.experienceMin != null || opp.experienceMax != null) ? (
                <DetailRow label="Experience" value={`${opp.experienceMin ?? 0}-${opp.experienceMax ?? '?'} yrs`} />
            ) : null}
            {Array.isArray(opp.requiredSkills) && opp.requiredSkills.length > 0 ? (
                <DetailRow label="Skills" value={opp.requiredSkills.join(', ')} />
            ) : null}
            {Array.isArray(opp.allowedDegrees) && opp.allowedDegrees.length > 0 ? (
                <DetailRow label="Degrees" value={opp.allowedDegrees.join(', ')} />
            ) : null}
            {Array.isArray(opp.allowedCourses) && opp.allowedCourses.length > 0 ? (
                <DetailRow label="Courses" value={opp.allowedCourses.join(', ')} />
            ) : null}
            {Array.isArray(opp.allowedSpecializations) && opp.allowedSpecializations.length > 0 ? (
                <DetailRow label="Specializations" value={opp.allowedSpecializations.join(', ')} />
            ) : null}
            {Array.isArray(opp.allowedPassoutYears) && opp.allowedPassoutYears.length > 0 ? (
                <DetailRow label="Passout Years" value={opp.allowedPassoutYears.join(', ')} />
            ) : null}
            {opp.jobFunction ? <DetailRow label="Function" value={String(opp.jobFunction)} /> : null}
            {opp.employmentType ? <DetailRow label="Employment" value={String(opp.employmentType)} /> : null}

            {socialPosts.length > 0 ? (
                <View style={styles.socialCard}>
                    <Text style={styles.sectionHeader}>Social Status</Text>
                    <View style={styles.socialRow}>
                        <SocialPill label="Published" value={socialSummary.published} color={theme.colors.success} />
                        <SocialPill label="Failed" value={socialSummary.failed} color={theme.colors.error} />
                        <SocialPill label="Pending" value={socialSummary.pending} color={theme.colors.accent} />
                    </View>
                </View>
            ) : null}

            {opp.sourceLink ? (
                <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(String(opp.sourceLink))}>
                    <ExternalLink size={14} color={theme.colors.primary} />
                    <Text style={styles.linkText} numberOfLines={1}>Source Link</Text>
                </TouchableOpacity>
            ) : null}

            {opp.applyLink ? (
                <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(String(opp.applyLink))}>
                    <ExternalLink size={14} color={theme.colors.secondary} />
                    <Text style={[styles.linkText, { color: theme.colors.secondary }]} numberOfLines={1}>Apply Link</Text>
                </TouchableOpacity>
            ) : null}

            {opp.expiresAt ? (
                <DetailRow label="Expires" value={new Date(String(opp.expiresAt)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />
            ) : null}
            <DetailRow label="Created" value={opp.postedAt ? new Date(opp.postedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'} />

            <View
                style={[
                    styles.detailRow,
                    {
                        borderLeftWidth: 4,
                        borderLeftColor:
                            opp.linkHealth === 'HEALTHY'
                                ? theme.colors.success
                                : opp.linkHealth === 'BROKEN'
                                    ? theme.colors.error
                                    : theme.colors.warning,
                    },
                ]}
            >
                <Text style={styles.fieldLabel}>Link Health</Text>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text
                        style={[
                            styles.fieldValue,
                            {
                                color:
                                    opp.linkHealth === 'HEALTHY'
                                        ? theme.colors.success
                                        : opp.linkHealth === 'BROKEN'
                                            ? theme.colors.error
                                            : theme.colors.warning,
                            },
                        ]}
                    >
                        {String(opp.linkHealth)}
                    </Text>
                    {opp.verificationFailures > 0 ? (
                        <Text style={styles.failureText}>{opp.verificationFailures} failures</Text>
                    ) : null}
                </View>
            </View>

            {opp.lastVerifiedAt ? (
                <DetailRow
                    label="Last Verified"
                    value={new Date(opp.lastVerifiedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                />
            ) : null}

            <DetailRow label="Slug" value={String(opp.slug)} />

            {opp.type === 'WALKIN' && opp.walkInDetails ? (
                <View style={styles.walkInCard}>
                    <Text style={styles.sectionHeader}>Walk-in Details</Text>
                    {opp.walkInDetails.venueAddress ? <DetailRow label="Venue" value={String(opp.walkInDetails.venueAddress)} /> : null}
                    {opp.walkInDetails.timeRange ? <DetailRow label="Time" value={String(opp.walkInDetails.timeRange)} /> : null}
                    {opp.walkInDetails.contactPerson ? (
                        <DetailRow
                            label="Contact"
                            value={`${opp.walkInDetails.contactPerson}${opp.walkInDetails.contactPhone ? ` · ${opp.walkInDetails.contactPhone}` : ''}`}
                        />
                    ) : null}
                    {Array.isArray(opp.walkInDetails.requiredDocuments) && opp.walkInDetails.requiredDocuments.length > 0 ? (
                        <DetailRow label="Docs" value={opp.walkInDetails.requiredDocuments.join(', ')} />
                    ) : null}
                    {opp.walkInDetails?.venueLink ? (
                        <TouchableOpacity style={styles.linkRow} onPress={() => opp.walkInDetails?.venueLink && Linking.openURL(String(opp.walkInDetails.venueLink))}>
                            <ExternalLink size={14} color={theme.colors.primary} />
                            <Text style={styles.linkText}>Maps Link</Text>
                        </TouchableOpacity>
                    ) : null}
                </View>
            ) : null}

            {opp.incentives ? <DescCard label="Incentives / Perks" value={String(opp.incentives)} /> : null}
            {opp.selectionProcess ? <DescCard label="Selection Process" value={String(opp.selectionProcess)} /> : null}
            {opp.notesHighlights ? <DescCard label="Notes / Highlights" value={String(opp.notesHighlights)} /> : null}
            {opp.description ? <DescCard label="Description" value={String(opp.description)} /> : null}
        </View>
    );
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.detailRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldValue}>{value}</Text>
    </View>
);

const DescCard = ({ label, value }: { label: string; value: string }) => (
    <View style={styles.descCard}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.descText}>{value}</Text>
    </View>
);

const SocialPill = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <View style={[styles.socialPill, { backgroundColor: color + '14' }]}>
        <Text style={[styles.socialValue, { color }]}>{value}</Text>
        <Text style={[styles.socialLabel, { color }]}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
    detailsGrid: { paddingHorizontal: 20, paddingVertical: 16, gap: 12 },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderWidth: 0.5,
        borderColor: alpha(theme.colors.border, 0.4),
    },
    fieldLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.8 },
    fieldValue: { fontSize: 14, fontWeight: '600', color: theme.colors.text, flex: 1, textAlign: 'right' },
    descCard: { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 18, borderWidth: 0.5, borderColor: alpha(theme.colors.border, 0.4), gap: 10 },
    descText: { fontSize: 14, color: theme.colors.text, lineHeight: 22, opacity: 0.9 },
    walkInCard: { backgroundColor: alpha(theme.colors.surface, 0.5), borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: alpha(theme.colors.border, 0.4), gap: 12 },
    socialCard: { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: alpha(theme.colors.border, 0.4), gap: 12 },
    socialRow: { flexDirection: 'row', gap: 10 },
    socialPill: { flex: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center' },
    socialValue: { fontSize: 20, fontWeight: '800' },
    socialLabel: { fontSize: 10, fontWeight: '700', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
    sectionHeader: { fontSize: 11, fontWeight: '800', color: theme.colors.primary, textTransform: 'uppercase', letterSpacing: 1.2, opacity: 0.9 },
    linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.colors.surface, borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: alpha(theme.colors.border, 0.4) },
    linkText: { fontSize: 14, fontWeight: '600', color: theme.colors.primary, flex: 1 },
    failureText: { fontSize: 10, color: theme.colors.error, fontWeight: '700', marginTop: 2 },
});


