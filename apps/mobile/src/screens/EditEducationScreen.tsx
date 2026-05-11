import React, { memo, useCallback } from 'react';
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
    FlatList,
} from 'react-native';
import { Check, GraduationCap, School } from 'lucide-react-native';
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
import { useEditEducation } from '@/hooks/useEditEducation';


type Props = NativeStackScreenProps<RootStackParamList, 'EditEducation'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const DropdownSelector = ({ label, value, options, onSelect, currentTheme }: { label: string, value: string, options: string[], onSelect: (val: string) => void, currentTheme: AppTheme }) => {
    const [visible, setVisible] = React.useState(false);

    return (
        <View style={{ marginBottom: 16, marginTop: 8 }}>
            <Text style={[styles.label, { color: currentTheme.colors.textMuted }]}>{label}</Text>
            <TouchableOpacity 
                style={[styles.input, { justifyContent: 'center', backgroundColor: alpha(currentTheme.colors.text, 0.03), borderColor: alpha(currentTheme.colors.border, 0.1) }]}
                onPress={() => setVisible(true)}
            >
                <Text style={{ color: value ? currentTheme.colors.text : alpha(currentTheme.colors.textMuted, 0.4), fontSize: 15, fontWeight: '600' }}>
                    {value || `Select ${label}`}
                </Text>
            </TouchableOpacity>

            <Modal visible={visible} transparent animationType="slide">
                <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <View style={{ backgroundColor: currentTheme.colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '60%' }}>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: currentTheme.colors.text, marginBottom: 16 }}>Select {label}</Text>
                        <FlatList 
                            data={options}
                            keyExtractor={(i: string) => i}
                            renderItem={({item}) => (
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

const EditEducationScreen: React.FC<Props> = memo(({ navigation }: Props) => {
    const { currentTheme } = useTheme();

    const {
        saving,
        educationLevel, setEducationLevel,
        tenthYear, setTenthYear,
        twelfthYear, setTwelfthYear,
        gradCourse, setGradCourse,
        gradSpecialization, setGradSpecialization,
        gradYear, setGradYear,
        hasPG, setHasPG,
        pgCourse, setPgCourse,
        pgSpecialization, setPgSpecialization,
        pgYear, setPgYear,
        handleSave,
    } = useEditEducation(navigation);

    const courses = educationLevel === 'DIPLOMA'
        ? DIPLOMA_DEGREES
        : educationLevel === 'PG'
            ? PG_DEGREES
            : UG_DEGREES;

    const onSave = useCallback(() => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        handleSave();
    }, [handleSave]);

    return (
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
            
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={[styles.stickyHeader, { paddingTop: Platform.OS === 'ios' ? 50 : 20 }]}>
                    <SecondaryHeader 
                        title="Academics" 
                        onBack={() => navigation.goBack()}
                        rightSlot={
                            <TouchableOpacity 
                                activeOpacity={0.7}
                                onPress={onSave} 
                                disabled={saving} 
                                style={[styles.saveBtn, { backgroundColor: currentTheme.colors.primary }]}
                            >
                                {saving ? (
                                    <ActivityIndicator size="small" color={currentTheme.colors.background} />
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
                        <View style={styles.heroSection}>
                            <Text style={[styles.heroTitle, { color: currentTheme.colors.text }]}>Share your{'\n'}records.</Text>
                            <Text style={[styles.heroSub, { color: currentTheme.colors.textMuted }]}>
                                Academic history helps us verify your signals and unlock exclusive early-career opportunities.
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <School size={16} color={currentTheme.colors.primary} />
                                <Text style={[styles.sectionLabel, { color: currentTheme.colors.textMuted }]}>SCHOOLING</Text>
                            </View>
                            <SurfaceCard style={styles.card}>
                                <View style={styles.row}>
                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                        <Text style={[styles.label, { color: currentTheme.colors.textMuted }]}>10TH PASSING YEAR</Text>
                                        <TextInput
                                            style={[styles.input, { color: currentTheme.colors.text, backgroundColor: alpha(currentTheme.colors.text, 0.03), borderColor: alpha(currentTheme.colors.border, 0.1) }]}
                                            placeholder="2018"
                                            placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.4)}
                                            keyboardType="number-pad"
                                            maxLength={4}
                                            value={tenthYear}
                                            onChangeText={setTenthYear}
                                        />
                                    </View>
                                    <View style={{ width: 16 }} />
                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                        <Text style={[styles.label, { color: currentTheme.colors.textMuted }]}>12TH PASSING YEAR</Text>
                                        <TextInput
                                            style={[styles.input, { color: currentTheme.colors.text, backgroundColor: alpha(currentTheme.colors.text, 0.03), borderColor: alpha(currentTheme.colors.border, 0.1) }]}
                                            placeholder="2020"
                                            placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.4)}
                                            keyboardType="number-pad"
                                            maxLength={4}
                                            value={twelfthYear}
                                            onChangeText={setTwelfthYear}
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
                                <DropdownSelector 
                                    label="CURRENT LEVEL" 
                                    value={educationLevel === 'DEGREE' ? 'UG' : educationLevel} 
                                    options={EDUCATION_LEVELS.map(l => l === 'DEGREE' ? 'UG' : l)} 
                                    onSelect={(val: string) => {
                                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        const actualLevel = val === 'UG' ? 'DEGREE' : val;
                                        setEducationLevel(actualLevel);
                                        setGradCourse('');
                                        setGradSpecialization('');
                                    }} 
                                    currentTheme={currentTheme} 
                                />

                                <DropdownSelector 
                                    label="COURSE" 
                                    value={gradCourse} 
                                    options={courses} 
                                    onSelect={(val: string) => {
                                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setGradCourse(val);
                                        setGradSpecialization('');
                                    }} 
                                    currentTheme={currentTheme} 
                                />

                                <DropdownSelector 
                                    label="SPECIALIZATION" 
                                    value={gradSpecialization} 
                                    options={getSpecializations(gradCourse)} 
                                    onSelect={(val: string) => {
                                        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setGradSpecialization(val);
                                    }} 
                                    currentTheme={currentTheme} 
                                />

                                <View style={[styles.inputGroup, { marginTop: 24 }]}>
                                    <Text style={[styles.label, { color: currentTheme.colors.textMuted }]}>GRADUATION YEAR</Text>
                                    <TextInput
                                        style={[styles.input, { color: currentTheme.colors.text, backgroundColor: alpha(currentTheme.colors.text, 0.03), borderColor: alpha(currentTheme.colors.border, 0.1) }]}
                                        placeholder="2024"
                                        placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.4)}
                                        keyboardType="number-pad"
                                        maxLength={4}
                                        value={gradYear}
                                        onChangeText={setGradYear}
                                    />
                                </View>
                            </SurfaceCard>
                        </View>

                        <View style={styles.section}>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                style={[
                                    styles.pgToggle, 
                                    { 
                                        borderColor: alpha(currentTheme.colors.border, 0.1),
                                        backgroundColor: hasPG ? alpha(currentTheme.colors.primary, 0.05) : alpha(currentTheme.colors.text, 0.03) 
                                    }
                                ]}
                                onPress={() => {
                                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    setHasPG(!hasPG);
                                }}
                            >
                                <View style={[
                                    styles.checkbox, 
                                    { borderColor: hasPG ? currentTheme.colors.primary : alpha(currentTheme.colors.border, 0.2) }, 
                                    hasPG && { backgroundColor: currentTheme.colors.primary }
                                ]}>
                                    {hasPG && <Check size={12} color={currentTheme.colors.background} strokeWidth={4} />}
                                </View>
                                <Text style={[styles.pgToggleText, { color: currentTheme.colors.text }]}>Include Postgraduate Details</Text>
                            </TouchableOpacity>

                            {hasPG && (
                                <SurfaceCard style={styles.card}>
                                    <Text style={[styles.label, { color: currentTheme.colors.textMuted }]}>PG COURSE</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={{ paddingRight: 20 }}>
                                        {PG_DEGREES.map((course: string) => (
                                            <TouchableOpacity
                                                key={course}
                                                activeOpacity={0.8}
                                                style={[
                                                    styles.chip,
                                                    { backgroundColor: alpha(currentTheme.colors.text, 0.03), borderColor: alpha(currentTheme.colors.border, 0.1) },
                                                    pgCourse === course && { backgroundColor: currentTheme.colors.text, borderColor: currentTheme.colors.text }
                                                ]}
                                                onPress={() => {
                                                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    setPgCourse(course);
                                                    setPgSpecialization('');
                                                }}
                                            >
                                                <Text style={[
                                                    styles.chipText,
                                                    { color: currentTheme.colors.text },
                                                    pgCourse === course && { color: currentTheme.colors.background }
                                                ]}>
                                                    {course}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>

                                    <Text style={[styles.label, { marginTop: 24, color: currentTheme.colors.textMuted }]}>PG SPECIALIZATION</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={{ paddingRight: 20 }}>
                                        {getSpecializations(pgCourse).map((spec: string) => (
                                            <TouchableOpacity
                                                key={spec}
                                                activeOpacity={0.8}
                                                style={[
                                                    styles.chip,
                                                    { backgroundColor: alpha(currentTheme.colors.text, 0.03), borderColor: alpha(currentTheme.colors.border, 0.1) },
                                                    pgSpecialization === spec && { backgroundColor: currentTheme.colors.text, borderColor: currentTheme.colors.text }
                                                ]}
                                                onPress={() => {
                                                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    setPgSpecialization(spec);
                                                }}
                                            >
                                                <Text style={[
                                                    styles.chipText,
                                                    { color: currentTheme.colors.text },
                                                    pgSpecialization === spec && { color: currentTheme.colors.background }
                                                ]}>
                                                    {spec}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>

                                    <View style={[styles.inputGroup, { marginTop: 24 }]}>
                                        <Text style={[styles.label, { color: currentTheme.colors.textMuted }]}>PG YEAR</Text>
                                        <TextInput
                                            style={[styles.input, { color: currentTheme.colors.text, backgroundColor: alpha(currentTheme.colors.text, 0.03), borderColor: alpha(currentTheme.colors.border, 0.1) }]}
                                            placeholder="2026"
                                            placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.4)}
                                            keyboardType="number-pad"
                                            maxLength={4}
                                            value={pgYear}
                                            onChangeText={setPgYear}
                                        />
                                    </View>
                                </SurfaceCard>
                            )}
                        </View>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </Screen>
    );
});

const styles = StyleSheet.create({
    stickyHeader: {
        zIndex: 10,
    },
    backBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: -8,
    },
    saveBtn: {
        height: 32,
        paddingHorizontal: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveBtnText: {
        fontSize: 13,
        fontWeight: '800',
    },
    scrollContent: {
        paddingBottom: 60,
    },
    content: {
        paddingHorizontal: 20,
    },
    heroSection: {
        marginTop: 20,
        marginBottom: 32,
    },
    heroTitle: {
        fontSize: 32,
        fontWeight: '900',
        letterSpacing: -1.5,
        lineHeight: 36,
    },
    heroSub: {
        fontSize: 15,
        marginTop: 12,
        lineHeight: 22,
    },
    section: {
        marginBottom: 40,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1.5,
    },
    card: {
        padding: 24,
        borderRadius: 28,
    },
    row: {
        flexDirection: 'row',
    },
    inputGroup: {
        marginBottom: 0,
    },
    label: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 10,
        marginLeft: 4,
    },
    input: {
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 16,
        height: 56,
        fontSize: 15,
        fontWeight: '600',
    },
    levelRow: {
        flexDirection: 'row',
        gap: 8,
    },
    levelBtn: {
        flex: 1,
        height: 48,
        borderWidth: 1,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    levelBtnText: {
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    chipScroll: {
        marginHorizontal: -4,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderWidth: 1,
        borderRadius: 14,
        marginRight: 8,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '700',
    },
    pgToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 24,
        borderWidth: 1,
        marginBottom: 16,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 8,
        borderWidth: 2.5,
        marginRight: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pgToggleText: {
        fontSize: 15,
        fontWeight: '800',
    },
});

export default memo(EditEducationScreen);
