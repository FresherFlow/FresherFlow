'use client';

import { useAdmin } from '@/lib/auth/AdminContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

import { DuplicateCheck } from './OpportunityForm/DuplicateCheck';
import { TypeSelection } from './OpportunityForm/sections/TypeSelection';
import { JobInfoSection } from './OpportunityForm/sections/JobInfoSection';
import { LogisticsSection } from './OpportunityForm/sections/LogisticsSection';
import { EligibilitySection } from './OpportunityForm/sections/EligibilitySection';
import { SalarySection } from './OpportunityForm/sections/SalarySection';
import { ApplyLinkSection } from './OpportunityForm/sections/ApplyLinkSection';
import { ApplicationDetailsSection } from './OpportunityForm/sections/ApplicationDetailsSection';
import { ExpirationSection } from './OpportunityForm/sections/ExpirationSection';
import { WalkInDetailsSection } from './OpportunityForm/sections/WalkInDetailsSection';
import { GovernmentJobSection } from './OpportunityForm/sections/GovernmentJobSection';
import { ParserSection } from './OpportunityForm/sections/ParserSection';
import { TimelineSection } from './OpportunityForm/sections/TimelineSection';
import { BoltIcon, ChevronLeftIcon } from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

// UI primitives
import { Button } from '@/ui/Button';
import { Badge } from '@/ui/Badge';
import { Progress } from '@/ui/Progress';
import { Dialog, DialogContent } from '@/ui/Dialog';

// Hooks & Utils
import { useOpportunityForm } from '../useOpportunityForm';
import { useOpportunityFormDerived } from '@/features/admin/opportunities/hooks/useOpportunityFormDerived';
import { useOpportunityFormHandlers } from '@/features/admin/opportunities/hooks/useOpportunityFormHandlers';

export type OpportunityFormPageProps = {
    mode?: 'create' | 'edit';
    opportunityId?: string;
    initialGovernmentMode?: boolean;
};

const TYPE_LABELS: Record<string, string> = {
    JOB: 'Job',
    INTERNSHIP: 'Internship',
    WALKIN: 'Walk-in',
    GOVERNMENT: 'Government',
};

type OpportunityFormState = ReturnType<typeof useOpportunityForm>;

/**
 * Listing completeness: the checks an admin must satisfy before a listing is
 * publish-ready. Drives the progress meter in the sticky action bar.
 */
function getCompleteness(form: OpportunityFormState): { percent: number; next: string | null } {
    const checks: { label: string; done: boolean }[] = [
        { label: 'Add a title', done: form.title.trim().length > 0 },
        { label: 'Add the company', done: form.company.trim().length > 0 },
        { label: 'Write the description', done: form.description.trim().length > 0 },
        { label: 'Add locations', done: form.locations.trim().length > 0 },
        {
            label: 'Add a source or apply URL',
            done: form.sourceLink.trim().length > 0 || form.applyLink.trim().length > 0,
        },
    ];

    if (form.type === 'WALKIN') {
        checks.push(
            { label: 'Add the venue address', done: form.venueAddress.trim().length > 0 },
            { label: 'Add the walk-in date', done: form.startDate.trim().length > 0 },
            { label: 'Add the walk-in time', done: form.startTime.trim().length > 0 },
        );
    } else if (form.isGovernmentJob || form.type === 'GOVERNMENT') {
        checks.push(
            { label: 'Add the organization', done: form.governmentOrganization.trim().length > 0 },
            { label: 'Add the department', done: form.governmentDepartment.trim().length > 0 },
        );
    } else {
        checks.push({
            label: 'Add compensation',
            done:
                form.salaryAmount.trim().length > 0 ||
                form.salaryRange.trim().length > 0 ||
                form.stipend.trim().length > 0,
        });
    }

    const done = checks.filter((check) => check.done).length;
    return {
        percent: Math.round((done / checks.length) * 100),
        next: checks.find((check) => !check.done)?.label ?? null,
    };
}

export function OpportunityFormPage({ mode = 'create', opportunityId, initialGovernmentMode = false }: OpportunityFormPageProps) {
    const { isAuthenticated } = useAdmin();
    const router = useRouter();
    const isEditMode = mode === 'edit' && !!opportunityId;

    const form = useOpportunityForm(mode, opportunityId);

    const {
        commonDegrees,
        customDegrees,
        visibleCourseOptions,
        visibleSpecializationOptions
    } = useOpportunityFormDerived(form);

    const {
        handleSubmit
    } = useOpportunityFormHandlers(form, mode, opportunityId);

    useEffect(() => {
        if (!isAuthenticated) {
            router.push('/admin/login');
        }
    }, [isAuthenticated, router]);

    useEffect(() => {
        if (!isEditMode && initialGovernmentMode) {
            form.setType('GOVERNMENT');
        }
    }, [form, initialGovernmentMode, isEditMode]);

    const handleQuickLocation = (loc: string) => {
        if (form.locations.toLowerCase().includes(loc.toLowerCase())) return;
        form.setLocations((prev: string) => prev ? `${prev}, ${loc}` : loc);
    };

    const handlePassoutYearsChange = (val: string) => {
        const years = val.split(',').map(y => parseInt(y.trim(), 10)).filter(y => !isNaN(y));
        form.setPassoutYears(years);
    };

    // Shared by the top-bar Auto-fill button: fast path fills from a JSON
    // clipboard, otherwise opens the parser dialog.
    const handleAutoFillAction = async () => {
        if (form.title) {
            form.setShowParser(true);
            return;
        }
        try {
            const text = await navigator.clipboard.readText();
            if (text && text.trim().startsWith('{')) {
                try {
                    form.applyJsonData(JSON.parse(text));
                    toast.success('Form updated from JSON clipboard.');
                } catch {
                    toast.error('Clipboard does not contain valid JSON data.');
                }
            } else if (text) {
                toast.error('Clipboard does not contain valid JSON data.');
            } else {
                toast.error('Clipboard is empty.');
            }
        } catch {
            toast.error('Could not read clipboard. Opening the auto-fill dialog.');
            form.setShowParser(true);
        }
    };

    const { percent, next } = getCompleteness(form);

    return (
        <div className="flex-1 h-full min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="mx-auto max-w-6xl px-4 md:px-8 py-4 md:py-6 pb-24">
                    <Dialog
                        open={form.showParser}
                        onOpenChange={(open) => {
                            if (!open) form.setShowParser(false);
                        }}
                    >
                        <DialogContent className="max-h-9/10 overflow-y-auto sm:max-w-2xl">
                            <ParserSection
                                form={form}
                                applyJsonToForm={(overrideJson?: string) => {
                                    try {
                                        const jsonStr = overrideJson ?? form.pastedJson;
                                        const parsed = JSON.parse(jsonStr);
                                        if (overrideJson) form.setPastedJson(overrideJson);
                                        form.applyJsonData(parsed);
                                        form.setShowParser(false);
                                    } catch {
                                        toast.error('Invalid JSON: Please check the pasted JSON structure.');
                                    }
                                }}
                                jsonReport={null}
                                closeParser={() => form.setShowParser(false)}
                            />
                        </DialogContent>
                    </Dialog>

                    <form id="opportunity-form" onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                        <TypeSelection form={form} />

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            <div className="lg:col-span-2 space-y-4">
                        <JobInfoSection
                            form={form}
                            duplicateCheckComponent={
                                <DuplicateCheck
                                    checking={form.checkingDuplicates}
                                    candidates={form.duplicateCandidates}
                                />
                            }
                        />

                        <EligibilitySection
                            form={form}
                            handleDegreeToggle={(deg) => form.setAllowedDegrees(prev => prev.includes(deg) ? prev.filter(d => d !== deg) : [...prev, deg])}
                            handleCourseToggle={(course) => form.setAllowedCourses(prev => prev.includes(course) ? prev.filter(c => c !== course) : [...prev, course])}
                            handleSpecializationToggle={(spec) => form.setAllowedSpecializations(prev => prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec])}
                            handlePassoutYearsChange={handlePassoutYearsChange}
                            commonDegrees={commonDegrees}
                            visibleCourseOptions={visibleCourseOptions}
                            visibleSpecializationOptions={visibleSpecializationOptions}
                            customDegrees={customDegrees}
                        />

                        {!form.isGovernmentJob && (
                            <ApplicationDetailsSection form={form} />
                        )}

                        {form.type === 'WALKIN' && (
                            <WalkInDetailsSection form={form} />
                        )}

                        {isEditMode && opportunityId && (
                            <TimelineSection
                                form={form}
                                isEditMode={isEditMode}
                            />
                        )}
                            </div>

                            {/* Publish rail: the fields that gate publishing stay visible while scrolling */}
                            <div className="space-y-4 lg:sticky lg:top-4 self-start">
                                <ApplyLinkSection form={form} />

                                <LogisticsSection
                                    form={form}
                                    handleQuickLocation={handleQuickLocation}
                                />

                                <SalarySection form={form} />

                                <ExpirationSection form={form} />
                            </div>
                        </div>

                        {form.isGovernmentJob && (
                            <div className="w-full">
                                <GovernmentJobSection form={form} />
                            </div>
                        )}
                    </form>
                </div>
            </div>

            {/* Floating action pill: back, progress and actions hover over the form */}
            <div className="fixed inset-x-4 bottom-6 z-40 flex justify-center">
                <div className="flex max-w-full items-center gap-2 rounded-2xl border border-border bg-background/95 py-2 pl-2 pr-2 shadow-lg backdrop-blur-md">
                    <Button
                        variant="ghost"
                        size="icon"
                        asChild
                        aria-label="Back to listings"
                    >
                        <Link href="/admin/opportunities">
                            <ChevronLeftIcon className="h-5 w-5" />
                        </Link>
                    </Button>

                    <div className="hidden min-w-0 md:block">
                        <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-semibold text-foreground">
                                {isEditMode ? 'Edit listing' : 'New listing'}
                            </span>
                            <Badge variant="outline" className="shrink-0">
                                {TYPE_LABELS[form.type] ?? form.type}
                            </Badge>
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                            <Progress value={percent} className="h-1.5 w-28" aria-label={`Listing ${percent}% complete`} />
                            <span className="truncate text-xs text-muted-foreground">
                                {percent}%{next ? ` · Next: ${next}` : ' · Ready'}
                            </span>
                        </div>
                    </div>

                    <div className="h-6 w-px shrink-0 bg-border hidden md:block" />

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={form.isParsing}
                        onClick={() => void handleAutoFillAction()}
                    >
                        {form.isParsing ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <BoltIcon className="w-4 h-4 text-primary" />
                        )}
                        <span className="hidden sm:inline">
                            {form.isParsing ? 'Filling…' : 'Auto-fill'}
                        </span>
                    </Button>
                    <Button
                        type="submit"
                        form="opportunity-form"
                        size="sm"
                        disabled={form.isLoading}
                    >
                        {form.isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {form.isLoading ? (isEditMode ? 'Updating…' : 'Publishing…') : (isEditMode ? 'Update' : 'Publish')}
                    </Button>
                </div>
            </div>
        </div>
    );
}
