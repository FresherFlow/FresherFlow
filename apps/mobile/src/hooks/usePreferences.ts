import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { profileApi } from '@fresherflow/api-client';
import { useUserAuth as useAuth } from '@repo/frontend-core';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'EditPreferences'>;

export const usePreferences = (navigation: Props['navigation']) => {
    const { profile, refreshMe } = useAuth();
    const [saving, setSaving] = useState(false);

    const [interestedIn, setInterestedIn] = useState<string[]>(profile?.interestedIn || []);
    const [workModes, setWorkModes] = useState<string[]>(profile?.workModes || []);
    const [preferredCities, setPreferredCities] = useState<string[]>(profile?.preferredCities || []);
    const [cityInput, setCityInput] = useState('');
    const [showCitySuggestions, setShowCitySuggestions] = useState(false);

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
            await profileApi.updatePreferences({
                interestedIn,
                workModes,
                preferredCities,
            });
            await refreshMe();
            navigation.goBack();
        } catch (error: unknown) {
            Alert.alert('Error', (error as Error).message || 'Failed to update preferences');
        } finally {
            setSaving(false);
        }
    }, [interestedIn, workModes, preferredCities, refreshMe, navigation]);

    return {
        saving,
        interestedIn, setInterestedIn,
        workModes, setWorkModes,
        preferredCities, setPreferredCities,
        cityInput, setCityInput,
        showCitySuggestions, setShowCitySuggestions,
        toggleItem,
        addCity,
        handleSave,
    };
};
