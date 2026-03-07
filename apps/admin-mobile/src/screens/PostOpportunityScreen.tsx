import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet, Text, View, TextInput, ScrollView,
    TouchableOpacity, Alert, ActivityIndicator, Modal, Switch,
} from 'react-native';
import { Opportunities } from '../lib/api';
import { theme } from '../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ADMIN_OPPORTUNITIES_CACHE_KEY } from '../lib/constants';
import { toast } from '../lib/toast';

// ── Constants ──────────────────────────────────────────────────────────────────

const OPPORTUNITY_TYPES = ['JOB', 'INTERNSHIP', 'WALKIN'] as const;
const WORK_MODES = ['ONSITE', 'HYBRID', 'REMOTE'] as const;
const SALARY_PERIODS = ['YEARLY', 'MONTHLY'] as const;
const STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
const PASS_YEARS = [2022, 2023, 2024, 2025, 2026, 2027, 2028];
const DEGREES = ['DIPLOMA', 'DEGREE', 'PG'];
const QUICK_LOCATIONS = ['Remote', 'Bengaluru', 'Mumbai', 'Hyderabad', 'Chennai', 'Delhi', 'Pune', 'Kolkata', 'Pan India'];
const EVENT_TYPES = [
    'NOTIFICATION', 'REG_START', 'REG_END', 'EXAM_DATE', 'RESULT', 'INTERVIEW', 'DOC_VERIFICATION', 'OTHER',
] as const;

type OpType = typeof OPPORTUNITY_TYPES[number];
type SalaryPeriod = typeof SALARY_PERIODS[number];

// ── Main Screen ────────────────────────────────────────────────────────────────

export const PostOpportunityScreen = ({ route, navigation }: any) => {
    const opportunityId = route.params?.opportunityId as string | undefined;
    const isEditing = !!opportunityId;

    // Core
    const [type, setType] = useState<OpType>('JOB');
    const [status, setStatus] = useState<string>('DRAFT');
    const [title, setTitle] = useState('');
    const [company, setCompany] = useState('');
    const [companyWebsite, setCompanyWebsite] = useState('');
    const [description, setDescription] = useState('');

    // Links
    const [sourceLink, setSourceLink] = useState('');
    const [applyLink, setApplyLink] = useState('');

    // Location
    const [locationInput, setLocationInput] = useState('');
    const [workMode, setWorkMode] = useState<string>('ONSITE');

    // Education
    const [selectedDegrees, setSelectedDegrees] = useState<string[]>([]);
    const [selectedYears, setSelectedYears] = useState<number[]>([]);

    // Skills
    const [skills, setSkills] = useState('');

    // Salary
    const [salaryRange, setSalaryRange] = useState('');
    const [salaryPeriod, setSalaryPeriod] = useState<SalaryPeriod>('YEARLY');

    // Experience
    const [expMin, setExpMin] = useState('');
    const [expMax, setExpMax] = useState('');

    // Job-specifics
    const [jobFunction, setJobFunction] = useState('');
    const [employmentType, setEmploymentType] = useState('');
    const [incentives, setIncentives] = useState('');
    const [selectionProcess, setSelectionProcess] = useState('');
    const [notesHighlights, setNotesHighlights] = useState('');
    const [expiresAt, setExpiresAt] = useState('');

    // Walk-in specifics
    const [venueAddress, setVenueAddress] = useState('');
    const [venueLink, setVenueLink] = useState('');
    const [walkInDate, setWalkInDate] = useState('');
    const [walkInEndDate, setWalkInEndDate] = useState('');
    const [walkInTime, setWalkInTime] = useState('');
    const [requiredDocuments, setRequiredDocuments] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [contactPhone, setContactPhone] = useState('');

    // UI state
    const [loading, setLoading] = useState(isEditing);
    const [saving, setSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    // Parse modal
    const [showParseModal, setShowParseModal] = useState(false);
    const [parseMode, setParseMode] = useState<'url' | 'json' | 'text'>('url');
    const [parseInput, setParseInput] = useState('');
    const [parsing, setParsing] = useState(false);

    // ── Dirty guard ──────────────────────────────────────────────────────────────
    useEffect(() => {
        const unsub = navigation.addListener('beforeRemove', (e: any) => {
            if (!isDirty || saving) return;
            e.preventDefault();
            Alert.alert('Discard changes?', 'You have unsaved changes.', [
                { text: 'Keep Editing', style: 'cancel' },
                { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
            ]);
        });
        return unsub;
    }, [navigation, isDirty, saving]);

    useEffect(() => {
        if (isEditing) void fetchOpportunity();
    }, [opportunityId]);

    // ── Load existing ────────────────────────────────────────────────────────────
    const fetchOpportunity = async () => {
        try {
            const data = await Opportunities.get(opportunityId!);
            fillForm(data.opportunity as any);
        } catch {
            toast.error('Failed to load opportunity');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const fillForm = (o: any) => {
        setType(o.type || 'JOB');
        setStatus(o.status || 'DRAFT');
        setTitle(o.title || '');
        setCompany(o.company || '');
        setCompanyWebsite(o.companyWebsite || '');
        setDescription(o.description || '');
        setSourceLink(o.sourceLink || '');
        setApplyLink(o.applyLink || '');
        setLocationInput(Array.isArray(o.locations) ? o.locations.join(', ') : '');
        setWorkMode(o.workMode || 'ONSITE');
        setSelectedDegrees(Array.isArray(o.allowedDegrees) ? o.allowedDegrees : []);
        setSelectedYears(Array.isArray(o.allowedPassoutYears) ? o.allowedPassoutYears : []);
        setSkills(Array.isArray(o.requiredSkills) ? o.requiredSkills.join(', ') : '');
        setSalaryRange(o.salaryRange || '');
        setSalaryPeriod(o.salaryPeriod || 'YEARLY');
        setExpMin(o.experienceMin?.toString() || '');
        setExpMax(o.experienceMax?.toString() || '');
        setJobFunction(o.jobFunction || '');
        setEmploymentType(o.employmentType || '');
        setIncentives(o.incentives || '');
        setSelectionProcess(o.selectionProcess || '');
        setNotesHighlights(o.notesHighlights || '');
        if (o.expiresAt) setExpiresAt(new Date(o.expiresAt).toISOString().slice(0, 10));
        // Walk-in
        const wd = o.walkInDetails;
        if (wd) {
            setVenueAddress(wd.venueAddress || '');
            setVenueLink(wd.venueLink || '');
            setWalkInTime(wd.timeRange || wd.reportingTime || '');
            setRequiredDocuments((wd.requiredDocuments || []).join(', '));
            setContactPerson(wd.contactPerson || '');
            setContactPhone(wd.contactPhone || '');
            if (Array.isArray(wd.dates) && wd.dates.length) {
                const sorted = [...wd.dates].sort((a: string, b: string) =>
                    new Date(a).getTime() - new Date(b).getTime()
                );
                setWalkInDate(sorted[0].slice(0, 10));
                if (sorted.length > 1) setWalkInEndDate(sorted[sorted.length - 1].slice(0, 10));
            }
        }
    };

    const markDirty = useCallback(<T,>(setter: (v: T) => void) => (v: T) => {
        setter(v);
        setIsDirty(true);
    }, []);

    const toggle = <T,>(list: T[], setList: (v: T[]) => void, item: T) => {
        setIsDirty(true);
        setList(list.includes(item) ? list.filter(i => i !== item) : [...list, item]);
    };

    // ── Parse / auto-fill ────────────────────────────────────────────────────────
    const handleParse = async () => {
        const val = parseInput.trim();
        if (!val) { Alert.alert('Required', 'Enter a value to parse'); return; }
        setParsing(true);
        try {
            if (parseMode === 'url') {
                const res = await Opportunities.parse(val) as any;
                if (!res.draft) throw new Error('No data returned');
                fillForm(res.draft);
                setIsDirty(true);
                setShowParseModal(false);
                setParseInput('');
                toast.success('Parsed ✓', 'Form filled from URL');
            } else if (parseMode === 'json') {
                const data = JSON.parse(val);
                fillForm(data);
                setIsDirty(true);
                setShowParseModal(false);
                setParseInput('');
                toast.success('Applied ✓', 'Form filled from JSON');
            } else {
                // text → call parse text endpoint
                const res = await Opportunities.parseText(val) as any;
                if (res.parsed) {
                    fillForm(res.parsed);
                    setIsDirty(true);
                    setShowParseModal(false);
                    setParseInput('');
                    Alert.alert('Parsed ✓', 'Form filled from text');
                } else throw new Error('Nothing extracted');
            }
        } catch (e) {
            toast.error('Parse failed', e instanceof Error ? e.message : 'Could not parse');
        } finally {
            setParsing(false);
        }
    };

    // ── Save ─────────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        if (!title.trim() || !company.trim()) {
            Alert.alert('Required', 'Title and Company are required.');
            return;
        }
        if (type !== 'WALKIN' && !sourceLink.trim() && !applyLink.trim()) {
            Alert.alert('Required', 'Add at least one Source or Apply URL.');
            return;
        }
        setSaving(true);
        try {
            const locations = locationInput.split(',').map(s => s.trim()).filter(Boolean);
            const requiredSkills = skills.split(',').map(s => s.trim()).filter(Boolean);

            const payload: Record<string, unknown> = {
                title: title.trim(),
                company: company.trim(),
                type,
                status,
                workMode,
                locations: locations.length ? locations : ['Remote'],
                allowedDegrees: selectedDegrees,
                allowedPassoutYears: selectedYears,
                requiredSkills,
            };

            if (companyWebsite.trim()) payload.companyWebsite = companyWebsite.trim();
            if (description.trim()) payload.description = description.trim();
            if (sourceLink.trim()) payload.sourceLink = sourceLink.trim();
            if (applyLink.trim()) payload.applyLink = applyLink.trim();
            else if (sourceLink.trim()) payload.applyLink = sourceLink.trim(); // fallback
            if (salaryRange.trim()) payload.salaryRange = salaryRange.trim();
            payload.salaryPeriod = salaryPeriod;
            if (expMin) payload.experienceMin = Number(expMin);
            if (expMax) payload.experienceMax = Number(expMax);
            if (jobFunction.trim()) payload.jobFunction = jobFunction.trim();
            if (employmentType.trim()) payload.employmentType = employmentType.trim();
            if (incentives.trim()) payload.incentives = incentives.trim();
            if (selectionProcess.trim()) payload.selectionProcess = selectionProcess.trim();
            if (notesHighlights.trim()) payload.notesHighlights = notesHighlights.trim();
            if (expiresAt) payload.expiresAt = new Date(expiresAt).toISOString();

            if (type === 'WALKIN') {
                const dates: string[] = [];
                if (walkInDate) {
                    const d = new Date(walkInDate);
                    const end = walkInEndDate ? new Date(walkInEndDate) : d;
                    const cur = new Date(d);
                    while (cur <= end) { dates.push(cur.toISOString()); cur.setDate(cur.getDate() + 1); }
                }
                payload.walkInDetails = {
                    venueAddress: venueAddress.trim(),
                    venueLink: venueLink.trim() || undefined,
                    timeRange: walkInTime.trim() || undefined,
                    dates,
                    requiredDocuments: requiredDocuments.split(',').map(s => s.trim()).filter(Boolean),
                    contactPerson: contactPerson.trim() || undefined,
                    contactPhone: contactPhone.trim() || undefined,
                };
            }

            if (isEditing) {
                await Opportunities.update(opportunityId!, payload);
                toast.success('Saved', 'Opportunity updated.');
            } else {
                await Opportunities.create(payload);
                toast.success('Posted', 'Opportunity created.');
            }
            setIsDirty(false);
            await AsyncStorage.removeItem(ADMIN_OPPORTUNITIES_CACHE_KEY);
            navigation.goBack();
        } catch (e) {
            toast.error('Save failed', e instanceof Error ? e.message : 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return (
        <View style={styles.loader}><ActivityIndicator size="large" color={theme.colors.primary} /></View>
    );

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
                        <Chip key={s} label={s} active={status === s}
                            onPress={() => { setStatus(s); setIsDirty(true); }}
                            activeColor={s === 'PUBLISHED' ? theme.colors.success : s === 'ARCHIVED' ? theme.colors.textMuted : theme.colors.accent} />
                    ))}
                </ChipRow>

                {/* Type */}
                <Label>Opportunity Type</Label>
                <ChipRow>
                    {OPPORTUNITY_TYPES.map(t => (
                        <Chip key={t} label={t} active={type === t} onPress={() => { setType(t); setIsDirty(true); }} />
                    ))}
                </ChipRow>

                {/* Core */}
                <Label>Job Title *</Label>
                <Input placeholder="e.g. Software Engineer" value={title} onChangeText={markDirty(setTitle)} />

                <Label>Company *</Label>
                <Input placeholder="e.g. Google" value={company} onChangeText={markDirty(setCompany)} />

                <Label>Company Website</Label>
                <Input placeholder="https://company.com" value={companyWebsite} onChangeText={markDirty(setCompanyWebsite)} url />

                {/* Links */}
                <Label>Source Link (job listing page)</Label>
                <Input placeholder="https://company.com/jobs/engineer" value={sourceLink} onChangeText={markDirty(setSourceLink)} url />

                <Label>Apply Link (direct apply URL)</Label>
                <Input placeholder="https://company.com/apply/…" value={applyLink} onChangeText={markDirty(setApplyLink)} url />

                {/* Location */}
                <Label>Locations (comma separated)</Label>
                <Input placeholder="Remote, Bengaluru, Mumbai" value={locationInput} onChangeText={markDirty(setLocationInput)} />
                <View style={styles.quickLocRow}>
                    {QUICK_LOCATIONS.map(l => (
                        <TouchableOpacity key={l} style={styles.quickLoc}
                            onPress={() => {
                                if (locationInput.toLowerCase().includes(l.toLowerCase())) return;
                                markDirty(setLocationInput)(locationInput ? `${locationInput}, ${l}` : l);
                            }}>
                            <Text style={styles.quickLocText}>{l}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Work mode */}
                <Label>Work Mode</Label>
                <ChipRow>
                    {WORK_MODES.map(m => (
                        <Chip key={m} label={m} active={workMode === m} onPress={() => { setWorkMode(m); setIsDirty(true); }} />
                    ))}
                </ChipRow>

                {/* Education */}
                <Label>Eligible Degrees</Label>
                <ChipRow wrap>
                    {DEGREES.map(d => (
                        <Chip key={d} label={d} active={selectedDegrees.includes(d)} onPress={() => toggle(selectedDegrees, setSelectedDegrees, d)} />
                    ))}
                </ChipRow>

                <Label>Eligible Passout Years</Label>
                <ChipRow wrap>
                    {PASS_YEARS.map(y => (
                        <Chip key={y} label={String(y)} active={selectedYears.includes(y)} onPress={() => toggle(selectedYears, setSelectedYears, y)} />
                    ))}
                </ChipRow>

                {/* Skills */}
                <Label>Required Skills (comma separated)</Label>
                <Input placeholder="React, Node.js, SQL" value={skills} onChangeText={markDirty(setSkills)} />

                {/* Salary */}
                <Label>Salary / CTC Range</Label>
                <Input placeholder={salaryPeriod === 'YEARLY' ? 'e.g. 4-8 LPA' : 'e.g. 25000-50000 /month'} value={salaryRange} onChangeText={markDirty(setSalaryRange)} />
                <Label>Salary Period</Label>
                <ChipRow>
                    {SALARY_PERIODS.map(p => (
                        <Chip key={p} label={p} active={salaryPeriod === p} onPress={() => { setSalaryPeriod(p); setIsDirty(true); }} />
                    ))}
                </ChipRow>

                {/* Experience */}
                <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                        <Label>Exp Min (yrs)</Label>
                        <Input placeholder="0" value={expMin} onChangeText={markDirty(setExpMin)} numeric />
                    </View>
                    <View style={{ width: 12 }} />
                    <View style={{ flex: 1 }}>
                        <Label>Exp Max (yrs)</Label>
                        <Input placeholder="3" value={expMax} onChangeText={markDirty(setExpMax)} numeric />
                    </View>
                </View>

                {/* Job specifics */}
                <Label>Job Function</Label>
                <Input placeholder="e.g. Engineering, Finance" value={jobFunction} onChangeText={markDirty(setJobFunction)} />

                <Label>Employment Type</Label>
                <Input placeholder="Full-time, Contract, Part-time" value={employmentType} onChangeText={markDirty(setEmploymentType)} />

                <Label>Incentives / Perks</Label>
                <Input placeholder="Health insurance, ESOPs…" value={incentives} onChangeText={markDirty(setIncentives)} />

                <Label>Selection Process</Label>
                <Input placeholder="Online test → Interview → HR round" value={selectionProcess} onChangeText={markDirty(setSelectionProcess)} />

                <Label>Notes / Highlights</Label>
                <Input placeholder="Important notes for freshers…" value={notesHighlights} onChangeText={markDirty(setNotesHighlights)} multiline />

                {/* Walk-in specific */}
                {type === 'WALKIN' && (
                    <>
                        <SectionHeader>Walk-in Details</SectionHeader>

                        <Label>Venue Address *</Label>
                        <Input placeholder="Building, Street, City" value={venueAddress} onChangeText={markDirty(setVenueAddress)} multiline />

                        <Label>Venue / Maps Link</Label>
                        <Input placeholder="https://maps.google.com/…" value={venueLink} onChangeText={markDirty(setVenueLink)} url />

                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <Label>Start Date</Label>
                                <Input placeholder="YYYY-MM-DD" value={walkInDate} onChangeText={markDirty(setWalkInDate)} />
                            </View>
                            <View style={{ width: 12 }} />
                            <View style={{ flex: 1 }}>
                                <Label>End Date</Label>
                                <Input placeholder="YYYY-MM-DD" value={walkInEndDate} onChangeText={markDirty(setWalkInEndDate)} />
                            </View>
                        </View>

                        <Label>Time Range</Label>
                        <Input placeholder="10:00 AM – 1:00 PM" value={walkInTime} onChangeText={markDirty(setWalkInTime)} />

                        <Label>Required Documents (comma separated)</Label>
                        <Input placeholder="Resume, Aadhar, Offer letter" value={requiredDocuments} onChangeText={markDirty(setRequiredDocuments)} />

                        <Label>Contact Person</Label>
                        <Input placeholder="HR Name" value={contactPerson} onChangeText={markDirty(setContactPerson)} />

                        <Label>Contact Phone</Label>
                        <Input placeholder="+91 98765 43210" value={contactPhone} onChangeText={markDirty(setContactPhone)} numeric />
                    </>
                )}

                {/* Expiry */}
                <Label>Expires On (YYYY-MM-DD)</Label>
                <Input placeholder="e.g. 2025-06-30" value={expiresAt} onChangeText={markDirty(setExpiresAt)} />

                {/* Description */}
                <Label>Description / JD</Label>
                <TextInput
                    style={[styles.input, { height: 160 }]}
                    placeholder="Full job description…"
                    placeholderTextColor={theme.colors.textMuted}
                    multiline
                    textAlignVertical="top"
                    value={description}
                    onChangeText={v => { setDescription(v); setIsDirty(true); }}
                />

                {/* Save */}
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.65 }]} onPress={handleSave} disabled={saving}>
                    {saving
                        ? <ActivityIndicator color="#fff" />
                        : <Text style={styles.saveBtnText}>{isEditing ? 'Save Changes' : 'Post Opportunity'}</Text>}
                </TouchableOpacity>
                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Auto-fill Modal */}
            <Modal visible={showParseModal} transparent animationType="slide" onRequestClose={() => setShowParseModal(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modal}>
                        <Text style={styles.modalTitle}>Auto-fill Form</Text>

                        {/* Mode picker */}
                        <View style={styles.modeRow}>
                            {(['url', 'json', 'text'] as const).map(m => (
                                <TouchableOpacity
                                    key={m}
                                    style={[styles.modeBtn, parseMode === m && styles.modeBtnActive]}
                                    onPress={() => { setParseMode(m); setParseInput(''); }}>
                                    <Text style={[styles.modeBtnText, parseMode === m && { color: '#fff' }]}>
                                        {m === 'url' ? '🔗 URL' : m === 'json' ? '{ } JSON' : '📝 Text'}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.modalSub}>
                            {parseMode === 'url'
                                ? 'Paste the job posting URL — AI extracts all fields.'
                                : parseMode === 'json'
                                    ? 'Paste a JSON payload — maps directly to the form.'
                                    : 'Paste job description text — AI parses and fills fields.'}
                        </Text>

                        <TextInput
                            style={[styles.modalInput, parseMode !== 'url' && { height: 160 }]}
                            placeholder={
                                parseMode === 'url' ? 'https://company.com/jobs/…'
                                    : parseMode === 'json' ? '{ "title": "...", "company": "..." }'
                                        : 'Paste full job description here…'
                            }
                            placeholderTextColor={theme.colors.textMuted}
                            value={parseInput}
                            onChangeText={setParseInput}
                            autoCapitalize="none"
                            keyboardType={parseMode === 'url' ? 'url' : 'default'}
                            multiline={parseMode !== 'url'}
                            textAlignVertical={parseMode !== 'url' ? 'top' : 'center'}
                            autoFocus
                        />

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setShowParseModal(false); setParseInput(''); }}>
                                <Text style={styles.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.parseBtn, parsing && { opacity: 0.6 }]} onPress={handleParse} disabled={parsing}>
                                {parsing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.parseBtnText}>Apply</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

// ── Helpers ────────────────────────────────────────────────────────────────────

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

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background },
    container: { flex: 1, backgroundColor: theme.colors.background },
    form: { padding: 20, paddingBottom: 40 },
    label: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, marginTop: 16 },
    sectionHeader: { fontSize: 15, fontWeight: '800', color: theme.colors.primary, marginTop: 24, marginBottom: 4, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 16 },
    input: {
        backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border,
        borderRadius: 10, padding: 13, fontSize: 15, color: theme.colors.text,
    },
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
    // Banner
    parseBanner: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: theme.colors.primary + '15', borderRadius: 12,
        padding: 14, borderWidth: 1, borderColor: theme.colors.primary + '30', marginBottom: 4,
    },
    parseBannerIcon: { fontSize: 20 },
    parseBannerTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },
    parseBannerSub: { fontSize: 12, color: theme.colors.textMuted, marginTop: 1 },
    parseBannerArrow: { fontSize: 22, color: theme.colors.primary },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' },
    modal: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
    modalTitle: { fontSize: 17, fontWeight: '800', color: theme.colors.text, marginBottom: 12 },
    modeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    modeBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center' },
    modeBtnActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
    modeBtnText: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted },
    modalSub: { fontSize: 13, color: theme.colors.textMuted, marginBottom: 12 },
    modalInput: { backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, padding: 12, fontSize: 14, color: theme.colors.text, marginBottom: 16 },
    modalActions: { flexDirection: 'row', gap: 10 },
    cancelBtn: { flex: 1, backgroundColor: theme.colors.background, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border, padding: 13, alignItems: 'center' },
    cancelBtnText: { fontWeight: '700', color: theme.colors.textMuted },
    parseBtn: { flex: 2, backgroundColor: theme.colors.primary, borderRadius: 10, padding: 13, alignItems: 'center' },
    parseBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
