import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'EditPreferences'>;

import { useProfile } from './useProfile';

export const usePreferences = (navigation: Props['navigation']) => {
    const { profile, updatePreferences, loadingCache } = useProfile();
    const [saving, setSaving] = useState(false);

    const [interestedIn, setInterestedIn] = useState<string[]>(profile?.interestedIn || []);
    const [workModes, setWorkModes] = useState<string[]>(profile?.workModes || []);
    const [preferredCities, setPreferredCities] = useState<string[]>(profile?.preferredCities || []);
    const [cityInput, setCityInput] = useState('');
    const [showCitySuggestions, setShowCitySuggestions] = useState(false);

    // Sync form fields when AsyncStorage profile loads
    useEffect(() => {
        if (!profile) return;
        if (profile.interestedIn) setInterestedIn(profile.interestedIn);
        if (profile.workModes) setWorkModes(profile.workModes);
        if (profile.preferredCities) setPreferredCities(profile.preferredCities);
    }, [profile?.interestedIn?.length, profile?.workModes?.length, profile?.preferredCities?.length]);

    const toggleItem = useCallback((list: string[], setList: (l: string[]) => void, item: string) => {
        if (list.includes(item)) {
            setList(list.filter(i => i !== item));
        } else {
            setList([...list, item]);
        }
    }, []);

    const addCity = useCallback((city: string) => {
        if (preferredCities.length >= 5) {
            Alert.alert('Limit Reached', 'You can select up to 5 cities');
            return;
        }
        const trimmed = city.trim();
        if (trimmed && !preferredCities.includes(trimmed)) {
            setPreferredCities(prev => [...prev, trimmed]);
            setCityInput('');
            setShowCitySuggestions(false);
        }
    }, [preferredCities.length]);

    const handleSave = useCallback(async () => {
        if (interestedIn.length === 0 || workModes.length === 0 || preferredCities.length === 0) {
            Alert.alert('Preferences Required', 'Please select at least one value for all sections');
            return;
        }

        setSaving(true);
        try {
            await updatePreferences({
                interestedIn,
                workModes,
                preferredCities,
            });
            // Mode switch handled by screen
        } catch (error: unknown) {
            Alert.alert('Error', (error as Error).message || 'Failed to update preferences');
        } finally {
            setSaving(false);
        }
    }, [interestedIn, workModes, preferredCities, updatePreferences, navigation]);

    return {
        profile,
        saving,
        interestedIn, setInterestedIn,
        workModes, setWorkModes,
        preferredCities, setPreferredCities,
        cityInput, setCityInput,
        showCitySuggestions, setShowCitySuggestions,
        toggleItem,
        addCity,
        handleSave,
        loadingCache,
    };
};
