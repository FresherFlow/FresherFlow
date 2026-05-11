import React, { memo } from 'react';
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
import { ChevronLeft, Check, Plus, X, Target, MapPin, Briefcase, Globe } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { OPPORTUNITY_TYPES, WORK_MODES, INDIAN_CITIES } from '@/utils/constants';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';
import { usePreferences } from '@/hooks/usePreferences';

// Premium System
import { Screen } from '@/system/layout/Layout';
import { PremiumHeader, SurfaceCard } from '@/system/components/PremiumPrimitives';

type Props = NativeStackScreenProps<RootStackParamList, 'EditPreferences'>;

const alpha = (color: string, opacity: number) => {
    if (color.startsWith('rgba')) return color;
    return `${color}${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
};

const EditPreferencesScreen: React.FC<Props> = memo(({ navigation }: Props) => {
    const { currentTheme } = useTheme();

    const {
        saving,
        interestedIn, setInterestedIn,
        workModes, setWorkModes,
        preferredCities, setPreferredCities,
        cityInput, setCityInput,
        showCitySuggestions, setShowCitySuggestions,
        toggleItem,
        addCity,
        handleSave,
    } = usePreferences(navigation);

    const citySuggestions = INDIAN_CITIES.filter(
        c => c.toLowerCase().includes(cityInput.toLowerCase()) && !preferredCities.includes(c)
    ).slice(0, 5);

    return (
        <Screen safe={false}>
            <StatusBar barStyle={currentTheme.mode === 'dark' ? 'light-content' : 'dark-content'} />
            
            <View style={[styles.stickyHeader, { paddingTop: Platform.OS === 'ios' ? 50 : 20 }]}>
                <PremiumHeader 
                    title="Interests" 
                    subtitle="Target Career Assets" 
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
            >
                <View style={styles.content}>
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
                                        activeOpacity={0.7}
                                        style={[
                                            styles.gridItem,
                                            { backgroundColor: currentTheme.colors.surface, borderColor: alpha(currentTheme.colors.border, 0.5) },
                                            active && { backgroundColor: alpha(currentTheme.colors.primary, 0.1), borderColor: currentTheme.colors.primary }
                                        ]}
                                        onPress={() => toggleItem(interestedIn, setInterestedIn, type)}
                                    >
                                        <Text style={[
                                            styles.gridItemText,
                                            { color: currentTheme.colors.textMuted },
                                            active && { color: currentTheme.colors.primary }
                                        ]}>
                                            {type}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

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
                                        activeOpacity={0.7}
                                        style={[
                                            styles.gridItem,
                                            { backgroundColor: currentTheme.colors.surface, borderColor: alpha(currentTheme.colors.border, 0.5) },
                                            active && { backgroundColor: alpha(currentTheme.colors.primary, 0.1), borderColor: currentTheme.colors.primary }
                                        ]}
                                        onPress={() => toggleItem(workModes, setWorkModes, mode)}
                                    >
                                        <Text style={[
                                            styles.gridItemText,
                                            { color: currentTheme.colors.textMuted },
                                            active && { color: currentTheme.colors.primary }
                                        ]}>
                                            {mode}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Globe size={16} color={currentTheme.colors.primary} />
                            <Text style={[styles.sectionLabel, { color: currentTheme.colors.textMuted }]}>Target Locations</Text>
                        </View>
                        <SurfaceCard style={styles.card}>
                            <View style={styles.cityInputWrapper}>
                                <TextInput
                                    style={[styles.input, { color: currentTheme.colors.text, borderColor: alpha(currentTheme.colors.border, 0.5) }]}
                                    placeholder="Add city (e.g. Bangalore)"
                                    placeholderTextColor={currentTheme.colors.textMuted}
                                    value={cityInput}
                                    onChangeText={(text) => {
                                        setCityInput(text);
                                        setShowCitySuggestions(true);
                                    }}
                                    onSubmitEditing={() => addCity(cityInput)}
                                />
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    style={[styles.addBtn, { backgroundColor: currentTheme.colors.primary }]}
                                    onPress={() => addCity(cityInput)}
                                >
                                    <Plus size={20} color={currentTheme.colors.background} />
                                </TouchableOpacity>
                            </View>

                            {showCitySuggestions && cityInput.length > 0 && citySuggestions.length > 0 && (
                                <View style={[styles.suggestionsContainer, { backgroundColor: currentTheme.colors.surface, borderColor: currentTheme.colors.border }]}>
                                    {citySuggestions.map((c) => (
                                        <TouchableOpacity
                                            key={c}
                                            style={[styles.suggestionItem, { borderBottomColor: alpha(currentTheme.colors.border, 0.5) }]}
                                            onPress={() => addCity(c)}
                                        >
                                            <Text style={[styles.suggestionText, { color: currentTheme.colors.text }]}>{c}</Text>
                                            <Plus size={14} color={currentTheme.colors.primary} />
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}

                            <View style={styles.cityTagContainer}>
                                {preferredCities.length === 0 ? (
                                    <Text style={[styles.emptyText, { color: currentTheme.colors.textMuted }]}>Any location preferred</Text>
                                ) : (
                                    preferredCities.map(city => (
                                        <View key={city} style={[styles.cityTag, { backgroundColor: alpha(currentTheme.colors.primary, 0.1) }]}>
                                            <MapPin size={12} color={currentTheme.colors.primary} style={{ marginRight: 6 }} />
                                            <Text style={[styles.cityTagText, { color: currentTheme.colors.primary }]}>{city}</Text>
                                            <TouchableOpacity onPress={() => setPreferredCities(preferredCities.filter(c => c !== city))}>
                                                <X size={14} color={currentTheme.colors.primary} style={{ marginLeft: 6 }} />
                                            </TouchableOpacity>
                                        </View>
                                    ))
                                )}
                            </View>
                        </SurfaceCard>
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
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    gridItem: {
        flex: 1,
        minWidth: '45%',
        height: 52,
        borderRadius: 16,
        borderWidth: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
    },
    gridItemText: {
        fontSize: 13,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    card: {
        padding: 0,
        borderRadius: 24,
        overflow: 'hidden',
    },
    cityInputWrapper: {
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
    cityTagContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 16,
        paddingTop: 4,
    },
    cityTag: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginRight: 8,
        marginBottom: 8,
    },
    cityTagText: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '500',
        fontStyle: 'italic',
        width: '100%',
        textAlign: 'center',
        marginVertical: 8,
    },
});

export default memo(EditPreferencesScreen);
