import React, { memo, useCallback, useMemo } from 'react';
import Fuse from 'fuse.js';
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
import { X, Plus, Zap, Timer, Pencil } from 'lucide-react-native';
import { useTheme, AppTheme } from '@/contexts/ThemeContext';
import { AVAILABILITY_OPTIONS } from '@/utils/constants';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { useSkills, SkillsFormData } from '@/hooks/useSkills';
import { useSkillsMetadata } from '@/hooks/useSkillsMetadata';
import * as Haptics from 'expo-haptics';
import { Availability } from '@fresherflow/types';

import { Screen } from '@/system/layout/Layout';
import { SecondaryHeader, SurfaceCard } from '@/system/components/PremiumPrimitives';

type Props = NativeStackScreenProps<RootStackParamList, 'EditSkills'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

export const SkillsView = ({ profile, availabilityLabel, onEdit, currentTheme }: { profile: ReturnType<typeof useSkills>['profile'], availabilityLabel: string, onEdit: () => void, currentTheme: AppTheme }) => {
    const hasSkills = (profile?.skills || []).length > 0;
    return (
        <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
            <SurfaceCard style={{ padding: 24, borderRadius: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: hasSkills ? 24 : 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Zap size={20} color={currentTheme.colors.primary} />
                        <Text style={{ fontSize: 18, fontWeight: '900', color: currentTheme.colors.text }}>Skills</Text>
                    </View>
                    <TouchableOpacity onPress={onEdit} activeOpacity={0.7} style={{ padding: 8, backgroundColor: alpha(currentTheme.colors.primary, 0.1), borderRadius: 12, marginTop: -4 }}>
                        <Pencil size={16} color={currentTheme.colors.primary} />
                    </TouchableOpacity>
                </View>

                {hasSkills ? (
                    <>
                        {/* Skills */}
                        <View style={{ marginBottom: 24 }}>
                            <Text style={[styles.viewFieldLabel, { color: currentTheme.colors.textMuted, marginBottom: 12 }]}>SKILLS & EXPERTISE</Text>
                            <View style={styles.tagContainer}>
                                {(profile?.skills || []).map(skill => (
                                    <View key={skill} style={[styles.viewTag, { backgroundColor: alpha(currentTheme.colors.primary, 0.08) }]}>
                                        <Text style={[styles.viewTagText, { color: currentTheme.colors.primary }]}>{skill}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Availability */}
                        <View style={{ paddingTop: 20, borderTopWidth: 1, borderTopColor: alpha(currentTheme.colors.border, 0.08) }}>
                            <Text style={[styles.viewFieldLabel, { color: currentTheme.colors.textMuted, marginBottom: 8 }]}>JOINING TIMELINE</Text>
                            <Text style={[styles.viewFieldValue, { color: currentTheme.colors.text }]}>{availabilityLabel}</Text>
                        </View>
                    </>
                ) : (
                    <View style={{ marginTop: 8 }}>
                        <Text style={{ fontSize: 11, fontWeight: '800', color: currentTheme.colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 }}>SUGGESTED SKILLS</Text>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                            {['React Native', 'TypeScript', 'Node.js', 'Communication', 'JavaScript'].map(skill => (
                                <View key={skill} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: alpha(currentTheme.colors.text, 0.03), borderWidth: 1, borderColor: alpha(currentTheme.colors.border, 0.05) }}>
                                    <Text style={{ fontSize: 12, fontWeight: '600', color: currentTheme.colors.textMuted }}>{skill}</Text>
                                </View>
                            ))}
                        </View>
                        <TouchableOpacity onPress={onEdit} activeOpacity={0.8} style={{ alignItems: 'center', paddingVertical: 14, backgroundColor: alpha(currentTheme.colors.primary, 0.06), borderRadius: 16, borderWidth: 1, borderColor: alpha(currentTheme.colors.primary, 0.1) }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: currentTheme.colors.primary }}>Add your skills</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </SurfaceCard>
        </View>
    );
};

const EditSkillsScreen: React.FC<Props> = memo(({ navigation }: Props) => {
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();
    const { skills: metadataSkills } = useSkillsMetadata();

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
        isValid,
        errors,
        setValue,
    } = useSkills();

    const hasData = (profile?.skills?.length ?? 0) > 0;

    const skillsFuse = useMemo(() => {
        return new Fuse(metadataSkills, {
            threshold: 0.35,
            distance: 10,
        });
    }, [metadataSkills]);

    const suggestions = useMemo(() => {
        if (!skillInput.trim()) return [];
        return skillsFuse
            .search(skillInput)
            .map(r => r.item)
            .filter(s => !skills.includes(s))
            .slice(0, 5);
    }, [skillInput, skills, skillsFuse]);

    const onSave = useCallback(async () => {
        void handleSubmit(async (data: SkillsFormData) => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await handleSave(data);
            navigation.goBack();
        })();
    }, [handleSubmit, handleSave, navigation]);



    return (
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <View style={[styles.stickyHeader, { paddingTop: insets.top + 10 }]}>
                    <SecondaryHeader
                        title="Skills"
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
                                <Text style={[styles.heroTitle, { color: currentTheme.colors.text }]}>What can you{'\n'}deliver?</Text>
                                <Text style={[styles.heroSub, { color: currentTheme.colors.textMuted }]}>
                                    Add your skills and availability. More signals = better matches.
                                </Text>
                            </View>
                        )}

                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Zap size={16} color={currentTheme.colors.primary} />
                                <Text style={[styles.sectionLabel, { color: currentTheme.colors.textMuted }]}>Skills & Expertise</Text>
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
                                        {suggestions.map(sug => (
                                            <TouchableOpacity
                                                key={sug}
                                                activeOpacity={0.7}
                                                onPress={() => { addSkill(sug); setSkillInput(''); }}
                                                style={[styles.suggestionItem, { backgroundColor: alpha(currentTheme.colors.primary, 0.08) }]}
                                            >
                                                <Text style={[styles.suggestionText, { color: currentTheme.colors.primary }]}>{sug}</Text>
                                                <Plus size={12} color={currentTheme.colors.primary} />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}

                                <View style={styles.tagContainer}>
                                    {skills.length === 0 ? (
                                        <View style={{ flex: 1, paddingVertical: 8 }}>
                                            <Text style={{ fontSize: 12, fontWeight: '700', color: currentTheme.colors.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Suggested skills (Tap to add):</Text>
                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                                {metadataSkills.slice(0, 16).map(skill => (
                                                    <TouchableOpacity
                                                        key={skill}
                                                        activeOpacity={0.7}
                                                        onPress={() => {
                                                            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                            addSkill(skill);
                                                        }}
                                                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: alpha(currentTheme.colors.primary, 0.08), borderWidth: 1, borderColor: alpha(currentTheme.colors.primary, 0.1) }}
                                                    >
                                                        <Text style={{ fontSize: 12, fontWeight: '700', color: currentTheme.colors.primary }}>{skill}</Text>
                                                        <Plus size={12} color={currentTheme.colors.primary} />
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </View>
                                    ) : (
                                        skills.map(skill => (
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
                            <SurfaceCard style={[styles.card, { paddingVertical: 8 }]}>
                                {AVAILABILITY_OPTIONS.map((opt, index) => {
                                    const isActive = availability === opt.value;
                                    return (
                                        <TouchableOpacity
                                            key={opt.value}
                                            activeOpacity={0.7}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                paddingVertical: 16,
                                                paddingHorizontal: 4,
                                                borderBottomWidth: index === AVAILABILITY_OPTIONS.length - 1 ? 0 : 1,
                                                borderBottomColor: alpha(currentTheme.colors.border, 0.05),
                                            }}
                                            onPress={() => {
                                                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                setValue('availability', opt.value as Availability, { shouldValidate: true });
                                            }}
                                        >
                                            <View style={{
                                                width: 20,
                                                height: 20,
                                                borderRadius: 10,
                                                borderWidth: 2,
                                                borderColor: isActive ? currentTheme.colors.primary : alpha(currentTheme.colors.text, 0.3),
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                marginRight: 14,
                                            }}>
                                                {isActive && (
                                                    <View style={{
                                                        width: 10,
                                                        height: 10,
                                                        borderRadius: 5,
                                                        backgroundColor: currentTheme.colors.primary,
                                                    }} />
                                                )}
                                            </View>
                                            <Text style={{
                                                fontSize: 16,
                                                fontWeight: isActive ? '800' : '600',
                                                color: currentTheme.colors.text,
                                            }}>{opt.label}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </SurfaceCard>
                        </View>
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
    viewSection: { marginBottom: 28, marginTop: 20 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    sectionLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
    card: { padding: 16, borderRadius: 16 },
    viewCard: { padding: 20, borderRadius: 16 },
    viewFieldLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 6 },
    viewFieldValue: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 56, borderRadius: 18, borderWidth: 1 },
    input: { flex: 1, fontSize: 16, fontWeight: '600' },
    errorText: { fontSize: 11, marginTop: 8, marginLeft: 4, fontWeight: '600' },
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

