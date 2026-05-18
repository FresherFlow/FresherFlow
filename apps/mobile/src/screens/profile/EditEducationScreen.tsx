import React, { memo, useCallback, useRef } from 'react';

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
import { Check, GraduationCap, School, Pencil } from 'lucide-react-native';
import { Controller } from 'react-hook-form';
import * as Haptics from 'expo-haptics';

import { useTheme, AppTheme } from '@/contexts/ThemeContext';
import { Screen } from '@/system/layout/Layout';
import { SecondaryHeader, SurfaceCard } from '@/system/components/PremiumPrimitives';
import {
    EDUCATION_LEVELS,
} from '@/utils/constants';
import { useEducationMetadata } from '@/hooks/useEducationMetadata';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { useEditEducation, EducationFormData } from '@/hooks/useEditEducation';

type Props = NativeStackScreenProps<RootStackParamList, 'EditEducation'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const DropdownSelector = ({ label, value, options, onSelect, currentTheme, error }: { label: string, value: string, options: string[], onSelect: (val: string) => void, currentTheme: AppTheme, error?: string }) => {
    const [visible, setVisible] = React.useState(false);
    return (
        <View style={{ marginBottom: 16, marginTop: 8 }}>
            <Text style={[styles.label, { color: currentTheme.colors.textMuted }]}>{label}</Text>
            <TouchableOpacity
                style={[
                    styles.input, 
                    { 
                        justifyContent: 'center', 
                        backgroundColor: alpha(currentTheme.colors.text, 0.03), 
                        borderColor: error ? currentTheme.colors.error : alpha(currentTheme.colors.border, 0.1) 
                    }
                ]}
                onPress={() => setVisible(true)}
            >
                <Text style={{ color: value ? currentTheme.colors.text : alpha(currentTheme.colors.textMuted, 0.4), fontSize: 15, fontWeight: '600' }}>
                    {value || `Select ${label}`}
                </Text>
            </TouchableOpacity>
            {error && <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>{error}</Text>}
            <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
                <Pressable style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: currentTheme.colors.blackOverlay }} onPress={() => setVisible(false)}>
                    <Pressable style={{ backgroundColor: currentTheme.colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '60%' }}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: currentTheme.colors.text, marginBottom: 16 }}>Select {label}</Text>
                        <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false}>
                            {options.map((item: string) => (
                                <TouchableOpacity
                                    key={item}
                                    style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: alpha(currentTheme.colors.border, 0.1) }}
                                    onPress={() => { onSelect(item); setVisible(false); }}
                                >
                                    <Text style={{ fontSize: 16, color: currentTheme.colors.text }}>{item}</Text>
                                </TouchableOpacity>
                            ))}
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

// --- View Mode: shows saved data as a readable card ---
export const EducationView = ({ profile, onEdit, currentTheme }: { profile: ReturnType<typeof useEditEducation>['profile'], onEdit: () => void, currentTheme: AppTheme }) => {
    const highestCourse = profile?.pgCourse || profile?.gradCourse;
    const highestSpec = profile?.pgCourse ? profile?.pgSpecialization : profile?.gradSpecialization;
    const highestYear = profile?.pgCourse ? profile?.pgYear : profile?.gradYear;

    return (
        <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
            <SurfaceCard style={{ padding: 24, borderRadius: 28 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: highestCourse ? 24 : 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <GraduationCap size={20} color={currentTheme.colors.primary} />
                        <Text style={{ fontSize: 18, fontWeight: '900', color: currentTheme.colors.text }}>Education & Academics</Text>
                    </View>
                    <TouchableOpacity onPress={onEdit} activeOpacity={0.7} style={{ padding: 8, backgroundColor: alpha(currentTheme.colors.primary, 0.1), borderRadius: 12, marginTop: -4 }}>
                        <Pencil size={16} color={currentTheme.colors.primary} />
                    </TouchableOpacity>
                </View>

                {highestCourse ? (
                    <>
                        {/* Higher Education */}
                        <View style={{ marginBottom: 24 }}>
                            <Text style={[styles.viewFieldLabel, { color: currentTheme.colors.textMuted, marginBottom: 8 }]}>HIGHEST QUALIFICATION</Text>
                            <Text style={[styles.viewFieldValue, { color: currentTheme.colors.text }]}>{highestCourse}</Text>
                            <Text style={[styles.viewFieldSub, { color: currentTheme.colors.textMuted }]}>
                                {highestSpec}  ·  Class of {highestYear}
                            </Text>
                        </View>

                        {profile.pgCourse && (
                            <View style={{ marginBottom: 24 }}>
                                <Text style={[styles.viewFieldLabel, { color: currentTheme.colors.textMuted, marginBottom: 8 }]}>UNDERGRAD</Text>
                                <Text style={[styles.viewFieldValue, { color: currentTheme.colors.text }]}>{profile.gradCourse}</Text>
                                <Text style={[styles.viewFieldSub, { color: currentTheme.colors.textMuted }]}>
                                    {profile.gradSpecialization}  ·  Class of {profile.gradYear}
                                </Text>
                            </View>
                        )}

                        {/* Schooling */}
                        <View style={{ flexDirection: 'row', gap: 40, paddingTop: 20, borderTopWidth: 1, borderTopColor: alpha(currentTheme.colors.border, 0.08) }}>
                            <View>
                                <Text style={[styles.viewFieldLabel, { color: currentTheme.colors.textMuted, marginBottom: 8 }]}>10TH</Text>
                                <Text style={[styles.viewFieldValue, { color: currentTheme.colors.text }]}>
                                    {profile.tenthYear ? String(profile.tenthYear) : <Text style={{ fontStyle: 'italic', opacity: 0.4 }}>Not set</Text>}
                                </Text>
                            </View>
                            <View>
                                <Text style={[styles.viewFieldLabel, { color: currentTheme.colors.textMuted, marginBottom: 8 }]}>12TH / DIPLOMA</Text>
                                <Text style={[styles.viewFieldValue, { color: currentTheme.colors.text }]}>
                                    {profile.twelfthYear ? String(profile.twelfthYear) : <Text style={{ fontStyle: 'italic', opacity: 0.4 }}>Not set</Text>}
                                </Text>
                            </View>
                        </View>
                    </>
                ) : (
                    <TouchableOpacity onPress={onEdit} activeOpacity={0.8} style={{ marginTop: 16, alignItems: 'center', paddingVertical: 14, backgroundColor: alpha(currentTheme.colors.text, 0.02), borderRadius: 16, borderWidth: 1, borderColor: alpha(currentTheme.colors.border, 0.05) }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: currentTheme.colors.textMuted }}>Add academic credentials</Text>
                    </TouchableOpacity>
                )}
            </SurfaceCard>
        </View>
    );
};

const EditEducationScreen: React.FC<Props> = memo(({ navigation }: Props) => {
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();
    const {
        profile,
        saving,
        control,
        handleSubmit,
        setValue,
        errors,
        isValid,
        hasPG,
        educationLevel,
        gradCourse,
        pgCourse,
        handleSave,
    } = useEditEducation();

    // Determine if we already have saved data
    const hasData = !!(profile?.gradCourse);
    const twelfthInputRef = useRef<TextInput>(null);

    const { getCoursesForLevel, getSpecializationsForCourse } = useEducationMetadata();

    const courses = getCoursesForLevel(educationLevel);

    const onSave = useCallback(() => {
        void handleSubmit((data: EducationFormData) => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            handleSave(data);
            navigation.goBack();
        })();
    }, [handleSubmit, handleSave, navigation]);

    return (
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <View style={[styles.stickyHeader, { paddingTop: insets.top + 10 }]}>
                    <SecondaryHeader
                        title="Academics"
                        onBack={() => navigation.goBack()}
                        rightSlot={
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={onSave}
                                disabled={saving || !isValid}
                                style={[styles.saveBtn, { backgroundColor: isValid ? currentTheme.colors.primary : alpha(currentTheme.colors.text, 0.2) }]}
                            >
                                {saving
                                    ? <ActivityIndicator size="small" color={currentTheme.colors.background} />
                                    : <Text style={[styles.saveBtnText, { color: currentTheme.colors.background }]}>Save</Text>
                                }
                            </TouchableOpacity>
                        }
                    />
                </View>

                {/* Form Mode */}
                <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.content}>
                            {!hasData && (
                                <View style={styles.heroSection}>
                                    <Text style={[styles.heroTitle, { color: currentTheme.colors.text }]}>Share your{'\n'}records.</Text>
                                    <Text style={[styles.heroSub, { color: currentTheme.colors.textMuted }]}>
                                        Academic history helps match you to the right opportunities.
                                    </Text>
                                </View>
                            )}

                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <School size={16} color={currentTheme.colors.primary} />
                                    <Text style={[styles.sectionLabel, { color: currentTheme.colors.textMuted }]}>SCHOOLING</Text>
                                </View>
                                <SurfaceCard style={styles.card}>
                                    <View style={styles.row}>
                                        <View style={[styles.inputGroup, { flex: 1 }]}>
                                            <Text style={[styles.label, { color: currentTheme.colors.textMuted }]}>10TH PASSING YEAR</Text>
                                            <Controller
                                                control={control}
                                                name="tenthYear"
                                                render={({ field: { onChange, value, onBlur } }) => (
                                                    <View>
                                                        <TextInput
                                                            style={[
                                                                styles.input, 
                                                                { 
                                                                    color: currentTheme.colors.text, 
                                                                    backgroundColor: alpha(currentTheme.colors.text, 0.03), 
                                                                    borderColor: errors.tenthYear ? currentTheme.colors.error : alpha(currentTheme.colors.border, 0.1) 
                                                                }
                                                            ]}
                                                            placeholder="2018"
                                                            placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.4)}
                                                            keyboardType="number-pad"
                                                            returnKeyType="next"
                                                            onSubmitEditing={() => twelfthInputRef.current?.focus()}
                                                            maxLength={4}
                                                            value={value}
                                                            onChangeText={onChange}
                                                            onBlur={onBlur}
                                                        />
                                                        {errors.tenthYear && <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>{errors.tenthYear.message}</Text>}
                                                    </View>
                                                )}
                                            />
                                        </View>
                                        <View style={{ width: 16 }} />
                                        <View style={[styles.inputGroup, { flex: 1 }]}>
                                            <Text style={[styles.label, { color: currentTheme.colors.textMuted }]}>12TH PASSING YEAR</Text>
                                            <Controller
                                                control={control}
                                                name="twelfthYear"
                                                render={({ field: { onChange, value, onBlur } }) => (
                                                    <View>
                                                        <TextInput
                                                            style={[
                                                                styles.input, 
                                                                { 
                                                                    color: currentTheme.colors.text, 
                                                                    backgroundColor: alpha(currentTheme.colors.text, 0.03), 
                                                                    borderColor: errors.twelfthYear ? currentTheme.colors.error : alpha(currentTheme.colors.border, 0.1) 
                                                                }
                                                            ]}
                                                            placeholder="2020"
                                                            placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.4)}
                                                            keyboardType="number-pad"
                                                            returnKeyType="done"
                                                            ref={twelfthInputRef}
                                                            maxLength={4}
                                                            value={value}
                                                            onChangeText={onChange}
                                                            onBlur={onBlur}
                                                        />
                                                        {errors.twelfthYear && <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>{errors.twelfthYear.message}</Text>}
                                                    </View>
                                                )}
                                            />
                                        </View>
                                    </View>
                                </SurfaceCard>
                            </View>

                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <GraduationCap size={16} color={currentTheme.colors.primary} />
                                    <Text style={[styles.sectionLabel, { color: currentTheme.colors.textMuted }]}>HIGHER EDUCATION</Text>
                                </View>
                                <SurfaceCard style={styles.card}>
                                    <Controller
                                        control={control}
                                        name="educationLevel"
                                        render={({ field: { onChange, value } }) => (
                                            <DropdownSelector
                                                label="CURRENT LEVEL"
                                                value={value === 'DEGREE' ? 'UG' : value}
                                                options={EDUCATION_LEVELS.map(l => l === 'DEGREE' ? 'UG' : l)}
                                                onSelect={(val: string) => {
                                                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    const actualLevel = val === 'UG' ? 'DEGREE' : val;
                                                    onChange(actualLevel);
                                                    setValue('gradCourse', '');
                                                    setValue('gradSpecialization', '');
                                                }}
                                                currentTheme={currentTheme}
                                                error={errors.educationLevel?.message}
                                            />
                                        )}
                                    />
                                    <Controller
                                        control={control}
                                        name="gradCourse"
                                        render={({ field: { onChange, value } }) => (
                                            <DropdownSelector
                                                label="COURSE"
                                                value={value}
                                                options={courses}
                                                onSelect={(val: string) => {
                                                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    onChange(val);
                                                    setValue('gradSpecialization', '');
                                                }}
                                                currentTheme={currentTheme}
                                                error={errors.gradCourse?.message}
                                            />
                                        )}
                                    />
                                    <Controller
                                        control={control}
                                        name="gradSpecialization"
                                        render={({ field: { onChange, value } }) => (
                                            <DropdownSelector
                                                label="SPECIALIZATION"
                                                value={value}
                                                options={getSpecializationsForCourse(gradCourse)}
                                                onSelect={(val: string) => {
                                                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    onChange(val);
                                                }}
                                                currentTheme={currentTheme}
                                                error={errors.gradSpecialization?.message}
                                            />
                                        )}
                                    />
                                    <View style={[styles.inputGroup, { marginTop: 8 }]}>
                                        <Text style={[styles.label, { color: currentTheme.colors.textMuted }]}>GRADUATION YEAR</Text>
                                        <Controller
                                            control={control}
                                            name="gradYear"
                                            render={({ field: { onChange, value, onBlur } }) => (
                                                <View>
                                                    <TextInput
                                                        style={[
                                                            styles.input, 
                                                            { 
                                                                color: currentTheme.colors.text, 
                                                                backgroundColor: alpha(currentTheme.colors.text, 0.03), 
                                                                borderColor: errors.gradYear ? currentTheme.colors.error : alpha(currentTheme.colors.border, 0.1) 
                                                            }
                                                        ]}
                                                        placeholder="Year"
                                                        placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.4)}
                                                        keyboardType="number-pad"
                                                        maxLength={4}
                                                        value={value}
                                                        onChangeText={onChange}
                                                        onBlur={onBlur}
                                                    />
                                                    {errors.gradYear && <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>{errors.gradYear.message}</Text>}
                                                </View>
                                            )}
                                        />
                                    </View>
                                </SurfaceCard>
                            </View>

                            {educationLevel !== 'PG' && (
                                <View style={styles.section}>
                                    <Controller
                                        control={control}
                                        name="hasPG"
                                        render={({ field: { onChange, value } }) => (
                                            <TouchableOpacity
                                                activeOpacity={0.8}
                                                style={[styles.pgToggle, { borderColor: alpha(currentTheme.colors.border, 0.1), backgroundColor: value ? alpha(currentTheme.colors.primary, 0.05) : alpha(currentTheme.colors.text, 0.03) }]}
                                                onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(!value); }}
                                            >
                                                <View style={[styles.checkbox, { borderColor: value ? currentTheme.colors.primary : alpha(currentTheme.colors.border, 0.2) }, value && { backgroundColor: currentTheme.colors.primary }]}>
                                                    {value && <Check size={12} color={currentTheme.colors.background} strokeWidth={4} />}
                                                </View>
                                                <Text style={[styles.pgToggleText, { color: currentTheme.colors.text }]}>Include Postgraduate Details</Text>
                                            </TouchableOpacity>
                                        )}
                                    />

                                    {hasPG && (
                                        <SurfaceCard style={styles.card}>
                                            <Controller
                                                control={control}
                                                name="pgCourse"
                                                render={({ field: { onChange, value } }) => (
                                                    <DropdownSelector
                                                        label="PG COURSE"
                                                        value={value || ''}
                                                        options={getCoursesForLevel('PG')}
                                                        onSelect={(val: string) => {
                                                            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                            onChange(val);
                                                            setValue('pgSpecialization', '');
                                                        }}
                                                        currentTheme={currentTheme}
                                                        error={errors.pgCourse?.message}
                                                    />
                                                )}
                                            />
                                            <Controller
                                                control={control}
                                                name="pgSpecialization"
                                                render={({ field: { onChange, value } }) => (
                                                    <DropdownSelector
                                                        label="SPECIALIZATION"
                                                        value={value || ''}
                                                        options={getSpecializationsForCourse(pgCourse || '')}
                                                        onSelect={(val: string) => {
                                                            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                            onChange(val);
                                                        }}
                                                        currentTheme={currentTheme}
                                                        error={errors.pgSpecialization?.message}
                                                    />
                                                )}
                                            />
                                            <View style={[styles.inputGroup, { marginTop: 24 }]}>
                                                <Text style={[styles.label, { color: currentTheme.colors.textMuted }]}>PG YEAR</Text>
                                                <Controller
                                                    control={control}
                                                    name="pgYear"
                                                    render={({ field: { onChange, value, onBlur } }) => (
                                                        <View>
                                                            <TextInput
                                                                style={[
                                                                    styles.input, 
                                                                    { 
                                                                        color: currentTheme.colors.text, 
                                                                        backgroundColor: alpha(currentTheme.colors.text, 0.03), 
                                                                        borderColor: errors.pgYear ? currentTheme.colors.error : alpha(currentTheme.colors.border, 0.1) 
                                                                    }
                                                                ]}
                                                                placeholder="2026"
                                                                placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.4)}
                                                                keyboardType="number-pad"
                                                                maxLength={4}
                                                                value={value}
                                                                onChangeText={onChange}
                                                                onBlur={onBlur}
                                                            />
                                                            {errors.pgYear && <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>{errors.pgYear.message}</Text>}
                                                        </View>
                                                    )}
                                                />
                                            </View>
                                        </SurfaceCard>
                                    )}
                                </View>
                            )}
                        </View>
                    </ScrollView>
            </KeyboardAvoidingView>
        </Screen>
    );
});

const styles = StyleSheet.create({
    stickyHeader: { zIndex: 10 },
    saveBtn: { height: 32, paddingHorizontal: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    saveBtnText: { fontSize: 13, fontWeight: '800' },
    editBtn: { height: 32, paddingHorizontal: 14, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, borderWidth: 1 },
    editBtnText: { fontSize: 13, fontWeight: '700' },
    scrollContent: { paddingBottom: 60 },
    content: { paddingHorizontal: 20 },
    heroSection: { marginTop: 20, marginBottom: 32 },
    heroTitle: { fontSize: 32, fontWeight: '900', letterSpacing: -1.5, lineHeight: 36 },
    heroSub: { fontSize: 15, marginTop: 12, lineHeight: 22 },
    section: { marginBottom: 32 },
    viewSection: { marginBottom: 28 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    sectionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
    card: { padding: 24, borderRadius: 28 },
    viewCard: { padding: 20, borderRadius: 24 },
    row: { flexDirection: 'row' },
    inputGroup: { marginBottom: 0 },
    label: { fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 10, marginLeft: 4 },
    input: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, height: 56, fontSize: 15, fontWeight: '600' },
    errorText: { fontSize: 11, marginTop: 4, marginLeft: 4, fontWeight: '600' },
    viewFieldLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
    viewFieldValue: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
    viewFieldSub: { fontSize: 13, fontWeight: '500', marginTop: 4 },
    pgToggle: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 16 },
    checkbox: { width: 22, height: 22, borderRadius: 8, borderWidth: 2.5, marginRight: 14, justifyContent: 'center', alignItems: 'center' },
    pgToggleText: { fontSize: 15, fontWeight: '800' },
    chipScroll: { marginHorizontal: -4 },
    chip: { paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderRadius: 14, marginRight: 8 },
    chipText: { fontSize: 13, fontWeight: '700' },
    editBlock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 20, borderWidth: 1, marginTop: 8 },
    editBlockText: { fontSize: 14, fontWeight: '700' },
});

export default memo(EditEducationScreen);
