/**
 * PostOpportunityScreen — thin render container.
 *
 * State & save logic: usePostOpportunityForm (./post-opportunity/usePostOpportunityForm)
 * Auto-fill modal:    ParseModal             (./post-opportunity/ParseModal)
 */
import React, { useState } from 'react';
import {
    StyleSheet, Text, View, TextInput, ScrollView,
    TouchableOpacity, ActivityIndicator,
} from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OpportunitiesStackParamList } from '@/navigation/OpportunitiesNavigator';
import { theme } from '../../theme';
import { usePostOpportunity } from './hooks/usePostOpportunity';
import { ParseModal } from './components/ParseModal';

// ── Constants ─────────────────────────────────────────────────────────────────
const OPPORTUNITY_TYPES = ['JOB', 'INTERNSHIP', 'WALKIN'] as const;
const WORK_MODES        = ['ONSITE', 'HYBRID', 'REMOTE'] as const;
const SALARY_PERIODS    = ['YEARLY', 'MONTHLY'] as const;
const STATUSES          = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
const PASS_YEARS        = [2022, 2023, 2024, 2025, 2026, 2027, 2028];
const DEGREES           = ['DIPLOMA', 'DEGREE', 'PG'];
const QUICK_LOCATIONS   = ['Remote', 'Bengaluru', 'Mumbai', 'Hyderabad', 'Chennai', 'Delhi', 'Pune', 'Kolkata', 'Pan India'];

// ── Screen ────────────────────────────────────────────────────────────────────
export const PostOpportunityScreen = ({ route, navigation }: { route: RouteProp<OpportunitiesStackParamList, 'PostOpportunity'>; navigation: NativeStackNavigationProp<OpportunitiesStackParamList> }) => {
    const opportunityId = route.params?.opportunityId;
    const isEditing = !!opportunityId;

    const { form, set, toggle, fillForm, loading, saving, handleSave } =
        usePostOpportunity(opportunityId, navigation);

    const [showParseModal, setShowParseModal] = useState(false);

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <ScrollView style={styles.container} contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">

                {/* Auto-fill banner */}
                {!isEditing && (
                    <TouchableOpacity style={styles.parseBanner} onPress={() => setShowParseModal(true)}>
                        <Text style={styles.parseBannerIcon}>⚡</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.parseBannerTitle}>Auto-fill from URL / JSON / Text</Text>
                            <Text style={styles.parseBannerSub}>AI extracts and pre-fills the form instantly</Text>
                        </View>
                        <Text style={styles.parseBannerArrow}>›</Text>
                    </TouchableOpacity>
                )}

                {/* Status */}
                <Label>Status</Label>
                <ChipRow>
                    {STATUSES.map(s => (
                        <Chip key={s} label={s} active={form.status === s}
                            onPress={() => set('status', s)}
                            activeColor={s === 'PUBLISHED' ? theme.colors.success : s === 'ARCHIVED' ? theme.colors.textMuted : theme.colors.accent} />
                    ))}
                </ChipRow>

                {/* Type */}
                <Label>Opportunity Type</Label>
                <ChipRow>
                    {OPPORTUNITY_TYPES.map(t => (
                        <Chip key={t} label={t} active={form.type === t} onPress={() => set('type', t)} />
                    ))}
                </ChipRow>

                {/* Core */}
                <Label>Job Title *</Label>
                <Input placeholder="e.g. Software Engineer" value={form.title} onChangeText={v => set('title', v)} />

                <Label>Company *</Label>
                <Input placeholder="e.g. Google" value={form.company} onChangeText={v => set('company', v)} />

                <Label>Company Website</Label>
                <Input placeholder="https://company.com" value={form.companyWebsite} onChangeText={v => set('companyWebsite', v)} url />

                {/* Links */}
                <Label>Source Link (job listing page)</Label>
                <Input placeholder="https://company.com/jobs/engineer" value={form.sourceLink} onChangeText={v => set('sourceLink', v)} url />

                <Label>Apply Link (direct apply URL)</Label>
                <Input placeholder="https://company.com/apply/…" value={form.applyLink} onChangeText={v => set('applyLink', v)} url />

                {/* Location */}
                <Label>Locations (comma separated)</Label>
                <Input placeholder="Remote, Bengaluru, Mumbai" value={form.locationInput} onChangeText={v => set('locationInput', v)} />
                <View style={styles.quickLocRow}>
                    {QUICK_LOCATIONS.map(l => (
                        <TouchableOpacity key={l} style={styles.quickLoc}
                            onPress={() => {
                                if (form.locationInput.toLowerCase().includes(l.toLowerCase())) return;
                                set('locationInput', form.locationInput ? `${form.locationInput}, ${l}` : l);
                            }}>
                            <Text style={styles.quickLocText}>{l}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Work mode */}
                <Label>Work Mode</Label>
                <ChipRow>
                    {WORK_MODES.map(m => (
                        <Chip key={m} label={m} active={form.workMode === m} onPress={() => set('workMode', m)} />
                    ))}
                </ChipRow>

                {/* Education */}
                <Label>Eligible Degrees</Label>
                <ChipRow wrap>
                    {DEGREES.map(d => (
                        <Chip key={d} label={d} active={form.selectedDegrees.includes(d)} onPress={() => toggle('selectedDegrees', d)} />
                    ))}
                </ChipRow>

                <Label>Eligible Courses (comma separated)</Label>
                <Input placeholder="e.g. B.Tech, B.E., MCA" value={form.allowedCourses} onChangeText={v => set('allowedCourses', v)} />

                <Label>Eligible Specializations (comma separated)</Label>
                <Input placeholder="e.g. CSE, IT, ECE" value={form.allowedSpecializations} onChangeText={v => set('allowedSpecializations', v)} />

                <Label>Eligible Passout Years</Label>
                <ChipRow wrap>
                    {PASS_YEARS.map(y => (
                        <Chip key={y} label={String(y)} active={form.selectedYears.includes(y)} onPress={() => toggle('selectedYears', y)} />
                    ))}
                </ChipRow>

                {/* Skills */}
                <Label>Required Skills (comma separated)</Label>
                <Input placeholder="React, Node.js, SQL" value={form.skills} onChangeText={v => set('skills', v)} />

                {/* Salary */}
                <Label>Salary / CTC Range</Label>
                <Input
                    placeholder={form.salaryPeriod === 'YEARLY' ? 'e.g. 4-8 LPA' : 'e.g. 25000-50000 /month'}
                    value={form.salaryRange} onChangeText={v => set('salaryRange', v)} />
                <Label>Salary Period</Label>
                <ChipRow>
                    {SALARY_PERIODS.map(p => (
                        <Chip key={p} label={p} active={form.salaryPeriod === p} onPress={() => set('salaryPeriod', p)} />
                    ))}
                </ChipRow>

                {/* Experience */}
                <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                        <Label>Exp Min (yrs)</Label>
                        <Input placeholder="0" value={form.expMin} onChangeText={v => set('expMin', v)} numeric />
                    </View>
                    <View style={{ width: 12 }} />
                    <View style={{ flex: 1 }}>
                        <Label>Exp Max (yrs)</Label>
                        <Input placeholder="3" value={form.expMax} onChangeText={v => set('expMax', v)} numeric />
                    </View>
                </View>

                {/* Job specifics */}
                <Label>Job Function</Label>
                <Input placeholder="e.g. Engineering, Finance" value={form.jobFunction} onChangeText={v => set('jobFunction', v)} />

                <Label>Employment Type</Label>
                <Input placeholder="Full-time, Contract, Part-time" value={form.employmentType} onChangeText={v => set('employmentType', v)} />

                <Label>Incentives / Perks</Label>
                <Input placeholder="Health insurance, ESOPs…" value={form.incentives} onChangeText={v => set('incentives', v)} />

                <Label>Selection Process</Label>
                <Input placeholder="Online test → Interview → HR round" value={form.selectionProcess} onChangeText={v => set('selectionProcess', v)} />

                <Label>Notes / Highlights</Label>
                <Input placeholder="Important notes for freshers…" value={form.notesHighlights} onChangeText={v => set('notesHighlights', v)} multiline />

                {/* Walk-in section */}
                {form.type === 'WALKIN' && (
                    <>
                        <SectionHeader>Walk-in Details</SectionHeader>

                        <Label>Venue Address *</Label>
                        <Input placeholder="Building, Street, City" value={form.venueAddress} onChangeText={v => set('venueAddress', v)} multiline />

                        <Label>Venue / Maps Link</Label>
                        <Input placeholder="https://maps.google.com/…" value={form.venueLink} onChangeText={v => set('venueLink', v)} url />

                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <Label>Start Date</Label>
                                <Input placeholder="YYYY-MM-DD" value={form.walkInDate} onChangeText={v => set('walkInDate', v)} />
                            </View>
                            <View style={{ width: 12 }} />
                            <View style={{ flex: 1 }}>
                                <Label>End Date</Label>
                                <Input placeholder="YYYY-MM-DD" value={form.walkInEndDate} onChangeText={v => set('walkInEndDate', v)} />
                            </View>
                        </View>

                        <Label>Time Range</Label>
                        <Input placeholder="10:00 AM – 1:00 PM" value={form.walkInTime} onChangeText={v => set('walkInTime', v)} />

                        <Label>Required Documents (comma separated)</Label>
                        <Input placeholder="Resume, Aadhar, Offer letter" value={form.requiredDocuments} onChangeText={v => set('requiredDocuments', v)} />

                        <Label>Contact Person</Label>
                        <Input placeholder="HR Name" value={form.contactPerson} onChangeText={v => set('contactPerson', v)} />

                        <Label>Contact Phone</Label>
                        <Input placeholder="+91 98765 43210" value={form.contactPhone} onChangeText={v => set('contactPhone', v)} numeric />
                    </>
                )}

                {/* Expiry */}
                <Label>Expires On (YYYY-MM-DD)</Label>
                <Input placeholder="e.g. 2025-06-30" value={form.expiresAt} onChangeText={v => set('expiresAt', v)} />

                {/* Description */}
                <Label>Description / JD</Label>
                <TextInput
                    style={[styles.input, { height: 160 }]}
                    placeholder="Full job description…"
                    placeholderTextColor={theme.colors.textMuted}
                    multiline textAlignVertical="top"
                    value={form.description}
                    onChangeText={v => set('description', v)}
                />

                {/* Save */}
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.65 }]} onPress={handleSave} disabled={saving}>
                    {saving
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.saveBtnText}>{isEditing ? 'Save Changes' : 'Post Opportunity'}</Text>}
                </TouchableOpacity>
                <View style={{ height: 40 }} />
            </ScrollView>

            <ParseModal
                visible={showParseModal}
                onClose={() => setShowParseModal(false)}
                onFilled={(data) => { fillForm(data); }}
            />
        </View>
    );
};

// ── Primitives ────────────────────────────────────────────────────────────────

const Label = ({ children }: { children: React.ReactNode }) => (
    <Text style={styles.label}>{children}</Text>
);
const SectionHeader = ({ children }: { children: React.ReactNode }) => (
    <Text style={styles.sectionHeader}>{children}</Text>
);
const ChipRow = ({ children, wrap }: { children: React.ReactNode; wrap?: boolean }) => (
    <View style={[styles.chipRow, wrap && styles.chipRowWrap]}>{children}</View>
);
const Chip = ({ label, active, onPress, activeColor }: { label: string; active: boolean; onPress: () => void; activeColor?: string }) => {
    const bg = active ? (activeColor ?? theme.colors.primary) : theme.colors.surface;
    return (
        <TouchableOpacity style={[styles.chip, { backgroundColor: bg, borderColor: active ? bg : theme.colors.border }]} onPress={onPress}>
            <Text style={[styles.chipText, { color: active ? '#fff' : theme.colors.textMuted }]}>{label}</Text>
        </TouchableOpacity>
    );
};
const Input = ({
    placeholder, value, onChangeText, url, numeric, multiline,
}: {
    placeholder?: string; value: string; onChangeText: (v: string) => void;
    url?: boolean; numeric?: boolean; multiline?: boolean;
}) => (
    <TextInput
        style={[styles.input, multiline && { height: 100 }]}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize={url ? 'none' : 'sentences'}
        keyboardType={url ? 'url' : numeric ? 'numeric' : 'default'}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
    />
);

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
    container: { flex: 1, backgroundColor: theme.colors.background },
    form: { padding: 20, paddingBottom: 40 },
    label: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 16 },
    sectionHeader: { fontSize: 15, fontWeight: '800', color: theme.colors.primary, marginTop: 24, marginBottom: 4, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 16 },
    input: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, padding: 13, fontSize: 15, color: theme.colors.text },
    chipRow: { flexDirection: 'row', gap: 8, marginBottom: 4, flexWrap: 'nowrap' },
    chipRowWrap: { flexWrap: 'wrap' },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
    chipText: { fontSize: 12, fontWeight: '600' },
    row: { flexDirection: 'row' },
    quickLocRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    quickLoc: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5 },
    quickLocText: { fontSize: 12, color: theme.colors.textMuted },
    saveBtn: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 28 },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
    parseBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.primary + '15', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: theme.colors.primary + '30', marginBottom: 4 },
    parseBannerIcon: { fontSize: 20 },
    parseBannerTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
    parseBannerSub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 1 },
    parseBannerArrow: { fontSize: 22, color: theme.colors.primary },
});


