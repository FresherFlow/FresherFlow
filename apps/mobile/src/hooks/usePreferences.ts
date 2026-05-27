import { useState, useCallback, useEffect } from 'react';
import { } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useProfile } from './useProfile';
import { useToast } from '@/contexts/ToastContext';

const preferencesSchema = z.object({
    interestedIn: z.array(z.string()).min(1, 'Select at least one type'),
    workModes: z.array(z.string()).min(1, 'Select at least one mode'),
    preferredCities: z.array(z.string()).min(1, 'Select at least one city').max(5, 'Maximum 5 cities allowed'),
});

export type PreferencesFormData = z.infer<typeof preferencesSchema>;

export const usePreferences = () => {
    const { profile, updatePreferences, loadingCache } = useProfile();
    const { showToast, showError } = useToast();
    const [saving, setSaving] = useState(false);
    const [cityInput, setCityInput] = useState('');
    const [showCitySuggestions, setShowCitySuggestions] = useState(false);

    const {
        control,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors, isValid },
    } = useForm<PreferencesFormData>({
        resolver: zodResolver(preferencesSchema),
        defaultValues: {
            interestedIn: profile?.interestedIn || [],
            workModes: profile?.workModes || [],
            preferredCities: profile?.preferredCities || [],
        },
        mode: 'onChange',
    });

    const interestedIn = watch('interestedIn');
    const workModes = watch('workModes');
    const preferredCities = watch('preferredCities');

    // Sync form fields when AsyncStorage profile loads
    useEffect(() => {
        if (!profile) return;
        reset({
            interestedIn: profile.interestedIn || [],
            workModes: profile.workModes || [],
            preferredCities: profile.preferredCities || [],
        });
    }, [profile, reset]);

    const toggleItem = useCallback((field: keyof PreferencesFormData, value: string) => {
        const current = watch(field);
        if (current.includes(value)) {
            setValue(field, current.filter(i => i !== value), { shouldValidate: true });
        } else {
            setValue(field, [...current, value], { shouldValidate: true });
        }
    }, [watch, setValue]);

    const addCity = useCallback((city: string) => {
        const trimmed = city.trim();
        if (trimmed && !preferredCities.includes(trimmed)) {
            if (preferredCities.length >= 5) {
                showToast('You can select up to 5 cities', 'warning');
                return;
            }
            setValue('preferredCities', [...preferredCities, trimmed], { shouldValidate: true });
            setCityInput('');
            setShowCitySuggestions(false);
        }
    }, [preferredCities, setValue]);

    const removeCity = useCallback((city: string) => {
        setValue('preferredCities', preferredCities.filter(c => c !== city), { shouldValidate: true });
    }, [preferredCities, setValue]);

    const handleSave = useCallback(async (data: PreferencesFormData) => {
        setSaving(true);
        try {
            await updatePreferences({
                interestedIn: data.interestedIn,
                workModes: data.workModes,
                preferredCities: data.preferredCities,
            });
        } catch (error: unknown) {
            showError((error as Error).message || 'Failed to update preferences');
        } finally {
            setSaving(false);
        }
    }, [updatePreferences]);

    return {
        profile,
        saving,
        control,
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
        setValue,
    };
};

