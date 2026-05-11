import { useState, useCallback, useEffect } from 'react';
import { adminOpportunitiesApi, type Opportunity } from '@fresherflow/api-client';
import type { NavigationProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { ADMIN_OPPORTUNITIES_CACHE_KEY } from '../../../lib/constants';
import { toast } from '../../../lib/toast';

export interface PostOpportunityFormState {
  type: 'JOB' | 'INTERNSHIP' | 'WALKIN';
  status: string;
  title: string;
  company: string;
  companyWebsite: string;
  description: string;
  sourceLink: string;
  applyLink: string;
  locationInput: string;
  workMode: string;
  selectedDegrees: string[];
  allowedCourses: string;
  allowedSpecializations: string;
  selectedYears: number[];
  skills: string;
  salaryRange: string;
  salaryPeriod: 'YEARLY' | 'MONTHLY';
  expMin: string;
  expMax: string;
  jobFunction: string;
  employmentType: string;
  incentives: string;
  selectionProcess: string;
  notesHighlights: string;
  expiresAt: string;
  venueAddress: string;
  venueLink: string;
  walkInDate: string;
  walkInEndDate: string;
  walkInTime: string;
  requiredDocuments: string;
  contactPerson: string;
  contactPhone: string;
}

const INITIAL: PostOpportunityFormState = {
  type: 'JOB', status: 'DRAFT', title: '', company: '', companyWebsite: '', description: '',
  sourceLink: '', applyLink: '',
  locationInput: '', workMode: 'ONSITE',
  selectedDegrees: [], allowedCourses: '', allowedSpecializations: '', selectedYears: [],
  skills: '', salaryRange: '', salaryPeriod: 'YEARLY',
  expMin: '', expMax: '',
  jobFunction: '', employmentType: '', incentives: '', selectionProcess: '', notesHighlights: '', expiresAt: '',
  venueAddress: '', venueLink: '', walkInDate: '', walkInEndDate: '', walkInTime: '',
  requiredDocuments: '', contactPerson: '', contactPhone: '',
};

function isValidDateInput(value: string): boolean {
  if (!value) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

export const usePostOpportunity = (opportunityId: string | undefined, navigation: NavigationProp<Record<string, unknown>>) => {
  const isEditing = !!opportunityId;
  const [form, setForm] = useState<PostOpportunityFormState>(INITIAL);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  const set = useCallback(<K extends keyof PostOpportunityFormState>(key: K, value: PostOpportunityFormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }, []);

  const toggle = useCallback(<T,>(key: keyof PostOpportunityFormState, item: T) => {
    setForm(prev => {
      const list = prev[key] as T[];
      return { ...prev, [key]: list.includes(item) ? list.filter(i => i !== item) : [...list, item] };
    });
    setIsDirty(true);
  }, []);

  const fillForm = useCallback((o: Partial<Opportunity> & Record<string, unknown>) => {
    setForm({
      type: o.type || 'JOB',
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
      salaryPeriod: o.salaryPeriod || 'YEARLY',
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
  }, []);

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

  const handleSave = useCallback(async () => {
    const f = form;
    if (!f.title.trim() || !f.company.trim()) {
      Alert.alert('Required', 'Title and Company are required.'); return;
    }
    if (f.type !== 'WALKIN' && !f.sourceLink.trim() && !f.applyLink.trim()) {
      Alert.alert('Required', 'Add at least one Source or Apply URL.'); return;
    }
    if (f.expiresAt && !isValidDateInput(f.expiresAt)) {
      Alert.alert('Invalid expiry date', 'Use a valid expiry date in YYYY-MM-DD format.'); return;
    }
    if (f.type === 'WALKIN') {
      if (!f.venueAddress.trim()) {
        Alert.alert('Walk-in requires venue', 'Add the venue address for this walk-in opportunity.'); return;
      }
      if (!f.walkInDate || !isValidDateInput(f.walkInDate)) {
        Alert.alert('Invalid walk-in date', 'Add a valid walk-in start date in YYYY-MM-DD format.'); return;
      }
      if (f.walkInEndDate && !isValidDateInput(f.walkInEndDate)) {
        Alert.alert('Invalid walk-in end date', 'Use a valid end date in YYYY-MM-DD format.'); return;
      }
      if (f.walkInEndDate && new Date(f.walkInEndDate).getTime() < new Date(f.walkInDate).getTime()) {
        Alert.alert('Date range error', 'Walk-in end date cannot be earlier than the start date.'); return;
      }
    }
    setSaving(true);
    try {
      const locations = f.locationInput.split(',').map(s => s.trim()).filter(Boolean);
      const requiredSkills = f.skills.split(',').map(s => s.trim()).filter(Boolean);
      const allowedCourses = f.allowedCourses.split(',').map(s => s.trim()).filter(Boolean);
      const allowedSpecializations = f.allowedSpecializations.split(',').map(s => s.trim()).filter(Boolean);
 
      const payload: Record<string, unknown> = {
        title: f.title.trim(), company: f.company.trim(),
        type: f.type, status: f.status, workMode: f.workMode,
        locations: locations.length ? locations : ['Remote'],
        allowedDegrees: f.selectedDegrees,
        allowedCourses,
        allowedSpecializations,
        allowedPassoutYears: f.selectedYears,
        requiredSkills,
      };

      if (f.companyWebsite.trim()) payload.companyWebsite = f.companyWebsite.trim();
      if (f.description.trim()) payload.description = f.description.trim();
      if (f.sourceLink.trim()) payload.sourceLink = f.sourceLink.trim();
      payload.applyLink = f.applyLink.trim() || f.sourceLink.trim();
      if (f.salaryRange.trim()) payload.salaryRange = f.salaryRange.trim();
      payload.salaryPeriod = f.salaryPeriod;
      if (f.expMin) payload.experienceMin = Number(f.expMin);
      if (f.expMax) payload.experienceMax = Number(f.expMax);
      if (f.jobFunction.trim()) payload.jobFunction = f.jobFunction.trim();
      if (f.employmentType.trim()) payload.employmentType = f.employmentType.trim();
      if (f.incentives.trim()) payload.incentives = f.incentives.trim();
      if (f.selectionProcess.trim()) payload.selectionProcess = f.selectionProcess.trim();
      if (f.notesHighlights.trim()) payload.notesHighlights = f.notesHighlights.trim();
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
          venueLink: f.venueLink.trim() || undefined,
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
      setIsDirty(false);
      await AsyncStorage.removeItem(ADMIN_OPPORTUNITIES_CACHE_KEY);
      navigation.goBack();
    } catch (e: unknown) {
      toast.error('Save failed', e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [form, isEditing, opportunityId, navigation, fillForm]);

  return { form, set, toggle, fillForm, loading, saving, handleSave };
};
