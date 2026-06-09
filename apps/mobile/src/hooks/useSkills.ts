import { useState, useCallback, useEffect } from 'react';
import { } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Availability } from '@fresherflow/types';
import { useProfile } from './useProfile';
import { useToast } from '@/contexts/ToastContext';
import { useFeedStore } from '@/store/useFeedStore';


const skillsSchema = z.object({
    skills: z.array(z.string()).min(1, 'Please add at least one skill'),
    availability: z.string().min(1, 'Required'),
});

export type SkillsFormData = z.infer<typeof skillsSchema>;

export const useSkills = () => {
    const { profile, updateReadiness, loadingCache } = useProfile();
    const { showError } = useToast();
    const [saving, setSaving] = useState(false);
    const [skillInput, setSkillInput] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);

    const {
        control,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors, isValid },
    } = useForm<SkillsFormData>({
        resolver: zodResolver(skillsSchema),
        defaultValues: {
            skills: profile?.skills || [],
            availability: profile?.availability || 'IMMEDIATE',
        },
        mode: 'onChange',
    });

    const skills = watch('skills');
    const availability = watch('availability');

    // Sync form fields when AsyncStorage profile loads
    useEffect(() => {
        if (!profile) return;
        reset({
            skills: profile.skills || [],
            availability: profile.availability || 'IMMEDIATE',
        });
    }, [profile, reset]);

    const addSkill = useCallback((skill: string) => {
        const toTitleCase = (str: string) => str.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        const trimmed = toTitleCase(skill.trim());
        if (trimmed && !skills.includes(trimmed)) {
            setValue('skills', [...skills, trimmed], { shouldValidate: true });
            setSkillInput('');
            setShowSuggestions(false);
        }
    }, [skills, setValue]);

    const removeSkill = useCallback((skill: string) => {
        setValue('skills', skills.filter(s => s !== skill), { shouldValidate: true });
    }, [skills, setValue]);

    const handleSave = useCallback(async (data: SkillsFormData) => {
        setSaving(true);
        try {
            await updateReadiness({
                availability: data.availability as Availability,
                skills: data.skills,
            });
            // Instantly trigger feed refresh to recalculate match scores
            useFeedStore.getState().recalculateScores();
        } catch (error: unknown) {
            showError((error as Error).message || 'Failed to update skills');
        } finally {
            setSaving(false);
        }
    }, [updateReadiness]);

    return {
        profile,
        saving,
        control,
        handleSubmit,
        setValue,
        skills,
        skillInput,
        setSkillInput,
        availability,
        showSuggestions,
        setShowSuggestions,
        addSkill,
        removeSkill,
        handleSave,
        loadingCache,
        isValid,
        errors,
    };
};

