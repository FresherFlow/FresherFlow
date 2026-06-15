import React, { memo } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    StatusBar,
    Platform,
    KeyboardAvoidingView,
    Modal,
    Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, UserCircle2, Pencil, MapPin } from 'lucide-react-native';
import { Controller } from 'react-hook-form';
import * as Haptics from 'expo-haptics';

import { useTheme, AppTheme } from '@/contexts/ThemeContext';
import { Screen } from '@/system/layout/Layout';
import { SecondaryHeader, SurfaceCard } from '@/system/components/PremiumPrimitives';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { useEditDemographics } from '@/hooks/useEditDemographics';
import { useProfile } from '@/hooks/useProfile';

type Props = NativeStackScreenProps<RootStackParamList, 'EditDemographics'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const GENDER_OPTIONS = [
    { label: 'Male', value: 'MALE' },
    { label: 'Female', value: 'FEMALE' },
    { label: 'Other', value: 'OTHER' },
];

const CATEGORY_OPTIONS = [
    { label: 'General', value: 'GENERAL' },
    { label: 'OBC (Non-Creamy Layer)', value: 'OBC' },
    { label: 'SC', value: 'SC' },
    { label: 'ST', value: 'ST' },
    { label: 'EWS', value: 'EWS' },
];

const YEARS = Array.from({ length: 70 }, (_, i) => String(2018 - i));

const MONTHS = [
    { label: 'January', value: '01' },
    { label: 'February', value: '02' },
    { label: 'March', value: '03' },
    { label: 'April', value: '04' },
    { label: 'May', value: '05' },
    { label: 'June', value: '06' },
    { label: 'July', value: '07' },
    { label: 'August', value: '08' },
    { label: 'September', value: '09' },
    { label: 'October', value: '10' },
    { label: 'November', value: '11' },
    { label: 'December', value: '12' },
];

const DAYS = Array.from({ length: 31 }, (_, i) => {
    const d = String(i + 1).padStart(2, '0');
    return { label: String(i + 1), value: d };
});

const INDIAN_STATES = [
    'Andaman & Nicobar Islands',
    'Andhra Pradesh',
    'Arunachal Pradesh',
    'Assam',
    'Bihar',
    'Chandigarh',
    'Chhattisgarh',
    'Dadra & Nagar Haveli and Daman & Diu',
    'Delhi',
    'Goa',
    'Gujarat',
    'Haryana',
    'Himachal Pradesh',
    'Jammu & Kashmir',
    'Jharkhand',
    'Karnataka',
    'Kerala',
    'Ladakh',
    'Lakshadweep',
    'Madhya Pradesh',
    'Maharashtra',
    'Manipur',
    'Meghalaya',
    'Mizoram',
    'Nagaland',
    'Odisha',
    'Puducherry',
    'Punjab',
    'Rajasthan',
    'Sikkim',
    'Tamil Nadu',
    'Telangana',
    'Tripura',
    'Uttar Pradesh',
    'Uttarakhand',
    'West Bengal'
];

// ─── Local DropdownSelector ───────────────────────────────────────────────────

type DropdownOption = { label: string; value: string };

const DropdownSelector = ({
    label,
    value,
    options,
    onSelect,
    currentTheme,
    error,
    hideLabel,
    placeholder,
    containerStyle,
    customDisplayValue,
}: {
    label: string;
    value: string;
    options: DropdownOption[] | string[];
    onSelect: (val: string) => void;
    currentTheme: AppTheme;
    error?: string;
    hideLabel?: boolean;
    placeholder?: string;
    containerStyle?: any;
    customDisplayValue?: string;
}) => {
    const [visible, setVisible] = React.useState(false);

    const getLabel = (v: string): string => {
        const match = (options as DropdownOption[]).find(o => typeof o === 'object' && o.value === v);
        return match ? match.label : v;
    };

    const displayValue = customDisplayValue || (value ? getLabel(value) : '');

    return (
        <View style={[{ marginBottom: 16, marginTop: 8 }, containerStyle]}>
            {!hideLabel && <Text style={[styles.label, { color: currentTheme.colors.textMuted }]}>{label}</Text>}
            <TouchableOpacity
                style={[
                    styles.input,
                    {
                        justifyContent: 'center',
                        backgroundColor: alpha(currentTheme.colors.text, 0.03),
                        borderColor: error ? currentTheme.colors.error : alpha(currentTheme.colors.border, 0.1),
                    },
                    hideLabel && { paddingHorizontal: 8 },
                ]}
                onPress={() => setVisible(true)}
            >
                <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={{
                        color: displayValue ? currentTheme.colors.text : alpha(currentTheme.colors.textMuted, 0.4),
                        fontSize: 15,
                        fontWeight: '600',
                    }}
                >
                    {displayValue || placeholder || `Select ${label}`}
                </Text>
            </TouchableOpacity>
            {error && <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>{error}</Text>}
            <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
                <Pressable style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: currentTheme.colors.blackOverlay }} onPress={() => setVisible(false)}>
                    <Pressable style={{ backgroundColor: currentTheme.colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '60%' }}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: currentTheme.colors.text, marginBottom: 16 }}>Select {label}</Text>
                        <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false}>
                            {(options as (DropdownOption | string)[]).map((item) => {
                                const itemValue = typeof item === 'object' ? item.value : item;
                                const itemLabel = typeof item === 'object' ? item.label : item;
                                return (
                                    <TouchableOpacity
                                        key={itemValue}
                                        style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: alpha(currentTheme.colors.border, 0.1) }}
                                        onPress={() => { onSelect(itemValue); setVisible(false); }}
                                    >
                                        <Text style={{ fontSize: 16, color: currentTheme.colors.text }}>{itemLabel}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                        <TouchableOpacity style={{ marginTop: 16, alignItems: 'center', paddingVertical: 16 }} onPress={() => setVisible(false)}>
                            <Text style={{ color: currentTheme.colors.textMuted, fontWeight: '700' }}>Cancel</Text>
                        </TouchableOpacity>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
};

// ─── ToggleRow ────────────────────────────────────────────────────────────────

const ToggleRow = ({
    label,
    description,
    value,
    onToggle,
    currentTheme,
}: {
    label: string;
    description: string;
    value: boolean;
    onToggle: () => void;
    currentTheme: AppTheme;
}) => (
    <TouchableOpacity
        activeOpacity={0.8}
        style={[
            styles.toggleRow,
            {
                borderColor: alpha(currentTheme.colors.border, 0.1),
                backgroundColor: value ? alpha(currentTheme.colors.primary, 0.05) : alpha(currentTheme.colors.text, 0.03),
            },
        ]}
        onPress={onToggle}
    >
        <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: currentTheme.colors.text }}>{label}</Text>
            <Text style={{ fontSize: 12, color: currentTheme.colors.textMuted, marginTop: 2 }}>{description}</Text>
        </View>
        <View
            style={[
                styles.checkbox,
                { borderColor: value ? currentTheme.colors.primary : alpha(currentTheme.colors.border, 0.2) },
                value && { backgroundColor: currentTheme.colors.primary },
            ]}
        >
            {value && <Check size={12} color={currentTheme.colors.background} strokeWidth={4} />}
        </View>
    </TouchableOpacity>
);

const formatDob = (dob: Date | string | null | undefined): string => {
    if (!dob) return 'Not set';
    try {
        return new Date(dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
    } catch {
        return String(dob);
    }
};

// ─── PersonalDetailsView (read-only card for CareerProfileScreen) ─────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const PersonalDetailsView = ({ onEdit, currentTheme }: { onEdit: () => void; currentTheme: AppTheme }) => {
    const { profile } = useProfile();

    const getGenderLabel = (g: string | null | undefined): string => {
        if (!g) return 'Not set';
        return GENDER_OPTIONS.find(o => o.value === g)?.label ?? g;
    };

    const getCategoryLabel = (c: string | null | undefined): string => {
        if (!c) return 'Not set';
        return CATEGORY_OPTIONS.find(o => o.value === c)?.label ?? c;
    };

    const hasDemographics = !!(profile?.dob || profile?.gender || profile?.category || profile?.homeState);

    return (
        <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
            <SurfaceCard style={{ padding: 24, borderRadius: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: hasDemographics ? 24 : 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <UserCircle2 size={20} color={currentTheme.colors.primary} />
                        <Text style={{ fontSize: 18, fontWeight: '900', color: currentTheme.colors.text }}>Personal Details</Text>
                    </View>
                    <TouchableOpacity
                        onPress={onEdit}
                        activeOpacity={0.7}
                        style={{ padding: 8, backgroundColor: alpha(currentTheme.colors.primary, 0.1), borderRadius: 12, marginTop: -4 }}
                    >
                        <Pencil size={16} color={currentTheme.colors.primary} />
                    </TouchableOpacity>
                </View>

                {hasDemographics ? (
                    <>
                        {/* DOB + Gender row */}
                        <View style={{ flexDirection: 'row', gap: 40, marginBottom: 20 }}>
                            <View>
                                <Text style={[styles.viewFieldLabel, { color: currentTheme.colors.textMuted, marginBottom: 6 }]}>Date of Birth</Text>
                                <Text style={[styles.viewFieldValue, { color: currentTheme.colors.text }]}>{formatDob(profile?.dob)}</Text>
                            </View>
                            <View>
                                <Text style={[styles.viewFieldLabel, { color: currentTheme.colors.textMuted, marginBottom: 6 }]}>Gender</Text>
                                <Text style={[styles.viewFieldValue, { color: currentTheme.colors.text }]}>{getGenderLabel(profile?.gender)}</Text>
                            </View>
                        </View>

                        {/* Category */}
                        <View style={{ marginBottom: 20 }}>
                            <Text style={[styles.viewFieldLabel, { color: currentTheme.colors.textMuted, marginBottom: 6 }]}>Reservation Category</Text>
                            <Text style={[styles.viewFieldValue, { color: currentTheme.colors.text }]}>{getCategoryLabel(profile?.category)}</Text>
                        </View>

                        {/* Home State */}
                        {profile?.homeState && (
                            <View style={{ marginBottom: 20 }}>
                                <Text style={[styles.viewFieldLabel, { color: currentTheme.colors.textMuted, marginBottom: 6 }]}>Home State</Text>
                                <Text style={[styles.viewFieldValue, { color: currentTheme.colors.text }]}>{profile.homeState}</Text>
                            </View>
                        )}

                        {/* PwBD + Ex-Servicemen chips */}
                        <View style={{ flexDirection: 'row', gap: 10, paddingTop: 16, borderTopWidth: 1, borderTopColor: alpha(currentTheme.colors.border, 0.08) }}>
                            <View style={[styles.chip, { borderColor: profile?.isPwBD ? currentTheme.colors.primary : alpha(currentTheme.colors.border, 0.1), backgroundColor: profile?.isPwBD ? alpha(currentTheme.colors.primary, 0.08) : alpha(currentTheme.colors.text, 0.03) }]}>
                                <Text style={[styles.chipText, { color: profile?.isPwBD ? currentTheme.colors.primary : currentTheme.colors.textMuted }]}>
                                    PwBD: {profile?.isPwBD ? 'Yes' : 'No'}
                                </Text>
                            </View>
                            <View style={[styles.chip, { borderColor: profile?.isExServicemen ? currentTheme.colors.primary : alpha(currentTheme.colors.border, 0.1), backgroundColor: profile?.isExServicemen ? alpha(currentTheme.colors.primary, 0.08) : alpha(currentTheme.colors.text, 0.03) }]}>
                                <Text style={[styles.chipText, { color: profile?.isExServicemen ? currentTheme.colors.primary : currentTheme.colors.textMuted }]}>
                                    Ex-Serviceman: {profile?.isExServicemen ? 'Yes' : 'No'}
                                </Text>
                            </View>
                        </View>
                    </>
                ) : (
                    <TouchableOpacity
                        onPress={onEdit}
                        activeOpacity={0.8}
                        style={{ marginTop: 16, alignItems: 'center', paddingVertical: 14, backgroundColor: alpha(currentTheme.colors.text, 0.02), borderRadius: 16, borderWidth: 1, borderColor: alpha(currentTheme.colors.border, 0.05) }}
                    >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: currentTheme.colors.textMuted }}>Add personal details</Text>
                    </TouchableOpacity>
                )}
            </SurfaceCard>
        </View>
    );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const EditDemographicsScreen: React.FC<Props> = memo(({ navigation }: Props) => {
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();
    const { control, onSave, saving, saved, errors } = useEditDemographics();

    const handleSave = async () => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await onSave();
        navigation.goBack();
    };

    return (
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                {/* Sticky header */}
                <View style={[styles.stickyHeader, { paddingTop: insets.top + 10 }]}>
                    <SecondaryHeader
                        title="Personal Details"
                        onBack={() => navigation.goBack()}
                        rightSlot={
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => { void handleSave(); }}
                                disabled={saving}
                                style={[styles.saveBtn, { backgroundColor: saving ? alpha(currentTheme.colors.primary, 0.5) : currentTheme.colors.primary }]}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color={currentTheme.colors.background} />
                                ) : saved ? (
                                    <Check size={16} color={currentTheme.colors.background} strokeWidth={3} />
                                ) : (
                                    <Text style={[styles.saveBtnText, { color: currentTheme.colors.background }]}>Save</Text>
                                )}
                            </TouchableOpacity>
                        }
                    />
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.content}>
                        {/* Hero Section - Description Only (removes duplication of Personal Details title) */}
                        <View style={{ marginTop: 20, marginBottom: 24 }}>
                            <Text style={[styles.heroSub, { color: currentTheme.colors.textMuted }]}>
                                Add your details to help verify your profile and check eligibility for public roles.
                            </Text>
                        </View>

                        {/* Personal Details */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <UserCircle2 size={16} color={currentTheme.colors.primary} />
                                <Text style={[styles.sectionLabel, { color: currentTheme.colors.textMuted }]}>Personal</Text>
                            </View>
                            <SurfaceCard style={styles.card}>
                                {/* DOB Selector Input */}
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, { color: currentTheme.colors.textMuted }]}>Date of Birth</Text>
                                    <Controller
                                        control={control}
                                        name="dob"
                                        render={({ field: { onChange, value } }) => {
                                            const currentVal = value && value.length === 10 ? value : '';
                                            const parts = currentVal.split('-');
                                            
                                            // Local states for year, month, day initialized from the controller's value
                                            const [selYear, setSelYear] = React.useState(parts[0] || '');
                                            const [selMonth, setSelMonth] = React.useState(parts[1] || '');
                                            const [selDay, setSelDay] = React.useState(parts[2] || '');

                                            // Sync local states if the value changes from the outside (e.g. on form reset)
                                            React.useEffect(() => {
                                                const p = (value && value.length === 10) ? value.split('-') : ['', '', ''];
                                                setSelYear(p[0]);
                                                setSelMonth(p[1]);
                                                setSelDay(p[2]);
                                            }, [value]);

                                            const updateDob = (y: string, m: string, d: string) => {
                                                setSelYear(y);
                                                setSelMonth(m);
                                                setSelDay(d);
                                                if (y && m && d) {
                                                    onChange(`${y}-${m}-${d}`);
                                                } else {
                                                    onChange('');
                                                }
                                            };

                                            const handleSelectYear = (y: string) => {
                                                updateDob(y, selMonth, selDay);
                                            };

                                            const handleSelectMonth = (m: string) => {
                                                updateDob(selYear, m, selDay);
                                            };

                                            const handleSelectDay = (d: string) => {
                                                updateDob(selYear, selMonth, d);
                                            };

                                            // Format month label abbreviation
                                            const selectedMonthLabel = MONTHS.find(m => m.value === selMonth)?.label;
                                            const shortMonthLabel = selectedMonthLabel ? selectedMonthLabel.substring(0, 3) : '';

                                            return (
                                                <View>
                                                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                                                        <View style={{ flex: 1 }}>
                                                            <DropdownSelector
                                                                label="Day"
                                                                value={selDay}
                                                                options={DAYS}
                                                                onSelect={handleSelectDay}
                                                                currentTheme={currentTheme}
                                                                hideLabel={true}
                                                                placeholder="Day"
                                                                containerStyle={{ marginVertical: 0 }}
                                                            />
                                                        </View>
                                                        <View style={{ flex: 1.5 }}>
                                                            <DropdownSelector
                                                                label="Month"
                                                                value={selMonth}
                                                                options={MONTHS}
                                                                onSelect={handleSelectMonth}
                                                                currentTheme={currentTheme}
                                                                hideLabel={true}
                                                                placeholder="Month"
                                                                customDisplayValue={shortMonthLabel}
                                                                containerStyle={{ marginVertical: 0 }}
                                                            />
                                                        </View>
                                                        <View style={{ flex: 1.2 }}>
                                                            <DropdownSelector
                                                                label="Year"
                                                                value={selYear}
                                                                options={YEARS}
                                                                onSelect={handleSelectYear}
                                                                currentTheme={currentTheme}
                                                                hideLabel={true}
                                                                placeholder="Year"
                                                                containerStyle={{ marginVertical: 0 }}
                                                            />
                                                        </View>
                                                    </View>
                                                    {errors.dob && <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>{errors.dob.message}</Text>}
                                                </View>
                                            );
                                        }}
                                    />
                                </View>

                                {/* Gender */}
                                <Controller
                                    control={control}
                                    name="gender"
                                    render={({ field: { onChange, value } }) => (
                                        <DropdownSelector
                                            label="Gender"
                                            value={value}
                                            options={GENDER_OPTIONS}
                                            onSelect={(val) => {
                                                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                onChange(val);
                                            }}
                                            currentTheme={currentTheme}
                                            error={errors.gender?.message}
                                        />
                                    )}
                                />
                            </SurfaceCard>
                        </View>

                        {/* Category */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <UserCircle2 size={16} color={currentTheme.colors.primary} />
                                <Text style={[styles.sectionLabel, { color: currentTheme.colors.textMuted }]}>Reservation (Government Jobs Only)</Text>
                            </View>
                            <SurfaceCard style={styles.card}>
                                <Text style={{ fontSize: 12, color: currentTheme.colors.textMuted, marginBottom: 16, lineHeight: 18 }}>
                                    Reservation details are optional and are used strictly to determine age relaxation and eligibility for government job listings.
                                </Text>
                                <Controller
                                    control={control}
                                    name="category"
                                    render={({ field: { onChange, value } }) => (
                                        <DropdownSelector
                                            label="Category"
                                            value={value}
                                            options={CATEGORY_OPTIONS}
                                            onSelect={(val) => {
                                                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                onChange(val);
                                            }}
                                            currentTheme={currentTheme}
                                            error={errors.category?.message}
                                        />
                                    )}
                                />

                                {/* PwBD Toggle */}
                                <Controller
                                    control={control}
                                    name="isPwBD"
                                    render={({ field: { onChange, value } }) => (
                                        <ToggleRow
                                            label="Person with Benchmark Disability (PwBD)"
                                            description="Applicable for 4% horizontal reservation in govt. jobs"
                                            value={value}
                                            onToggle={() => {
                                                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                onChange(!value);
                                            }}
                                            currentTheme={currentTheme}
                                        />
                                    )}
                                />

                                {/* Ex-Servicemen Toggle */}
                                <Controller
                                    control={control}
                                    name="isExServicemen"
                                    render={({ field: { onChange, value } }) => (
                                        <ToggleRow
                                            label="Ex-Serviceman"
                                            description="For candidates who have served in the armed forces"
                                            value={value}
                                            onToggle={() => {
                                                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                onChange(!value);
                                            }}
                                            currentTheme={currentTheme}
                                        />
                                    )}
                                />
                            </SurfaceCard>
                        </View>

                        {/* Home State */}
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <MapPin size={16} color={currentTheme.colors.primary} />
                                <Text style={[styles.sectionLabel, { color: currentTheme.colors.textMuted }]}>Location</Text>
                            </View>
                            <SurfaceCard style={styles.card}>
                                <Controller
                                    control={control}
                                    name="homeState"
                                    render={({ field: { onChange, value } }) => (
                                        <DropdownSelector
                                            label="Home State"
                                            value={value}
                                            options={INDIAN_STATES}
                                            onSelect={(val) => {
                                                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                onChange(val);
                                            }}
                                            currentTheme={currentTheme}
                                            error={errors.homeState?.message}
                                        />
                                    )}
                                />
                            </SurfaceCard>
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </Screen>
    );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    stickyHeader: { zIndex: 10 },
    saveBtn: { height: 32, paddingHorizontal: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', minWidth: 60 },
    saveBtnText: { fontSize: 13, fontWeight: '800' },
    scrollContent: { paddingBottom: 60 },
    content: { paddingHorizontal: 20 },
    heroSection: { marginTop: 20, marginBottom: 32 },
    heroTitle: { fontSize: 32, fontWeight: '900', letterSpacing: -1.5, lineHeight: 36 },
    heroSub: { fontSize: 15, marginTop: 12, lineHeight: 22 },
    section: { marginBottom: 32 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    sectionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
    card: { padding: 24, borderRadius: 16 },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 10, marginLeft: 4 },
    input: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, height: 56, fontSize: 15, fontWeight: '600' },
    errorText: { fontSize: 11, marginTop: 4, marginLeft: 4, fontWeight: '600' },
    viewFieldLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    viewFieldValue: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
    toggleRow: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 16, borderWidth: 1, marginBottom: 12, gap: 16 },
    checkbox: { width: 22, height: 22, borderRadius: 8, borderWidth: 2.5, justifyContent: 'center', alignItems: 'center' },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderRadius: 12 },
    chipText: { fontSize: 12, fontWeight: '700' },
});

export default memo(EditDemographicsScreen);
