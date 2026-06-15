import { useForm } from 'react-hook-form';
import { useState, useEffect } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { Gender, ReservationCategory } from '@fresherflow/types';

export type DemographicsFormData = {
  dob: string;            // stored as YYYY-MM-DD string
  gender: Gender | '';
  category: ReservationCategory | '';
  isPwBD: boolean;
  isExServicemen: boolean;
  homeState: string;
};

export const useEditDemographics = () => {
  const { profile, updateDemographics } = useProfile();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const getInitialDob = () => {
    if (!profile?.dob) return '';
    try {
      if (typeof profile.dob === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(profile.dob)) {
        return profile.dob;
      }
      const d = new Date(profile.dob);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch (e) {
      console.warn('Failed to parse dob', e);
    }
    return '';
  };

  const { control, handleSubmit, reset, formState: { errors, isDirty } } = useForm<DemographicsFormData>({
    defaultValues: {
      dob: getInitialDob(),
      gender: profile?.gender ?? '',
      category: profile?.category ?? '',
      isPwBD: profile?.isPwBD ?? false,
      isExServicemen: profile?.isExServicemen ?? false,
      homeState: profile?.homeState ?? '',
    },
  });

  useEffect(() => {
    if (profile) {
      let dobStr = '';
      if (profile.dob) {
        try {
          if (typeof profile.dob === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(profile.dob)) {
            dobStr = profile.dob;
          } else {
            const d = new Date(profile.dob);
            if (!isNaN(d.getTime())) {
              dobStr = d.toISOString().split('T')[0];
            }
          }
        } catch (e) {
          console.warn('Failed to parse dob', e);
        }
      }

      reset({
        dob: dobStr,
        gender: profile.gender ?? '',
        category: profile.category ?? '',
        isPwBD: profile.isPwBD ?? false,
        isExServicemen: profile.isExServicemen ?? false,
        homeState: profile.homeState ?? '',
      });
    }
  }, [profile]);

  const onSave = handleSubmit(async (data) => {
    setSaving(true);
    try {
      await updateDemographics({
        dob: data.dob || undefined,
        gender: (data.gender || undefined) as Gender | undefined,
        category: (data.category || undefined) as ReservationCategory | undefined,
        isPwBD: data.isPwBD,
        isExServicemen: data.isExServicemen,
        homeState: data.homeState || undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  });

  return { control, onSave, saving, saved, errors, isDirty };
};
