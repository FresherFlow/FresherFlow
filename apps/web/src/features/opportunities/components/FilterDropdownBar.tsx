'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { cn } from '@repo/ui/utils/cn';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import ChevronDownIcon from '@heroicons/react/24/outline/ChevronDownIcon';
import BriefcaseIcon from '@heroicons/react/24/outline/BriefcaseIcon';
import AcademicCapIcon from '@heroicons/react/24/outline/AcademicCapIcon';
import CalendarIcon from '@heroicons/react/24/outline/CalendarIcon';
import { SkillPill } from '@/ui/SkillPill';

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
    company: string[];
}

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
    aggregates?: {
        locations: Record<string, number>;
        skills: Record<string, number>;
        sources: Record<string, number>;
        years: Record<string, number>;
        companies?: Record<string, number>;
    };
}

type OpenPanel = 'location' | 'year' | 'company' | 'type' | 'sector' | 'qualification' | 'course' | 'workMode' | 'skills' | 'source' | null;

type DropdownOption =
    | { kind: 'type'; value: string | null; label: string }
    | { kind: 'workMode'; mode: string }
    | { kind: 'allLocations' }
    | { kind: 'location'; loc: string; count: number }
    | { kind: 'sector'; value: string }
    | { kind: 'qualification'; value: string }
    | { kind: 'skills'; skill: string; count: number }
    | { kind: 'course'; value: string }
    | { kind: 'source'; value: string; count: number }
    | { kind: 'yearAny' }
    | { kind: 'year'; year: number; count: number }
    | { kind: 'company'; company: string; count: number };

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

const chipBase = 'h-9 px-2 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors transition-transform duration-150 ease-out active:scale-[0.97] whitespace-nowrap select-none cursor-pointer outline-none motion-reduce:transform-none motion-reduce:transition-none';
const chipDefault = 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent transition-colors duration-100';
const chipActive = 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent transition-colors duration-100';

const TYPE_OPTIONS = [
    { label: 'All types', value: null },
    { label: 'Jobs', value: 'JOB' },
    { label: 'Internships', value: 'INTERNSHIP' },
    { label: 'Walk-ins', value: 'WALKIN' },
];

export function FilterDropdownBar({ filters, setFilters, selectedType, onTypeChange, pageType, aggregates }: FilterDropdownBarProps) {
    const [open, setOpen] = useState<OpenPanel>(null);
    const [locSearch, setLocSearch] = useState('');
    const [skillSearch, setSkillSearch] = useState('');
    const [companySearch, setCompanySearch] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const barRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

    useClickOutside(barRef, () => { setOpen(null); setLocSearch(''); setSkillSearch(''); setCompanySearch(''); });

    useEffect(() => {
        const onScroll = () => { setOpen(null); setLocSearch(''); setSkillSearch(''); setCompanySearch(''); };
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const toggle = (panel: OpenPanel) => {
        setOpen(prev => (prev === panel ? null : panel));
        if (panel !== 'location') setLocSearch('');
        if (panel !== 'skills') setSkillSearch('');
        if (panel !== 'company') setCompanySearch('');
    };

    const isGovt = pageType === 'GOVERNMENT';

    const sortedLocations = useMemo(() => {
        return Object.entries(aggregates?.locations || {})
            .sort((a, b) => b[1] - a[1])
            .map(([loc, count]) => ({ loc, count }));
    }, [aggregates?.locations]);

    const query = locSearch.trim().toLowerCase();
    const filteredLocations = useMemo(() => {
        return query ? sortedLocations.filter(l => l.loc.toLowerCase().includes(query)) : sortedLocations;
    }, [query, sortedLocations]);

    const sortedSkills = useMemo(() => {
        return Object.entries(aggregates?.skills || {})
            .sort((a, b) => b[1] - a[1])
            .map(([skill, count]) => ({ skill, count }));
    }, [aggregates?.skills]);

    const filteredSkills = useMemo(() => {
        return skillSearch ? sortedSkills.filter(s => s.skill.toLowerCase().includes(skillSearch.toLowerCase())) : sortedSkills;
    }, [skillSearch, sortedSkills]);

    const sortedSources = useMemo(() => {
        return Object.entries(aggregates?.sources || {})
            .sort((a, b) => b[1] - a[1])
            .map(([source, count]) => ({ source, count }));
    }, [aggregates?.sources]);

    const sortedYears = useMemo(() => {
        return Object.entries(aggregates?.years || {})
            .sort((a, b) => Number(b[0]) - Number(a[0]))
            .map(([year, count]) => ({ year: Number(year), count }));
    }, [aggregates?.years]);

    const sortedCompanies = useMemo(() => {
        return Object.entries(aggregates?.companies || {})
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .map(([company, count]) => ({ company, count }));
    }, [aggregates?.companies]);

    const compQuery = companySearch.trim().toLowerCase();
    const filteredCompanies = useMemo(() => {
        return compQuery ? sortedCompanies.filter(c => c.company.toLowerCase().includes(compQuery)) : sortedCompanies;
    }, [compQuery, sortedCompanies]);

    // Flatten options for the currently open dropdown
    const options = useMemo<DropdownOption[]>(() => {
        if (!open) return [];
        switch (open) {
            case 'type':
                return TYPE_OPTIONS.map(opt => ({ kind: 'type' as const, value: opt.value, label: opt.label }));
            case 'location': {
                const list: DropdownOption[] = [];
                if (!isGovt) {
                    list.push({ kind: 'workMode' as const, mode: 'REMOTE' });
                    list.push({ kind: 'workMode' as const, mode: 'HYBRID' });
                    list.push({ kind: 'workMode' as const, mode: 'ON_SITE' });
                }
                list.push({ kind: 'allLocations' as const });
                filteredLocations.forEach(({ loc, count }) => {
                    list.push({ kind: 'location' as const, loc, count });
                });
                return list;
            }
            case 'sector':
                return GOVT_SECTORS.map(s => ({ kind: 'sector' as const, value: s }));
            case 'qualification':
                return GOVT_QUALIFICATIONS.map(q => ({ kind: 'qualification' as const, value: q }));
            case 'skills':
                return filteredSkills.map(({ skill, count }) => ({ kind: 'skills' as const, skill, count }));
            case 'course':
                return CORP_COURSES.map(c => ({ kind: 'course' as const, value: c }));
            case 'source':
                return sortedSources.map(({ source: opt, count }) => ({ kind: 'source' as const, value: opt, count }));
            case 'year':
                return [
                    { kind: 'yearAny' as const },
                    ...sortedYears.map(({ year, count }) => ({ kind: 'year' as const, year, count })),
                ];
            case 'company':
                return filteredCompanies.map(({ company, count }) => ({ kind: 'company' as const, company, count }));
            default:
                return [];
        }
    }, [open, isGovt, filteredLocations, filteredSkills, sortedSources, sortedYears, filteredCompanies]);

    const handleSelectOption = useCallback((option: DropdownOption) => {
        if (!option) return;
        switch (option.kind) {
            case 'type':
                if (onTypeChange) onTypeChange(option.value);
                setOpen(null);
                break;
            case 'workMode': {
                const mode = option.mode;
                const isSelected = filters.workMode?.includes(mode);
                const newModes = isSelected
                    ? (filters.workMode || []).filter(m => m !== mode)
                    : [...(filters.workMode || []), mode];
                setFilters({ ...filters, workMode: newModes.length > 0 ? newModes : null });
                break;
            }
            case 'allLocations':
                setFilters({ ...filters, location: null });
                setOpen(null);
                setLocSearch('');
                break;
            case 'location': {
                const loc = option.loc;
                setFilters({ ...filters, location: filters.location === loc ? null : loc });
                setOpen(null);
                setLocSearch('');
                break;
            }
            case 'sector':
                setFilters({ ...filters, sector: filters.sector === option.value ? null : option.value });
                setOpen(null);
                break;
            case 'qualification':
                setFilters({ ...filters, qualification: filters.qualification === option.value ? null : option.value });
                setOpen(null);
                break;
            case 'skills': {
                const skill = option.skill;
                const isSelected = filters.skills?.includes(skill);
                const newSkills = isSelected
                    ? (filters.skills || []).filter(s => s !== skill)
                    : [...(filters.skills || []), skill];
                setFilters({ ...filters, skills: newSkills });
                break;
            }
            case 'course':
                setFilters({ ...filters, course: filters.course === option.value ? null : option.value });
                setOpen(null);
                break;
            case 'source': {
                const opt = option.value;
                const isSelected = filters.source?.includes(opt);
                const newSource = isSelected
                    ? (filters.source || []).filter(s => s !== opt)
                    : [...(filters.source || []), opt];
                setFilters({ ...filters, source: newSource });
                break;
            }
            case 'yearAny':
                setFilters({ ...filters, year: null });
                setOpen(null);
                break;
            case 'year':
                setFilters({ ...filters, year: option.year });
                setOpen(null);
                break;
            case 'company': {
                const comp = option.company;
                const isSelected = filters.company?.includes(comp);
                const newCompanies = isSelected
                    ? (filters.company || []).filter(c => c !== comp)
                    : [...(filters.company || []), comp];
                setFilters({ ...filters, company: newCompanies });
                break;
            }
        }
    }, [filters, onTypeChange, setFilters]);

    // Reset activeIndex when open panel or search query changes
    useEffect(() => {
        setActiveIndex(0);
    }, [open, locSearch, skillSearch, companySearch]);

    // Keyboard navigation listener
    useEffect(() => {
        if (!open || options.length === 0) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex(prev => (prev + 1) % options.length);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex(prev => (prev - 1 + options.length) % options.length);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (activeIndex >= 0 && activeIndex < options.length) {
                    handleSelectOption(options[activeIndex]);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                setOpen(null);
                setLocSearch('');
                setSkillSearch('');
                setCompanySearch('');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [open, options, activeIndex, handleSelectOption]);

    // Scroll active element into view
    useEffect(() => {
        if (open && itemRefs.current[activeIndex]) {
            itemRefs.current[activeIndex]?.scrollIntoView({
                block: 'nearest',
            });
        }
    }, [activeIndex, open]);

    return (
        <div ref={barRef} className="hidden lg:flex items-center gap-1 flex-wrap">

            {/* Type dropdown */}
            {onTypeChange && (
                <div className="relative">
                    <button
                        onClick={() => toggle('type')}
                        aria-expanded={open === 'type'}
                        aria-haspopup="listbox"
                        className={cn(chipBase, selectedType ? chipActive : chipDefault)}
                    >
                        {selectedType === 'JOB' ? 'Jobs' : selectedType === 'INTERNSHIP' ? 'Internships' : selectedType === 'WALKIN' ? 'Walk-ins' : 'Type'}
                    </button>
                    {open === 'type' && (
                        <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-lg animate-in fade-in-0 zoom-in-95 duration-150 origin-top p-1.5 w-48 z-[100] overscroll-contain">
                            {TYPE_OPTIONS.map((opt, idx) => (
                                <button
                                    key={opt.label}
                                    tabIndex={-1}
                                    ref={el => { itemRefs.current[idx] = el; }}
                                    onClick={() => handleSelectOption(options[idx])}
                                    onMouseEnter={() => setActiveIndex(idx)}
                                    className={cn(
                                        'w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer flex items-center gap-2.5 outline-none select-none text-foreground',
                                        idx === activeIndex ? 'bg-muted text-foreground font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    )}
                                >
                                    <input type="checkbox" tabIndex={-1} checked={selectedType === opt.value} readOnly className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary pointer-events-none shrink-0" />
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
                    Location
                    {((filters.workMode?.length || 0) + (filters.location ? 1 : 0)) > 0 && (
                        <span className="bg-muted text-foreground rounded-md px-1.5 text-sm font-medium shrink-0 flex items-center justify-center h-5 min-w-[20px]">
                            {((filters.workMode?.length || 0) + (filters.location ? 1 : 0))}
                        </span>
                    )}
                </button>

                {open === 'location' && (() => {
                    let itemIdx = 0;
                    return (
                        <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-xl animate-in fade-in-0 zoom-in-95 duration-150 origin-top p-2 w-72 z-[100] space-y-1.5 overscroll-contain">
                            <div className="px-1">
                                <input
                                    type="text"
                                    value={locSearch}
                                    onChange={e => setLocSearch(e.target.value)}
                                    placeholder="Search city or state..."
                                    className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                                    autoFocus
                                />
                            </div>

                            <div className="max-h-60 overflow-y-auto overscroll-contain space-y-0.5 pr-1">
                                {/* Work Mode Options */}
                                {!isGovt && (
                                    <>
                                        <div className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
                                            Work Mode
                                        </div>
                                        {['REMOTE', 'HYBRID', 'ON_SITE'].map(mode => {
                                            const idx = itemIdx++;
                                            const isSelected = filters.workMode?.includes(mode);
                                            return (
                                                <button
                                                    key={mode}
                                                    tabIndex={-1}
                                                    ref={el => { itemRefs.current[idx] = el; }}
                                                    onClick={() => handleSelectOption(options[idx])}
                                                    onMouseEnter={() => setActiveIndex(idx)}
                                                    className={cn(
                                                        'w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2.5 cursor-pointer outline-none select-none',
                                                        idx === activeIndex ? 'bg-muted text-foreground font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                                    )}
                                                >
                                                    <input type="checkbox" tabIndex={-1} checked={!!isSelected} readOnly className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary pointer-events-none shrink-0" />
                                                    <span>{mode === 'REMOTE' ? 'Remote' : mode === 'HYBRID' ? 'Hybrid' : 'On-site'}</span>
                                                </button>
                                            );
                                        })}
                                        <div className="my-1.5 border-t border-border/50" />
                                    </>
                                )}

                                {/* Option for All Locations */}
                                {(() => {
                                    const idx = itemIdx++;
                                    return (
                                        <button
                                            key="all-locations"
                                            tabIndex={-1}
                                            ref={el => { itemRefs.current[idx] = el; }}
                                            onClick={() => handleSelectOption(options[idx])}
                                            onMouseEnter={() => setActiveIndex(idx)}
                                            className={cn(
                                                'w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2.5 cursor-pointer outline-none select-none',
                                                idx === activeIndex ? 'bg-muted text-foreground font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                            )}
                                        >
                                            <input type="checkbox" tabIndex={-1} checked={filters.location === null} readOnly className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary pointer-events-none shrink-0" />
                                            <span>All Locations</span>
                                        </button>
                                    );
                                })()}

                                {filteredLocations.length > 0 && (
                                    <>
                                        <div className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
                                            Locations
                                        </div>
                                        {filteredLocations.map(({ loc, count }) => {
                                            const idx = itemIdx++;
                                            const isSelected = filters.location === loc;
                                            return (
                                                <button
                                                    key={loc}
                                                    tabIndex={-1}
                                                    ref={el => { itemRefs.current[idx] = el; }}
                                                    onClick={() => handleSelectOption(options[idx])}
                                                    onMouseEnter={() => setActiveIndex(idx)}
                                                    className={cn(
                                                        'w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2.5 cursor-pointer outline-none select-none',
                                                        idx === activeIndex ? 'bg-muted text-foreground font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                                    )}
                                                >
                                                    <input type="checkbox" tabIndex={-1} checked={!!isSelected} readOnly className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary pointer-events-none shrink-0" />
                                                    <span>{loc} ({count})</span>
                                                </button>
                                            );
                                        })}
                                    </>
                                )}

                                {filteredLocations.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-3">No matching cities found</p>
                                )}
                            </div>
                        </div>
                    );
                })()}
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
                            Sector
                            {filters.sector && <span className="bg-muted text-foreground rounded-md px-1.5 text-sm font-medium shrink-0 flex items-center justify-center h-5 min-w-[20px]">1</span>}
                        </button>
                        {open === 'sector' && (
                            <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-lg animate-in fade-in-0 zoom-in-95 duration-150 origin-top p-2 w-52 z-[100]">
                                {GOVT_SECTORS.map((opt, idx) => (
                                    <button
                                        key={opt}
                                        tabIndex={-1}
                                        ref={el => { itemRefs.current[idx] = el; }}
                                        onClick={() => handleSelectOption(options[idx])}
                                        onMouseEnter={() => setActiveIndex(idx)}
                                        className={cn(
                                            'w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2.5 cursor-pointer outline-none select-none',
                                            idx === activeIndex ? 'bg-muted text-foreground font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        )}
                                    >
                                        <input type="checkbox" tabIndex={-1} checked={filters.sector === opt} readOnly className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary pointer-events-none shrink-0" />
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
                            Qualification
                            {filters.qualification && <span className="bg-muted text-foreground rounded-md px-1.5 text-sm font-medium shrink-0 flex items-center justify-center h-5 min-w-[20px]">1</span>}
                        </button>
                        {open === 'qualification' && (
                            <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-lg animate-in fade-in-0 zoom-in-95 duration-150 origin-top p-2 w-52 z-[100]">
                                {GOVT_QUALIFICATIONS.map((opt, idx) => (
                                    <button
                                        key={opt}
                                        tabIndex={-1}
                                        ref={el => { itemRefs.current[idx] = el; }}
                                        onClick={() => handleSelectOption(options[idx])}
                                        onMouseEnter={() => setActiveIndex(idx)}
                                        className={cn(
                                            'w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2.5 cursor-pointer outline-none select-none',
                                            idx === activeIndex ? 'bg-muted text-foreground font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        )}
                                    >
                                        <input type="checkbox" tabIndex={-1} checked={filters.qualification === opt} readOnly className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary pointer-events-none shrink-0" />
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
                            Skills
                            {filters.skills && filters.skills.length > 0 && (
                                <span className="bg-muted text-foreground rounded-md px-1.5 text-sm font-medium shrink-0 flex items-center justify-center h-5 min-w-[20px]">
                                    {filters.skills.length}
                                </span>
                            )}
                        </button>
                        {open === 'skills' && (
                            <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-lg animate-in fade-in-0 zoom-in-95 duration-150 origin-top p-2 w-72 min-w-[18rem] z-[100] flex flex-col gap-1 max-h-80">
                                <div className="px-1 pb-1 pt-0.5 shrink-0">
                                    <input
                                        type="text"
                                        value={skillSearch}
                                        onChange={e => setSkillSearch(e.target.value)}
                                        placeholder="Search skills..."
                                        className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                                        onClick={e => e.stopPropagation()}
                                        autoFocus
                                    />
                                </div>
                                <div className="overflow-y-auto flex-1 overscroll-contain">
                                    {filteredSkills.map(({ skill, count }, idx) => {
                                        const isSelected = filters.skills?.includes(skill);
                                        return (
                                            <button
                                                key={skill}
                                                tabIndex={-1}
                                                ref={el => { itemRefs.current[idx] = el; }}
                                                onClick={() => handleSelectOption(options[idx])}
                                                onMouseEnter={() => setActiveIndex(idx)}
                                                className={cn(
                                                    'w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2.5 cursor-pointer outline-none select-none',
                                                    idx === activeIndex ? 'bg-muted text-foreground font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                                )}
                                            >
                                                <input type="checkbox" tabIndex={-1} checked={!!isSelected} readOnly className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary pointer-events-none shrink-0" />
                                                <SkillPill skill={skill} className="bg-transparent border-none p-0 h-auto text-inherit shadow-none" />
                                                <span className="text-muted-foreground text-sm ml-1">({count})</span>
                                            </button>
                                        );
                                    })}
                                    {filteredSkills.length === 0 && (
                                        <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                                            No skills found
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => toggle('course')}
                            aria-expanded={open === 'course'}
                            className={cn(chipBase, filters.course ? chipActive : chipDefault)}
                        >
                            Course
                            {filters.course && <span className="bg-muted text-foreground rounded-md px-1.5 text-sm font-medium shrink-0 flex items-center justify-center h-5 min-w-[20px]">1</span>}
                        </button>
                        {open === 'course' && (
                            <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-lg animate-in fade-in-0 zoom-in-95 duration-150 origin-top p-2 w-52 z-[100]">
                                {CORP_COURSES.map((opt, idx) => (
                                    <button
                                        key={opt}
                                        tabIndex={-1}
                                        ref={el => { itemRefs.current[idx] = el; }}
                                        onClick={() => handleSelectOption(options[idx])}
                                        onMouseEnter={() => setActiveIndex(idx)}
                                        className={cn(
                                            'w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2.5 cursor-pointer outline-none select-none',
                                            idx === activeIndex ? 'bg-muted text-foreground font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        )}
                                    >
                                        <input type="checkbox" tabIndex={-1} checked={filters.course === opt} readOnly className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary pointer-events-none shrink-0" />
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
                            Source
                            {filters.source && filters.source.length > 0 && (
                                <span className="bg-muted text-foreground rounded-md px-1.5 text-sm font-medium shrink-0 flex items-center justify-center h-5 min-w-[20px]">
                                    {filters.source.length}
                                </span>
                            )}
                        </button>
                        {open === 'source' && (
                            <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-lg animate-in fade-in-0 zoom-in-95 duration-150 origin-top p-2 w-52 z-[100] max-h-60 overflow-y-auto">
                                {sortedSources.map(({ source: opt, count }, idx) => {
                                    const isSelected = filters.source?.includes(opt);
                                    return (
                                        <button
                                            key={opt}
                                            tabIndex={-1}
                                            ref={el => { itemRefs.current[idx] = el; }}
                                            onClick={() => handleSelectOption(options[idx])}
                                            onMouseEnter={() => setActiveIndex(idx)}
                                            className={cn(
                                                'w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2.5 cursor-pointer outline-none select-none',
                                                idx === activeIndex ? 'bg-muted text-foreground font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                            )}
                                        >
                                            <input type="checkbox" tabIndex={-1} checked={!!isSelected} readOnly className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary pointer-events-none shrink-0" />
                                            <span>{opt} ({count})</span>
                                        </button>
                                    );
                                })}
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
                            Batch
                            {filters.year !== null && <span className="bg-muted text-foreground rounded-md px-1.5 text-sm font-medium shrink-0 flex items-center justify-center h-5 min-w-[20px]">1</span>}
                        </button>

                        {open === 'year' && (() => {
                            let itemIdx = 0;
                            return (
                                <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-lg animate-in fade-in-0 zoom-in-95 duration-150 origin-top p-2 w-44 z-[100]">
                                    {(() => {
                                        const idx = itemIdx++;
                                        return (
                                            <button
                                                key="any-year"
                                                tabIndex={-1}
                                                ref={el => { itemRefs.current[idx] = el; }}
                                                onClick={() => handleSelectOption(options[idx])}
                                                onMouseEnter={() => setActiveIndex(idx)}
                                                className={cn(
                                                    'w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2.5 cursor-pointer outline-none select-none',
                                                    idx === activeIndex ? 'bg-muted text-foreground font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                                )}
                                            >
                                                <input type="checkbox" tabIndex={-1} checked={filters.year === null} readOnly className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary pointer-events-none shrink-0" />
                                                <span>Any</span>
                                            </button>
                                        );
                                    })()}
                                    {sortedYears.map(({ year, count }) => {
                                        const idx = itemIdx++;
                                        return (
                                            <button
                                                key={year}
                                                tabIndex={-1}
                                                ref={el => { itemRefs.current[idx] = el; }}
                                                onClick={() => handleSelectOption(options[idx])}
                                                onMouseEnter={() => setActiveIndex(idx)}
                                                className={cn(
                                                    'w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2.5 cursor-pointer outline-none select-none',
                                                    idx === activeIndex ? 'bg-muted text-foreground font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                                )}
                                            >
                                                <input type="checkbox" tabIndex={-1} checked={filters.year === year} readOnly className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary pointer-events-none shrink-0" />
                                                {year} ({count})
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>

                    {/* Company dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => toggle('company')}
                            aria-expanded={open === 'company'}
                            aria-haspopup="listbox"
                            className={cn(chipBase, filters.company && filters.company.length > 0 ? chipActive : chipDefault)}
                        >
                            Company
                            {filters.company && filters.company.length > 0 && (
                                <span className="bg-muted text-foreground rounded-md px-1.5 text-sm font-medium shrink-0 flex items-center justify-center h-5 min-w-[20px]">
                                    {filters.company.length}
                                </span>
                            )}
                        </button>
                        {open === 'company' && (
                            <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-lg animate-in fade-in-0 zoom-in-95 duration-150 origin-top p-2 w-72 min-w-[18rem] z-[100] flex flex-col gap-1 max-h-80">
                                <div className="px-1 pb-1 pt-0.5 shrink-0">
                                    <input
                                        type="text"
                                        value={companySearch}
                                        onChange={e => setCompanySearch(e.target.value)}
                                        placeholder="Search companies..."
                                        className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                                        onClick={e => e.stopPropagation()}
                                        autoFocus
                                    />
                                </div>
                                <div className="overflow-y-auto flex-1 overscroll-contain space-y-0.5">
                                    {filteredCompanies.map(({ company, count }, idx) => {
                                        const isSelected = filters.company?.includes(company);
                                        return (
                                            <button
                                                key={company}
                                                tabIndex={-1}
                                                ref={el => { itemRefs.current[idx] = el; }}
                                                onClick={() => handleSelectOption(options[idx])}
                                                onMouseEnter={() => setActiveIndex(idx)}
                                                className={cn(
                                                    'w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2.5 cursor-pointer outline-none select-none',
                                                    idx === activeIndex ? 'bg-muted text-foreground font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                                )}
                                            >
                                                <input type="checkbox" tabIndex={-1} checked={!!isSelected} readOnly className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary pointer-events-none shrink-0" />
                                                <span className="truncate flex-1 text-foreground">{company}</span>
                                                <span className="text-muted-foreground text-sm shrink-0">({count})</span>
                                            </button>
                                        );
                                    })}
                                    {filteredCompanies.length === 0 && (
                                        <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                                            No companies found
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}

        </div>
    );
}
