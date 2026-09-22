import { useState } from 'react';
import toast from 'react-hot-toast';
import { profileApi } from '@/lib/api/client';
import { useAuth } from '@/lib/auth/AuthContext';
import { validateEducationData } from '@fresherflow/utils';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useProfileUpdateHandlers(form: any, _refreshUser?: () => Promise<void>) {  
    const { updateProfileState } = useAuth();
    const [saving, setSaving] = useState<string | null>(null);
    const [editingSection, setEditingSection] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleIdentityUpdate = () => {
        setSaving('identity');
        setError(null);
        if (!form.fullName.trim()) { toast.error('Full name is required'); setSaving(null); return; }
        const payload = { fullName: form.fullName };
        updateProfileState(payload, () => profileApi.updateProfile(payload));
        toast.success('Name updated.');
        setEditingSection(null);
        setTimeout(() => setSaving(null), 300);
    };

    const handleEducationUpdate = () => {
        setSaving('education');
        setError(null);
        if (!form.tenthYear || !form.twelfthYear || !form.educationLevel || !form.gradCourse || !form.gradSpecialization || !form.gradYear) {
            toast.error('Please fill all mandatory education fields'); setSaving(null); return;
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
            return;
        }
        
        const payload = {
            educationLevel: form.educationLevel,
            tenthYear: validation.years.tenthYear,
            twelfthYear: validation.years.twelfthYear,
            gradCourse: form.gradCourse,
            gradSpecialization: form.gradSpecialization,
            gradYear: validation.years.gradYear,
            collegeId: form.collegeId || null,
            collegeName: form.collegeName || null,
            collegeState: form.collegeState || null,
            ...(validation.includePG && { 
                pgCourse: form.pgCourse, 
                pgSpecialization: form.pgSpecialization, 
                pgYear: validation.years.pgYear 
            })
        };

        updateProfileState(payload as any, () => profileApi.updateEducation(payload));
        toast.success('Education updated.');
        setEditingSection(null);
        setTimeout(() => setSaving(null), 300);
    };

    const handlePreferencesUpdate = () => {
        setSaving('preferences');
        setError(null);
        const cleanCities = (form.preferredCities || []).map((c: string) => c.trim()).filter(Boolean);
        const cleanInterestedIn = (form.interestedIn || []).filter(Boolean);
        const cleanWorkModes = (form.workModes || []).filter(Boolean);

        const payload = { 
            interestedIn: cleanInterestedIn, 
            preferredCities: cleanCities, 
            workModes: cleanWorkModes 
        };

        updateProfileState(payload as any, () => profileApi.updatePreferences(payload));
        toast.success('Preferences saved.');
        setEditingSection(null);
    };

    const handleReadinessUpdate = () => {
        if (form.skills.length === 0) { toast.error('Add at least one skill'); return; }
        if (form.skills.length > 10) { toast.error('Maximum 10 skills allowed'); return; }

        const ctcNum = form.expectedCtc === '' || form.expectedCtc == null ? null : Number(form.expectedCtc);
        if (ctcNum !== null && (!Number.isFinite(ctcNum) || ctcNum < 0 || ctcNum > 200)) {
            toast.error('Expected CTC must be between 0 and 200 LPA');
            return;
        }
        const resume = (form.resumeUrl || '').trim() || null;
        if (resume && !/^https?:\/\//i.test(resume)) {
            toast.error('Resume link must start with http:// or https://');
            return;
        }

        const payload = {
            availability: form.availability,
            skills: form.skills,
            expectedCtc: ctcNum,
            resumeUrl: resume,
            willingToRelocate: form.willingToRelocate !== false,
        };

        updateProfileState(payload as any, () => profileApi.updateReadiness(payload));
        toast.success('Skills updated.');
        setEditingSection(null);
        setTimeout(() => setSaving(null), 300);
    };

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





