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

// Native Imports
import DateTimePicker from '@react-native-community/datetimepicker';
import SegmentedControl from '@react-native-segmented-control/segmented-control';
import Slider from '@react-native-community/slider';

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
                    <Section title="Signal Configuration">
                        <SurfaceCard style={styles.formCard}>
                            <SegmentedControlField
                                label="Status"
                                options={STATUSES}
                                selectedValue={form.status}
                                onChange={v => set('status', v)}
                            />

                            <View style={[styles.divider, { backgroundColor: alpha(currentTheme.colors.border, 0.1) }]} />

                            <SegmentedControlField
                                label="Signal Type"
                                options={OPPORTUNITY_TYPES}
                                selectedValue={form.type}
                                onChange={v => set('type', v)}
                            />
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
                            <SegmentedControlField
                                label="Work Mode"
                                options={WORK_MODES}
                                selectedValue={form.workMode}
                                onChange={v => set('workMode', v)}
                            />

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

                            <DatePickerField
                                label="Expiration Date"
                                value={form.expiresAt}
                                onChange={v => set('expiresAt', v)}
                                onClear={() => set('expiresAt', '')}
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
                                        <DatePickerField
                                            label="Start Date *"
                                            value={form.walkInDate}
                                            onChange={v => set('walkInDate', v)}
                                            error={errors.walkInDate?.message}
                                        />
                                    </View>
                                    <View style={{ width: SPACING.md }} />
                                    <View style={styles.flex}>
                                        <DatePickerField
                                            label="End Date"
                                            value={form.walkInEndDate}
                                            onChange={v => set('walkInEndDate', v)}
                                            onClear={() => set('walkInEndDate', '')}
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
                            
                            <SegmentedControlField
                                label="Period"
                                options={SALARY_PERIODS}
                                selectedValue={form.salaryPeriod}
                                onChange={v => set('salaryPeriod', v)}
                            />

                            <View style={[styles.divider, { backgroundColor: alpha(currentTheme.colors.border, 0.1) }]} />

                            <View style={{ marginBottom: SPACING.md }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <Label>Min Experience: {form.expMin || '0'} yrs</Label>
                                </View>
                                <Slider
                                    minimumValue={0}
                                    maximumValue={10}
                                    step={1}
                                    value={Number(form.expMin || 0)}
                                    onValueChange={v => set('expMin', String(v))}
                                    minimumTrackTintColor={currentTheme.colors.primary}
                                    maximumTrackTintColor={alpha(currentTheme.colors.text, 0.1)}
                                    thumbTintColor={currentTheme.colors.primary}
                                    style={{ height: 40 }}
                                />
                            </View>

                            <View style={{ marginBottom: SPACING.md }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                    <Label>Max Experience: {form.expMax || '0'} yrs</Label>
                                </View>
                                <Slider
                                    minimumValue={0}
                                    maximumValue={15}
                                    step={1}
                                    value={Number(form.expMax || 0)}
                                    onValueChange={v => set('expMax', String(v))}
                                    minimumTrackTintColor={currentTheme.colors.primary}
                                    maximumTrackTintColor={alpha(currentTheme.colors.text, 0.1)}
                                    thumbTintColor={currentTheme.colors.primary}
                                    style={{ height: 40 }}
                                />
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

const SegmentedControlField = <T extends string>({
    label,
    options,
    selectedValue,
    onChange,
}: {
    label: string;
    options: readonly T[];
    selectedValue: T;
    onChange: (val: T) => void;
}) => {
    const { currentTheme } = useTheme();
    const selectedIndex = options.indexOf(selectedValue);
    
    return (
        <View style={{ marginBottom: SPACING.md }}>
            <Label>{label}</Label>
            <SegmentedControl
                values={options as unknown as string[]}
                selectedIndex={selectedIndex >= 0 ? selectedIndex : 0}
                onChange={(event) => {
                    const idx = event.nativeEvent.selectedSegmentIndex;
                    onChange(options[idx]);
                }}
                style={{ height: 40, marginTop: 8 }}
                tintColor={currentTheme.colors.primary}
                backgroundColor={alpha(currentTheme.colors.text, 0.05)}
                activeFontStyle={{ color: currentTheme.colors.background, fontWeight: '800' }}
                fontStyle={{ color: currentTheme.colors.textMuted, fontWeight: '600' }}
            />
        </View>
    );
};

const DatePickerField = ({
    label,
    value,
    onChange,
    error,
    onClear,
}: {
    label: string;
    value: string;
    onChange: (dateStr: string) => void;
    error?: string;
    onClear?: () => void;
}) => {
    const { currentTheme } = useTheme();
    const [show, setShow] = useState(false);

    const handleDateChange = (event: unknown, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShow(false);
        }
        if (selectedDate) {
            const formatted = selectedDate.toISOString().split('T')[0];
            onChange(formatted);
        }
    };

    const displayDate = value ? new Date(value) : null;
    const pickerDate = displayDate && !isNaN(displayDate.getTime()) ? displayDate : new Date();

    return (
        <View style={{ marginBottom: SPACING.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: mScale(10), fontWeight: '900', letterSpacing: 1.5, color: currentTheme.colors.textMuted, textTransform: 'uppercase' }}>{label}</Text>
                {value && onClear ? (
                    <TouchableOpacity 
                        onPress={onClear}
                        style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: alpha(currentTheme.colors.error, 0.1) }}
                        activeOpacity={0.7}
                    >
                        <Text style={{ color: currentTheme.colors.error, fontSize: mScale(9), fontWeight: '800' }}>CLEAR</Text>
                    </TouchableOpacity>
                ) : null}
            </View>
            <TouchableOpacity
                onPress={() => setShow(true)}
                style={[
                    styles.input,
                    {
                        borderBottomColor: error ? currentTheme.colors.error : alpha(currentTheme.colors.border, 0.1),
                        marginBottom: 0,
                        justifyContent: 'center',
                        paddingVertical: 12,
                    }
                ]}
            >
                <Text style={{ 
                    color: value ? currentTheme.colors.text : alpha(currentTheme.colors.text, 0.3),
                    fontSize: mScale(15),
                    fontWeight: '600'
                }}>
                    {value ? value : 'Select Date'}
                </Text>
            </TouchableOpacity>
            {error && <Text style={{ color: currentTheme.colors.error, fontSize: 10, marginTop: 4, fontWeight: '700' }}>{error}</Text>}

            {show && (
                <>
                    {Platform.OS === 'ios' ? (
                        <View style={{ marginTop: 10, alignItems: 'flex-start' }}>
                            <DateTimePicker
                                value={pickerDate}
                                mode="date"
                                display="default"
                                onChange={handleDateChange}
                            />
                            <TouchableOpacity onPress={() => setShow(false)} style={{ marginTop: 8, padding: 6, alignSelf: 'flex-end' }}>
                                <Text style={{ color: currentTheme.colors.primary, fontWeight: '700' }}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <DateTimePicker
                            value={pickerDate}
                            mode="date"
                            display="default"
                            onChange={handleDateChange}
                        />
                    )}
                </>
            )}
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
