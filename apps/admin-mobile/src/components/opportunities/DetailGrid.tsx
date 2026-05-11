import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { ExternalLink } from 'lucide-react-native';
import { theme } from '@/theme';
import type { Opportunity } from '@/lib/api';

interface DetailGridProps {
    opp: Opportunity;
}

export const DetailGrid = ({ opp }: DetailGridProps) => {
    return (
        <View style={styles.detailsGrid}>
            <DetailRow label="Type" value={String(opp.type)} />
            <DetailRow label="Work Mode" value={String(opp.workMode ?? '—')} />
            <DetailRow label="Locations" value={Array.isArray(opp.locations) ? opp.locations.join(', ') : '—'} />
            {opp.salaryRange && <DetailRow label="Salary" value={`${String(opp.salaryRange)} (${String(opp.salaryPeriod ?? 'YEARLY')})`} />}
            {(opp.experienceMin != null || opp.experienceMax != null) &&
                <DetailRow label="Experience" value={`${opp.experienceMin ?? 0}–${opp.experienceMax ?? '?'} yrs`} />}
            {Array.isArray(opp.requiredSkills) && (opp.requiredSkills as string[]).length > 0 &&
                <DetailRow label="Skills" value={(opp.requiredSkills as string[]).join(', ')} />}
            {Array.isArray(opp.allowedPassoutYears) && (opp.allowedPassoutYears as number[]).length > 0 &&
                <DetailRow label="Passout Years" value={(opp.allowedPassoutYears as number[]).join(', ')} />}
            {Array.isArray(opp.allowedDegrees) && (opp.allowedDegrees as string[]).length > 0 &&
                <DetailRow label="Degrees" value={(opp.allowedDegrees as string[]).join(', ')} />}
            {opp.jobFunction && <DetailRow label="Function" value={String(opp.jobFunction)} />}
            {opp.employmentType && <DetailRow label="Employment" value={String(opp.employmentType)} />}
            
            {opp.sourceLink && (
                <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(String(opp.sourceLink))}>
                    <ExternalLink size={14} color={theme.colors.primary} />
                    <Text style={styles.linkText} numberOfLines={1}>Source Link</Text>
                </TouchableOpacity>
            )}
            
            {opp.applyLink && (
                <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(String(opp.applyLink))}>
                    <ExternalLink size={14} color={theme.colors.secondary} />
                    <Text style={styles.linkText} numberOfLines={1}>Apply Link</Text>
                </TouchableOpacity>
            )}
            
            {opp.expiresAt &&
                <DetailRow label="Expires" value={new Date(String(opp.expiresAt)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} />}
            <DetailRow label="Created" value={opp.postedAt ? new Date(opp.postedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} />
            
            <View style={[styles.detailRow, { borderLeftWidth: 4, borderLeftColor: opp.linkHealth === 'HEALTHY' ? theme.colors.success : opp.linkHealth === 'BROKEN' ? theme.colors.error : theme.colors.warning }]}>
                <Text style={styles.fieldLabel}>Link Health</Text>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.fieldValue, { color: opp.linkHealth === 'HEALTHY' ? theme.colors.success : opp.linkHealth === 'BROKEN' ? theme.colors.error : theme.colors.warning }]}>
                        {String(opp.linkHealth)}
                    </Text>
                    {opp.verificationFailures > 0 && (
                        <Text style={{ fontSize: 10, color: theme.colors.error, fontWeight: '700' }}>
                            {opp.verificationFailures} FAILURES
                        </Text>
                    )}
                </View>
            </View>

            {opp.lastVerifiedAt && (
                <DetailRow
                    label="Last Verified"
                    value={new Date(opp.lastVerifiedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                />
            )}

            <DetailRow label="Slug" value={String(opp.slug)} />

            {/* Walk-in details */}
            {opp.type === 'WALKIN' && opp.walkInDetails && (() => {
                const wd = opp.walkInDetails;
                return (
                    <View style={styles.walkInCard}>
                        <Text style={styles.sectionHeader}>Walk-in Details</Text>
                        {wd.venueAddress && <DetailRow label="Venue" value={String(wd.venueAddress)} />}
                        {wd.timeRange && <DetailRow label="Time" value={String(wd.timeRange)} />}
                        {wd.contactPerson && <DetailRow label="Contact" value={`${wd.contactPerson}${wd.contactPhone ? ' · ' + wd.contactPhone : ''}`} />}
                        {Array.isArray(wd.requiredDocuments) && wd.requiredDocuments.length > 0 &&
                            <DetailRow label="Docs" value={(wd.requiredDocuments as string[]).join(', ')} />}
                        {wd.venueLink && (
                            <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL(String(wd.venueLink))}>
                                <ExternalLink size={14} color={theme.colors.primary} />
                                <Text style={styles.linkText}>Maps Link</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                );
            })()}

            {/* Extras */}
            {opp.incentives && <DescCard label="Incentives / Perks" value={String(opp.incentives)} />}
            {opp.selectionProcess && <DescCard label="Selection Process" value={String(opp.selectionProcess)} />}
            {opp.notesHighlights && <DescCard label="Notes / Highlights" value={String(opp.notesHighlights)} />}
            {opp.description && <DescCard label="Description" value={String(opp.description)} />}
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

const styles = StyleSheet.create({
    detailsGrid: { padding: 16, gap: 10 },
    detailRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
        backgroundColor: theme.colors.surface, borderRadius: 10, padding: 12,
        borderWidth: 1, borderColor: theme.colors.border,
    },
    fieldLabel: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.4 },
    fieldValue: { fontSize: 14, fontWeight: '600', color: theme.colors.text, flex: 1, textAlign: 'right' },
    descCard: { backgroundColor: theme.colors.surface, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: theme.colors.border, gap: 8 },
    descText: { fontSize: 14, color: theme.colors.text, lineHeight: 20 },
    walkInCard: { backgroundColor: theme.colors.surface + '80', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: theme.colors.border, gap: 8 },
    sectionHeader: { fontSize: 13, fontWeight: '800', color: theme.colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
    linkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.surface, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: theme.colors.border },
    linkText: { fontSize: 14, fontWeight: '600', color: theme.colors.primary, flex: 1 },
});
