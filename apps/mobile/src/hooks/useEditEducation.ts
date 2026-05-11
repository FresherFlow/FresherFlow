import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { profileApi } from '@fresherflow/api-client';
import { useUserAuth as useAuth } from '@repo/frontend-core';

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'EditEducation'>;

export const useEditEducation = (navigation: Props['navigation']) => {
    const { profile, refreshMe } = useAuth();
    const [saving, setSaving] = useState(false);

    // Form State
    const [educationLevel, setEducationLevel] = useState(profile?.educationLevel || 'DEGREE');
    const [tenthYear, setTenthYear] = useState(profile?.tenthYear?.toString() || '');
    const [twelfthYear, setTwelfthYear] = useState(profile?.twelfthYear?.toString() || '');
    const [gradCourse, setGradCourse] = useState(profile?.gradCourse || '');
    const [gradSpecialization, setGradSpecialization] = useState(profile?.gradSpecialization || '');
    const [gradYear, setGradYear] = useState(profile?.gradYear?.toString() || '');

    const [hasPG, setHasPG] = useState(!!profile?.pgCourse);
    const [pgCourse, setPgCourse] = useState(profile?.pgCourse || '');
    const [pgSpecialization, setPgSpecialization] = useState(profile?.pgSpecialization || '');
    const [pgYear, setPgYear] = useState(profile?.pgYear?.toString() || '');

    const handleSave = useCallback(async () => {
        if (!tenthYear || !twelfthYear || !educationLevel || !gradCourse || !gradSpecialization || !gradYear) {
            Alert.alert('Incomplete', 'Please fill all required fields');
            return;
        }

        setSaving(true);
        try {
            await profileApi.updateEducation({
                educationLevel,
                tenthYear: parseInt(tenthYear),
                twelfthYear: parseInt(twelfthYear),
                gradCourse,
                gradSpecialization,
                gradYear: parseInt(gradYear),
                ...(hasPG && {
                    pgCourse,
                    pgSpecialization,
                    pgYear: pgYear ? parseInt(pgYear) : undefined,
                }),
            });
            await refreshMe();
            navigation.goBack();
        } catch (error: unknown) {
            Alert.alert('Error', (error as Error).message || 'Failed to update education');
        } finally {
            setSaving(false);
        }
    }, [
        tenthYear, twelfthYear, educationLevel, gradCourse, 
        gradSpecialization, gradYear, hasPG, pgCourse, 
        pgSpecialization, pgYear, refreshMe, navigation
    ]);

    return {
        saving,
        educationLevel, setEducationLevel,
        tenthYear, setTenthYear,
        twelfthYear, setTwelfthYear,
        gradCourse, setGradCourse,
        gradSpecialization, setGradSpecialization,
        gradYear, setGradYear,
        hasPG, setHasPG,
        pgCourse, setPgCourse,
        pgSpecialization, setPgSpecialization,
        pgYear, setPgYear,
        handleSave,
    };
};
