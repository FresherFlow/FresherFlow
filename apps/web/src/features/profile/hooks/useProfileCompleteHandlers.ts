import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { getErrorMessage } from '@/lib/utils/error';
import { profileApi } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { validateEducationData } from '@fresherflow/utils';

export interface ProfileCompleteForm {
    fullName: string;
    educationLevel: string;
    tenthYear: string;
    twelfthYear: string;
    gradCourse: string;
    gradSpecialization: string;
    gradYear: string;
    collegeId?: string;
    collegeName?: string;
    collegeState?: string;
    hasPG: boolean;
    pgCourse: string;
    pgSpecialization: string;
    pgYear: string;
    interestedIn: string[];
    preferredCities: string[];
    workModes: string[];
    skills: string[];
    /** The recruiter fields the preferences section also edits. */
    expectedCtc?: string;
    resumeUrl?: string;
    willingToRelocate?: boolean;
}

/**
 * The two onboarding writes.
 *
 * Both resolve to `true` only when the save actually happened, so the section
 * that submitted can report real saving/saved state, and both are awaited —
 * publishing before the writes land would ship a page missing this data.
 *
 * The onboarding steps themselves no longer exist: onboarding collects the same
 * fields as the profile editor, so it renders the same sections and injects
 * these handlers as their save. One implementation of each field.
 */
export function useProfileCompleteHandlers(
    form: ProfileCompleteForm,
    _forceRefreshProfile: () => Promise<void>,
    onEducationSaved: () => void
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
            toast.error(validation.error || 'Invalid education data');
            return false;
        }

        setIsLoading(true);

        // Only applicable levels travel: a 10th passout sends no 12th or
        // graduation entries, so nothing inapplicable is stored.
        const payload = {
            fullName: form.fullName,
            educationLevel: form.educationLevel,
            tenthYear: validation.years.tenthYear,
            ...(validation.years.twelfthYear !== undefined && { twelfthYear: validation.years.twelfthYear }),
            ...(validation.includeGrad && {
                gradCourse: form.gradCourse,
                gradSpecialization: form.gradSpecialization,
                gradYear: validation.years.gradYear,
                // The editor collects the college; onboarding renders the same
                // fields, so leaving it out here would silently drop a picked college.
                collegeId: form.collegeId || null,
                collegeName: form.collegeName || null,
                collegeState: form.collegeState || null,
            }),
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
            onEducationSaved();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return true;
        } catch (err) {
            toast.error(getErrorMessage(err, 'Could not save your education. Try again.'));
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const handleReadinessSubmit = async () => {
        if (form.interestedIn.length === 0 || form.preferredCities.length === 0 || form.workModes.length === 0) {
            toast.error('Please fill in your career preferences');
            return false;
        }
        if (form.skills.length === 0) {
            toast.error('Add at least one professional skill');
            return false;
        }
        if (form.skills.length > 10) {
            toast.error('Maximum 10 skills allowed');
            return false;
        }

        const prefPayload = {
            interestedIn: form.interestedIn,
            preferredCities: form.preferredCities,
            workModes: form.workModes,
        };

        // The preferences section renders the recruiter fields too, so whatever is
        // in them is saved with the rest instead of being dropped on the floor.
        const ctcRaw = (form.expectedCtc ?? '').trim();
        const ctcNum = ctcRaw === '' ? null : Number(ctcRaw);
        if (ctcNum !== null && (!Number.isFinite(ctcNum) || ctcNum < 0 || ctcNum > 200)) {
            toast.error('Expected CTC must be between 0 and 200 LPA');
            return false;
        }
        const resume = (form.resumeUrl ?? '').trim() || null;
        if (resume && !/^https?:\/\//i.test(resume)) {
            toast.error('Resume link must start with http:// or https://');
            return false;
        }

        const readinessPayload = {
            availability: 'IMMEDIATE',
            skills: form.skills,
            expectedCtc: ctcNum,
            resumeUrl: resume,
            willingToRelocate: form.willingToRelocate !== false,
        };

        setIsLoading(true);
        try {
            await profileApi.updatePreferences(prefPayload);
            await profileApi.updateReadiness(readinessPayload);
            updateProfileState({ ...prefPayload, ...readinessPayload } as any);

            const username = user?.username;
            if (username) {
                try {
                    await profileApi.publishProfile();
                    toast.success('Profile complete — your page is live and boosted for recruiters.');
                    router.push(`/u/${username}`);
                    return true;
                } catch {
                    toast.error('Saved. Publishing your page failed — retry it from your profile.');
                }
            }
            router.push('/jobs?tab=for-you');
            return true;
        } catch (err) {
            toast.error(getErrorMessage(err, 'Could not save your preferences. Try again.'));
            return false;
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
