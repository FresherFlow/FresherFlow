import React, { memo, useCallback, useMemo, useRef } from 'react';
import Fuse from 'fuse.js';
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
import { Plus, X, Target, MapPin, Briefcase, Globe, Pencil, CheckSquare, Square, Check } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useTheme, AppTheme } from '@/contexts/ThemeContext';
import { OPPORTUNITY_TYPES, WORK_MODES, INDIAN_CITIES } from '@/utils/constants';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { usePreferences, PreferencesFormData } from '@/hooks/usePreferences';
import { useCitiesMetadata } from '@/hooks/useCitiesMetadata';

import { Screen } from '@/system/layout/Layout';
import { SecondaryHeader, SurfaceCard } from '@/system/components/PremiumPrimitives';

type Props = NativeStackScreenProps<RootStackParamList, 'EditPreferences'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

export const PreferencesView = ({ profile, onEdit, currentTheme }: { profile: ReturnType<typeof usePreferences>['profile'], onEdit: () => void, currentTheme: AppTheme }) => {
    const hasPreferences = (profile?.interestedIn || []).length > 0;
    return (
        <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
            <SurfaceCard style={{ padding: 24, borderRadius: 16 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: hasPreferences ? 24 : 0 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Target size={20} color={currentTheme.colors.primary} />
                        <Text style={{ fontSize: 18, fontWeight: '900', color: currentTheme.colors.text }}>Work Preferences</Text>
                    </View>
                    <TouchableOpacity onPress={onEdit} activeOpacity={0.7} style={{ padding: 8, backgroundColor: alpha(currentTheme.colors.primary, 0.1), borderRadius: 12, marginTop: -4 }}>
                        <Pencil size={16} color={currentTheme.colors.primary} />
                    </TouchableOpacity>
                </View>

                {hasPreferences ? (
                    <>
                        {/* Opportunity Types */}
                        <View style={{ marginBottom: 24 }}>
                            <Text style={[styles.viewFieldLabel, { color: currentTheme.colors.textMuted, marginBottom: 12 }]}>LOOKING FOR</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {(profile?.interestedIn || []).map(type => (
                                    <View key={type} style={[styles.viewChip, { backgroundColor: alpha(currentTheme.colors.primary, 0.08) }]}>
                                        <Text style={[styles.viewChipText, { color: currentTheme.colors.primary }]}>{type}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Work Mode */}
                        <View style={{ marginBottom: 24 }}>
                            <Text style={[styles.viewFieldLabel, { color: currentTheme.colors.textMuted, marginBottom: 12 }]}>WORK MODE</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {(profile?.workModes || []).map(mode => (
                                    <View key={mode} style={[styles.viewChip, { backgroundColor: alpha(currentTheme.colors.text, 0.06) }]}>
                                        <Text style={[styles.viewChipText, { color: currentTheme.colors.text }]}>{mode}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Locations */}
                        <View style={{ paddingTop: 20, borderTopWidth: 1, borderTopColor: alpha(currentTheme.colors.border, 0.08) }}>
                            <Text style={[styles.viewFieldLabel, { color: currentTheme.colors.textMuted, marginBottom: 12 }]}>TARGET CITIES</Text>
                            {(profile?.preferredCities || []).length === 0 ? (
                                <Text style={[styles.emptyText, { color: currentTheme.colors.textMuted }]}>Any location</Text>
                            ) : (
                                <>
                                    {(profile?.preferredCities || []).length > 4 ? (
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -24 }} contentContainerStyle={{ paddingHorizontal: 24 }}>
                                            <View style={{ flexDirection: 'column', gap: 8 }}>
                                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                                    {(profile?.preferredCities || []).filter((_, i) => i % 2 === 0).map(city => (
                                                        <View key={city} style={[styles.viewChip, { backgroundColor: alpha(currentTheme.colors.text, 0.06) }]}>
                                                            <MapPin size={10} color={currentTheme.colors.textMuted} />
                                                            <Text style={[styles.viewChipText, { color: currentTheme.colors.text }]}>{city.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                                    {(profile?.preferredCities || []).filter((_, i) => i % 2 !== 0).map(city => (
                                                        <View key={city} style={[styles.viewChip, { backgroundColor: alpha(currentTheme.colors.text, 0.06) }]}>
                                                            <MapPin size={10} color={currentTheme.colors.textMuted} />
                                                            <Text style={[styles.viewChipText, { color: currentTheme.colors.text }]}>{city.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</Text>
                                                        </View>
                                                    ))}
                                                </View>
                                            </View>
                                        </ScrollView>
                                    ) : (
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                            {(profile?.preferredCities || []).map(city => (
                                                <View key={city} style={[styles.viewChip, { backgroundColor: alpha(currentTheme.colors.text, 0.06) }]}>
                                                    <MapPin size={10} color={currentTheme.colors.textMuted} />
                                                    <Text style={[styles.viewChipText, { color: currentTheme.colors.text }]}>{city.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    )}
                                </>
                            )}
                        </View>
                    </>
                ) : (
                    <TouchableOpacity onPress={onEdit} activeOpacity={0.8} style={{ marginTop: 16, alignItems: 'center', paddingVertical: 14, backgroundColor: alpha(currentTheme.colors.text, 0.02), borderRadius: 16, borderWidth: 1, borderColor: alpha(currentTheme.colors.border, 0.05) }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: currentTheme.colors.textMuted }}>Specify career preferences</Text>
                    </TouchableOpacity>
                )}
            </SurfaceCard>
        </View>
    );
};

const EditPreferencesScreen: React.FC<Props> = memo(({ navigation }: Props) => {
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();
    const { cities } = useCitiesMetadata();

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
        isValid,
        errors,
    } = usePreferences();

    const scrollRef = useRef<ScrollView>(null);

    const hasData = (profile?.interestedIn?.length ?? 0) > 0;

    const citiesFuse = useMemo(() => {
        return new Fuse(cities, {
            threshold: 0.3,
            distance: 20,
            ignoreLocation: true,
        });
    }, [cities]);

    const citySuggestions = useMemo(() => {
        if (!cityInput.trim()) return [];
        return citiesFuse
            .search(cityInput)
            .map(r => r.item)
            .filter(c => !preferredCities.includes(c))
            .slice(0, 5);
    }, [cityInput, preferredCities, citiesFuse]);

    const onToggle = (field: keyof PreferencesFormData, item: string) => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        toggleItem(field, item);
    };

    const onSave = useCallback(async () => {
        void handleSubmit(async (data: PreferencesFormData) => {
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
                        title="Interests"
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
                                <Text style={[styles.heroTitle, { color: currentTheme.colors.text }]}>Job Preferences</Text>
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
                            <View style={styles.checkboxList}>
                                {OPPORTUNITY_TYPES.map(type => {
                                    const active = interestedIn.includes(type);
                                    return (
                                        <TouchableOpacity
                                            key={type}
                                            activeOpacity={0.8}
                                            style={styles.checkboxItem}
                                            onPress={() => onToggle('interestedIn', type)}
                                        >
                                            {active ? (
                                                <CheckSquare size={20} color={currentTheme.colors.primary} />
                                            ) : (
                                                <Square size={20} color={alpha(currentTheme.colors.textMuted, 0.4)} />
                                            )}
                                            <Text style={[styles.checkboxLabel, { color: active ? currentTheme.colors.text : currentTheme.colors.textMuted }]}>{type}</Text>
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
                            <View style={styles.checkboxList}>
                                {WORK_MODES.map(mode => {
                                    const active = workModes.includes(mode);
                                    return (
                                        <TouchableOpacity
                                            key={mode}
                                            activeOpacity={0.8}
                                            style={styles.checkboxItem}
                                            onPress={() => onToggle('workModes', mode)}
                                        >
                                            {active ? (
                                                <CheckSquare size={20} color={currentTheme.colors.primary} />
                                            ) : (
                                                <Square size={20} color={alpha(currentTheme.colors.textMuted, 0.4)} />
                                            )}
                                            <Text style={[styles.checkboxLabel, { color: active ? currentTheme.colors.text : currentTheme.colors.textMuted }]}>{mode}</Text>
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

                                {/* Quick selection popular cities grid */}
                                {(() => {
                                    if (cityInput.length > 0) return null;
                                    const popularCities = INDIAN_CITIES.slice(0, 5).filter(c => !preferredCities.includes(c));
                                    if (popularCities.length === 0) return null;
                                    return (
                                        <View style={{ marginTop: 16 }}>
                                            <Text style={{ fontSize: 11, fontWeight: '800', color: currentTheme.colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>Popular Locations</Text>
                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                                {popularCities.map(city => (
                                                    <TouchableOpacity
                                                        key={city}
                                                        activeOpacity={0.7}
                                                        onPress={() => {
                                                            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                            addCity(city);
                                                        }}
                                                        style={{
                                                            flexDirection: 'row',
                                                            alignItems: 'center',
                                                            gap: 6,
                                                            paddingHorizontal: 12,
                                                            paddingVertical: 8,
                                                            borderRadius: 12,
                                                            backgroundColor: alpha(currentTheme.colors.text, 0.03),
                                                            borderWidth: 1,
                                                            borderColor: alpha(currentTheme.colors.border, 0.05)
                                                        }}
                                                    >
                                                        <Text style={{
                                                            fontSize: 12,
                                                            fontWeight: '700',
                                                            color: currentTheme.colors.textMuted
                                                        }}>{city}</Text>
                                                        <Plus size={12} color={currentTheme.colors.textMuted} />
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </View>
                                    );
                                })()}

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

                                <View style={[styles.tagContainer, { marginTop: 24, marginBottom: 16 }]}>
                                    {preferredCities.length === 0 ? (
                                        <View style={styles.emptyState}>
                                            <MapPin size={24} color={alpha(currentTheme.colors.textMuted, 0.2)} />
                                            <Text style={[styles.emptyText, { color: currentTheme.colors.textMuted }]}>Any location preferred</Text>
                                        </View>
                                    ) : (
                                        <ScrollView 
                                            ref={scrollRef}
                                            style={{ maxHeight: 160 }} 
                                            nestedScrollEnabled 
                                            showsVerticalScrollIndicator={false}
                                            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
                                        >
                                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 4 }}>
                                                {preferredCities.map(city => (
                                                    <TouchableOpacity
                                                        key={city}
                                                        activeOpacity={0.7}
                                                        onPress={() => removeCity(city)}
                                                        style={[styles.tag, { backgroundColor: currentTheme.colors.text }]}
                                                    >
                                                        <Text style={[styles.tagText, { color: currentTheme.colors.background }]}>{city}</Text>
                                                        <X size={12} color={currentTheme.colors.background} />
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </ScrollView>
                                    )}
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
    checkboxList: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, paddingHorizontal: 4 },
    checkboxItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
    checkboxLabel: { fontSize: 16, fontWeight: '700' },
    errorText: { fontSize: 11, marginTop: 8, marginLeft: 4, fontWeight: '600' },
    card: { padding: 16, borderRadius: 16 },
    viewCard: { padding: 20, borderRadius: 16 },
    viewFieldLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, marginBottom: 6 },
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

