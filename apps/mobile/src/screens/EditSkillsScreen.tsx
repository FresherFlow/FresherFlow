import React, { memo, useState, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Plus, Zap, Timer, Check, Pencil } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { COMMON_SKILLS, AVAILABILITY_OPTIONS } from '@/utils/constants';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { useSkills, SkillsFormData } from '@/hooks/useSkills';
import * as Haptics from 'expo-haptics';
import { Availability } from '@fresherflow/types';

import { Screen } from '@/system/layout/Layout';
import { SecondaryHeader, SurfaceCard } from '@/system/components/PremiumPrimitives';

type Props = NativeStackScreenProps<RootStackParamList, 'EditSkills'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const EditSkillsScreen: React.FC<Props> = memo(({ navigation }: Props) => {
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();

    const {
        profile,
        saving,
        handleSubmit,
        skills,
        skillInput,
        setSkillInput,
        availability,
        showSuggestions,
        setShowSuggestions,
        addSkill,
        removeSkill,
        handleSave,
        loadingCache,
        isValid,
        errors,
        setValue,
    } = useSkills();

    const hasData = (profile?.skills?.length ?? 0) > 0;
    const [isEditing, setIsEditing] = useState(false);
    const [modeInitialized, setModeInitialized] = useState(false);

    // Handle initial mode setting once cache is loaded
    React.useEffect(() => {
        if (!loadingCache && !modeInitialized) {
            setIsEditing(!hasData);
            setModeInitialized(true);
        }
    }, [loadingCache, hasData, modeInitialized]);

    const suggestions = COMMON_SKILLS.filter(
        s => s.toLowerCase().includes(skillInput.toLowerCase()) && !skills.includes(s)
    ).slice(0, 5);

    const onSave = useCallback(async () => {
        void handleSubmit(async (data: SkillsFormData) => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await handleSave(data);
            setIsEditing(false);
        })();
    }, [handleSubmit, handleSave]);

    const availabilityLabel = AVAILABILITY_OPTIONS.find(o => o.value === (profile?.availability || availability))?.label || 'Immediate';

    return (
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <View style={[styles.stickyHeader, { paddingTop: insets.top + 10 }]}>
                    <SecondaryHeader
                        title="Capability"
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
                                    onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIsEditing(true); }}
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
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60, paddingHorizontal: 20 }}>
                        {/* Skills */}
                        <View style={styles.viewSection}>
                            <View style={styles.sectionHeader}>
                                <Zap size={16} color={currentTheme.colors.primary} />
                                <Text style={[styles.sectionLabel, { color: currentTheme.colors.textMuted }]}>Technical Stack</Text>
                            </View>
                            <SurfaceCard style={styles.viewCard}>
                                <View style={styles.tagContainer}>
                                    {(profile?.skills || []).map(skill => (
                                        <View key={skill} style={[styles.viewTag, { backgroundColor: alpha(currentTheme.colors.primary, 0.08) }]}>
                                            <Text style={[styles.viewTagText, { color: currentTheme.colors.primary }]}>{skill}</Text>
                                        </View>
                                    ))}
                                </View>
                            </SurfaceCard>
                        </View>

                        {/* Availability */}
                        <View style={styles.viewSection}>
                            <View style={styles.sectionHeader}>
                                <Timer size={16} color={currentTheme.colors.primary} />
                                <Text style={[styles.sectionLabel, { color: currentTheme.colors.textMuted }]}>Availability</Text>
                            </View>
                            <SurfaceCard style={styles.viewCard}>
                                <Text style={[styles.viewFieldLabel, { color: currentTheme.colors.textMuted }]}>Joining Timeline</Text>
                                <Text style={[styles.viewFieldValue, { color: currentTheme.colors.text }]}>{availabilityLabel}</Text>
                            </SurfaceCard>
                        </View>

                        <TouchableOpacity
                            style={[styles.editBlock, { borderColor: alpha(currentTheme.colors.primary, 0.2), backgroundColor: alpha(currentTheme.colors.primary, 0.04) }]}
                            onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIsEditing(true); }}
                            activeOpacity={0.7}
                        >
                            <Pencil size={14} color={currentTheme.colors.primary} />
                            <Text style={[styles.editBlockText, { color: currentTheme.colors.primary }]}>Edit Skills & Availability</Text>
                        </TouchableOpacity>
                    </ScrollView>
                ) : (
                    // FORM MODE
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.scrollContent}
                        keyboardShouldPersistTaps="handled"
                    >
                        <View style={styles.content}>
                            {!hasData && (
                                <View style={styles.heroSection}>
                                    <Text style={[styles.heroTitle, { color: currentTheme.colors.text }]}>What can you{'\n'}deliver?</Text>
                                    <Text style={[styles.heroSub, { color: currentTheme.colors.textMuted }]}>
                                        Add your tech stack and availability. More signals = better matches.
                                    </Text>
                                </View>
                            )}

                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Zap size={16} color={currentTheme.colors.primary} />
                                    <Text style={[styles.sectionLabel, { color: currentTheme.colors.textMuted }]}>Technical Stack</Text>
                                </View>

                                <SurfaceCard style={styles.card}>
                                    <View style={[styles.inputContainer, { backgroundColor: alpha(currentTheme.colors.text, 0.03), borderColor: errors.skills ? currentTheme.colors.error : alpha(currentTheme.colors.border, 0.1) }]}>
                                        <TextInput
                                            style={[styles.input, { color: currentTheme.colors.text }]}
                                            placeholder="Add a skill..."
                                            placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.5)}
                                            value={skillInput}
                                            onChangeText={(text) => { setSkillInput(text); setShowSuggestions(true); }}
                                            onSubmitEditing={() => addSkill(skillInput)}
                                            blurOnSubmit={false}
                                        />
                                        {skillInput.length > 0 && (
                                            <TouchableOpacity onPress={() => addSkill(skillInput)} style={[styles.addInlineBtn, { backgroundColor: currentTheme.colors.primary }]}>
                                                <Plus size={16} color={currentTheme.colors.background} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    {errors.skills && <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>{errors.skills.message}</Text>}

                                    {showSuggestions && skillInput.length > 0 && suggestions.length > 0 && (
                                        <View style={styles.suggestionsContainer}>
                                            {suggestions.map((s) => (
                                                <TouchableOpacity
                                                    key={s}
                                                    style={[styles.suggestionItem, { backgroundColor: alpha(currentTheme.colors.primary, 0.05) }]}
                                                    onPress={() => addSkill(s)}
                                                >
                                                    <Text style={[styles.suggestionText, { color: currentTheme.colors.primary }]}>{s}</Text>
                                                    <Plus size={12} color={currentTheme.colors.primary} />
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}

                                    <View style={styles.tagContainer}>
                                        {skills.length === 0 ? (
                                            <Text style={[styles.emptyText, { color: currentTheme.colors.textMuted }]}>No skills added yet</Text>
                                        ) : (
                                            skills.map((skill) => (
                                                <TouchableOpacity
                                                    key={skill}
                                                    activeOpacity={0.7}
                                                    onPress={() => removeSkill(skill)}
                                                    style={[styles.tag, { backgroundColor: currentTheme.colors.text }]}
                                                >
                                                    <Text style={[styles.tagText, { color: currentTheme.colors.background }]}>{skill}</Text>
                                                    <X size={12} color={currentTheme.colors.background} />
                                                </TouchableOpacity>
                                            ))
                                        )}
                                    </View>
                                </SurfaceCard>
                            </View>

                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Timer size={16} color={currentTheme.colors.primary} />
                                    <Text style={[styles.sectionLabel, { color: currentTheme.colors.textMuted }]}>Availability</Text>
                                </View>
                                <View style={styles.tileContainer}>
                                    {AVAILABILITY_OPTIONS.map((opt) => {
                                        const isActive = availability === opt.value;
                                        return (
                                            <TouchableOpacity
                                                key={opt.value}
                                                activeOpacity={0.8}
                                                style={[styles.tile, { backgroundColor: isActive ? currentTheme.colors.primary : alpha(currentTheme.colors.text, 0.03), borderColor: isActive ? currentTheme.colors.primary : alpha(currentTheme.colors.border, 0.1) }]}
                                                onPress={() => {
                                                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    setValue('availability', opt.value as Availability, { shouldValidate: true });
                                                }}
                                            >
                                                <Text style={[styles.tileText, { color: isActive ? currentTheme.colors.background : currentTheme.colors.text }]}>{opt.label}</Text>
                                                {isActive && <Check size={14} color={currentTheme.colors.background} strokeWidth={4} />}
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
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
    viewSection: { marginBottom: 28, marginTop: 20 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    sectionLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
    card: { padding: 16, borderRadius: 28 },
    viewCard: { padding: 20, borderRadius: 24 },
    viewFieldLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 6 },
    viewFieldValue: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 56, borderRadius: 18, borderWidth: 1 },
    input: { flex: 1, fontSize: 16, fontWeight: '600' },
    errorText: { fontSize: 11, color: '#FF4444', marginTop: 8, marginLeft: 4, fontWeight: '600' },
    addInlineBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    suggestionsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
    suggestionItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
    suggestionText: { fontSize: 12, fontWeight: '700' },
    tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, minHeight: 40 },
    tag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
    tagText: { fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
    viewTag: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
    viewTagText: { fontSize: 13, fontWeight: '700' },
    emptyText: { fontSize: 14, fontStyle: 'italic', padding: 8 },
    tileContainer: { gap: 10 },
    tile: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, height: 64, borderRadius: 20, borderWidth: 1 },
    tileText: { fontSize: 16, fontWeight: '800' },
    editBlock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 20, borderWidth: 1, marginTop: 8 },
    editBlockText: { fontSize: 14, fontWeight: '700' },
});

export default memo(EditSkillsScreen);

