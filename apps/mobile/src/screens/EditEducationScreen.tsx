import React, { memo, useCallback, useState } from 'react';
import { FlashList } from '@shopify/flash-list';
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
    DIPLOMA_DEGREES,
    UG_DEGREES,
    PG_DEGREES,
    getSpecializations,
} from '@/utils/constants';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
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
            <Modal visible={visible} transparent animationType="slide">
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: currentTheme.colors.blackOverlay }}>
                    <View style={{ backgroundColor: currentTheme.colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '60%' }}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: currentTheme.colors.text, marginBottom: 16 }}>Select {label}</Text>
                        <FlashList
                            data={options}
                            keyExtractor={(i: string) => i}
                            // @ts-expect-error - FlashList typing bug with estimatedItemSize
                            estimatedItemSize={50}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={{ paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: alpha(currentTheme.colors.border, 0.1) }}
                                    onPress={() => { onSelect(item); setVisible(false); }}
                                >
                                    <Text style={{ fontSize: 16, color: currentTheme.colors.text }}>{item}</Text>
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity style={{ marginTop: 16, alignItems: 'center', paddingVertical: 16 }} onPress={() => setVisible(false)}>
                            <Text style={{ color: currentTheme.colors.textMuted, fontWeight: '700' }}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

// --- View Mode: shows saved data as a readable card ---
const EducationView = ({ profile, onEdit, currentTheme }: { profile: NonNullable<ReturnType<typeof useEditEducation>['profile']>, onEdit: () => void, currentTheme: AppTheme }) => {
    const highestCourse = profile.pgCourse || profile.gradCourse;
    const highestSpec = profile.pgCourse ? profile.pgSpecialization : profile.gradSpecialization;
    const highestYear = profile.pgCourse ? profile.pgYear : profile.gradYear;

    return (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
            <View style={{ paddingHorizontal: 20 }}>
                {/* Schooling */}
                <View style={styles.viewSection}>
                    <View style={styles.sectionHeader}>
                        <School size={16} color={currentTheme.colors.primary} />
                        <Text style={[styles.sectionLabel, { color: currentTheme.colors.textMuted }]}>SCHOOLING</Text>
                    </View>
                    <SurfaceCard style={styles.viewCard}>
                        <View style={{ flexDirection: 'row', gap: 40 }}>
                            <View>
                                <Text style={[styles.viewFieldLabel, { color: currentTheme.colors.textMuted }]}>10TH</Text>
                                <Text style={[styles.viewFieldValue, { color: currentTheme.colors.text }]}>
                                    {profile.tenthYear ? String(profile.tenthYear) : <Text style={{ fontStyle: 'italic', opacity: 0.4 }}>Not set</Text>}
                                </Text>
                            </View>
                            <View>
                                <Text style={[styles.viewFieldLabel, { color: currentTheme.colors.textMuted }]}>12TH / DIPLOMA</Text>
                                <Text style={[styles.viewFieldValue, { color: currentTheme.colors.text }]}>
                                    {profile.twelfthYear ? String(profile.twelfthYear) : <Text style={{ fontStyle: 'italic', opacity: 0.4 }}>Not set</Text>}
                                </Text>
                            </View>
                        </View>
                    </SurfaceCard>
                </View>

                {/* Higher Education */}
                <View style={styles.viewSection}>
                    <View style={styles.sectionHeader}>
                        <GraduationCap size={16} color={currentTheme.colors.primary} />
                        <Text style={[styles.sectionLabel, { color: currentTheme.colors.textMuted }]}>HIGHER EDUCATION</Text>
                    </View>
                    <SurfaceCard style={styles.viewCard}>
                        <View style={{ marginBottom: profile.pgCourse ? 20 : 0 }}>
                            <Text style={[styles.viewFieldLabel, { color: currentTheme.colors.textMuted }]}>HIGHEST QUALIFICATION</Text>
                            <Text style={[styles.viewFieldValue, { color: currentTheme.colors.text }]}>{highestCourse}</Text>
                            <Text style={[styles.viewFieldSub, { color: currentTheme.colors.textMuted }]}>
                                {highestSpec}  ·  Class of {highestYear}
                            </Text>
                        </View>
                        {profile.pgCourse && (
                            <View style={{ paddingTop: 20, borderTopWidth: 1, borderTopColor: alpha(currentTheme.colors.border, 0.08) }}>
                                <Text style={[styles.viewFieldLabel, { color: currentTheme.colors.textMuted }]}>UNDERGRAD</Text>
                                <Text style={[styles.viewFieldValue, { color: currentTheme.colors.text }]}>{profile.gradCourse}</Text>
                                <Text style={[styles.viewFieldSub, { color: currentTheme.colors.textMuted }]}>
                                    {profile.gradSpecialization}  ·  Class of {profile.gradYear}
                                </Text>
                            </View>
                        )}
                    </SurfaceCard>
                </View>

                {/* Edit CTA */}
                <TouchableOpacity
                    style={[styles.editBlock, { borderColor: alpha(currentTheme.colors.primary, 0.2), backgroundColor: alpha(currentTheme.colors.primary, 0.04) }]}
                    onPress={onEdit}
                    activeOpacity={0.7}
                >
                    <Pencil size={14} color={currentTheme.colors.primary} />
                    <Text style={[styles.editBlockText, { color: currentTheme.colors.primary }]}>Edit Academics</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
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
        handleSave,
        loadingCache,
    } = useEditEducation();

    // Determine if we already have saved data
    const hasData = !!(profile?.gradCourse);
    const [isEditing, setIsEditing] = useState(false);

    // Track if we've initialized the mode based on data
    const [modeInitialized, setModeInitialized] = useState(false);

    // Handle initial mode setting once cache is loaded
    React.useEffect(() => {
        if (!loadingCache && !modeInitialized) {
            setIsEditing(!hasData);
            setModeInitialized(true);
        }
    }, [loadingCache, hasData, modeInitialized]);

    const courses = educationLevel === 'DIPLOMA'
        ? DIPLOMA_DEGREES
        : educationLevel === 'PG'
            ? PG_DEGREES
            : UG_DEGREES;

    const onSave = useCallback(() => {
        void handleSubmit((data: EducationFormData) => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            handleSave(data);
            setIsEditing(false);
        })();
    }, [handleSubmit, handleSave]);

    const onEdit = useCallback(() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsEditing(true);
    }, []);

    return (
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <View style={[styles.stickyHeader, { paddingTop: insets.top + 10 }]}>
                    <SecondaryHeader
                        title="Academics"
                        onBack={() => navigation.goBack()}
                        rightSlot={
                            isEditing ? (
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
                            ) : (
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={onEdit}
                                    style={[styles.editBtn, { borderColor: alpha(currentTheme.colors.primary, 0.3) }]}
                                >
                                    <Pencil size={14} color={currentTheme.colors.primary} />
                                    <Text style={[styles.editBtnText, { color: currentTheme.colors.primary }]}>Edit</Text>
                                </TouchableOpacity>
                            )
                        }
                    />
                </View>

                {loadingCache || !modeInitialized ? (
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="large" color={currentTheme.colors.primary} />
                    </View>
                ) : !isEditing && hasData ? (
                    <EducationView profile={profile} onEdit={onEdit} currentTheme={currentTheme} />
                ) : (
                    // Form Mode
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
                                                options={getSpecializations(gradCourse)}
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
                                        <Text style={[styles.label, { color: currentTheme.colors.textMuted }]}>PG COURSE</Text>
                                        <Controller
                                            control={control}
                                            name="pgCourse"
                                            render={({ field: { onChange, value } }) => (
                                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={{ paddingRight: 20 }}>
                                                    {PG_DEGREES.map((course: string) => (
                                                        <TouchableOpacity
                                                            key={course}
                                                            activeOpacity={0.8}
                                                            style={[styles.chip, { backgroundColor: alpha(currentTheme.colors.text, 0.03), borderColor: alpha(currentTheme.colors.border, 0.1) }, value === course && { backgroundColor: currentTheme.colors.text, borderColor: currentTheme.colors.text }]}
                                                            onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(course); setValue('pgSpecialization', ''); }}
                                                        >
                                                            <Text style={[styles.chipText, { color: currentTheme.colors.text }, value === course && { color: currentTheme.colors.background }]}>{course}</Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
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
                        </View>
                    </ScrollView>
                )}
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
    errorText: { fontSize: 11, color: '#FF4444', marginTop: 4, marginLeft: 4, fontWeight: '600' },
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
