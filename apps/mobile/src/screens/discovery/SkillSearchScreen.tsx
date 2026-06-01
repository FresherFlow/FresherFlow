import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, TextInput, Keyboard, TouchableWithoutFeedback } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { ChevronLeft, Plus, Check, Search, X } from 'lucide-react-native';
import { FlashList } from '@shopify/flash-list';
import Fuse from 'fuse.js';
import { JobCard } from '@/system/components/OpportunityCard';
import { useAuthStore } from '@/store/useAuthStore';
import { useFeedStore } from '@/store/useFeedStore';
import { alpha } from '@/theme';
import * as Haptics from 'expo-haptics';
import { useToast } from '@/contexts/ToastContext';
import { PremiumHeader, SecondaryHeader } from '@/system/components/PremiumPrimitives';
import { PremiumSearchBar } from '@/system/components/PremiumSearchBar';
import { Opportunity } from '@fresherflow/types';

import { useProfile } from '@/hooks/useProfile';
import { useSkillsMetadata } from '@/hooks/useSkillsMetadata';

type Props = NativeStackScreenProps<RootStackParamList, 'SkillSearch'>;

const normalizeSkill = (value: string) => value.toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ').replace(/\s+/g, ' ').trim();

const matchesSkillQuery = (opportunity: Opportunity, query: string) => {
    const normalizedQuery = normalizeSkill(query);
    if (!normalizedQuery) return true;

    const skillMatches = (opportunity.requiredSkills || []).some(skill => {
        const normalizedSkill = normalizeSkill(skill);
        return normalizedSkill === normalizedQuery || normalizedSkill.includes(normalizedQuery);
    });
    if (skillMatches) return true;

    const tagMatches = (opportunity.tags || []).some(tag => normalizeSkill(tag).includes(normalizedQuery));
    if (tagMatches) return true;

    return [
        opportunity.title,
        opportunity.company,
        opportunity.jobFunction,
        ...(opportunity.locations || []),
    ].some(value => normalizeSkill(value || '').includes(normalizedQuery));
};

export default function SkillSearchScreen({ navigation, route }: Props) {
    const { skill } = route.params;
    const insets = useSafeAreaInsets();
    const { currentTheme } = useTheme();
    const { user, isAnonymous } = useAuthStore();
    const { cachedItems, isBootstrapping, hasHydrated, hydrate } = useFeedStore();
    const { showToast } = useToast();
    const { profile, updateReadiness } = useProfile();
    const { skills: metadataSkills } = useSkillsMetadata();

    const [inputValue, setInputValue] = useState(skill);
    const [selectedSkill, setSelectedSkill] = useState<string | null>(skill);
    const listRef = useRef<any>(null);

    useEffect(() => {
        if (!hasHydrated) {
            void hydrate();
        }
    }, [hasHydrated, hydrate]);

    const skillsFuse = useMemo(() => {
        return new Fuse(metadataSkills, {
            threshold: 0.35,
            distance: 10,
        });
    }, [metadataSkills]);

    const suggestions = useMemo(() => {
        if (!inputValue.trim()) return metadataSkills;
        return skillsFuse.search(inputValue).map(r => r.item);
    }, [inputValue, metadataSkills, skillsFuse]);

    const hasSkill = useMemo(() => {
        if (!selectedSkill) return false;
        return (profile?.skills || []).some(s => s.toLowerCase() === selectedSkill.toLowerCase());
    }, [profile?.skills, selectedSkill]);

    const results = useMemo(() => {
        if (!selectedSkill) return [];
        return cachedItems.filter(item => matchesSkillQuery(item, selectedSkill));
    }, [cachedItems, selectedSkill]);

    const handleSearchChange = (text: string) => {
        setInputValue(text);
        setSelectedSkill(null);
    };

    const handleSkillSelect = (selected: string) => {
        setInputValue(selected);
        setSelectedSkill(selected);
        Keyboard.dismiss();
        listRef.current?.scrollToOffset({ offset: 0, animated: false });
    };

    const toggleSkillByName = async (targetSkill: string) => {
        if (isAnonymous) {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            showToast('Please sign in to update your profile', 'info');
            navigation.navigate('Auth');
            return;
        }

        if (!user?.id) return;

        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const currentSkills = profile?.skills || [];
            
            let newSkills = [...currentSkills];
            const isAdding = !newSkills.some(s => s.toLowerCase() === targetSkill.toLowerCase());
            
            if (isAdding) {
                newSkills.push(targetSkill);
                showToast(`Added ${targetSkill} to your profile!`, 'success');
            } else {
                newSkills = newSkills.filter(s => s.toLowerCase() !== targetSkill.toLowerCase());
                showToast(`Removed ${targetSkill} from your profile`, 'info');
            }

            await updateReadiness({
                availability: profile?.availability || 'IMMEDIATE',
                skills: newSkills,
            });
        } catch (error) {
            console.error('Failed to update skill:', error);
            showToast('Failed to update profile', 'error');
        }
    };

    const toggleProfileSkill = async () => {
        if (selectedSkill) {
            await toggleSkillByName(selectedSkill);
        }
    };

    const searchInputRef = useRef<TextInput>(null);

    return (
        <View style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
                <View style={{ paddingTop: insets.top + 10 }}>
                    <SecondaryHeader
                        title="Skill Search"
                        showBack={true}
                        onBack={() => navigation.goBack()}
                    />
                    
                    <View style={[styles.header, { borderBottomWidth: 0, paddingRight: 20, marginTop: -12, paddingBottom: 6 }]}>
                        <View style={[styles.inlineSearchContainer, { backgroundColor: alpha(currentTheme.colors.text, 0.05), marginLeft: 20 }]}>
                            <Search size={18} color={currentTheme.colors.textMuted} />
                            <TextInput
                                ref={searchInputRef}
                                style={[styles.inlineSearchInput, { color: currentTheme.colors.text }]}
                                placeholder="Search skills..."
                                placeholderTextColor={currentTheme.colors.textMuted}
                                value={inputValue}
                                onChangeText={handleSearchChange}
                                autoCorrect={false}
                                autoFocus={false}
                            />
                            {inputValue.length > 0 && (
                                <TouchableOpacity onPress={() => { handleSearchChange(''); Keyboard.dismiss(); }}>
                                    <X size={18} color={currentTheme.colors.textMuted} />
                                </TouchableOpacity>
                            )}
                        </View>

                        {selectedSkill && normalizeSkill(inputValue) === normalizeSkill(selectedSkill) ? (
                            <TouchableOpacity 
                                onPress={toggleProfileSkill}
                                style={[
                                    styles.skillActionChip, 
                                    { 
                                        backgroundColor: hasSkill ? alpha(currentTheme.colors.success, 0.1) : currentTheme.colors.primary,
                                        borderColor: hasSkill ? currentTheme.colors.success : 'transparent',
                                        borderWidth: hasSkill ? 1 : 0
                                    }
                                ]}
                            >
                                {hasSkill ? (
                                    <Check size={14} color={currentTheme.colors.success} />
                                ) : (
                                    <Plus size={14} color={currentTheme.colors.background} />
                                )}
                                <Text style={[
                                    styles.skillActionText,
                                    { color: hasSkill ? currentTheme.colors.success : currentTheme.colors.background }
                                ]}>
                                    {hasSkill ? 'Added' : 'Add Skill'}
                                </Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>
                </View>
            </TouchableWithoutFeedback>

            {selectedSkill === null ? (
                <View style={{ flex: 1 }}>
                    <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: currentTheme.colors.textMuted, letterSpacing: 0.5 }}>
                            {inputValue.trim() === '' ? 'POPULAR SKILLS (TAP TO SEARCH)' : 'SUGGESTED SKILLS'}
                        </Text>
                    </View>
                    <FlashList
                        data={suggestions}
                        keyExtractor={(item) => item}
                        numColumns={2}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                        // @ts-expect-error - FlashList typing bug with estimatedItemSize
                        estimatedItemSize={60}
                        contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 6, paddingBottom: insets.bottom + 20 }}
                        renderItem={({ item }) => {
                            const isAdded = (profile?.skills || []).some(s => s.toLowerCase() === item.toLowerCase());
                            return (
                                <TouchableOpacity
                                    onPress={() => handleSkillSelect(item)}
                                    activeOpacity={0.7}
                                    style={{
                                        flex: 1,
                                        margin: 6,
                                        paddingVertical: 14,
                                        paddingHorizontal: 16,
                                        borderRadius: 14,
                                        backgroundColor: isAdded ? alpha(currentTheme.colors.success, 0.08) : alpha(currentTheme.colors.text, 0.03),
                                        borderWidth: 1,
                                        borderColor: isAdded ? alpha(currentTheme.colors.success, 0.3) : alpha(currentTheme.colors.border, 0.08),
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                    }}
                                >
                                    <Text 
                                        style={{
                                            fontSize: 14,
                                            fontWeight: '700',
                                            color: isAdded ? currentTheme.colors.success : currentTheme.colors.text,
                                            flex: 1,
                                            marginRight: 8,
                                        }}
                                        numberOfLines={1}
                                    >
                                        {item}
                                    </Text>
                                    {isAdded ? (
                                        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: currentTheme.colors.success, alignItems: 'center', justifyContent: 'center' }}>
                                            <Check size={12} color={currentTheme.colors.background} />
                                        </View>
                                    ) : (
                                        <Search size={14} color={currentTheme.colors.textMuted} />
                                    )}
                                </TouchableOpacity>
                            );
                        }}
                    />
                </View>
            ) : isBootstrapping && cachedItems.length === 0 ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="large" color={currentTheme.colors.primary} />
                </View>
            ) : results.length === 0 ? (
                <View style={styles.centerContainer}>
                    <Text style={[styles.emptyText, { color: currentTheme.colors.textMuted }]}>
                        No jobs found requiring "{inputValue}"
                    </Text>
                </View>
            ) : (
                <FlashList
                    ref={listRef}
                    data={results}
                    keyExtractor={(item) => item.id}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    contentContainerStyle={{ paddingTop: 16, paddingBottom: insets.bottom + 20 }}
                    // @ts-expect-error - FlashList typing bug with estimatedItemSize
                    estimatedItemSize={160}
                    renderItem={({ item }) => (
                        <JobCard 
                            opportunity={item} 
                            onPress={() => navigation.push('JobDetail', { opportunity: item, opportunityId: item.id })}
                        />
                    )}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        gap: 8,
    },
    backBtn: {
        padding: 4,
    },
    headerIconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    inlineSearchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 44,
        borderRadius: 22,
        paddingHorizontal: 16,
        marginHorizontal: 8,
    },
    inlineSearchInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 10,
        padding: 0,
    },
    clearBtn: {
        padding: 4,
    },
    actionBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    skillActionRow: {
        paddingHorizontal: 20,
        paddingBottom: 4,
        alignItems: 'flex-start',
    },
    skillActionChip: {
        height: 36,
        borderRadius: 18,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    skillActionText: {
        fontSize: 13,
        fontWeight: '800',
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 16,
        textAlign: 'center',
    }
});
