import { useState } from 'react';
import toast from 'react-hot-toast';
import { profileApi } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { validateEducationData } from '@fresherflow/utils';
import { buildPreferencesPayload } from '@/features/profile/preferences';

/**
 * Profile writes.
 *
 * Each handler awaits the API before reporting success, then hands the saved
 * values to `updateProfileState` so local state, the cached session and Firebase
 * agree with the server. It used to pass the request as a background sync task
 * and toast "Saved." immediately, which meant a failed write still looked saved.
 *
 * Every handler resolves to `true` only when the write happened, so the section
 * that called it can show real saving/saved state.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useProfileUpdateHandlers(form: any, _refreshUser?: () => Promise<void>) {
    const { updateProfileState } = useAuth();
    const [saving, setSaving] = useState<string | null>(null);
    const [editingSection, setEditingSection] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const withSaving = async (key: string, task: () => Promise<boolean>) => {
        setSaving(key);
        setError(null);
        try {
            return await task();
        } finally {
            setSaving(null);
        }
    };

    const handleIdentityUpdate = () =>
        withSaving('identity', async () => {
            if (!form.fullName.trim()) {
                toast.error('Full name is required');
                return false;
            }
            const payload = { fullName: form.fullName };
            await profileApi.updateProfile(payload);
            updateProfileState(payload);
            return true;
        });

    const handleEducationUpdate = () =>
        withSaving('education', async () => {
            // Required fields follow the highest level — same rule as
            // validateEducationData below, so lower levels are never forced
            // to invent entries for schooling they don't have.
            const needsTwelfth = form.educationLevel !== 'TENTH';
            const needsGrad = ['DIPLOMA', 'DEGREE', 'PG'].includes(form.educationLevel ?? '');
            if (!form.tenthYear || !form.educationLevel || (needsTwelfth && !form.twelfthYear) || (needsGrad && (!form.gradCourse || !form.gradSpecialization || !form.gradYear))) {
                toast.error('Please fill all mandatory education fields');
                return false;
            }
            const validation = validateEducationData({
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

            const payload = {
                educationLevel: form.educationLevel,
                tenthYear: validation.years.tenthYear,
                ...(validation.years.twelfthYear !== undefined && { twelfthYear: validation.years.twelfthYear }),
                ...(validation.includeGrad && {
                    gradCourse: form.gradCourse,
                    gradSpecialization: form.gradSpecialization,
                    gradYear: validation.years.gradYear,
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

            await profileApi.updateEducation(payload);
            updateProfileState(payload as any);
            return true;
        });

    /**
     * Career preferences, including the recruiter-facing fields.
     *
     * Expected CTC, the resume link and relocation used to be saved by the skills
     * handler and edited inside the Skills section. They are preferences, so they
     * are edited here now — and because the two endpoints own different columns,
     * this one action writes both rather than dropping what moved.
     */
    const handlePreferencesUpdate = () =>
        withSaving('preferences', async () => {
            // The payload shape lives in `features/profile/preferences.ts` so this save and any
            // other consumer of the same three fields cannot drift apart.
            const preferences = buildPreferencesPayload({
                interestedIn: form.interestedIn || [],
                preferredCities: form.preferredCities || [],
                workModes: form.workModes || [],
            });

            const ctcRaw = form.expectedCtc;
            const ctcNum = ctcRaw === '' || ctcRaw == null ? null : Number(ctcRaw);
            if (ctcNum !== null && (!Number.isFinite(ctcNum) || ctcNum < 0 || ctcNum > 200)) {
                toast.error('Expected CTC must be between 0 and 200 LPA');
                return false;
            }
            const resume = (form.resumeUrl || '').trim() || null;
            if (resume && !/^https?:\/\//i.test(resume)) {
                toast.error('Resume link must start with http:// or https://');
                return false;
            }

            const readiness = {
                expectedCtc: ctcNum,
                resumeUrl: resume,
                willingToRelocate: form.willingToRelocate !== false,
            };

            await Promise.all([
                profileApi.updatePreferences(preferences),
                profileApi.updateReadiness({ ...readiness, skills: form.skills, availability: form.availability }),
            ]);
            updateProfileState({ ...preferences, ...readiness } as any);
            return true;
        });

    const handleReadinessUpdate = () =>
        withSaving('skills', async () => {
            if (form.skills.length === 0) {
                toast.error('Add at least one skill');
                return false;
            }
            if (form.skills.length > 10) {
                toast.error('Maximum 10 skills allowed');
                return false;
            }

            // The readiness endpoint owns these columns, so a skills save would
            // blank them if they were left out of the body.
            const ctcRaw = form.expectedCtc;
            const ctcNum = ctcRaw === '' || ctcRaw == null ? null : Number(ctcRaw);

            const payload = {
                availability: form.availability,
                skills: form.skills,
                expectedCtc: ctcNum,
                resumeUrl: (form.resumeUrl || '').trim() || null,
                willingToRelocate: form.willingToRelocate !== false,
            };

            await profileApi.updateReadiness(payload as any);
            updateProfileState(payload as any);
            return true;
        });

    return {
        saving,
        editingSection,
        setEditingSection,
        handleIdentityUpdate,
        handleEducationUpdate,
        handlePreferencesUpdate,
        handleReadinessUpdate,
        error,
        setError,
    };
}
