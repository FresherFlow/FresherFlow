import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';

import { Availability } from '@fresherflow/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EditSkills'>;

import { useProfile } from './useProfile';

export const useSkills = (navigation: Props['navigation']) => {
    const { profile, updateReadiness, loadingCache } = useProfile();
    const [saving, setSaving] = useState(false);

    const [skills, setSkills] = useState<string[]>(profile?.skills || []);
    const [skillInput, setSkillInput] = useState('');
    const [availability, setAvailability] = useState<Availability>(profile?.availability as Availability || 'IMMEDIATE');
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Sync form fields when AsyncStorage profile loads
    useEffect(() => {
        if (!profile) return;
        if (profile.skills) setSkills(profile.skills);
        if (profile.availability) setAvailability(profile.availability);
    }, [profile?.skills?.length, profile?.availability]);

    const addSkill = useCallback((skill: string) => {
        const trimmed = skill.trim();
        if (trimmed && !skills.includes(trimmed)) {
            setSkills(prev => [...prev, trimmed]);
            setSkillInput('');
            setShowSuggestions(false);
        }
    }, [skills]);

    const removeSkill = useCallback((skill: string) => {
        setSkills(prev => prev.filter(s => s !== skill));
    }, []);

    const handleSave = useCallback(async () => {
        if (skills.length === 0) {
            Alert.alert('Details Required', 'Please add at least one skill');
            return;
        }

        setSaving(true);
        try {
            await updateReadiness({
                availability,
                skills,
            });
            // Screen will switch to view mode via its own useEffect
        } catch (error: unknown) {
            Alert.alert('Error', (error as Error).message || 'Failed to update skills');
        } finally {
            setSaving(false);
        }
    }, [skills, availability, updateReadiness, navigation]);

    return {
        profile,
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
        loadingCache,
    };
};
