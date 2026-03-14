import { useState } from 'react';
import toast from 'react-hot-toast';
import { profileApi } from '@/lib/api/client';
import { validateEducationData } from '@/lib/profileFormValidation';

export function useProfileUpdateHandlers(form: any, refreshUser: () => Promise<void>) {
    const [saving, setSaving] = useState<string | null>(null);
    const [editingSection, setEditingSection] = useState<string | null>(null);

    const handleIdentityUpdate = async () => {
        if (!form.fullName.trim()) { toast.error('Full name is required'); return; }
        setSaving('identity');
        const t = toast.loading('Saving...');
        try {
            await profileApi.updateProfile({ fullName: form.fullName });
            await refreshUser();
            toast.success('Name updated.', { id: t });
            setEditingSection(null);
        } catch (err: unknown) { toast.error((err as Error).message || 'Failed', { id: t }); }
        finally { setSaving(null); }
    };

    const handleEducationUpdate = async () => {
        if (!form.tenthYear || !form.twelfthYear || !form.educationLevel || !form.gradCourse || !form.gradSpecialization || !form.gradYear) {
            toast.error('Please fill all mandatory education fields'); return;
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
        setSaving('education');
        const t = toast.loading('Saving...');
        try {
            await profileApi.updateEducation({
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
                })
            });
            await refreshUser();
            toast.success('Education updated.', { id: t });
            setEditingSection(null);
        } catch (err: unknown) { toast.error((err as Error).message || 'Failed', { id: t }); }
        finally { setSaving(null); }
    };

    const handlePreferencesUpdate = async () => {
        const cleanCities = (form.preferredCities || []).map((c: string) => c.trim()).filter(Boolean);
        const cleanInterestedIn = (form.interestedIn || []).filter(Boolean);
        const cleanWorkModes = (form.workModes || []).filter(Boolean);

        setSaving('preferences');
        const t = toast.loading('Saving...');
        try {
            await profileApi.updatePreferences({ 
                interestedIn: cleanInterestedIn, 
                preferredCities: cleanCities, 
                workModes: cleanWorkModes 
            });
            await refreshUser();
            toast.success('Preferences saved.', { id: t });
            setEditingSection(null);
        } catch (err: unknown) { toast.error((err as Error).message || 'Failed', { id: t }); }
        finally { setSaving(null); }
    };

    const handleReadinessUpdate = async () => {
        if (form.skills.length === 0) { toast.error('Add at least one skill'); return; }
        setSaving('skills');
        const t = toast.loading('Saving...');
        try {
            await profileApi.updateReadiness({ availability: form.availability, skills: form.skills });
            await refreshUser();
            toast.success('Skills updated.', { id: t });
            setEditingSection(null);
        } catch (err: unknown) { toast.error((err as Error).message || 'Failed', { id: t }); }
        finally { setSaving(null); }
    };

    return {
        saving,
        editingSection,
        setEditingSection,
        handleIdentityUpdate,
        handleEducationUpdate,
        handlePreferencesUpdate,
        handleReadinessUpdate
    };
}
