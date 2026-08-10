'use client';

import { useState, useEffect } from 'react';
import { XMarkIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { Button } from '@/ui/Button';
import { SkillPill } from '@/ui/SkillPill';
import { cn } from '@repo/ui/utils/cn';

import { INDIAN_CITIES, INDIAN_STATES } from '@fresherflow/constants';

const PRIMARY_CITIES = ['Remote', 'Bengaluru', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Pune', 'Chennai', 'Noida', 'Gurugram', 'Kolkata'];
const OTHER_CITIES = INDIAN_CITIES.filter(c => !PRIMARY_CITIES.includes(c));

const PRIMARY_STATES = ['All India', 'Delhi NCR', 'Karnataka', 'Maharashtra', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh'];
const OTHER_STATES = INDIAN_STATES.filter(s => !PRIMARY_STATES.includes(s));

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

const CANONICAL_SKILLS = [
  '.NET', 'A.I.', 'Analytics', 'Android', 'Angular',
  'Back-End', 'C#', 'C++', 'Data Science', 'DevOps',
  'Django', 'Docker', 'Front-End', 'Golang', 'GraphQL',
  'Hardware', 'iOS', 'Java', 'JavaScript', 'Linux',
  'Microservices', 'Machine Learning', 'MySQL', 'NextJS', 'NodeJS',
  'Objective-C', 'Perl', 'PHP', 'PostgreSQL', 'Python',
  'Quality Assurance', 'React', 'React Native', 'Redis', 'Ruby',
  'Ruby on Rails', 'Salesforce', 'Scala', 'Shopify', 'TypeScript',
  'VueJS'
];

type OpenSection = 'type' | 'location' | 'year' | 'sector' | 'qualification' | 'course' | 'workMode' | 'skills' | 'source' | null;

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
    draftWorkMode?: 'REMOTE' | 'HYBRID' | 'ON_SITE' | null;
    setDraftWorkMode?: (val: 'REMOTE' | 'HYBRID' | 'ON_SITE' | null) => void;
    draftSkills?: string[];
    setDraftSkills?: (val: string[]) => void;
    draftSource?: string[];
    setDraftSource?: (val: string[]) => void;
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
                className="w-full flex items-center justify-between py-4 focus-visible:ring-2 focus-visible:ring-primary focus:outline-none cursor-pointer"
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
                'px-3.5 py-1.5 rounded-full text-xs transition cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus:outline-none select-none',
                active ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'bg-muted/70 text-foreground hover:bg-muted',
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
    draftWorkMode,
    setDraftWorkMode,
    draftSkills,
    setDraftSkills,
    draftSource,
    setDraftSource,
    pageType,
    onApply,
    onClear,
}: MobileFilterDrawerProps) {
    const [openSection, setOpenSection] = useState<OpenSection>(setDraftType ? 'type' : 'location');
    const [locSearch, setLocSearch] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const activeCount = [
        draftType,
        draftLoc,
        draftYear,
        draftSector,
        draftQualification,
        draftCourse,
        draftSource,
        draftClosingSoon ? 'closing' : null,
        draftShowOnlySaved ? 'saved' : null,
    ].filter(Boolean).length;

    const isGovt = pageType === 'GOVERNMENT';
    const primaryList = isGovt ? PRIMARY_STATES : PRIMARY_CITIES;
    const secondaryList = isGovt ? OTHER_STATES : OTHER_CITIES;

    const query = locSearch.trim().toLowerCase();
    const filteredPrimary = query ? primaryList.filter(l => l.toLowerCase().includes(query)) : primaryList;
    const filteredSecondary = query ? secondaryList.filter(l => l.toLowerCase().includes(query)) : secondaryList;

    return (
        <div className="fixed inset-0 z-90 lg:hidden" role="dialog" aria-modal="true" aria-labelledby="mobile-filter-title">
            <div className="absolute inset-0 bg-black/40 animate-in fade-in duration-300 ease-out" onClick={onClose} />

            <div className="absolute bottom-0 pb-[env(safe-area-inset-bottom)] left-0 right-0 max-h-[85vh] rounded-t-3xl bg-background border-t border-border shadow-2xl flex flex-col animate-in slide-in-from-bottom-[100%] duration-400 ease-[cubic-bezier(0.32,0.72,0,1)] overscroll-contain">
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
                        className="h-10 w-10 rounded-xl border border-border bg-card text-muted-foreground hover:bg-muted transition-colors flex items-center justify-center focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
                        aria-label="Close filters"
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-5 overflow-y-auto overscroll-contain flex-1">
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
                        <div className="space-y-3">
                            <input
                                type="text"
                                value={locSearch}
                                onChange={e => setLocSearch(e.target.value)}
                                placeholder="Search city or state..."
                                className="w-full h-9 px-3 rounded-xl border border-border bg-card text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                            />
                            <div className="space-y-3 max-h-52 overflow-y-auto overscroll-contain pr-1">
                                <div className="flex flex-wrap gap-2">
                                    <Pill active={draftLoc === null} onClick={() => setDraftLoc(null)}>All Locations</Pill>
                                </div>

                                {filteredPrimary.length > 0 && (
                                    <div className="space-y-1.5">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">{isGovt ? 'Top States' : 'Top Tech Hubs'}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {filteredPrimary.map((location) => (
                                                <Pill
                                                    key={location}
                                                    active={draftLoc === location}
                                                    onClick={() => setDraftLoc(location)}
                                                >
                                                    {location}
                                                </Pill>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {filteredSecondary.length > 0 && (
                                    <div className="space-y-1.5 pt-1">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">{isGovt ? 'Other States' : 'Other Cities'}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {filteredSecondary.map((location) => (
                                                <Pill
                                                    key={location}
                                                    active={draftLoc === location}
                                                    onClick={() => setDraftLoc(location)}
                                                >
                                                    {location}
                                                </Pill>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
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
                            {setDraftSource && (
                            <Section
                                title="Source"
                                isOpen={openSection === 'source'}
                                onToggle={() => setOpenSection(openSection === 'source' ? null : 'source')}
                            >
                                <div className="flex flex-wrap gap-2">
                                    {['Careers', 'Workday', 'Greenhouse', 'Lever', 'Ashby', 'BambooHR', 'iCIMS', 'Taleo'].map((src) => {
                                        const isSelected = draftSource?.includes(src);
                                        return (
                                        <Pill
                                            key={src}
                                            active={isSelected || false}
                                            onClick={() => {
                                                const newSource = isSelected
                                                    ? (draftSource || []).filter(s => s !== src)
                                                    : [...(draftSource || []), src];
                                                setDraftSource(newSource);
                                            }}
                                        >
                                            {src}
                                        </Pill>
                                    )})}
                                </div>
                            </Section>
                            )}
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
                            {setDraftWorkMode && (
                            <Section
                                title="Work Mode"
                                isOpen={openSection === 'workMode'}
                                onToggle={() => setOpenSection(openSection === 'workMode' ? null : 'workMode')}
                            >
                                <div className="flex flex-wrap gap-2">
                                    <Pill active={draftWorkMode === null} onClick={() => setDraftWorkMode(null)}>Any</Pill>
                                    <Pill active={draftWorkMode === 'REMOTE'} onClick={() => setDraftWorkMode('REMOTE')}>Remote</Pill>
                                    <Pill active={draftWorkMode === 'HYBRID'} onClick={() => setDraftWorkMode('HYBRID')}>Hybrid</Pill>
                                    <Pill active={draftWorkMode === 'ON_SITE'} onClick={() => setDraftWorkMode('ON_SITE')}>On-site</Pill>
                                </div>
                            </Section>
                            )}
                            {setDraftSkills && (
                            <Section
                                title="Skills"
                                isOpen={openSection === 'skills'}
                                onToggle={() => setOpenSection(openSection === 'skills' ? null : 'skills')}
                            >
                                <div className="flex flex-wrap gap-2">
                                    {CANONICAL_SKILLS.map((skill) => {
                                        const isSelected = draftSkills?.includes(skill);
                                        return (
                                        <Pill
                                            key={skill}
                                            active={isSelected || false}
                                            onClick={() => {
                                                const newSkills = isSelected
                                                    ? (draftSkills || []).filter(s => s !== skill)
                                                    : [...(draftSkills || []), skill];
                                                setDraftSkills(newSkills);
                                            }}
                                        >
                                            <SkillPill skill={skill} className="bg-transparent border-none p-0 h-auto text-inherit shadow-none" />
                                        </Pill>
                                    )})}
                                </div>
                            </Section>
                            )}
                        </>
                    )}


                </div>

                <div className="border-t border-border p-4">
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={onClear}
                            className="h-12 rounded-xl border border-border bg-card text-sm font-medium text-foreground hover:bg-muted/60 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus:outline-none"
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






