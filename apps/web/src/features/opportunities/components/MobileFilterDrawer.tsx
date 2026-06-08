'use client';

import { useState } from 'react';
import { XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { Button } from '@/features/system/components/ui/Button';
import { cn } from '@repo/ui/utils/cn';

const CORP_LOCATIONS = ['Bangalore', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Pune', 'Remote'];
const GOVT_LOCATIONS = ['All India', 'Delhi', 'Telangana', 'Maharashtra', 'Uttar Pradesh', 'Karnataka'];

const TYPE_OPTIONS = [
    { label: 'All', value: '' },
    { label: 'Jobs', value: 'JOB' },
    { label: 'Internships', value: 'INTERNSHIP' },
    { label: 'Walk-ins', value: 'WALKIN' },
];

const GOVT_SECTORS = ['Defense', 'Railways', 'Banking', 'Teaching', 'Police', 'SSC / UPSC', 'PSU'];
const GOVT_QUALIFICATIONS = ['10th Pass', '12th Pass', 'Diploma', 'Graduate', 'Postgraduate'];
const CORP_COURSES = ['B.Tech/B.E.', 'M.C.A.', 'MBA', 'B.Sc/B.Com/B.A', 'Diploma'];

const CURRENT_YEAR = new Date().getFullYear();
const START_YEAR = 2020;
const END_YEAR = CURRENT_YEAR + 2;
const PASSOUT_YEAR_OPTIONS = Array.from(
    { length: Math.max(0, END_YEAR - START_YEAR + 1) },
    (_, idx) => START_YEAR + idx
);

type OpenSection = 'type' | 'location' | 'year' | 'sector' | 'qualification' | 'course' | null;

interface MobileFilterDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    draftType?: string | null;
    setDraftType?: (type: string | null) => void;
    draftLoc: string | null;
    setDraftLoc: (loc: string | null) => void;
    draftYear: number | null;
    setDraftYear: (year: number | null) => void;
    draftClosingSoon: boolean;
    setDraftClosingSoon: (val: boolean) => void;
    draftShowOnlySaved: boolean;
    setDraftShowOnlySaved: (val: boolean) => void;
    draftSector: string | null;
    setDraftSector: (val: string | null) => void;
    draftQualification: string | null;
    setDraftQualification: (val: string | null) => void;
    draftCourse: string | null;
    setDraftCourse: (val: string | null) => void;
    isLoggedIn: boolean;
    pageType?: string;
    onApply: () => void;
    onClear: () => void;
}

function Section({
    title,
    isOpen,
    onToggle,
    children,
}: {
    title: string;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="border-b border-border/70">
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex items-center justify-between py-4"
            >
                <span className="text-sm font-semibold text-foreground">{title}</span>
                <ChevronDownIcon className={cn('w-4 h-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')} />
            </button>
            {isOpen ? <div className="pb-4 space-y-2">{children}</div> : null}
        </div>
    );
}

function Pill({
    active,
    children,
    onClick,
    disabled = false,
}: {
    active: boolean;
    children: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={cn(
                'px-4 py-2 rounded-full text-sm transition',
                active ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/80',
                disabled && 'opacity-50 cursor-not-allowed'
            )}
        >
            {children}
        </button>
    );
}

export function MobileFilterDrawer({
    isOpen,
    onClose,
    draftType,
    setDraftType,
    draftLoc,
    setDraftLoc,
    draftYear,
    setDraftYear,
    draftClosingSoon,
    draftShowOnlySaved,
    draftSector,
    setDraftSector,
    draftQualification,
    setDraftQualification,
    draftCourse,
    setDraftCourse,
    pageType,
    onApply,
    onClear,
}: MobileFilterDrawerProps) {
    const [openSection, setOpenSection] = useState<OpenSection>(setDraftType ? 'type' : 'location');
    if (!isOpen) return null;

    const activeCount = [
        draftType,
        draftLoc,
        draftYear,
        draftSector,
        draftQualification,
        draftCourse,
        draftClosingSoon ? 'closing' : null,
        draftShowOnlySaved ? 'saved' : null,
    ].filter(Boolean).length;

    return (
        <div className="fixed inset-0 z-90 lg:hidden" role="dialog" aria-modal="true" aria-labelledby="mobile-filter-title">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />

            <div className="absolute bottom-18 left-0 right-0 max-h-[85vh] rounded-t-3xl bg-background border-t border-border shadow-2xl flex flex-col">
                <div className="flex justify-center py-3">
                    <div className="h-1.5 w-10 rounded-full bg-muted" />
                </div>

                <div className="px-5 pb-3 border-b border-border/70 flex items-start justify-between">
                    <div>
                        <h3 id="mobile-filter-title" className="text-xl font-bold text-foreground">Filters</h3>
                        <p className="text-sm text-muted-foreground">{activeCount} filters active</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="h-10 w-10 rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted transition-colors flex items-center justify-center"
                        aria-label="Close filters"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-5 overflow-y-auto flex-1">
                    {setDraftType ? (
                        <Section
                            title="Type"
                            isOpen={openSection === 'type'}
                            onToggle={() => setOpenSection(openSection === 'type' ? null : 'type')}
                        >
                            <div className="flex flex-wrap gap-2">
                                {TYPE_OPTIONS.map((option) => (
                                    <Pill
                                        key={option.label}
                                        active={(draftType || '') === option.value}
                                        onClick={() => setDraftType(option.value || null)}
                                    >
                                        {option.label}
                                    </Pill>
                                ))}
                            </div>
                        </Section>
                    ) : null}

                    <Section
                        title="Location"
                        isOpen={openSection === 'location'}
                        onToggle={() => setOpenSection(openSection === 'location' ? null : 'location')}
                    >
                        <div className="flex flex-wrap gap-2">
                            <Pill active={draftLoc === null} onClick={() => setDraftLoc(null)}>Any</Pill>
                            {(pageType === 'GOVERNMENT' ? GOVT_LOCATIONS : CORP_LOCATIONS).map((location) => (
                                <Pill
                                    key={location}
                                    active={draftLoc === location}
                                    onClick={() => setDraftLoc(location)}
                                >
                                    {location}
                                </Pill>
                            ))}
                        </div>
                    </Section>

                    {pageType === 'GOVERNMENT' && (
                        <>
                            <Section
                                title="Sector"
                                isOpen={openSection === 'sector'}
                                onToggle={() => setOpenSection(openSection === 'sector' ? null : 'sector')}
                            >
                                <div className="flex flex-wrap gap-2">
                                    <Pill active={draftSector === null} onClick={() => setDraftSector(null)}>Any</Pill>
                                    {GOVT_SECTORS.map((sector) => (
                                        <Pill
                                            key={sector}
                                            active={draftSector === sector}
                                            onClick={() => setDraftSector(sector)}
                                        >
                                            {sector}
                                        </Pill>
                                    ))}
                                </div>
                            </Section>

                            <Section
                                title="Qualification"
                                isOpen={openSection === 'qualification'}
                                onToggle={() => setOpenSection(openSection === 'qualification' ? null : 'qualification')}
                            >
                                <div className="flex flex-wrap gap-2">
                                    <Pill active={draftQualification === null} onClick={() => setDraftQualification(null)}>Any</Pill>
                                    {GOVT_QUALIFICATIONS.map((qual) => (
                                        <Pill
                                            key={qual}
                                            active={draftQualification === qual}
                                            onClick={() => setDraftQualification(qual)}
                                        >
                                            {qual}
                                        </Pill>
                                    ))}
                                </div>
                            </Section>
                        </>
                    )}

                    {pageType !== 'GOVERNMENT' && (
                        <>
                            <Section
                                title="Course"
                                isOpen={openSection === 'course'}
                                onToggle={() => setOpenSection(openSection === 'course' ? null : 'course')}
                            >
                                <div className="flex flex-wrap gap-2">
                                    <Pill active={draftCourse === null} onClick={() => setDraftCourse(null)}>Any</Pill>
                                    {CORP_COURSES.map((course) => (
                                        <Pill
                                            key={course}
                                            active={draftCourse === course}
                                            onClick={() => setDraftCourse(course)}
                                        >
                                            {course}
                                        </Pill>
                                    ))}
                                </div>
                            </Section>
                            <Section
                                title="Passout Year"
                                isOpen={openSection === 'year'}
                                onToggle={() => setOpenSection(openSection === 'year' ? null : 'year')}
                            >
                                <div className="flex flex-wrap gap-2">
                                    <Pill active={draftYear === null} onClick={() => setDraftYear(null)}>Any</Pill>
                                    {PASSOUT_YEAR_OPTIONS.map((year) => (
                                        <Pill
                                            key={year}
                                            active={draftYear === year}
                                            onClick={() => setDraftYear(year)}
                                        >
                                            {year}
                                        </Pill>
                                    ))}
                                </div>
                            </Section>
                        </>
                    )}


                </div>

                <div className="border-t border-border p-4">
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={onClear}
                            className="h-12 rounded-xl border border-border bg-card text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
                        >
                            Clear
                        </button>
                        <Button className="h-12 rounded-xl text-sm font-semibold" onClick={onApply}>
                            Apply filters
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}






