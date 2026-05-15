import React, { memo, useState, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Plus, X, Target, MapPin, Briefcase, Globe, Pencil } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { OPPORTUNITY_TYPES, WORK_MODES, INDIAN_CITIES } from '@/utils/constants';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { usePreferences, PreferencesFormData } from '@/hooks/usePreferences';

import { Screen } from '@/system/layout/Layout';
import { SecondaryHeader, SurfaceCard } from '@/system/components/PremiumPrimitives';

type Props = NativeStackScreenProps<RootStackParamList, 'EditPreferences'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const EditPreferencesScreen: React.FC<Props> = memo(({ navigation }: Props) => {
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();

    const {
        profile,
        saving,
        handleSubmit,
        interestedIn,
        workModes,
        preferredCities,
        cityInput,
        setCityInput,
        showCitySuggestions,
        setShowCitySuggestions,
        toggleItem,
        addCity,
        removeCity,
        handleSave,
        loadingCache,
        isValid,
        errors,
    } = usePreferences();

    const hasData = (profile?.interestedIn?.length ?? 0) > 0;
    const [isEditing, setIsEditing] = useState(false);
    const [modeInitialized, setModeInitialized] = useState(false);

    // Handle initial mode setting once cache is loaded
    React.useEffect(() => {
        if (!loadingCache && !modeInitialized) {
            setIsEditing(!hasData);
            setModeInitialized(true);
        }
    }, [loadingCache, hasData, modeInitialized]);

    const citySuggestions = INDIAN_CITIES.filter(
        c => c.toLowerCase().includes(cityInput.toLowerCase()) && !preferredCities.includes(c)
    ).slice(0, 5);

    const onToggle = (field: keyof PreferencesFormData, item: string) => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        toggleItem(field, item);
    };

    const onSave = useCallback(async () => {
        void handleSubmit(async (data: PreferencesFormData) => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            await handleSave(data);
            setIsEditing(false);
        })();
    }, [handleSubmit, handleSave]);

    return (
        <Screen safe={false} style={{ backgroundColor: currentTheme.colors.background }}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <View style={[styles.stickyHeader, { paddingTop: insets.top + 10 }]}>
                    <SecondaryHeader
                        title="Interests"
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
                        <View style={{ marginTop: 20 }}>
                            {/* Opportunity Types */}
                            <View style={styles.viewSection}>
                                <View style={styles.sectionHeader}>
                                    <Target size={16} color={currentTheme.colors.primary} />
                                    <Text style={[styles.sectionLabel, { color: currentTheme.colors.textMuted }]}>Looking For</Text>
                                </View>
                                <SurfaceCard style={styles.viewCard}>
                                    <View style={styles.chipRow}>
                                        {(profile?.interestedIn || []).map(type => (
                                            <View key={type} style={[styles.viewChip, { backgroundColor: alpha(currentTheme.colors.primary, 0.08) }]}>
                                                <Text style={[styles.viewChipText, { color: currentTheme.colors.primary }]}>{type}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </SurfaceCard>
                            </View>

                            {/* Work Mode */}
                            <View style={styles.viewSection}>
                                <View style={styles.sectionHeader}>
                                    <Briefcase size={16} color={currentTheme.colors.primary} />
                                    <Text style={[styles.sectionLabel, { color: currentTheme.colors.textMuted }]}>Work Mode</Text>
                                </View>
                                <SurfaceCard style={styles.viewCard}>
                                    <View style={styles.chipRow}>
                                        {(profile?.workModes || []).map(mode => (
                                            <View key={mode} style={[styles.viewChip, { backgroundColor: alpha(currentTheme.colors.text, 0.06) }]}>
                                                <Text style={[styles.viewChipText, { color: currentTheme.colors.text }]}>{mode}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </SurfaceCard>
                            </View>

                            {/* Locations */}
                            <View style={styles.viewSection}>
                                <View style={styles.sectionHeader}>
                                    <MapPin size={16} color={currentTheme.colors.primary} />
                                    <Text style={[styles.sectionLabel, { color: currentTheme.colors.textMuted }]}>Target Cities</Text>
                                </View>
                                <SurfaceCard style={styles.viewCard}>
                                    {(profile?.preferredCities || []).length === 0 ? (
                                        <Text style={[styles.emptyText, { color: currentTheme.colors.textMuted }]}>Any location</Text>
                                    ) : (
                                        <View style={styles.chipRow}>
                                            {(profile?.preferredCities || []).map(city => (
                                                <View key={city} style={[styles.viewChip, { backgroundColor: alpha(currentTheme.colors.text, 0.06) }]}>
                                                    <MapPin size={10} color={currentTheme.colors.textMuted} />
                                                    <Text style={[styles.viewChipText, { color: currentTheme.colors.text }]}>{city}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </SurfaceCard>
                            </View>

                            <TouchableOpacity
                                style={[styles.editBlock, { borderColor: alpha(currentTheme.colors.primary, 0.2), backgroundColor: alpha(currentTheme.colors.primary, 0.04) }]}
                                onPress={() => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setIsEditing(true); }}
                                activeOpacity={0.7}
                            >
                                <Pencil size={14} color={currentTheme.colors.primary} />
                                <Text style={[styles.editBlockText, { color: currentTheme.colors.primary }]}>Edit Preferences</Text>
                            </TouchableOpacity>
                        </View>
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
                                    <Text style={[styles.heroTitle, { color: currentTheme.colors.text }]}>Aim with{'\n'}precision.</Text>
                                    <Text style={[styles.heroSub, { color: currentTheme.colors.textMuted }]}>
                                        Tell us where you want to go. We'll filter the signals to match your intent.
                                    </Text>
                                </View>
                            )}

                            {/* Opportunity Type */}
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Target size={16} color={currentTheme.colors.primary} />
                                    <Text style={[styles.sectionLabel, { color: currentTheme.colors.textMuted }]}>Opportunity Type</Text>
                                </View>
                                <View style={styles.grid}>
                                    {OPPORTUNITY_TYPES.map(type => {
                                        const active = interestedIn.includes(type);
                                        return (
                                            <TouchableOpacity
                                                key={type}
                                                activeOpacity={0.8}
                                                style={[styles.gridItem, { backgroundColor: active ? currentTheme.colors.text : alpha(currentTheme.colors.text, 0.03), borderColor: active ? currentTheme.colors.text : alpha(currentTheme.colors.border, 0.1) }]}
                                                onPress={() => onToggle('interestedIn', type)}
                                            >
                                                <Text style={[styles.gridItemText, { color: active ? currentTheme.colors.background : currentTheme.colors.text }]}>{type}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                                {errors.interestedIn && <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>{errors.interestedIn.message}</Text>}
                            </View>

                            {/* Work Mode */}
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Briefcase size={16} color={currentTheme.colors.primary} />
                                    <Text style={[styles.sectionLabel, { color: currentTheme.colors.textMuted }]}>Work Mode</Text>
                                </View>
                                <View style={styles.grid}>
                                    {WORK_MODES.map(mode => {
                                        const active = workModes.includes(mode);
                                        return (
                                            <TouchableOpacity
                                                key={mode}
                                                activeOpacity={0.8}
                                                style={[styles.gridItem, { backgroundColor: active ? currentTheme.colors.text : alpha(currentTheme.colors.text, 0.03), borderColor: active ? currentTheme.colors.text : alpha(currentTheme.colors.border, 0.1) }]}
                                                onPress={() => onToggle('workModes', mode)}
                                            >
                                                <Text style={[styles.gridItemText, { color: active ? currentTheme.colors.background : currentTheme.colors.text }]}>{mode}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                                {errors.workModes && <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>{errors.workModes.message}</Text>}
                            </View>

                            {/* Locations */}
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Globe size={16} color={currentTheme.colors.primary} />
                                    <Text style={[styles.sectionLabel, { color: currentTheme.colors.textMuted }]}>Target Locations</Text>
                                </View>
                                <SurfaceCard style={styles.card}>
                                    <View style={[styles.inputContainer, { backgroundColor: alpha(currentTheme.colors.text, 0.03), borderColor: errors.preferredCities ? currentTheme.colors.error : alpha(currentTheme.colors.border, 0.1) }]}>
                                        <TextInput
                                            style={[styles.input, { color: currentTheme.colors.text }]}
                                            placeholder="Add a city..."
                                            placeholderTextColor={alpha(currentTheme.colors.textMuted, 0.4)}
                                            value={cityInput}
                                            onChangeText={(text) => { setCityInput(text); setShowCitySuggestions(true); }}
                                            onSubmitEditing={() => addCity(cityInput)}
                                        />
                                        {cityInput.length > 0 && (
                                            <TouchableOpacity onPress={() => addCity(cityInput)} style={[styles.addInlineBtn, { backgroundColor: currentTheme.colors.primary }]}>
                                                <Plus size={16} color={currentTheme.colors.background} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    {errors.preferredCities && <Text style={[styles.errorText, { color: currentTheme.colors.error }]}>{errors.preferredCities.message}</Text>}

                                    {showCitySuggestions && cityInput.length > 0 && citySuggestions.length > 0 && (
                                        <View style={styles.suggestionsContainer}>
                                            {citySuggestions.map((c) => (
                                                <TouchableOpacity
                                                    key={c}
                                                    style={[styles.suggestionItem, { backgroundColor: alpha(currentTheme.colors.primary, 0.05) }]}
                                                    onPress={() => addCity(c)}
                                                >
                                                    <Text style={[styles.suggestionText, { color: currentTheme.colors.primary }]}>{c}</Text>
                                                    <Plus size={12} color={currentTheme.colors.primary} />
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    )}

                                    <View style={styles.tagContainer}>
                                        {preferredCities.length === 0 ? (
                                            <View style={styles.emptyState}>
                                                <MapPin size={24} color={alpha(currentTheme.colors.textMuted, 0.2)} />
                                                <Text style={[styles.emptyText, { color: currentTheme.colors.textMuted }]}>Any location preferred</Text>
                                            </View>
                                        ) : (
                                            preferredCities.map(city => (
                                                <TouchableOpacity
                                                    key={city}
                                                    activeOpacity={0.7}
                                                    onPress={() => removeCity(city)}
                                                    style={[styles.tag, { backgroundColor: currentTheme.colors.text }]}
                                                >
                                                    <Text style={[styles.tagText, { color: currentTheme.colors.background }]}>{city}</Text>
                                                    <X size={12} color={currentTheme.colors.background} />
                                                </TouchableOpacity>
                                            ))
                                        )}
                                    </View>
                                </SurfaceCard>
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
    viewSection: { marginBottom: 24 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    sectionLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    gridItem: { flex: 1, minWidth: '45%', height: 56, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
    gridItemText: { fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
    errorText: { fontSize: 11, color: '#FF4444', marginTop: 8, marginLeft: 4, fontWeight: '600' },
    card: { padding: 16, borderRadius: 28 },
    viewCard: { padding: 20, borderRadius: 24 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    viewChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 12 },
    viewChipText: { fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
    inputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 56, borderRadius: 18, borderWidth: 1 },
    input: { flex: 1, fontSize: 16, fontWeight: '600' },
    addInlineBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    suggestionsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
    suggestionItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
    suggestionText: { fontSize: 12, fontWeight: '700' },
    tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 24, minHeight: 50 },
    tag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 },
    tagText: { fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
    emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 20, gap: 12 },
    emptyText: { fontSize: 14, fontWeight: '600', fontStyle: 'italic' },
    editBlock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderRadius: 20, borderWidth: 1, marginTop: 8 },
    editBlockText: { fontSize: 14, fontWeight: '700' },
});

export default memo(EditPreferencesScreen);

