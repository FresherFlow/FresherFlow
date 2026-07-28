import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { profileApi } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { validateEducationData } from '@fresherflow/domain';

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
    _forceRefreshProfile: () => Promise<void>,
    setCurrentStep: (step: 'education' | 'preferences') => void
) {
    const router = useRouter();
    const { updateProfileState } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const handleEducationSubmit = () => {
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

        const payload = {
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
                pgYear: validation.years.pgYear,
            }),
        };

        updateProfileState(payload as any, () => profileApi.updateEducation(payload));
        toast.success('Education saved.');
        setCurrentStep('preferences');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleReadinessSubmit = () => {
        if (form.interestedIn.length === 0 || form.preferredCities.length === 0 || form.workModes.length === 0) {
            toast.error('Please fill in your career preferences');
            return;
        }
        if (form.skills.length === 0) {
            toast.error('Add at least one professional skill');
            return;
        }
        if (form.skills.length > 10) {
            toast.error('Maximum 10 skills allowed');
            return;
        }

        const prefPayload = {
            interestedIn: form.interestedIn,
            preferredCities: form.preferredCities,
            workModes: form.workModes,
        };

        const readinessPayload = {
            availability: 'IMMEDIATE',
            skills: form.skills,
        };

        updateProfileState({ ...prefPayload, ...readinessPayload } as any, async () => {
            await profileApi.updatePreferences(prefPayload);
            await profileApi.updateReadiness(readinessPayload);
        });

        toast.success('Profile complete! Welcome to FresherFlow.');
        router.push('/dashboard');
    };

    return {
        isLoading,
        handleEducationSubmit,
        handleReadinessSubmit,
    };
}
