/**
 * usePostOpportunityForm
 * Owns all form state, dirty tracking, load, and save logic for PostOpportunityScreen.
 * The screen itself becomes a thin render container.
 */
import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Opportunities } from '../../lib/api';
import { ADMIN_OPPORTUNITIES_CACHE_KEY } from '../../lib/constants';
import { toast } from '../../lib/toast';

type OpType = 'JOB' | 'INTERNSHIP' | 'WALKIN';
type SalaryPeriod = 'YEARLY' | 'MONTHLY';

export interface PostOpportunityFormState {
    // Core
    type: OpType;
    status: string;
    title: string;
    company: string;
    companyWebsite: string;
    description: string;
    // Links
    sourceLink: string;
    applyLink: string;
    // Location
    locationInput: string;
    workMode: string;
    // Education
    selectedDegrees: string[];
    selectedYears: number[];
    // Skills
    skills: string;
    // Salary
    salaryRange: string;
    salaryPeriod: SalaryPeriod;
    // Experience
    expMin: string;
    expMax: string;
    // Job specifics
    jobFunction: string;
    employmentType: string;
    incentives: string;
    selectionProcess: string;
    notesHighlights: string;
    expiresAt: string;
    // Walk-in
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
    selectedDegrees: [], selectedYears: [],
    skills: '', salaryRange: '', salaryPeriod: 'YEARLY',
    expMin: '', expMax: '',
    jobFunction: '', employmentType: '', incentives: '', selectionProcess: '', notesHighlights: '', expiresAt: '',
    venueAddress: '', venueLink: '', walkInDate: '', walkInEndDate: '', walkInTime: '',
    requiredDocuments: '', contactPerson: '', contactPhone: '',
};

export function usePostOpportunityForm(opportunityId: string | undefined, navigation: any) {
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

    const fillForm = useCallback((o: any) => {
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
            const data = await Opportunities.get(opportunityId!);
            fillForm(data.opportunity);
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

    // Dirty guard
    useEffect(() => {
        const unsub = navigation.addListener('beforeRemove', (e: any) => {
            if (!isDirty || saving) return;
            e.preventDefault();
            Alert.alert('Discard changes?', 'You have unsaved changes.', [
                { text: 'Keep Editing', style: 'cancel' },
                { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
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
        setSaving(true);
        try {
            const locations = f.locationInput.split(',').map(s => s.trim()).filter(Boolean);
            const requiredSkills = f.skills.split(',').map(s => s.trim()).filter(Boolean);

            const payload: Record<string, unknown> = {
                title: f.title.trim(), company: f.company.trim(),
                type: f.type, status: f.status, workMode: f.workMode,
                locations: locations.length ? locations : ['Remote'],
                allowedDegrees: f.selectedDegrees, allowedPassoutYears: f.selectedYears, requiredSkills,
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
                await Opportunities.update(opportunityId!, payload);
                toast.success('Saved', 'Opportunity updated.');
            } else {
                await Opportunities.create(payload);
                toast.success('Posted', 'Opportunity created.');
            }
            setIsDirty(false);
            await AsyncStorage.removeItem(ADMIN_OPPORTUNITIES_CACHE_KEY);
            navigation.goBack();
        } catch (e) {
            toast.error('Save failed', e instanceof Error ? e.message : 'Failed to save');
        } finally {
            setSaving(false);
        }
    }, [form, isEditing, opportunityId, navigation]);

    return { form, set, toggle, fillForm, loading, saving, isDirty, handleSave };
}
