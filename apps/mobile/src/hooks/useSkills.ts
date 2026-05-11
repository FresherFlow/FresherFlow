import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { profileApi } from '@fresherflow/api-client';
import { useUserAuth as useAuth } from '@repo/frontend-core';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'EditSkills'>;

export const useSkills = (navigation: Props['navigation']) => {
    const { profile, refreshMe } = useAuth();
    const [saving, setSaving] = useState(false);

    const [skills, setSkills] = useState<string[]>(profile?.skills || []);
    const [skillInput, setSkillInput] = useState('');
    const [availability, setAvailability] = useState(profile?.availability || 'IMMEDIATE');
    const [showSuggestions, setShowSuggestions] = useState(false);

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
            await profileApi.updateReadiness({
                availability,
                skills,
            });
            await refreshMe();
            navigation.goBack();
        } catch (error: unknown) {
            Alert.alert('Error', (error as Error).message || 'Failed to update skills');
        } finally {
            setSaving(false);
        }
    }, [skills, availability, refreshMe, navigation]);

    return {
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
    };
};
