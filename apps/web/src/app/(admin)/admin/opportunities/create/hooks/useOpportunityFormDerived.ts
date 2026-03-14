import { useMemo } from 'react';
import { ALL_COURSE_OPTIONS, ALL_SPECIALIZATION_OPTIONS } from '@/lib/profileConstants';
import { useOpportunityForm } from '@/features/admin/opportunities/useOpportunityForm';

const commonDegrees = ['DIPLOMA', 'DEGREE', 'PG'];

export function useOpportunityFormDerived(form: ReturnType<typeof useOpportunityForm>) {
    const customDegrees = useMemo(() => 
        form.allowedDegrees.filter((d: string) => !commonDegrees.includes(d)),
    [form.allowedDegrees]);

    const visibleCourseOptions = useMemo(() => {
        const selected = new Set(form.allowedCourses as string[]);
        const defaults = ['B.E', 'B.Tech', 'BCA', 'B.Sc', 'M.E', 'M.Tech', 'MCA', 'M.Sc', 'MBA'];
        return Array.from(new Set([...selected, ...defaults])).filter(c => (ALL_COURSE_OPTIONS as unknown as string[]).includes(c));
    }, [form.allowedCourses]);

    const visibleSpecializationOptions = useMemo(() => {
        const selected = new Set((form.allowedSpecializations || []) as string[]);
        const defaults = ['CS', 'IT', 'ECE', 'EEE', 'Mechanical', 'Civil', 'Any'];
        return Array.from(new Set([...selected, ...defaults])).filter(s => (ALL_SPECIALIZATION_OPTIONS as unknown as string[]).includes(s));
    }, [form.allowedSpecializations]);

    return {
        commonDegrees,
        customDegrees,
        visibleCourseOptions,
        visibleSpecializationOptions
    };
}
