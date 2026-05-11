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
} from 'react-native';
import { Check, ChevronLeft, GraduationCap, School } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/contexts/ThemeContext';
import { Screen } from '@/system/layout/Layout';
import { PremiumHeader, SurfaceCard } from '@/system/components/PremiumPrimitives';
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        handleSave();
    }, [handleSave]);

    return (
        <Screen safe={false}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
            
            <View style={[styles.stickyHeader, { paddingTop: Platform.OS === 'ios' ? 50 : 20 }]}>
                <PremiumHeader 
                    title="Education" 
                    subtitle="Academic Records" 
                    leftSlot={
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <ChevronLeft size={24} color={currentTheme.colors.text} />
                        </TouchableOpacity>
                    }
                    rightSlot={
                        <TouchableOpacity onPress={onSave} disabled={saving} style={styles.saveBtn}>
                            {saving ? (
                                <ActivityIndicator size="small" color={currentTheme.colors.primary} />
                            ) : (
                                <Check size={24} color={currentTheme.colors.primary} />
                            )}
                        </TouchableOpacity>
                    }
                />
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.content}>
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <School size={16} color={currentTheme.colors.primary} />
                            <Text style={[styles.sectionLabel, { color: currentTheme.colors.textMuted }]}>Schooling</Text>
                        </View>
                        <SurfaceCard style={styles.card}>
                            <View style={styles.row}>
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={[styles.label, { color: currentTheme.colors.text }]}>10th Year</Text>
                                    <TextInput
                                        style={[styles.input, { color: currentTheme.colors.text, borderColor: alpha(currentTheme.colors.border, 0.5) }]}
                                        placeholder="2018"
                                        placeholderTextColor={currentTheme.colors.textMuted}
                                        keyboardType="number-pad"
                                        maxLength={4}
                                        value={tenthYear}
                                        onChangeText={setTenthYear}
                                    />
                                </View>
                                <View style={{ width: 16 }} />
                                <View style={[styles.inputGroup, { flex: 1 }]}>
                                    <Text style={[styles.label, { color: currentTheme.colors.text }]}>12th Year</Text>
                                    <TextInput
                                        style={[styles.input, { color: currentTheme.colors.text, borderColor: alpha(currentTheme.colors.border, 0.5) }]}
                                        placeholder="2020"
                                        placeholderTextColor={currentTheme.colors.textMuted}
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
                            <Text style={[styles.sectionLabel, { color: currentTheme.colors.textMuted }]}>Higher Education</Text>
                        </View>
                        <SurfaceCard style={styles.card}>
                            <Text style={[styles.label, { color: currentTheme.colors.text }]}>Current Level</Text>
                            <View style={styles.levelRow}>
                                {EDUCATION_LEVELS.map((level: string) => (
                                    <TouchableOpacity
                                        key={level}
                                        style={[
                                            styles.levelBtn,
                                            { backgroundColor: alpha(currentTheme.colors.text, 0.03), borderColor: alpha(currentTheme.colors.border, 0.5) },
                                            educationLevel === level && { borderColor: currentTheme.colors.primary, backgroundColor: alpha(currentTheme.colors.primary, 0.1) },
                                        ]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setEducationLevel(level);
                                            setGradCourse('');
                                            setGradSpecialization('');
                                        }}
                                    >
                                        <Text style={[
                                            styles.levelBtnText,
                                            { color: currentTheme.colors.textMuted },
                                            educationLevel === level && { color: currentTheme.colors.primary }
                                        ]}>
                                            {level === 'DEGREE' ? 'UG' : level}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={[styles.label, { color: currentTheme.colors.text }]}>Course</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={{ paddingRight: 20 }}>
                                {courses.map((course: string) => (
                                    <TouchableOpacity
                                        key={course}
                                        style={[
                                            styles.chip,
                                            { backgroundColor: alpha(currentTheme.colors.text, 0.03), borderColor: alpha(currentTheme.colors.border, 0.5) },
                                            gradCourse === course && { backgroundColor: currentTheme.colors.primary, borderColor: currentTheme.colors.primary }
                                        ]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setGradCourse(course);
                                            setGradSpecialization('');
                                        }}
                                    >
                                        <Text style={[
                                            styles.chipText,
                                            { color: currentTheme.colors.textMuted },
                                            gradCourse === course && { color: currentTheme.colors.background }
                                        ]}>
                                            {course}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <Text style={[styles.label, { marginTop: 20, color: currentTheme.colors.text }]}>Specialization</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={{ paddingRight: 20 }}>
                                {getSpecializations(gradCourse).map((spec: string) => (
                                    <TouchableOpacity
                                        key={spec}
                                        style={[
                                            styles.chip,
                                            { backgroundColor: alpha(currentTheme.colors.text, 0.03), borderColor: alpha(currentTheme.colors.border, 0.5) },
                                            gradSpecialization === spec && { backgroundColor: currentTheme.colors.primary, borderColor: currentTheme.colors.primary }
                                        ]}
                                        onPress={() => {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            setGradSpecialization(spec);
                                        }}
                                    >
                                        <Text style={[
                                            styles.chipText,
                                            { color: currentTheme.colors.textMuted },
                                            gradSpecialization === spec && { color: currentTheme.colors.background }
                                        ]}>
                                            {spec}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <View style={[styles.inputGroup, { marginTop: 20 }]}>
                                <Text style={[styles.label, { color: currentTheme.colors.text }]}>Graduation Year</Text>
                                <TextInput
                                    style={[styles.input, { color: currentTheme.colors.text, borderColor: alpha(currentTheme.colors.border, 0.5) }]}
                                    placeholder="2024"
                                    placeholderTextColor={currentTheme.colors.textMuted}
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
                                    borderColor: currentTheme.colors.border,
                                    backgroundColor: hasPG ? alpha(currentTheme.colors.primary, 0.05) : currentTheme.colors.surface 
                                }
                            ]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setHasPG(!hasPG);
                            }}
                        >
                            <View style={[
                                styles.checkbox, 
                                { borderColor: hasPG ? currentTheme.colors.primary : currentTheme.colors.border }, 
                                hasPG && { backgroundColor: currentTheme.colors.primary }
                            ]}>
                                {hasPG && <Check size={12} color={currentTheme.colors.background} />}
                            </View>
                            <Text style={[styles.pgToggleText, { color: currentTheme.colors.text }]}>Include Postgraduate Details</Text>
                        </TouchableOpacity>

                        {hasPG && (
                            <SurfaceCard style={styles.card}>
                                <Text style={[styles.label, { color: currentTheme.colors.text }]}>PG Course</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={{ paddingRight: 20 }}>
                                    {PG_DEGREES.map((course: string) => (
                                        <TouchableOpacity
                                            key={course}
                                            style={[
                                                styles.chip,
                                                { backgroundColor: alpha(currentTheme.colors.text, 0.03), borderColor: alpha(currentTheme.colors.border, 0.5) },
                                                pgCourse === course && { backgroundColor: currentTheme.colors.primary, borderColor: currentTheme.colors.primary }
                                            ]}
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setPgCourse(course);
                                                setPgSpecialization('');
                                            }}
                                        >
                                            <Text style={[
                                                styles.chipText,
                                                { color: currentTheme.colors.textMuted },
                                                pgCourse === course && { color: currentTheme.colors.background }
                                            ]}>
                                                {course}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <Text style={[styles.label, { marginTop: 20, color: currentTheme.colors.text }]}>PG Specialization</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll} contentContainerStyle={{ paddingRight: 20 }}>
                                    {getSpecializations(pgCourse).map((spec: string) => (
                                        <TouchableOpacity
                                            key={spec}
                                            style={[
                                                styles.chip,
                                                { backgroundColor: alpha(currentTheme.colors.text, 0.03), borderColor: alpha(currentTheme.colors.border, 0.5) },
                                                pgSpecialization === spec && { backgroundColor: currentTheme.colors.primary, borderColor: currentTheme.colors.primary }
                                            ]}
                                            onPress={() => {
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setPgSpecialization(spec);
                                            }}
                                        >
                                            <Text style={[
                                                styles.chipText,
                                                { color: currentTheme.colors.textMuted },
                                                pgSpecialization === spec && { color: currentTheme.colors.background }
                                            ]}>
                                                {spec}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                <View style={[styles.inputGroup, { marginTop: 20 }]}>
                                    <Text style={[styles.label, { color: currentTheme.colors.text }]}>PG Year</Text>
                                    <TextInput
                                        style={[styles.input, { color: currentTheme.colors.text, borderColor: alpha(currentTheme.colors.border, 0.5) }]}
                                        placeholder="2026"
                                        placeholderTextColor={currentTheme.colors.textMuted}
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
        </Screen>
    );
});

const styles = StyleSheet.create({
    stickyHeader: {
        zIndex: 10,
    },
    backBtn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveBtn: {
        padding: 8,
    },
    scrollContent: {
        paddingBottom: 60,
        paddingTop: 12,
    },
    content: {
        paddingHorizontal: 20,
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        marginLeft: 8,
    },
    sectionLabel: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
    },
    card: {
        padding: 20,
        borderRadius: 24,
    },
    row: {
        flexDirection: 'row',
    },
    inputGroup: {
        marginBottom: 0,
    },
    label: {
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 8,
        marginLeft: 4,
    },
    input: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 16,
        height: 50,
        fontSize: 15,
        fontWeight: '600',
    },
    levelRow: {
        flexDirection: 'row',
        marginBottom: 20,
        gap: 8,
    },
    levelBtn: {
        flex: 1,
        height: 42,
        borderWidth: 1,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    levelBtnText: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    chipScroll: {
        marginHorizontal: -4,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderWidth: 1,
        borderRadius: 20,
        marginRight: 8,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '700',
    },
    pgToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 16,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 6,
        borderWidth: 2,
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pgToggleText: {
        fontSize: 15,
        fontWeight: '700',
    },
});

export default EditEducationScreen;
