'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@repo/ui/utils/cn';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import ChevronDownIcon from '@heroicons/react/24/outline/ChevronDownIcon';
import BriefcaseIcon from '@heroicons/react/24/outline/BriefcaseIcon';
import AcademicCapIcon from '@heroicons/react/24/outline/AcademicCapIcon';
import { SkillPill } from '@/ui/SkillPill';

import { INDIAN_CITIES, INDIAN_STATES } from '@fresherflow/constants';

const PRIMARY_CITIES = ['Bengaluru', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Pune', 'Chennai', 'Noida', 'Gurugram', 'Kolkata'];
const OTHER_CITIES = INDIAN_CITIES.filter(c => !PRIMARY_CITIES.includes(c));

const PRIMARY_STATES = ['All India', 'Delhi NCR', 'Karnataka', 'Maharashtra', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh'];
const OTHER_STATES = INDIAN_STATES.filter(s => !PRIMARY_STATES.includes(s));

export interface FilterBarFilters {
    location: string | null;
    year: number | null;
    closingSoon: boolean;
    saved: boolean;
    sector: string | null;
    qualification: string | null;
    course: string | null;
    workMode: string[] | null;
    skills: string[];
    source: string[];
}

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

const GOVT_SECTORS = ['Defense', 'Railways', 'Banking', 'Teaching', 'Police', 'SSC / UPSC', 'PSU'];
const GOVT_QUALIFICATIONS = ['10th Pass', '12th Pass', 'Diploma', 'Graduate', 'Postgraduate'];
const CORP_COURSES = ['B.Tech/B.E.', 'M.C.A.', 'MBA', 'B.Sc/B.Com/B.A', 'Diploma'];

interface FilterDropdownBarProps {
    filters: FilterBarFilters;
    setFilters: (f: FilterBarFilters) => void;
    isLoggedIn: boolean;
    selectedType?: string | null;
    onTypeChange?: (type: string | null) => void;
    pageType?: string;
}

type OpenPanel = 'location' | 'year' | 'type' | 'sector' | 'qualification' | 'course' | 'workMode' | 'skills' | 'source' | null;

const CURRENT_YEAR = new Date().getFullYear();
const START_YEAR = 2020;
const END_YEAR = CURRENT_YEAR + 2;
const PASSOUT_YEAR_OPTIONS = Array.from(
    { length: Math.max(0, END_YEAR - START_YEAR + 1) },
    (_, idx) => START_YEAR + idx
);

function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
    useEffect(() => {
        const listener = (e: MouseEvent | TouchEvent) => {
            if (!ref.current || ref.current.contains(e.target as Node)) return;
            handler();
        };
        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);
        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [ref, handler]);
}

const chipBase = 'h-8 px-3 rounded-lg text-[13px] font-medium flex items-center gap-1.5 transition-all whitespace-nowrap select-none cursor-pointer';
const chipDefault = 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground';
const chipActive = 'bg-muted text-foreground font-semibold';

export function FilterDropdownBar({ filters, setFilters, selectedType, onTypeChange, pageType }: FilterDropdownBarProps) {
    const [open, setOpen] = useState<OpenPanel>(null);
    const [locSearch, setLocSearch] = useState('');
    const barRef = useRef<HTMLDivElement>(null);

    useClickOutside(barRef, () => { setOpen(null); setLocSearch(''); });

    useEffect(() => {
        const onScroll = () => { setOpen(null); setLocSearch(''); };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const toggle = (panel: OpenPanel) => {
        setOpen(prev => (prev === panel ? null : panel));
        if (panel !== 'location') setLocSearch('');
    };


    const isGovt = pageType === 'GOVERNMENT';

    const primaryList = isGovt ? PRIMARY_STATES : PRIMARY_CITIES;
    const secondaryList = isGovt ? OTHER_STATES : OTHER_CITIES;

    const query = locSearch.trim().toLowerCase();
    const filteredPrimary = query ? primaryList.filter(l => l.toLowerCase().includes(query)) : primaryList;
    const filteredSecondary = query ? secondaryList.filter(l => l.toLowerCase().includes(query)) : secondaryList;

    return (
        <div ref={barRef} className="hidden lg:flex items-center gap-2 flex-wrap">

            {/* Type dropdown */}
            {onTypeChange && (
                <div className="relative">
                    <button
                        onClick={() => toggle('type')}
                        aria-expanded={open === 'type'}
                        aria-haspopup="listbox"
                        className={cn(chipBase, selectedType ? chipActive : chipDefault)}
                    >
                        <BriefcaseIcon className="w-3.5 h-3.5" />
                        {selectedType === 'JOB' ? 'Jobs' : selectedType === 'INTERNSHIP' ? 'Internships' : selectedType === 'WALKIN' ? 'Walk-ins' : 'Type'}
                        <ChevronDownIcon className={cn('w-3 h-3 transition-transform', open === 'type' && 'rotate-180')} />
                    </button>
                    {open === 'type' && (
                        <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-lg p-1.5 w-44 z-[100] overscroll-contain">
                            {[
                                { label: 'All types', value: null },
                                { label: 'Jobs', value: 'JOB' },
                                { label: 'Internships', value: 'INTERNSHIP' },
                                { label: 'Walk-ins', value: 'WALKIN' },
                            ].map(opt => (
                                <button
                                    key={opt.label}
                                    onClick={() => { onTypeChange(opt.value); setOpen(null); }}
                                    className={cn(
                                        'w-full text-left px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all cursor-pointer',
                                        selectedType === opt.value
                                            ? 'bg-primary/10 text-primary font-bold'
                                            : 'text-foreground hover:bg-muted/60'
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="relative">
                <button
                    onClick={() => toggle('location')}
                    aria-expanded={open === 'location'}
                    aria-haspopup="listbox"
                    className={cn(chipBase, (filters.location || (filters.workMode && filters.workMode.length > 0)) ? chipActive : chipDefault)}
                >
                    <MapPinIcon className="w-3.5 h-3.5" />
                    Location
                    {((filters.workMode?.length || 0) + (filters.location ? 1 : 0)) > 0 && (
                        <span className="bg-primary/20 text-primary rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none shrink-0 ml-1">
                            {((filters.workMode?.length || 0) + (filters.location ? 1 : 0))}
                        </span>
                    )}
                    <ChevronDownIcon className={cn('w-3 h-3 transition-transform shrink-0', open === 'location' && 'rotate-180')} />
                </button>

                {open === 'location' && (
                    <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-xl p-2 w-64 z-[100] space-y-1.5 overscroll-contain">
                        <div className="px-1">
                            <input
                                type="text"
                                value={locSearch}
                                onChange={e => setLocSearch(e.target.value)}
                                placeholder="Search city or state..."
                                className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                                autoFocus
                            />
                        </div>

                        <div className="max-h-60 overflow-y-auto overscroll-contain space-y-0.5 pr-1">
                            {/* Work Mode Options */}
                            {!isGovt && (
                                <>
                                    <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                                        Work Mode
                                    </div>
                                    {['REMOTE', 'HYBRID', 'ON_SITE'].map(mode => {
                                        const isSelected = filters.workMode?.includes(mode);
                                        return (
                                            <button
                                                key={mode}
                                                onClick={() => {
                                                    const newModes = isSelected
                                                        ? (filters.workMode || []).filter(m => m !== mode)
                                                        : [...(filters.workMode || []), mode];
                                                    setFilters({ ...filters, workMode: newModes.length > 0 ? newModes : null });
                                                }}
                                                className={cn(
                                                    'w-full text-left px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all flex items-center gap-2 cursor-pointer',
                                                    isSelected ? 'bg-primary/10 text-primary font-bold' : 'text-foreground hover:bg-muted/60'
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-3 h-3 rounded flex items-center justify-center shrink-0 border",
                                                    isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border bg-background"
                                                )}>
                                                    {isSelected && <svg viewBox="0 0 14 14" fill="none" className="w-2.5 h-2.5 stroke-current stroke-2"><path d="M3 7l3 3 5-5"/></svg>}
                                                </div>
                                                <span>{mode === 'REMOTE' ? 'Remote' : mode === 'HYBRID' ? 'Hybrid' : 'On-site'}</span>
                                            </button>
                                        );
                                    })}
                                    <div className="my-1.5 border-t border-border/50" />
                                </>
                            )}

                            {/* Option for All Locations */}
                            <button
                                onClick={() => {
                                    setFilters({ ...filters, location: null });
                                    setOpen(null);
                                    setLocSearch('');
                                }}
                                className={cn(
                                    'w-full text-left px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all flex items-center justify-between cursor-pointer',
                                    filters.location === null
                                        ? 'bg-primary/10 text-primary font-bold'
                                        : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                                )}
                            >
                                <span>All Locations</span>
                                {filters.location === null && <span className="text-primary text-xs">✓</span>}
                            </button>

                            {/* Main Hubs / Top Cities */}
                            {filteredPrimary.length > 0 && (
                                <>
                                    <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                                        {isGovt ? 'Top States' : 'Top Tech Hubs'}
                                    </div>
                                    {filteredPrimary.map(loc => (
                                        <button
                                            key={loc}
                                            onClick={() => {
                                                setFilters({ ...filters, location: filters.location === loc ? null : loc });
                                                setOpen(null);
                                                setLocSearch('');
                                            }}
                                            className={cn(
                                                'w-full text-left px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all flex items-center justify-between cursor-pointer',
                                                filters.location === loc
                                                    ? 'bg-primary/10 text-primary font-bold'
                                                    : 'text-foreground hover:bg-muted/60'
                                            )}
                                        >
                                            <span>{loc}</span>
                                            {filters.location === loc && <span className="text-primary text-xs">✓</span>}
                                        </button>
                                    ))}
                                </>
                            )}

                            {/* Other Cities / States */}
                            {filteredSecondary.length > 0 && (
                                <>
                                    <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                                        {isGovt ? 'Other States' : 'Other Cities'}
                                    </div>
                                    {filteredSecondary.map(loc => (
                                        <button
                                            key={loc}
                                            onClick={() => {
                                                setFilters({ ...filters, location: filters.location === loc ? null : loc });
                                                setOpen(null);
                                                setLocSearch('');
                                            }}
                                            className={cn(
                                                'w-full text-left px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all flex items-center justify-between cursor-pointer',
                                                filters.location === loc
                                                    ? 'bg-primary/10 text-primary font-bold'
                                                    : 'text-foreground hover:bg-muted/60'
                                            )}
                                        >
                                            <span>{loc}</span>
                                            {filters.location === loc && <span className="text-primary text-xs">✓</span>}
                                        </button>
                                    ))}
                                </>
                            )}

                            {filteredPrimary.length === 0 && filteredSecondary.length === 0 && (
                                <p className="text-[11px] text-muted-foreground text-center py-3">No matching cities found</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Govt specific dropdowns */}
            {isGovt && (
                <>
                    <div className="relative">
                        <button
                            onClick={() => toggle('sector')}
                            aria-expanded={open === 'sector'}
                            className={cn(chipBase, filters.sector ? chipActive : chipDefault)}
                        >
                            <BriefcaseIcon className="w-3.5 h-3.5" />
                            Sector
                            {filters.sector && <span className="w-1.5 h-1.5 rounded-full bg-primary ml-1" />}
                            <ChevronDownIcon className={cn('w-3 h-3 transition-transform', open === 'sector' && 'rotate-180')} />
                        </button>
                        {open === 'sector' && (
                            <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-lg p-2 w-44 z-[100]">
                                {GOVT_SECTORS.map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => {
                                            setFilters({ ...filters, sector: filters.sector === opt ? null : opt });
                                            setOpen(null);
                                        }}
                                        className={cn(
                                            'w-full text-left px-3 py-2 rounded-lg text-[12px] font-medium transition-all',
                                            filters.sector === opt ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted/60'
                                        )}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => toggle('qualification')}
                            aria-expanded={open === 'qualification'}
                            className={cn(chipBase, filters.qualification ? chipActive : chipDefault)}
                        >
                            <AcademicCapIcon className="w-3.5 h-3.5" />
                            Qualification
                            {filters.qualification && <span className="w-1.5 h-1.5 rounded-full bg-primary ml-1" />}
                            <ChevronDownIcon className={cn('w-3 h-3 transition-transform', open === 'qualification' && 'rotate-180')} />
                        </button>
                        {open === 'qualification' && (
                            <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-lg p-2 w-44 z-[100]">
                                {GOVT_QUALIFICATIONS.map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => {
                                            setFilters({ ...filters, qualification: filters.qualification === opt ? null : opt });
                                            setOpen(null);
                                        }}
                                        className={cn(
                                            'w-full text-left px-3 py-2 rounded-lg text-[12px] font-medium transition-all',
                                            filters.qualification === opt ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted/60'
                                        )}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Corporate specific dropdowns */}
            {!isGovt && (
                <>

                    <div className="relative">
                        <button
                            onClick={() => toggle('skills')}
                            aria-expanded={open === 'skills'}
                            className={cn(chipBase, filters.skills && filters.skills.length > 0 ? chipActive : chipDefault)}
                        >
                            <AcademicCapIcon className="w-3.5 h-3.5" />
                            Skills
                            {filters.skills && filters.skills.length > 0 && (
                                <span className="bg-primary/20 text-primary rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none shrink-0 ml-1">
                                    {filters.skills.length}
                                </span>
                            )}
                            <ChevronDownIcon className={cn('w-3 h-3 transition-transform', open === 'skills' && 'rotate-180')} />
                        </button>
                        {open === 'skills' && (
                            <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-lg p-2 w-56 z-[100] max-h-60 overflow-y-auto">
                                {CANONICAL_SKILLS.map(opt => {
                                    const isSelected = filters.skills?.includes(opt);
                                    return (
                                    <button
                                        key={opt}
                                        onClick={() => {
                                            const newSkills = isSelected
                                                ? (filters.skills || []).filter(s => s !== opt)
                                                : [...(filters.skills || []), opt];
                                            setFilters({ ...filters, skills: newSkills });
                                        }}
                                        className={cn(
                                            'w-full text-left px-3 py-2 rounded-lg text-[12px] font-medium transition-all flex items-center justify-between',
                                            isSelected ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted/60'
                                        )}
                                    >
                                        <SkillPill skill={opt} className="bg-transparent border-none p-0 h-auto text-inherit shadow-none" />
                                        {isSelected && <span className="text-primary text-xs">✓</span>}
                                    </button>
                                )})}
                            </div>
                        )}
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => toggle('course')}
                            aria-expanded={open === 'course'}
                            className={cn(chipBase, filters.course ? chipActive : chipDefault)}
                        >
                            <AcademicCapIcon className="w-3.5 h-3.5" />
                            Course
                            {filters.course && <span className="w-1.5 h-1.5 rounded-full bg-primary ml-1" />}
                            <ChevronDownIcon className={cn('w-3 h-3 transition-transform', open === 'course' && 'rotate-180')} />
                        </button>
                        {open === 'course' && (
                            <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-lg p-2 w-44 z-[100]">
                                {CORP_COURSES.map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => {
                                            setFilters({ ...filters, course: filters.course === opt ? null : opt });
                                            setOpen(null);
                                        }}
                                        className={cn(
                                            'w-full text-left px-3 py-2 rounded-lg text-[12px] font-medium transition-all',
                                            filters.course === opt ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted/60'
                                        )}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => toggle('source')}
                            aria-expanded={open === 'source'}
                            className={cn(chipBase, filters.source && filters.source.length > 0 ? chipActive : chipDefault)}
                        >
                            <BriefcaseIcon className="w-3.5 h-3.5" />
                            Source
                            {filters.source && filters.source.length > 0 && (
                                <span className="bg-primary/20 text-primary rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none shrink-0 ml-1">
                                    {filters.source.length}
                                </span>
                            )}
                            <ChevronDownIcon className={cn('w-3 h-3 transition-transform', open === 'source' && 'rotate-180')} />
                        </button>
                        {open === 'source' && (
                            <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-lg p-2 w-44 z-[100] max-h-60 overflow-y-auto">
                                {['Careers', 'Workday', 'Greenhouse', 'Lever', 'Ashby', 'BambooHR', 'iCIMS', 'Taleo'].map(opt => {
                                    const isSelected = filters.source?.includes(opt);
                                    return (
                                    <button
                                        key={opt}
                                        onClick={() => {
                                            const newSource = isSelected
                                                ? (filters.source || []).filter(s => s !== opt)
                                                : [...(filters.source || []), opt];
                                            setFilters({ ...filters, source: newSource });
                                        }}
                                        className={cn(
                                            'w-full text-left px-3 py-2 rounded-lg text-[12px] font-medium transition-all flex items-center justify-between',
                                            isSelected ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted/60'
                                        )}
                                    >
                                        <span>{opt}</span>
                                        {isSelected && <span className="text-primary text-xs">✓</span>}
                                    </button>
                                )})}
                            </div>
                        )}
                    </div>
                    {/* Passout year dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => toggle('year')}
                            aria-expanded={open === 'year'}
                            aria-haspopup="listbox"
                            className={cn(chipBase, filters.year !== null ? chipActive : chipDefault)}
                        >
                            <AcademicCapIcon className="w-3.5 h-3.5" />
                            Passout Year
                            {filters.year !== null && <span className="w-1.5 h-1.5 rounded-full bg-primary ml-1" />}
                            <ChevronDownIcon className={cn('w-3 h-3 transition-transform', open === 'year' && 'rotate-180')} />
                        </button>

                        {open === 'year' && (
                            <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-lg p-2 w-36 z-[100]">
                                <button
                                    onClick={() => {
                                        setFilters({ ...filters, year: null });
                                        setOpen(null);
                                    }}
                                    className={cn(
                                        'w-full text-left px-3 py-2 rounded-lg text-[12px] font-medium transition-all',
                                        filters.year === null
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-foreground hover:bg-muted/60'
                                    )}
                                >
                                    Any
                                </button>
                                {PASSOUT_YEAR_OPTIONS.map((year) => (
                                    <button
                                        key={year}
                                        onClick={() => {
                                            setFilters({ ...filters, year });
                                            setOpen(null);
                                        }}
                                        className={cn(
                                            'w-full text-left px-3 py-2 rounded-lg text-[12px] font-medium transition-all',
                                            filters.year === year
                                                ? 'bg-primary/10 text-primary'
                                                : 'text-foreground hover:bg-muted/60'
                                        )}
                                    >
                                        {year}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}


        </div>
    );
}






