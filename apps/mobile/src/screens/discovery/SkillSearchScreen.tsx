import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { ChevronLeft, Plus, Check, Search } from 'lucide-react-native';
import { FlashList } from '@shopify/flash-list';
import { JobCard } from '@/system/components/OpportunityCard';
import { useAuthStore } from '@/store/useAuthStore';
import { useFeedStore } from '@/store/useFeedStore';
import { alpha } from '@/theme';
import * as Haptics from 'expo-haptics';
import { useToast } from '@/contexts/ToastContext';
import { PremiumHeader } from '@/system/components/PremiumPrimitives';
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
    const listRef = useRef<any>(null);

    useEffect(() => {
        if (!hasHydrated) {
            void hydrate();
        }
    }, [hasHydrated, hydrate]);

    const hasSkill = useMemo(() => {
        return (profile?.skills || []).some(s => s.toLowerCase() === skill.toLowerCase());
    }, [profile?.skills, skill]);

    const results = useMemo(() => {
        return cachedItems.filter(item => matchesSkillQuery(item, inputValue));
    }, [cachedItems, inputValue]);

    const handleSearchChange = (text: string) => {
        setInputValue(text);
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
        await toggleSkillByName(skill);
    };

    return (
        <View style={[styles.container, { backgroundColor: currentTheme.colors.background }]}>
            <View style={{ paddingTop: insets.top + 30 }}>
                <PremiumHeader
                    title="Skill Search"
                    leftSlot={
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={[styles.headerIconButton, { backgroundColor: alpha(currentTheme.colors.text, 0.05) }]}
                            activeOpacity={0.7}
                        >
                            <ChevronLeft size={24} color={currentTheme.colors.text} />
                        </TouchableOpacity>
                    }
                    rightSlot={normalizeSkill(inputValue) === normalizeSkill(skill) ? (
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
                                {hasSkill ? 'In Profile' : 'Add Skill'}
                            </Text>
                        </TouchableOpacity>
                    ) : null}
                />
                <View style={[styles.searchContainer, { backgroundColor: currentTheme.colors.background }]}>
                    <PremiumSearchBar
                        value={inputValue}
                        onChangeText={handleSearchChange}
                        onClear={() => handleSearchChange('')}
                        placeholder="Search skills..."
                    />
                </View>
            </View>

            {inputValue.trim() === '' ? (
                <View style={{ flex: 1 }}>
                    <View style={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6 }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: currentTheme.colors.textMuted, letterSpacing: 0.5 }}>POPULAR SKILLS (TAP TO SEARCH)</Text>
                    </View>
                    <FlashList
                        data={metadataSkills}
                        keyExtractor={(item) => item}
                        numColumns={2}
                        // @ts-expect-error - FlashList typing bug with estimatedItemSize
                        estimatedItemSize={60}
                        contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 6, paddingBottom: insets.bottom + 20 }}
                        renderItem={({ item }) => {
                            const isAdded = (profile?.skills || []).some(s => s.toLowerCase() === item.toLowerCase());
                            return (
                                <TouchableOpacity
                                    onPress={() => handleSearchChange(item)}
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
    searchContainer: {
        paddingHorizontal: 20,
        paddingBottom: 12,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        height: 40,
        borderRadius: 20,
        paddingHorizontal: 12,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        height: '100%',
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
