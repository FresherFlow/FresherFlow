import { useState, useCallback, useEffect } from 'react';
import { useForm, Path, PathValue } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { adminOpportunitiesApi, type Opportunity, OpportunityType } from '@fresherflow/api-client';
import type { NavigationProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { ADMIN_OPPORTUNITIES_CACHE_KEY } from '../../../lib/constants';
import { toast } from '../../../lib/toast';
import { postOpportunitySchema, type PostOpportunityFormValues } from '../schemas/postOpportunitySchema';
import { usePostSyncStore } from '../store/usePostSyncStore';
import { useQueryClient } from '@tanstack/react-query';

const INITIAL: PostOpportunityFormValues = {
  type: OpportunityType.JOB, status: 'DRAFT', title: '', company: '', companyWebsite: '', description: '',
  sourceLink: '', applyLink: '',
  locationInput: '', workMode: 'ONSITE',
  selectedDegrees: [], allowedCourses: '', allowedSpecializations: '', selectedYears: [],
  skills: '', salaryRange: '', salaryPeriod: 'YEARLY',
  expMin: '', expMax: '',
  jobFunction: '', employmentType: '', incentives: '', selectionProcess: '', notesHighlights: '', expiresAt: '',
  venueAddress: '', venueLink: '', walkInDate: '', walkInEndDate: '', walkInTime: '',
  requiredDocuments: '', contactPerson: '', contactPhone: '',
};

export const usePostOpportunity = (opportunityId: string | undefined, navigation: NavigationProp<Record<string, unknown>>) => {
  const isEditing = !!opportunityId;
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const { addToQueue } = usePostSyncStore();
  const queryClient = useQueryClient();

  const {
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isDirty, errors },
  } = useForm<PostOpportunityFormValues>({
    resolver: zodResolver(postOpportunitySchema),
    defaultValues: INITIAL,
  });

  const formValues = watch();

  useEffect(() => {
    // @ts-expect-error - navigation params typing
    const sourceLink = navigation.getState().routes.find(r => r.name === 'PostOpportunity')?.params?.sourceLink;
    if (sourceLink && !isEditing && !isDirty) {
      setValue('sourceLink', sourceLink);
    }
  }, [navigation, isEditing, isDirty, setValue]);

  const fillForm = useCallback((o: Partial<Opportunity> & Record<string, unknown>) => {
    reset({
      type: o.type || OpportunityType.JOB,
      status: o.status || 'DRAFT',
      title: o.title || '',
      company: o.company || '',
      companyWebsite: o.companyWebsite || '',
      description: o.description || '',
      sourceLink: o.sourceLink || '',
      applyLink: o.applyLink || '',
      locationInput: Array.isArray(o.locations) ? o.locations.join(', ') : '',
      workMode: o.workMode || 'ONSITE',
      selectedDegrees: Array.isArray(o.allowedDegrees) ? o.allowedDegrees : [],
      allowedCourses: Array.isArray(o.allowedCourses) ? o.allowedCourses.join(', ') : '',
      allowedSpecializations: Array.isArray(o.allowedSpecializations) ? o.allowedSpecializations.join(', ') : '',
      selectedYears: Array.isArray(o.allowedPassoutYears) ? o.allowedPassoutYears : [],
      skills: Array.isArray(o.requiredSkills) ? o.requiredSkills.join(', ') : '',
      salaryRange: o.salaryRange || '',
      salaryPeriod: (o.salaryPeriod as 'YEARLY' | 'MONTHLY') || 'YEARLY',
      expMin: o.experienceMin?.toString() || '',
      expMax: o.experienceMax?.toString() || '',
      jobFunction: o.jobFunction || '',
      employmentType: o.employmentType || '',
      incentives: o.incentives || '',
      selectionProcess: o.selectionProcess || '',
      notesHighlights: o.notesHighlights || '',
      expiresAt: o.expiresAt ? new Date(o.expiresAt).toISOString().slice(0, 10) : '',
      venueAddress: o.walkInDetails?.venueAddress || '',
      venueLink: o.walkInDetails?.venueLink || '',
      walkInTime: o.walkInDetails?.timeRange || o.walkInDetails?.reportingTime || '',
      requiredDocuments: (o.walkInDetails?.requiredDocuments || []).join(', '),
      contactPerson: o.walkInDetails?.contactPerson || '',
      contactPhone: o.walkInDetails?.contactPhone || '',
      walkInDate: (() => {
        const dates = o.walkInDetails?.dates;
        if (!Array.isArray(dates) || !dates.length) return '';
        const sorted = [...dates].sort((a: string, b: string) => new Date(a).getTime() - new Date(b).getTime());
        return sorted[0].slice(0, 10);
      })(),
      walkInEndDate: (() => {
        const dates = o.walkInDetails?.dates;
        if (!Array.isArray(dates) || dates.length < 2) return '';
        const sorted = [...dates].sort((a: string, b: string) => new Date(a).getTime() - new Date(b).getTime());
        return sorted[sorted.length - 1].slice(0, 10);
      })(),
    });
  }, [reset]);

  const fetchOpportunity = useCallback(async () => {
    try {
      const res = await adminOpportunitiesApi.get(opportunityId!);
      fillForm(res.opportunity as Partial<Opportunity> & Record<string, unknown>);
    } catch {
      toast.error('Failed to load opportunity');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [opportunityId, navigation, fillForm]);

  useEffect(() => {
    if (isEditing) void fetchOpportunity();
  }, [opportunityId, fetchOpportunity, isEditing]);

  useEffect(() => {
    const unsub = navigation.addListener('beforeRemove', (e: { preventDefault: () => void; data: { action: unknown } }) => {
      if (!isDirty || saving) return;
      e.preventDefault();
      Alert.alert('Discard changes?', 'You have unsaved changes.', [
        { text: 'Keep Editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action as Readonly<{ type: string; payload?: object; source?: string; target?: string; }>) },
      ]);
    });
    return unsub;
  }, [navigation, isDirty, saving]);

  const onSave = async (f: PostOpportunityFormValues) => {
    const payload: Record<string, unknown> = {
      title: f.title.trim(), company: f.company.trim(),
      type: f.type, status: f.status, workMode: f.workMode,
      locations: f.locationInput.split(',').map(s => s.trim()).filter(Boolean).length 
        ? f.locationInput.split(',').map(s => s.trim()).filter(Boolean) 
        : ['Remote'],
      allowedDegrees: f.selectedDegrees,
      allowedCourses: f.allowedCourses.split(',').map(s => s.trim()).filter(Boolean),
      allowedSpecializations: f.allowedSpecializations.split(',').map(s => s.trim()).filter(Boolean),
      allowedPassoutYears: f.selectedYears,
      requiredSkills: f.skills.split(',').map(s => s.trim()).filter(Boolean),
    };

    setSaving(true);
    try {
      if (f.companyWebsite?.trim()) payload.companyWebsite = f.companyWebsite.trim();
      if (f.description?.trim()) payload.description = f.description.trim();
      if (f.sourceLink?.trim()) payload.sourceLink = f.sourceLink.trim();
      payload.applyLink = f.applyLink?.trim() || f.sourceLink?.trim();
      if (f.salaryRange?.trim()) payload.salaryRange = f.salaryRange.trim();
      payload.salaryPeriod = f.salaryPeriod;
      if (f.expMin) payload.experienceMin = Number(f.expMin);
      if (f.expMax) payload.experienceMax = Number(f.expMax);
      if (f.jobFunction?.trim()) payload.jobFunction = f.jobFunction.trim();
      if (f.employmentType?.trim()) payload.employmentType = f.employmentType.trim();
      if (f.incentives?.trim()) payload.incentives = f.incentives.trim();
      if (f.selectionProcess?.trim()) payload.selectionProcess = f.selectionProcess.trim();
      if (f.notesHighlights?.trim()) payload.notesHighlights = f.notesHighlights.trim();
      if (f.expiresAt) payload.expiresAt = new Date(f.expiresAt).toISOString();

      if (f.type === 'WALKIN') {
        const dates: string[] = [];
        if (f.walkInDate) {
          const d = new Date(f.walkInDate);
          const end = f.walkInEndDate ? new Date(f.walkInEndDate) : d;
          const cur = new Date(d);
          while (cur <= end) { dates.push(cur.toISOString()); cur.setDate(cur.getDate() + 1); }
        }
        payload.walkInDetails = {
          venueAddress: f.venueAddress.trim(),
          venueLink: f.venueLink?.trim() || undefined,
          timeRange: f.walkInTime.trim() || undefined,
          dates,
          requiredDocuments: f.requiredDocuments.split(',').map(s => s.trim()).filter(Boolean),
          contactPerson: f.contactPerson.trim() || undefined,
          contactPhone: f.contactPhone.trim() || undefined,
        };
      }

      if (isEditing) {
        await adminOpportunitiesApi.update(opportunityId!, payload);
        toast.success('Saved', 'Opportunity updated.');
      } else {
        await adminOpportunitiesApi.create(payload);
        toast.success('Posted', 'Opportunity created.');
      }
      
      reset(f); 
      await queryClient.invalidateQueries({ queryKey: ['admin'] });
      await AsyncStorage.removeItem(ADMIN_OPPORTUNITIES_CACHE_KEY);
      navigation.goBack();
    } catch (e: unknown) {
      const err = e as Record<string, unknown>;
      // Check if it's a network error (offline)
      const isNetworkError = !err.response || err.code === 'ERR_NETWORK' || (err.message as string)?.includes('Network Error');
      
      if (isNetworkError) {
        addToQueue(payload, isEditing, opportunityId);
        toast.warning('Offline', 'Saved locally. Will sync when online.');
        reset(f);
        navigation.goBack();
      } else {
        toast.error('Save failed', e instanceof Error ? e.message : 'Failed to save');
      }
    } finally {
      setSaving(false);
    }
  };

  const set = useCallback(<K extends Path<PostOpportunityFormValues>>(key: K, value: PathValue<PostOpportunityFormValues, K>) => {
    setValue(key, value, { shouldDirty: true });
  }, [setValue]);

  const toggle = useCallback(<T,>(key: Path<PostOpportunityFormValues>, item: T) => {
    const list = (watch(key) as unknown as T[]) || [];
    const next = list.includes(item) ? list.filter(i => i !== item) : [...list, item];
    setValue(key, next as PathValue<PostOpportunityFormValues, Path<PostOpportunityFormValues>>, { shouldDirty: true });
  }, [setValue, watch]);

  return { 
    form: formValues, 
    set, 
    toggle, 
    fillForm, 
    loading, 
    saving, 
    handleSave: handleSubmit(onSave),
    errors,
  };
};
