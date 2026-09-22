import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { profileApi } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { validateEducationData, PROFILE_PAGE_ACTIVE_DAYS } from '@fresherflow/utils';

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
    const { updateProfileState, user } = useAuth();
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

        try {
            // Awaited so a failed save is surfaced here instead of being swallowed and
            // then published as a page missing the education the user just entered.
            await profileApi.updateEducation(payload);
            updateProfileState(payload as any);
            toast.success('Education saved.');
            setCurrentStep('preferences');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            toast.error((err as Error).message || 'Could not save your education. Try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleReadinessSubmit = async () => {
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

        setIsLoading(true);
        try {
            // Await the writes before publishing: the published payload is built from
            // Postgres, so publishing first would ship a page with none of this data.
            await profileApi.updatePreferences(prefPayload);
            await profileApi.updateReadiness(readinessPayload);
            updateProfileState({ ...prefPayload, ...readinessPayload } as any);

            const username = user?.username;
            if (username) {
                try {
                    await profileApi.publishProfile();
                    toast.success(`Profile complete — your page is live for the next ${PROFILE_PAGE_ACTIVE_DAYS} days.`);
                    router.push(`/u/${username}`);
                    return;
                } catch {
                    toast.error('Saved. Publishing your page failed — retry it from your profile.');
                }
            } else {
                toast.success('Profile complete! Welcome to FresherFlow.');
            }
            router.push('/jobs?tab=for-you');
        } catch (err) {
            toast.error((err as Error).message || 'Could not save your preferences. Try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return {
        isLoading,
        handleEducationSubmit,
        handleReadinessSubmit,
    };
}
