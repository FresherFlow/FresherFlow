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
import { X, Plus, Zap, Timer, Check } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { COMMON_SKILLS, AVAILABILITY_OPTIONS } from '@/utils/constants';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { useSkills } from '@/hooks/useSkills';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { SecondaryHeader, SurfaceCard } from '@/system/components/PremiumPrimitives';

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
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={[styles.stickyHeader, { paddingTop: Platform.OS === 'ios' ? 50 : 20 }]}>
                    <SecondaryHeader 
                        title="Capability" 
                        onBack={() => navigation.goBack()}
                        rightSlot={
                            <TouchableOpacity 
                                activeOpacity={0.7}
                                onPress={handleSave} 
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
                            <Text style={[styles.heroTitle, { color: currentTheme.colors.text }]}>What can you{'\n'}deliver?</Text>
                            <Text style={[styles.heroSub, { color: currentTheme.colors.textMuted }]}>
                                Add your tech stack and availability. The more signals you provide, the better we match you.
                            </Text>
                        </View>

                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Zap size={16} color={currentTheme.colors.primary} />
                                <Text style={[styles.sectionLabel, { color: currentTheme.colors.textMuted }]}>TECHNICAL STACK</Text>
                            </View>
                            
                            <SurfaceCard style={styles.card}>
                                <View style={[styles.inputContainer, { backgroundColor: alpha(currentTheme.colors.text, 0.03), borderColor: alpha(currentTheme.colors.border, 0.1) }]}>
                                    <TextInput
                                        style={[styles.input, { color: currentTheme.colors.text }]}
                                        placeholder="Add a skill..."
                                        placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.5)}
                                        value={skillInput}
                                        onChangeText={(text) => {
                                            setSkillInput(text);
                                            setShowSuggestions(true);
                                        }}
                                        onSubmitEditing={() => addSkill(skillInput)}
                                        blurOnSubmit={false}
                                    />
                                    {skillInput.length > 0 && (
                                        <TouchableOpacity 
                                            onPress={() => addSkill(skillInput)}
                                            style={[styles.addInlineBtn, { backgroundColor: currentTheme.colors.primary }]}
                                        >
                                            <Plus size={16} color={currentTheme.colors.background} />
                                        </TouchableOpacity>
                                    )}
                                </View>

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
                                        <View style={styles.emptyState}>
                                            <Text style={[styles.emptyText, { color: currentTheme.colors.textMuted }]}>No skills highlighted yet</Text>
                                        </View>
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
                                <Text style={[styles.sectionLabel, { color: currentTheme.colors.textMuted }]}>AVAILABILITY</Text>
                            </View>
                            
                            <View style={styles.tileContainer}>
                                {AVAILABILITY_OPTIONS.map((opt) => {
                                    const isActive = availability === opt.value;
                                    return (
                                        <TouchableOpacity
                                            key={opt.value}
                                            activeOpacity={0.8}
                                            style={[
                                                styles.tile,
                                                { 
                                                    backgroundColor: isActive ? currentTheme.colors.primary : alpha(currentTheme.colors.text, 0.03),
                                                    borderColor: isActive ? currentTheme.colors.primary : alpha(currentTheme.colors.border, 0.1)
                                                }
                                            ]}
                                            onPress={() => setAvailability(opt.value)}
                                        >
                                            <Text style={[
                                                styles.tileText,
                                                { color: isActive ? currentTheme.colors.background : currentTheme.colors.text }
                                            ]}>
                                                {opt.label}
                                            </Text>
                                            {isActive && <Check size={14} color={currentTheme.colors.background} strokeWidth={4} />}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
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
        padding: 16,
        borderRadius: 28,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 56,
        borderRadius: 18,
        borderWidth: 1,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
    },
    addInlineBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    suggestionsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 16,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
    },
    suggestionText: {
        fontSize: 12,
        fontWeight: '700',
    },
    tagContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 24,
        minHeight: 100,
    },
    tag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 14,
    },
    tagText: {
        fontSize: 12,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        gap: 12,
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '600',
        fontStyle: 'italic',
    },
    tileContainer: {
        gap: 10,
    },
    tile: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        height: 64,
        borderRadius: 20,
        borderWidth: 1,
    },
    tileText: {
        fontSize: 16,
        fontWeight: '800',
    },
});

export default memo(EditSkillsScreen);
