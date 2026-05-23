import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useProfile } from './useProfile';

const educationSchema = z.object({
    educationLevel: z.string().min(1, 'Required'),
    tenthYear: z.string().regex(/^\d{4}$/, 'Enter 4-digit year'),
    twelfthYear: z.string().regex(/^\d{4}$/, 'Enter 4-digit year'),
    gradCourse: z.string().min(1, 'Required'),
    gradSpecialization: z.string().min(1, 'Required'),
    gradYear: z.string().regex(/^\d{4}$/, 'Enter 4-digit year'),
    hasPG: z.boolean(),
    pgCourse: z.string().optional(),
    pgSpecialization: z.string().optional(),
    pgYear: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.hasPG || data.educationLevel === 'PG') {
        if (!data.pgCourse) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Required',
                path: ['pgCourse'],
            });
        }
        if (!data.pgSpecialization) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Required',
                path: ['pgSpecialization'],
            });
        }
        if (!/^\d{4}$/.test(data.pgYear || '')) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Enter 4-digit year',
                path: ['pgYear'],
            });
        }
    }
});

export interface EducationFormData {
    educationLevel: string;
    tenthYear: string;
    twelfthYear: string;
    gradCourse: string;
    gradSpecialization: string;
    gradYear: string;
    hasPG: boolean;
    pgCourse?: string;
    pgSpecialization?: string;
    pgYear?: string;
}

export const useEditEducation = () => {
    const { profile, updateEducation, loadingCache } = useProfile();
    const [saving, setSaving] = useState(false);

    const {
        control,
        handleSubmit,
        reset,
        watch,
        setValue,
        formState: { errors, isValid },
    } = useForm<EducationFormData>({
        resolver: zodResolver(educationSchema),
        defaultValues: {
            educationLevel: profile?.educationLevel || '',
            tenthYear: profile?.tenthYear?.toString() || '',
            twelfthYear: profile?.twelfthYear?.toString() || '',
            gradCourse: profile?.gradCourse || '',
            gradSpecialization: profile?.gradSpecialization || '',
            gradYear: profile?.gradYear?.toString() || '',
            hasPG: !!profile?.pgCourse,
            pgCourse: profile?.pgCourse || '',
            pgSpecialization: profile?.pgSpecialization || '',
            pgYear: profile?.pgYear?.toString() || '',
        },
        mode: 'onChange',
    });

    const hasPG = watch('hasPG');
    const educationLevel = watch('educationLevel');
    const gradCourse = watch('gradCourse');
    const pgCourse = watch('pgCourse');

    // Sync form fields when AsyncStorage profile loads
    useEffect(() => {
        if (!profile) return;
        reset({
            educationLevel: profile.educationLevel || '',
            tenthYear: profile.tenthYear?.toString() || '',
            twelfthYear: profile.twelfthYear?.toString() || '',
            gradCourse: profile.gradCourse || '',
            gradSpecialization: profile.gradSpecialization || '',
            gradYear: profile.gradYear?.toString() || '',
            hasPG: !!profile.pgCourse,
            pgCourse: profile.pgCourse || '',
            pgSpecialization: profile.pgSpecialization || '',
            pgYear: profile.pgYear?.toString() || '',
        });
    }, [profile, reset]);

    const handleSave = useCallback(async (data: EducationFormData) => {
        setSaving(true);
        try {
            await updateEducation({
                educationLevel: data.educationLevel,
                tenthYear: parseInt(data.tenthYear),
                twelfthYear: parseInt(data.twelfthYear),
                gradCourse: data.gradCourse,
                gradSpecialization: data.gradSpecialization,
                gradYear: parseInt(data.gradYear),
                ...((data.hasPG || data.educationLevel === 'PG') && {
                    pgCourse: data.pgCourse,
                    pgSpecialization: data.pgSpecialization,
                    pgYear: data.pgYear ? parseInt(data.pgYear) : undefined,
                }),
            });
        } catch (error: unknown) {
            Alert.alert('Error', (error as Error).message || 'Failed to update education');
        } finally {
            setSaving(false);
        }
    }, [updateEducation]);

    return {
        profile,
        saving,
        control,
        handleSubmit,
        setValue,
        errors,
        isValid,
        hasPG,
        educationLevel,
        gradCourse,
        pgCourse,
        handleSave,
        loadingCache,
    };
};

