import React, { memo } from 'react';
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
import { ChevronLeft, Check, X, Plus, Zap, Timer } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { COMMON_SKILLS, AVAILABILITY_OPTIONS } from '@/utils/constants';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { useSkills } from '@/hooks/useSkills';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { PremiumHeader, SurfaceCard } from '@/system/components/PremiumPrimitives';

type Props = NativeStackScreenProps<RootStackParamList, 'EditSkills'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const EditSkillsScreen: React.FC<Props> = memo(({ navigation }: Props) => {
    const { currentTheme } = useTheme();

    const {
        saving,
        skills,
        skillInput,
        setSkillInput,
        availability,
        setAvailability,
        showSuggestions,
        setShowSuggestions,
        addSkill,
        removeSkill,
        handleSave,
    } = useSkills(navigation);

    const suggestions = COMMON_SKILLS.filter(
        s => s.toLowerCase().includes(skillInput.toLowerCase()) && !skills.includes(s)
    ).slice(0, 5);

    return (
        <Screen safe={false}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={[styles.stickyHeader, { paddingTop: Platform.OS === 'ios' ? 50 : 20 }]}>
                    <PremiumHeader 
                        title="Capability" 
                        subtitle="Skills & Availability" 
                        leftSlot={
                            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                                <ChevronLeft size={24} color={currentTheme.colors.text} />
                            </TouchableOpacity>
                        }
                        rightSlot={
                            <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
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
                    keyboardShouldPersistTaps="handled"
                >
                    <View style={styles.content}>
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Zap size={16} color={currentTheme.colors.primary} />
                                <Text style={[styles.sectionLabel, { color: currentTheme.colors.textMuted }]}>Technical Stack</Text>
                            </View>
                            <SurfaceCard style={styles.card}>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={[styles.input, { color: currentTheme.colors.text, borderColor: alpha(currentTheme.colors.border, 0.5) }]}
                                        placeholder="Add skill (e.g. React Native)"
                                        placeholderTextColor={currentTheme.colors.textMuted}
                                        value={skillInput}
                                        onChangeText={(text) => {
                                            setSkillInput(text);
                                            setShowSuggestions(true);
                                        }}
                                        onSubmitEditing={() => addSkill(skillInput)}
                                        blurOnSubmit={false}
                                    />
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        style={[styles.addBtn, { backgroundColor: currentTheme.colors.primary }]}
                                        onPress={() => addSkill(skillInput)}
                                    >
                                        <Plus size={20} color={currentTheme.colors.background} />
                                    </TouchableOpacity>
                                </View>

                                {showSuggestions && skillInput.length > 0 && suggestions.length > 0 && (
                                    <View style={[styles.suggestionsContainer, { backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }]}>
                                        {suggestions.map((s) => (
                                            <TouchableOpacity
                                                key={s}
                                                style={[styles.suggestionItem, { borderBottomColor: alpha(currentTheme.colors.border, 0.5) }]}
                                                onPress={() => addSkill(s)}
                                            >
                                                <Text style={[styles.suggestionText, { color: currentTheme.colors.text }]}>{s}</Text>
                                                <Plus size={14} color={currentTheme.colors.primary} />
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}

                                <View style={styles.tagContainer}>
                                    {skills.length === 0 ? (
                                        <Text style={[styles.emptyText, { color: currentTheme.colors.textMuted }]}>No skills added yet</Text>
                                    ) : (
                                        skills.map((skill) => (
                                            <View key={skill} style={[styles.tag, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                                                <Text style={[styles.tagText, { color: currentTheme.colors.primary }]}>{skill}</Text>
                                                <TouchableOpacity onPress={() => removeSkill(skill)}>
                                                    <X size={14} color={currentTheme.colors.primary} style={styles.tagClose} />
                                                </TouchableOpacity>
                                            </View>
                                        ))
                                    )}
                                </View>
                            </SurfaceCard>
                        </View>

                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Timer size={16} color={currentTheme.colors.primary} />
                                <Text style={[styles.sectionLabel, { color: currentTheme.colors.textMuted }]}>Working Hours</Text>
                            </View>
                            <SurfaceCard style={styles.card}>
                                <View style={styles.availabilityList}>
                                    {AVAILABILITY_OPTIONS.map((opt, index) => (
                                        <TouchableOpacity
                                            key={opt.value}
                                            activeOpacity={0.7}
                                            style={[
                                                styles.optionItem,
                                                index !== AVAILABILITY_OPTIONS.length - 1 && { borderBottomWidth: 1, borderBottomColor: alpha(currentTheme.colors.border, 0.5) },
                                                availability === opt.value && { backgroundColor: alpha(currentTheme.colors.primary, 0.03) }
                                            ]}
                                            onPress={() => setAvailability(opt.value)}
                                        >
                                            <View style={[
                                                styles.radio,
                                                { borderColor: availability === opt.value ? currentTheme.colors.primary : currentTheme.colors.border },
                                            ]}>
                                                {availability === opt.value && <View style={[styles.radioInner, { backgroundColor: currentTheme.colors.primary }]} />}
                                            </View>
                                            <Text style={[
                                                styles.optionText,
                                                { color: availability === opt.value ? currentTheme.colors.text : currentTheme.colors.textMuted },
                                                availability === opt.value && { fontWeight: '800' }
                                            ]}>
                                                {opt.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </SurfaceCard>
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
        padding: 0,
        borderRadius: 24,
        overflow: 'hidden',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
    },
    input: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderRadius: 14,
        paddingHorizontal: 16,
        height: 50,
        fontSize: 15,
        fontWeight: '600',
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
    },
    addBtn: {
        width: 50,
        height: 50,
        borderTopRightRadius: 14,
        borderBottomRightRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    suggestionsContainer: {
        marginHorizontal: 12,
        marginBottom: 12,
        borderRadius: 16,
        borderWidth: 1,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    suggestionText: {
        fontSize: 14,
        fontWeight: '600',
    },
    tagContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 16,
        paddingTop: 4,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginRight: 8,
        marginBottom: 8,
    },
    tagText: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tagClose: {
        marginLeft: 6,
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '500',
        fontStyle: 'italic',
        width: '100%',
        textAlign: 'center',
        marginVertical: 8,
    },
    availabilityList: {
        overflow: 'hidden',
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 18,
    },
    radio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        marginRight: 14,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 0,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
    },
    optionText: {
        fontSize: 15,
        fontWeight: '600',
    },
});

export default memo(EditSkillsScreen);
