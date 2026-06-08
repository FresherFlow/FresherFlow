import { useState, useCallback, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as Haptics from 'expo-haptics';

import { getLocalAlertPrefs, saveLocalAlertPrefs, AlertPreference } from '@/utils/cache/localAlerts';

const alertSettingsSchema = z.object({
    privateJobs: z.boolean(),
    governmentJobs: z.boolean(),
    closingSoon: z.boolean(),
    minRelevanceScore: z.number().min(0).max(100),
});

export type AlertSettingsFormData = z.infer<typeof alertSettingsSchema>;

const DEFAULT_PREFS: AlertSettingsFormData = {
    privateJobs: true,
    governmentJobs: true,
    closingSoon: true,
    minRelevanceScore: 45,
};

export const useAlertSettings = () => {
    const [loading, setLoading] = useState(true);

    const {
        control,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors, isValid },
    } = useForm<AlertSettingsFormData>({
        resolver: zodResolver(alertSettingsSchema),
        defaultValues: DEFAULT_PREFS,
        mode: 'onBlur',
    });

    const loadPrefs = useCallback(async () => {
        setLoading(true);
        const local = await getLocalAlertPrefs();
        if (local) {
            reset(local as AlertSettingsFormData);
        } else {
            reset(DEFAULT_PREFS);
        }
        setLoading(false);
    }, [reset]);

    useEffect(() => {
        void loadPrefs();
    }, [loadPrefs]);

    const updatePref = useCallback(async (data: Partial<AlertSettingsFormData>) => {
        try {
            const current = await getLocalAlertPrefs();
            const updated = { ...current, ...data } as AlertPreference;
            await saveLocalAlertPrefs(updated);
            
            try {
                const messaging = require('@react-native-firebase/messaging').default;
                if (data.privateJobs !== undefined) {
                    if (data.privateJobs) {
                        void messaging().subscribeToTopic('fresherflow_private_jobs').catch(() => {});
                    } else {
                        void messaging().unsubscribeFromTopic('fresherflow_private_jobs').catch(() => {});
                    }
                }
                if (data.governmentJobs !== undefined) {
                    if (data.governmentJobs) {
                        void messaging().subscribeToTopic('fresherflow_govt_jobs').catch(() => {});
                    } else {
                        void messaging().unsubscribeFromTopic('fresherflow_govt_jobs').catch(() => {});
                    }
                }
            } catch (err) {
                // Ignore messaging errors
            }

            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            console.error('Failed to update local preferences', error);
        }
    }, []);

    return {
        loading,
        control,
        handleSubmit,
        watch,
        setValue,
        errors,
        isValid,
        updatePref,
    };
};
