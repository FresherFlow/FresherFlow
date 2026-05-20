import React, { useState } from 'react';
import {
    StyleSheet, Text, View, TextInput, ScrollView,
    TouchableOpacity, ActivityIndicator, Platform, KeyboardAvoidingView
} from 'react-native';
import type { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { OpportunitiesStackParamList } from '../../navigation/OpportunitiesNavigator';
import { usePostOpportunity } from './hooks/usePostOpportunity';
import { ParseModal } from './components/ParseModal';
import { OpportunityType } from '@fresherflow/api-client';
import { useTheme } from '../../theme/ThemeProvider';
import { alpha } from '../../theme';
import { mScale, SPACING } from '../../theme/dimensions';
import { Screen, Section } from '../system/layout/Layout';
import { SurfaceCard } from '../system/components/PremiumPrimitives';
import { AppButton } from '@repo/ui';
import { Sparkles, Check } from 'lucide-react-native';

// ── Constants ─────────────────────────────────────────────────────────────────
const OPPORTUNITY_TYPES = [OpportunityType.JOB, OpportunityType.INTERNSHIP, OpportunityType.WALKIN] as const;
const WORK_MODES        = ['ONSITE', 'HYBRID', 'REMOTE'] as const;
const SALARY_PERIODS    = ['YEARLY', 'MONTHLY'] as const;
const STATUSES          = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
const PASS_YEARS        = [2022, 2023, 2024, 2025, 2026, 2027, 2028];
const DEGREES           = ['DIPLOMA', 'DEGREE', 'PG'];
const QUICK_LOCATIONS   = ['Remote', 'Bengaluru', 'Mumbai', 'Hyderabad', 'Chennai', 'Delhi', 'Pune', 'Kolkata', 'Pan India'];

export const PostOpportunityScreen = ({ 
    route, 
    navigation 
}: { 
    route: RouteProp<OpportunitiesStackParamList, 'PostOpportunity'>; 
    navigation: NativeStackNavigationProp<OpportunitiesStackParamList> 
}) => {
    const opportunityId = route.params?.opportunityId;
    const isEditing = !!opportunityId;
    const { currentTheme } = useTheme();

    const { form, set, toggle, fillForm, loading, saving, handleSave, errors } =
        usePostOpportunity(opportunityId, navigation);

    const [showParseModal, setShowParseModal] = useState(false);

    if (loading) {
        return (
            <Screen safe>
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color={currentTheme.colors.primary} />
                </View>
            </Screen>
        );
    }

    return (
        <Screen safe>
            
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                style={styles.flex}
            >
                <ScrollView 
                    style={styles.flex} 
                    contentContainerStyle={styles.scrollContent} 
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {/* No banner, using FAB instead */}

                    <Section title="Signal Configuration">
                        <SurfaceCard style={styles.formCard}>
                            <Label>Status</Label>
                            <ChipRow wrap>
                                {STATUSES.map(s => (
                                    <Chip 
                                        key={s} 
                                        label={s} 
                                        active={form.status === s}
                                        onPress={() => set('status', s)}
                                        activeColor={s === 'PUBLISHED' ? currentTheme.colors.success : s === 'ARCHIVED' ? currentTheme.colors.muted : currentTheme.colors.secondary} 
                                    />
                                ))}
                            </ChipRow>

                            <View style={[styles.divider, { backgroundColor: alpha(currentTheme.colors.border, 0.1) }]} />

                            <Label>Signal Type</Label>
                            <ChipRow>
                                {OPPORTUNITY_TYPES.map(t => (
                                    <Chip 
                                        key={t} 
                                        label={t} 
                                        active={form.type === t} 
                                        onPress={() => set('type', t)} 
                                    />
                                ))}
                            </ChipRow>
                        </SurfaceCard>
                    </Section>

                    <Section title="Entity Details">
                        <SurfaceCard style={styles.formCard}>
                            <Label>Job Title *</Label>
                            <FormInput 
                                placeholder="e.g. Software Engineer" 
                                value={form.title} 
                                onChangeText={v => set('title', v)} 
                                error={errors.title?.message}
                            />

                            <Label>Company *</Label>
                            <FormInput 
                                placeholder="e.g. Google" 
                                value={form.company} 
                                onChangeText={v => set('company', v)} 
                                error={errors.company?.message}
                            />

                            <Label>Website</Label>
                            <FormInput 
                                placeholder="https://company.com" 
                                value={form.companyWebsite} 
                                onChangeText={v => set('companyWebsite', v)} 
                                error={errors.companyWebsite?.message}
                                url 
                            />
                        </SurfaceCard>
                    </Section>

                    <Section title="Fulfillment Links">
                        <SurfaceCard style={styles.formCard}>
                            <Label>Source Page</Label>
                            <FormInput 
                                placeholder="Link to listing page" 
                                value={form.sourceLink} 
                                onChangeText={v => set('sourceLink', v)} 
                                url 
                            />

                            <Label>Apply Direct</Label>
                            <FormInput 
                                placeholder="Direct application URL" 
                                value={form.applyLink} 
                                onChangeText={v => set('applyLink', v)} 
                                url 
                            />
                        </SurfaceCard>
                    </Section>

                    <Section title="Logistics">
                        <SurfaceCard style={styles.formCard}>
                            <Label>Work Mode</Label>
                            <ChipRow>
                                {WORK_MODES.map(m => (
                                    <Chip key={m} label={m} active={form.workMode === m} onPress={() => set('workMode', m)} />
                                ))}
                            </ChipRow>

                            <View style={[styles.divider, { backgroundColor: alpha(currentTheme.colors.border, 0.1) }]} />

                            <Label>Locations</Label>
                            <FormInput 
                                placeholder="Remote, Bengaluru, Mumbai" 
                                value={form.locationInput} 
                                onChangeText={v => set('locationInput', v)} 
                            />
                            <View style={styles.quickLocRow}>
                                {QUICK_LOCATIONS.map(l => (
                                    <TouchableOpacity 
                                        key={l} 
                                        style={[styles.quickLoc, { backgroundColor: alpha(currentTheme.colors.primary, 0.05) }]}
                                        onPress={() => {
                                            if (form.locationInput.toLowerCase().includes(l.toLowerCase())) return;
                                            set('locationInput', form.locationInput ? `${form.locationInput}, ${l}` : l);
                                        }}
                                    >
                                        <Text style={[styles.quickLocText, { color: currentTheme.colors.text }]}>{l}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <View style={[styles.divider, { backgroundColor: alpha(currentTheme.colors.border, 0.1) }]} />

                            <Label>Expiration Date (YYYY-MM-DD)</Label>
                            <FormInput 
                                placeholder="e.g. 2026-12-31" 
                                value={form.expiresAt} 
                                onChangeText={v => set('expiresAt', v)} 
                                error={errors.expiresAt?.message}
                            />
                        </SurfaceCard>
                    </Section>

                    {form.type === OpportunityType.WALKIN && (
                        <Section title="Walk-in Details">
                            <SurfaceCard style={styles.formCard}>
                                <Label>Venue Address *</Label>
                                <FormInput 
                                    placeholder="Full address of the walk-in drive" 
                                    value={form.venueAddress} 
                                    onChangeText={v => set('venueAddress', v)} 
                                    error={errors.venueAddress?.message}
                                />

                                <Label>Maps Location Link</Label>
                                <FormInput 
                                    placeholder="https://maps.google.com/..." 
                                    value={form.venueLink} 
                                    onChangeText={v => set('venueLink', v)} 
                                    error={errors.venueLink?.message}
                                    url
                                />

                                <View style={styles.row}>
                                    <View style={styles.flex}>
                                        <Label>Start Date *</Label>
                                        <FormInput 
                                            placeholder="YYYY-MM-DD" 
                                            value={form.walkInDate} 
                                            onChangeText={v => set('walkInDate', v)} 
                                            error={errors.walkInDate?.message}
                                        />
                                    </View>
                                    <View style={{ width: SPACING.md }} />
                                    <View style={styles.flex}>
                                        <Label>End Date</Label>
                                        <FormInput 
                                            placeholder="YYYY-MM-DD" 
                                            value={form.walkInEndDate} 
                                            onChangeText={v => set('walkInEndDate', v)} 
                                            error={errors.walkInEndDate?.message}
                                        />
                                    </View>
                                </View>

                                <Label>Reporting / Interview Time</Label>
                                <FormInput 
                                    placeholder="e.g. 9:00 AM - 1:00 PM" 
                                    value={form.walkInTime} 
                                    onChangeText={v => set('walkInTime', v)} 
                                    error={errors.walkInTime?.message}
                                />

                                <Label>Required Documents</Label>
                                <FormInput 
                                    placeholder="Resume, Govt ID, Degree Certificates" 
                                    value={form.requiredDocuments} 
                                    onChangeText={v => set('requiredDocuments', v)} 
                                    error={errors.requiredDocuments?.message}
                                />

                                <View style={styles.row}>
                                    <View style={styles.flex}>
                                        <Label>Contact Person</Label>
                                        <FormInput 
                                            placeholder="HR Manager Name" 
                                            value={form.contactPerson} 
                                            onChangeText={v => set('contactPerson', v)} 
                                            error={errors.contactPerson?.message}
                                        />
                                    </View>
                                    <View style={{ width: SPACING.md }} />
                                    <View style={styles.flex}>
                                        <Label>Contact Phone</Label>
                                        <FormInput 
                                            placeholder="+91 XXXXX XXXXX" 
                                            value={form.contactPhone} 
                                            onChangeText={v => set('contactPhone', v)} 
                                            error={errors.contactPhone?.message}
                                        />
                                    </View>
                                </View>
                            </SurfaceCard>
                        </Section>
                    )}

                    <Section title="Candidate Profile">
                        <SurfaceCard style={styles.formCard}>
                            <Label>Degrees</Label>
                            <ChipRow wrap>
                                {DEGREES.map(d => (
                                    <Chip key={d} label={d} active={form.selectedDegrees.includes(d)} onPress={() => toggle('selectedDegrees', d)} />
                                ))}
                            </ChipRow>

                            <View style={[styles.divider, { backgroundColor: alpha(currentTheme.colors.border, 0.1) }]} />

                            <Label>Passout Years</Label>
                            <ChipRow wrap>
                                {PASS_YEARS.map(y => (
                                    <Chip key={y} label={String(y)} active={form.selectedYears.includes(y)} onPress={() => toggle('selectedYears', y)} />
                                ))}
                            </ChipRow>

                            <View style={[styles.divider, { backgroundColor: alpha(currentTheme.colors.border, 0.1) }]} />

                            <Label>Courses</Label>
                            <FormInput placeholder="e.g. B.Tech, MCA" value={form.allowedCourses} onChangeText={v => set('allowedCourses', v)} />

                            <Label>Skills</Label>
                            <FormInput placeholder="React, Python, SQL" value={form.skills} onChangeText={v => set('skills', v)} />
                        </SurfaceCard>
                    </Section>

                    <Section title="Compensation & Context">
                        <SurfaceCard style={styles.formCard}>
                            <Label>Salary Range</Label>
                            <FormInput
                                placeholder={form.salaryPeriod === 'YEARLY' ? 'e.g. 6-12 LPA' : 'e.g. 40k-60k /month'}
                                value={form.salaryRange} onChangeText={v => set('salaryRange', v)} />
                            
                            <Label>Period</Label>
                            <ChipRow>
                                {SALARY_PERIODS.map(p => (
                                    <Chip key={p} label={p} active={form.salaryPeriod === p} onPress={() => set('salaryPeriod', p)} />
                                ))}
                            </ChipRow>

                            <View style={[styles.divider, { backgroundColor: alpha(currentTheme.colors.border, 0.1) }]} />

                            <View style={styles.row}>
                                <View style={styles.flex}>
                                    <Label>Exp Min</Label>
                                    <FormInput placeholder="0" value={form.expMin} onChangeText={v => set('expMin', v)} numeric />
                                </View>
                                <View style={{ width: SPACING.md }} />
                                <View style={styles.flex}>
                                    <Label>Exp Max</Label>
                                    <FormInput placeholder="3" value={form.expMax} onChangeText={v => set('expMax', v)} numeric />
                                </View>
                            </View>
                        </SurfaceCard>
                    </Section>

                    <Section title="Signal Depth">
                        <SurfaceCard style={styles.formCard}>
                            <Label>Description</Label>
                            <FormInput 
                                placeholder="Full job details..." 
                                value={form.description} 
                                onChangeText={v => set('description', v)} 
                                multiline 
                            />

                            <Label>Notes / Highlights</Label>
                            <FormInput 
                                placeholder="Admin notes..." 
                                value={form.notesHighlights} 
                                onChangeText={v => set('notesHighlights', v)} 
                                multiline 
                            />
                        </SurfaceCard>
                    </Section>

                    <AppButton
                        label={isEditing ? 'Save Signal Changes' : 'Publish Opportunity Signal'}
                        onPress={handleSave}
                        loading={saving}
                        style={styles.saveBtn}
                    />
                    <View style={styles.footerSpace} />
                </ScrollView>
            </KeyboardAvoidingView>

            {!isEditing && (
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: currentTheme.colors.primary }]}
                    onPress={() => setShowParseModal(true)}
                    activeOpacity={0.8}
                >
                    <Sparkles size={24} color={currentTheme.colors.background} />
                </TouchableOpacity>
            )}

            <ParseModal
                visible={showParseModal}
                initialUrl={form.sourceLink}
                onClose={() => setShowParseModal(false)}
                onFilled={(data) => { fillForm(data); }}
            />
        </Screen>
    );
};

const Label = ({ children }: { children: React.ReactNode }) => {
    const { currentTheme } = useTheme();
    return <Text style={[styles.label, { color: currentTheme.colors.textMuted }]}>{children}</Text>;
};

const ChipRow = ({ children, wrap }: { children: React.ReactNode; wrap?: boolean }) => (
    <View style={[styles.chipRow, wrap && styles.chipRowWrap]}>{children}</View>
);

const Chip = ({ label, active, onPress, activeColor }: { label: string; active: boolean; onPress: () => void; activeColor?: string }) => {
    const { currentTheme } = useTheme();
    const bg = active ? (activeColor ?? currentTheme.colors.primary) : alpha(currentTheme.colors.primary, 0.05);
    const borderColor = active ? bg : alpha(currentTheme.colors.border, 0.1);
    
    return (
        <TouchableOpacity 
            style={[styles.chip, { backgroundColor: bg, borderColor }]} 
            onPress={onPress}
            activeOpacity={0.7}
        >
            <Text style={[styles.chipText, { color: active ? currentTheme.colors.background : currentTheme.colors.text }]}>
                {label}
            </Text>
            {active && <Check size={10} color={currentTheme.colors.background} style={{ marginLeft: 4 }} />}
        </TouchableOpacity>
    );
};

const FormInput = ({
    placeholder, value, onChangeText, url, numeric, multiline, error
}: {
    placeholder?: string; value: string; onChangeText: (v: string) => void;
    url?: boolean; numeric?: boolean; multiline?: boolean; error?: string;
}) => {
    const { currentTheme } = useTheme();
    return (
        <View style={{ marginBottom: SPACING.md }}>
            <TextInput
                style={[
                    styles.input, 
                    { 
                        color: currentTheme.colors.text, 
                        borderBottomColor: error ? currentTheme.colors.error : alpha(currentTheme.colors.border, 0.1),
                        marginBottom: 0
                    },
                    multiline && { height: 100, textAlignVertical: 'top' }
                ]}
                placeholder={placeholder}
                placeholderTextColor={alpha(currentTheme.colors.text, 0.3)}
                value={value}
                onChangeText={onChangeText}
                autoCapitalize={url ? 'none' : 'sentences'}
                keyboardType={url ? 'url' : numeric ? 'numeric' : 'default'}
                multiline={multiline}
            />
            {error && <Text style={{ color: currentTheme.colors.error, fontSize: 10, marginTop: 4, fontWeight: '700' }}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    flex: { flex: 1 },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { paddingHorizontal: SPACING.lg, paddingBottom: 140 },
    fab: {
        position: 'absolute',
        right: SPACING.lg,
        bottom: 100,
        width: mScale(56),
        height: mScale(56),
        borderRadius: mScale(28),
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    formCard: { padding: SPACING.lg },
    label: { fontSize: mScale(10), fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 },
    divider: { height: 1, marginVertical: SPACING.lg },
    input: { 
        fontSize: mScale(15), 
        fontWeight: '600', 
        paddingVertical: 12,
        borderBottomWidth: 1,
        marginBottom: SPACING.lg,
    },
    chipRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
    chipRowWrap: { flexWrap: 'wrap' },
    chip: { 
        paddingHorizontal: 12, 
        paddingVertical: 8, 
        borderRadius: 12, 
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    chipText: { fontSize: mScale(11), fontWeight: '800', letterSpacing: 0.5 },
    row: { flexDirection: 'row' },
    quickLocRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    quickLoc: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    quickLocText: { fontSize: mScale(11), fontWeight: '700' },
    saveBtn: { marginTop: SPACING.xl, height: mScale(56), borderRadius: 16 },
    footerSpace: { height: 40 },
});
