import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { profileApi } from '@/lib/api/client';
import { validateEducationData } from '@/lib/profileFormValidation';

export interface ProfileCompleteForm {
    fullName: string;
    educationLevel: string;
    tenthYear: string;
    twelfthYear: string;
    gradCourse: string;
    gradSpecialization: string;
    gradYear: string;
    hasPG: boolean;
    pgCourse: string;
    pgSpecialization: string;
    pgYear: string;
    interestedIn: string[];
    preferredCities: string[];
    workModes: string[];
    skills: string[];
}

export function useProfileCompleteHandlers(
    form: ProfileCompleteForm, 
    refreshUser: () => Promise<void>,
    setCurrentStep: (step: 'education' | 'preferences' | 'readiness') => void
) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const handleEducationSubmit = async () => {
        const validation = validateEducationData({
            fullName: form.fullName,
            requireFullName: true,
            educationLevel: form.educationLevel,
            tenthYear: form.tenthYear, 
            twelfthYear: form.twelfthYear,
            gradCourse: form.gradCourse, 
            gradSpecialization: form.gradSpecialization, 
            gradYear: form.gradYear,
            hasPG: form.hasPG, 
            pgCourse: form.pgCourse, 
            pgSpecialization: form.pgSpecialization, 
            pgYear: form.pgYear,
        });

        if (!validation.valid || !validation.years) {
            toast.error(`Error: ${validation.error || 'Invalid education data'}`);
            return;
        }

        setIsLoading(true);
        const tid = toast.loading('Saving education details...');
        try {
            await profileApi.updateEducation({
                fullName: form.fullName, 
                educationLevel: form.educationLevel,
                tenthYear: validation.years.tenthYear,
                twelfthYear: validation.years.twelfthYear,
                gradCourse: form.gradCourse, 
                gradSpecialization: form.gradSpecialization,
                gradYear: validation.years.gradYear,
                ...(validation.includePG && { 
                    pgCourse: form.pgCourse, 
                    pgSpecialization: form.pgSpecialization, 
                    pgYear: validation.years.pgYear 
                }),
            });
            await refreshUser();
            toast.success('Education saved.', { id: tid });
            setCurrentStep('preferences');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err: unknown) {
            toast.error((err as Error).message || 'Update failed', { id: tid });
        } finally {
            setIsLoading(false);
        }
    };

    const handlePreferencesSubmit = async () => {
        if (form.interestedIn.length === 0 || form.preferredCities.length === 0 || form.workModes.length === 0) {
            toast.error('Preferences incomplete');
            return;
        }
        setIsLoading(true);
        const tid = toast.loading('Saving preferences...');
        try {
            await profileApi.updatePreferences({ 
                interestedIn: form.interestedIn, 
                preferredCities: form.preferredCities, 
                workModes: form.workModes 
            });
            await refreshUser();
            toast.success('Preferences saved.', { id: tid });
            setCurrentStep('readiness');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err: unknown) {
            toast.error((err as Error).message || 'Update failed', { id: tid });
        } finally {
            setIsLoading(false);
        }
    };

    const handleReadinessSubmit = async () => {
        if (form.skills.length === 0) {
            toast.error('Add at least one skill');
            return;
        }
        setIsLoading(true);
        const tid = toast.loading('Finalizing your profile...');
        try {
            await profileApi.updateReadiness({ availability: 'IMMEDIATE', skills: form.skills });
            await refreshUser();
            toast.success('Profile complete!', { id: tid });
            router.push('/dashboard');
        } catch (err: unknown) {
            toast.error((err as Error).message || 'Update failed', { id: tid });
        } finally {
            setIsLoading(false);
        }
    };

    return {
        isLoading,
        handleEducationSubmit,
        handlePreferencesSubmit,
        handleReadinessSubmit
    };
}
