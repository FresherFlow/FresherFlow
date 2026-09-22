'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@repo/ui/utils/cn';
import MapPinIcon from '@heroicons/react/24/outline/MapPinIcon';
import ChevronDownIcon from '@heroicons/react/24/outline/ChevronDownIcon';
import AcademicCapIcon from '@heroicons/react/24/outline/AcademicCapIcon';
import CalendarIcon from '@heroicons/react/24/outline/CalendarIcon';
import AdjustmentsHorizontalIcon from '@heroicons/react/24/outline/AdjustmentsHorizontalIcon';
import { SkillPill } from '@/features/jobs/components/SkillPill';

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
    role?: string[];
    driveDate?: 'all' | 'today' | 'thisWeek';
}

const GOVT_SECTORS = ['Defense', 'Railways', 'Banking', 'Teaching', 'Police', 'SSC / UPSC', 'PSU'];
const GOVT_QUALIFICATIONS = ['10th Pass', '12th Pass', 'Diploma', 'Graduate', 'Postgraduate'];
const CORP_COURSES = ['B.Tech/B.E.', 'M.C.A.', 'MBA', 'B.Sc/B.Com/B.A', 'Diploma'];

const ROLE_OPTIONS = [
    'Software Engineer',
    'Frontend Developer',
    'Backend Developer',
    'Full Stack Developer',
    'Data Scientist',
    'Data Analyst',
    'QA / Test Engineer',
    'DevOps Engineer',
    'Product Manager',
    'UI/UX Designer',
    'Android Developer',
    'iOS Developer',
];

interface JobFilterBarProps {
    filters: FilterBarFilters;
    setFilters: (f: FilterBarFilters) => void;
    isLoggedIn: boolean;
    selectedType?: string | null;
    onTypeChange?: (type: string | null) => void;
    pageType?: string;
    driveDate?: 'all' | 'today' | 'thisWeek';
    onDriveDateChange?: (v: 'all' | 'today' | 'thisWeek') => void;
    aggregates?: {
        locations: Record<string, number>;
        skills: Record<string, number>;
        sources: Record<string, number>;
        years: Record<string, number>;
        companies?: Record<string, number>;
    };
}

type OpenPanel = 'location' | 'year' | 'company' | 'type' | 'sector' | 'qualification' | 'course' | 'workMode' | 'skills' | 'source' | 'driveDate' | 'role' | null;

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
    | { kind: 'company'; company: string; count: number }
    | { kind: 'role'; role: string };

function useClickOutside(ref: React.RefObject<HTMLElement | null>, handler: (e: MouseEvent | TouchEvent) => void) {
    useEffect(() => {
        const listener = (e: MouseEvent | TouchEvent) => {
            if (!ref.current || ref.current.contains(e.target as Node)) return;
            handler(e);
        };
        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);
        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [ref, handler]);
}

const pillBase = 'h-8 px-3 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all duration-150 ease-out active:scale-95 whitespace-nowrap select-none cursor-pointer outline-none shrink-0 motion-reduce:transform-none motion-reduce:transition-none';
const pillDefault = 'text-muted-foreground hover:text-foreground hover:bg-muted';
const pillOpen = 'bg-muted text-foreground ring-1 ring-border';

/** Per-panel "Clear {filter}" footer (Simplify pattern). Rendered only when
 *  that dimension has an active selection. tabIndex -1 keeps keyboard nav
 *  indexing (itemRefs) untouched. */
function PanelClearButton({ show, onClear, label }: { show: boolean; onClear: () => void; label: string }) {
    if (!show) return null;
    return (
        <button
            type="button"
            tabIndex={-1}
            onClick={onClear}
            className="w-full shrink-0 cursor-pointer border-t border-border/60 px-3 py-2 mt-1 text-left text-sm font-semibold text-primary transition-colors hover:underline"
        >
            {label}
        </button>
    );
}

const TYPE_OPTIONS = [
    { label: 'All types', value: null },
    { label: 'Jobs', value: 'JOB' },
    { label: 'Internships', value: 'INTERNSHIP' },
    { label: 'Walk-ins', value: 'WALKIN' },
];

export function JobFilterBar({ filters, setFilters, selectedType, onTypeChange, pageType, aggregates, driveDate = 'all', onDriveDateChange }: JobFilterBarProps) {
    const [open, setOpen] = useState<OpenPanel>(null);
    const [locSearch, setLocSearch] = useState('');
    const [skillSearch, setSkillSearch] = useState('');
    const [companySearch, setCompanySearch] = useState('');
    const [roleSearch, setRoleSearch] = useState('');
    const [activeIndex, setActiveIndex] = useState(-1);
    const [showAllPills, setShowAllPills] = useState(false);
    const [isWide, setIsWide] = useState(false);
    const barRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

    // Wider screens earn more inline pills (Tailwind xl breakpoint).
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 1280px)');
        const update = () => setIsWide(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    // Portaled panels: panels render fixed under their pill (the scrollable bar
    // would clip absolutely-positioned panels). Hover continuity across the
    // trigger→panel gap is kept with a short delayed close.
    const triggerRefs = useRef<Partial<Record<Exclude<OpenPanel, null>, HTMLButtonElement | null>>>({});
    const panelRef = useRef<HTMLDivElement | null>(null);
    const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
    const closeTimer = useRef<number | null>(null);

    const cancelClose = useCallback(() => {
        if (closeTimer.current !== null) {
            window.clearTimeout(closeTimer.current);
            closeTimer.current = null;
        }
    }, []);

    const scheduleClose = useCallback(() => {
        cancelClose();
        closeTimer.current = window.setTimeout(() => setOpen(null), 120);
    }, [cancelClose]);

    // Measure the open trigger so the portaled panel anchors under its pill.
    // freshOpen tracks fresh opens (animate the pop) vs pill-to-pill travel
    // (content swaps with a soft fade — no close/open replay).
    const prevOpenRef = useRef<OpenPanel>(null);
    const [freshOpen, setFreshOpen] = useState(false);
    useEffect(() => {
        if (!open) {
            setAnchorRect(null);
            setFreshOpen(false);
            prevOpenRef.current = null;
            return;
        }
        setFreshOpen(prevOpenRef.current === null);
        prevOpenRef.current = open;
        const el = triggerRefs.current[open];
        setAnchorRect(el ? el.getBoundingClientRect() : null);
    }, [open]);

    const PANEL_WIDTH: Partial<Record<Exclude<OpenPanel, null>, number>> = {
        type: 192,
        location: 288,
        sector: 208,
        qualification: 208,
        driveDate: 176,
        role: 256,
        skills: 288,
        course: 208,
        source: 208,
        year: 176,
        company: 288,
    };

    const panelStyle = (panel: Exclude<OpenPanel, null>): React.CSSProperties => {
        const width = PANEL_WIDTH[panel] ?? 256;
        const left = anchorRect
            ? Math.max(12, Math.min(anchorRect.right - width, window.innerWidth - width - 12))
            : 12;
        return {
            position: 'fixed',
            top: anchorRect ? anchorRect.bottom + 6 : 0,
            left,
            zIndex: 100,
        };
    };

    useClickOutside(barRef, (e) => {
        // Clicks inside the portaled panel must not dismiss before click lands.
        if (panelRef.current?.contains(e.target as Node)) return;
        setOpen(null);
        setLocSearch('');
        setSkillSearch('');
        setCompanySearch('');
        setRoleSearch('');
    });

    useEffect(() => {
        const onDismiss = () => {
            cancelClose();
            setOpen(null);
            setLocSearch('');
            setSkillSearch('');
            setCompanySearch('');
            setRoleSearch('');
        };
        window.addEventListener('scroll', onDismiss, { passive: true });
        window.addEventListener('resize', onDismiss);
        return () => {
            window.removeEventListener('scroll', onDismiss);
            window.removeEventListener('resize', onDismiss);
        };
    }, [cancelClose]);

    const toggle = (panel: OpenPanel) => {
        cancelClose();
        setOpen(prev => (prev === panel ? null : panel));
        if (panel !== 'location') setLocSearch('');
        if (panel !== 'skills') setSkillSearch('');
        if (panel !== 'company') setCompanySearch('');
        if (panel !== 'role') setRoleSearch('');
    };

    // Hover support: open the panel when the mouse enters a trigger, and close
    // it when the mouse leaves the trigger+panel wrapper (`relative` div). Click
    // still works for touch / keyboard users.
    const openOnEnter = (panel: OpenPanel) => {
        cancelClose();
        setOpen(panel);
        if (panel !== 'location') setLocSearch('');
        if (panel !== 'skills') setSkillSearch('');
        if (panel !== 'company') setCompanySearch('');
        if (panel !== 'role') setRoleSearch('');
    };
    const closeOnLeave = () => scheduleClose();

    const isGovt = pageType === 'GOVERNMENT';

    // ── Progressive disclosure ────────────────────────────────────────────
    // Default bar: Type · Location · (Batch | Qualification) · All Filters.
    // Wider screens (xl) reveal Role (and Batch on corp pages). The rest
    // (Skills, Course, Source, Company, Sector) live behind the All Filters
    // toggle. A pill always shows once it has an active selection so users
    // can see and clear what they set.
    type FilterDim = 'type' | 'location' | 'sector' | 'qualification' | 'driveDate' | 'role' | 'skills' | 'course' | 'source' | 'year' | 'company';

    const dimActive: Record<FilterDim, boolean> = {
        type: !!selectedType,
        location: !!filters.location || (filters.workMode?.length ?? 0) > 0,
        sector: !!filters.sector,
        qualification: !!filters.qualification,
        driveDate: !!driveDate && driveDate !== 'all',
        role: (filters.role?.length ?? 0) > 0,
        skills: (filters.skills?.length ?? 0) > 0,
        course: !!filters.course,
        source: (filters.source?.length ?? 0) > 0,
        year: filters.year !== null,
        company: (filters.company?.length ?? 0) > 0,
    };

    const pillVisible = (dim: FilterDim) =>
        dimActive[dim] ||
        showAllPills ||
        dim === 'type' ||
        dim === 'location' ||
        dim === 'driveDate' ||
        (isWide && (isGovt ? dim === 'qualification' : dim === 'role' || dim === 'year'));

    // Active filters that live behind the All Filters pill (badge count).
    const hiddenActiveCount = (isGovt
        ? (['sector', 'qualification'] as FilterDim[])
        : (['role', 'skills', 'course', 'source', 'year', 'company'] as FilterDim[])
    ).reduce((n, d) => n + (dimActive[d] ? 1 : 0), 0);

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

    const roleQuery = roleSearch.trim().toLowerCase();
    const filteredRoles = useMemo(() => {
        return roleQuery ? ROLE_OPTIONS.filter(r => r.toLowerCase().includes(roleQuery)) : ROLE_OPTIONS;
    }, [roleQuery]);

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
            case 'role':
                return filteredRoles.map(role => ({ kind: 'role' as const, role }));
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
    }, [open, isGovt, filteredLocations, filteredRoles, filteredSkills, sortedSources, sortedYears, filteredCompanies]);

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
            case 'role': {
                const r = option.role;
                const isSelected = filters.role?.includes(r);
                const newRoles = isSelected
                    ? (filters.role || []).filter(item => item !== r)
                    : [...(filters.role || []), r];
                setFilters({ ...filters, role: newRoles });
                break;
            }
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

    // Reset activeIndex when open panel or search query changes (nothing
    // pre-highlighted — highlight follows mouse or arrow keys only).
    useEffect(() => {
        setActiveIndex(-1);
    }, [open, locSearch, skillSearch, companySearch, roleSearch]);

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
                setRoleSearch('');
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
        <div ref={barRef} className="hidden lg:flex items-center gap-1 flex-nowrap overflow-x-auto min-w-0 rounded-xl bg-muted/60 px-1.5 py-1 [&::-webkit-scrollbar]:hidden">

            {/* Type dropdown */}
            {onTypeChange && (
                <div className="relative" onMouseLeave={closeOnLeave}>
                    <button
                        ref={el => { triggerRefs.current.type = el; }}
                        onClick={() => toggle('type')}
                        onMouseEnter={() => openOnEnter('type')}
                        aria-expanded={open === 'type'}
                        aria-haspopup="listbox"
                        className={cn(pillBase, selectedType ? 'text-foreground' : pillDefault, open === 'type' && pillOpen)}
                    >
                        {selectedType === 'JOB' ? 'Jobs' : selectedType === 'INTERNSHIP' ? 'Internships' : selectedType === 'WALKIN' ? 'Walk-ins' : 'Type'}
                        <ChevronDownIcon className={cn('h-3.5 w-3.5 shrink-0 opacity-50 transition-transform', open === 'type' && 'rotate-180')} />
                    </button>
                    {open === 'type' && anchorRect && createPortal(
                        <div ref={panelRef} onMouseEnter={cancelClose} onMouseLeave={scheduleClose} style={panelStyle('type')} className={`bg-card border border-border rounded-xl shadow-lg ${freshOpen ? 'animate-in fade-in-0 zoom-in-95 duration-150' : 'animate-in fade-in-0 duration-100'} origin-top p-1.5 w-48 z-50 overscroll-contain`}>
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
                            <PanelClearButton show={!!selectedType} onClear={() => { if (onTypeChange) onTypeChange(null); }} label="Clear type" />
                        </div>
                    , document.body)}
                </div>
            )}

            {/* Location pill — always visible (2nd default) */}
            <div className="relative" onMouseLeave={closeOnLeave}>
                <button
                    ref={el => { triggerRefs.current.location = el; }}
                    onClick={() => toggle('location')}
                    onMouseEnter={() => openOnEnter('location')}
                    aria-expanded={open === 'location'}
                    aria-haspopup="listbox"
                    className={cn(pillBase, (filters.location || (filters.workMode && filters.workMode.length > 0)) ? 'text-foreground' : pillDefault, open === 'location' && pillOpen)}
                >
                    Location
                    {((filters.workMode?.length || 0) + (filters.location ? 1 : 0)) > 0 && (
                        <span className="bg-muted text-foreground rounded-md px-1.5 text-sm font-medium shrink-0 flex items-center justify-center h-5 min-w-5">
                            {((filters.workMode?.length || 0) + (filters.location ? 1 : 0))}
                        </span>
                    )}
                    <ChevronDownIcon className={cn('h-3.5 w-3.5 shrink-0 opacity-50 transition-transform', open === 'location' && 'rotate-180')} />
                </button>

                {open === 'location' && anchorRect && createPortal((() => {
                    let itemIdx = 0;
                    return (
                    <div ref={panelRef} onMouseEnter={cancelClose} onMouseLeave={scheduleClose} style={panelStyle('location')} className={`bg-card border border-border rounded-xl shadow-xl ${freshOpen ? 'animate-in fade-in-0 zoom-in-95 duration-150' : 'animate-in fade-in-0 duration-100'} origin-top p-2 w-72 z-50 space-y-1.5 overscroll-contain`}>
                            <div className="px-1">
                                <input
                                    type="text"
                                    value={locSearch}
                                    onChange={e => setLocSearch(e.target.value)}
                                    placeholder="Search city or state..."
                                    className="w-full h-9 px-3 rounded-lg border border-transparent bg-muted/60 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:bg-muted/80"
                                    autoFocus
                                />
                            </div>

                            <div className="max-h-60 overflow-y-auto overscroll-contain space-y-0.5 pr-1">
                                {/* Work Mode Options */}
                                {!isGovt && (
                                    <>
                                        <div className="px-3 pt-2 pb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
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
                                        <div className="px-3 pt-2 pb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground/70">
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
                            <PanelClearButton show={!!filters.location || (filters.workMode?.length ?? 0) > 0} onClear={() => setFilters({ ...filters, location: null, workMode: null })} label="Clear location" />
                        </div>
                    );
                })(), document.body)}
            </div>

            {/* Govt specific dropdowns */}
            {isGovt && (
                <>
                    <div className={cn('relative', !pillVisible('sector') && 'hidden')} onMouseLeave={closeOnLeave}>
                        <button
                            ref={el => { triggerRefs.current.sector = el; }}
                            onClick={() => toggle('sector')}
                            onMouseEnter={() => openOnEnter('sector')}
                            aria-expanded={open === 'sector'}
                            className={cn(pillBase, filters.sector ? 'text-foreground' : pillDefault, open === 'sector' && pillOpen)}
                        >
                            Sector
                            {filters.sector && <span className="bg-muted text-foreground rounded-md px-1.5 text-sm font-medium shrink-0 flex items-center justify-center h-5 min-w-5">1</span>}
                            <ChevronDownIcon className={cn('h-3.5 w-3.5 shrink-0 opacity-50 transition-transform', open === 'sector' && 'rotate-180')} />
                        </button>
                        {open === 'sector' && anchorRect && createPortal(
                            <div ref={panelRef} onMouseEnter={cancelClose} onMouseLeave={scheduleClose} style={panelStyle('sector')} className={`bg-card border border-border rounded-xl shadow-lg ${freshOpen ? 'animate-in fade-in-0 zoom-in-95 duration-150' : 'animate-in fade-in-0 duration-100'} origin-top p-2 w-52 z-50`}>
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
                                <PanelClearButton show={!!filters.sector} onClear={() => setFilters({ ...filters, sector: null })} label="Clear sector" />
                            </div>
                        , document.body)}
                    </div>
                    <div className={cn('relative', !pillVisible('qualification') && 'hidden')} onMouseLeave={closeOnLeave}>
                        <button
                            ref={el => { triggerRefs.current.qualification = el; }}
                            onClick={() => toggle('qualification')}
                            onMouseEnter={() => openOnEnter('qualification')}
                            aria-expanded={open === 'qualification'}
                            className={cn(pillBase, filters.qualification ? 'text-foreground' : pillDefault, open === 'qualification' && pillOpen)}
                        >
                            Qualification
                            {filters.qualification && <span className="bg-muted text-foreground rounded-md px-1.5 text-sm font-medium shrink-0 flex items-center justify-center h-5 min-w-5">1</span>}
                            <ChevronDownIcon className={cn('h-3.5 w-3.5 shrink-0 opacity-50 transition-transform', open === 'qualification' && 'rotate-180')} />
                        </button>
                        {open === 'qualification' && anchorRect && createPortal(
                            <div ref={panelRef} onMouseEnter={cancelClose} onMouseLeave={scheduleClose} style={panelStyle('qualification')} className={`bg-card border border-border rounded-xl shadow-lg ${freshOpen ? 'animate-in fade-in-0 zoom-in-95 duration-150' : 'animate-in fade-in-0 duration-100'} origin-top p-2 w-52 z-50`}>
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
                                <PanelClearButton show={!!filters.qualification} onClear={() => setFilters({ ...filters, qualification: null })} label="Clear qualification" />
                            </div>
                        , document.body)}
                    </div>
                </>
            )}

            {/* When (drive date) — walk-in specific */}
            {pageType === 'WALKIN' && onDriveDateChange && pillVisible('driveDate') && (
                <div className="relative" onMouseLeave={closeOnLeave}>
                        <button
                            ref={el => { triggerRefs.current.driveDate = el; }}
                            onClick={() => toggle('driveDate')}
                            onMouseEnter={() => openOnEnter('driveDate')}
                            aria-expanded={open === 'driveDate'}
                            className={cn(pillBase, driveDate && driveDate !== 'all' ? 'text-foreground' : pillDefault, open === 'driveDate' && pillOpen)}
                        >
                        <CalendarIcon className="w-4 h-4 shrink-0" />
                        {driveDate === 'today' ? 'Today' : driveDate === 'thisWeek' ? 'This Week' : 'When'}
                        <ChevronDownIcon className={cn('h-3.5 w-3.5 shrink-0 opacity-50 transition-transform', open === 'driveDate' && 'rotate-180')} />
                    </button>
                        {open === 'driveDate' && anchorRect && createPortal(
                            <div ref={panelRef} onMouseEnter={cancelClose} onMouseLeave={scheduleClose} style={panelStyle('driveDate')} className={`bg-card border border-border rounded-xl shadow-lg ${freshOpen ? 'animate-in fade-in-0 zoom-in-95 duration-150' : 'animate-in fade-in-0 duration-100'} origin-top p-1.5 w-44 z-50`}>
                            {([
                                { value: 'all' as const, label: 'All Dates' },
                                { value: 'today' as const, label: 'Today' },
                                { value: 'thisWeek' as const, label: 'This Week' },
                            ]).map((opt, idx) => (
                                <button
                                    key={opt.value}
                                    tabIndex={-1}
                                    ref={el => { itemRefs.current[idx] = el; }}
                                    onClick={() => {
                                        onDriveDateChange(opt.value);
                                        setOpen(null);
                                    }}
                                    onMouseEnter={() => setActiveIndex(idx)}
                                    className={cn(
                                        'w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2.5 cursor-pointer outline-none select-none text-foreground',
                                        idx === activeIndex ? 'bg-muted text-foreground font-semibold' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    )}
                                >
                                    <input type="radio" tabIndex={-1} checked={driveDate === opt.value} readOnly className="w-4 h-4 rounded-full border-border text-primary focus:ring-primary accent-primary pointer-events-none shrink-0" />
                                    {opt.label}
                                </button>
                            ))}
                            <PanelClearButton show={driveDate !== 'all'} onClear={() => onDriveDateChange?.('all')} label="Clear date" />
                        </div>
                    , document.body)}
                </div>
            )}

            {/* Corporate specific dropdowns */}
            {!isGovt && (
                <>
                    {/* Role dropdown — inline from xl */}
                    <div className={cn('relative', !pillVisible('role') && 'hidden')} onMouseLeave={closeOnLeave}>
                        <button
                            ref={el => { triggerRefs.current.role = el; }}
                            onClick={() => toggle('role')}
                            onMouseEnter={() => openOnEnter('role')}
                            aria-expanded={open === 'role'}
                            aria-haspopup="listbox"
                            className={cn(pillBase, filters.role && filters.role.length > 0 ? 'text-foreground' : pillDefault, open === 'role' && pillOpen)}
                        >
                            Role
                            {filters.role && filters.role.length > 0 && (
                                <span className="bg-muted text-foreground rounded-md px-1.5 text-sm font-medium shrink-0 flex items-center justify-center h-5 min-w-5">
                                    {filters.role.length}
                                </span>
                            )}
                            <ChevronDownIcon className={cn('h-3.5 w-3.5 shrink-0 opacity-50 transition-transform', open === 'role' && 'rotate-180')} />
                        </button>
                        {open === 'role' && anchorRect && createPortal(
                            <div ref={panelRef} onMouseEnter={cancelClose} onMouseLeave={scheduleClose} style={panelStyle('role')} className={`bg-card border border-border rounded-xl shadow-lg ${freshOpen ? 'animate-in fade-in-0 zoom-in-95 duration-150' : 'animate-in fade-in-0 duration-100'} origin-top p-2 w-64 z-50 flex flex-col gap-1 max-h-80`}>
                                <div className="px-1 pb-1 pt-0.5 shrink-0">
                                    <input
                                        type="text"
                                        value={roleSearch}
                                        onChange={e => setRoleSearch(e.target.value)}
                                        placeholder="Search roles..."
                                        className="w-full h-9 px-3 rounded-lg border border-transparent bg-muted/60 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:bg-muted/80"
                                        onClick={e => e.stopPropagation()}
                                        autoFocus
                                    />
                                </div>
                                <div className="overflow-y-auto flex-1 overscroll-contain space-y-0.5">
                                    {filteredRoles.map((role, idx) => {
                                        const isSelected = filters.role?.includes(role);
                                        return (
                                            <button
                                                key={role}
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
                                                <span className="truncate flex-1 text-foreground">{role}</span>
                                            </button>
                                        );
                                    })}
                                    {filteredRoles.length === 0 && (
                                        <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                                            No roles found
                                        </div>
                                    )}
                                </div>
                                <PanelClearButton show={(filters.role?.length ?? 0) > 0} onClear={() => setFilters({ ...filters, role: [] })} label="Clear role" />
                            </div>
                        , document.body)}
                    </div>

                    <div className={cn('relative', !pillVisible('skills') && 'hidden')} onMouseLeave={closeOnLeave}>
                        <button
                            ref={el => { triggerRefs.current.skills = el; }}
                            onClick={() => toggle('skills')}
                            onMouseEnter={() => openOnEnter('skills')}
                            aria-expanded={open === 'skills'}
                            className={cn(pillBase, filters.skills && filters.skills.length > 0 ? 'text-foreground' : pillDefault, open === 'skills' && pillOpen)}
                        >
                            Skills
                            {filters.skills && filters.skills.length > 0 && (
                                <span className="bg-muted text-foreground rounded-md px-1.5 text-sm font-medium shrink-0 flex items-center justify-center h-5 min-w-5">
                                    {filters.skills.length}
                                </span>
                            )}
                            <ChevronDownIcon className={cn('h-3.5 w-3.5 shrink-0 opacity-50 transition-transform', open === 'skills' && 'rotate-180')} />
                        </button>
                        {open === 'skills' && anchorRect && createPortal(
                            <div ref={panelRef} onMouseEnter={cancelClose} onMouseLeave={scheduleClose} style={panelStyle('skills')} className={`bg-card border border-border rounded-xl shadow-lg ${freshOpen ? 'animate-in fade-in-0 zoom-in-95 duration-150' : 'animate-in fade-in-0 duration-100'} origin-top p-2 w-72 min-w-72 z-50 flex flex-col gap-1 max-h-80`}>
                                <div className="px-1 pb-1 pt-0.5 shrink-0">
                                    <input
                                        type="text"
                                        value={skillSearch}
                                        onChange={e => setSkillSearch(e.target.value)}
                                        placeholder="Search skills..."
                                        className="w-full h-9 px-3 rounded-lg border border-transparent bg-muted/60 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:bg-muted/80"
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
                                                <SkillPill skill={skill} className="h-auto" />
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
                                <PanelClearButton show={(filters.skills?.length ?? 0) > 0} onClear={() => setFilters({ ...filters, skills: [] })} label="Clear skills" />
                            </div>
                        , document.body)}
                    </div>
                    <div className={cn('relative', !pillVisible('course') && 'hidden')} onMouseLeave={closeOnLeave}>
                        <button
                            ref={el => { triggerRefs.current.course = el; }}
                            onClick={() => toggle('course')}
                            onMouseEnter={() => openOnEnter('course')}
                            aria-expanded={open === 'course'}
                            className={cn(pillBase, filters.course ? 'text-foreground' : pillDefault, open === 'course' && pillOpen)}
                        >
                            Course
                            {filters.course && <span className="bg-muted text-foreground rounded-md px-1.5 text-sm font-medium shrink-0 flex items-center justify-center h-5 min-w-5">1</span>}
                            <ChevronDownIcon className={cn('h-3.5 w-3.5 shrink-0 opacity-50 transition-transform', open === 'course' && 'rotate-180')} />
                        </button>
                        {open === 'course' && anchorRect && createPortal(
                            <div ref={panelRef} onMouseEnter={cancelClose} onMouseLeave={scheduleClose} style={panelStyle('course')} className={`bg-card border border-border rounded-xl shadow-lg ${freshOpen ? 'animate-in fade-in-0 zoom-in-95 duration-150' : 'animate-in fade-in-0 duration-100'} origin-top p-2 w-52 z-50`}>
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
                                <PanelClearButton show={!!filters.course} onClear={() => setFilters({ ...filters, course: null })} label="Clear course" />
                            </div>
                        , document.body)}
                    </div>
                    <div className={cn('relative', !pillVisible('source') && 'hidden')} onMouseLeave={closeOnLeave}>
                        <button
                            ref={el => { triggerRefs.current.source = el; }}
                            onClick={() => toggle('source')}
                            onMouseEnter={() => openOnEnter('source')}
                            aria-expanded={open === 'source'}
                            className={cn(pillBase, filters.source && filters.source.length > 0 ? 'text-foreground' : pillDefault, open === 'source' && pillOpen)}
                        >
                            Source
                            {filters.source && filters.source.length > 0 && (
                                <span className="bg-muted text-foreground rounded-md px-1.5 text-sm font-medium shrink-0 flex items-center justify-center h-5 min-w-5">
                                    {filters.source.length}
                                </span>
                            )}
                            <ChevronDownIcon className={cn('h-3.5 w-3.5 shrink-0 opacity-50 transition-transform', open === 'source' && 'rotate-180')} />
                        </button>
                        {open === 'source' && anchorRect && createPortal(
                            <div ref={panelRef} onMouseEnter={cancelClose} onMouseLeave={scheduleClose} style={panelStyle('source')} className={`bg-card border border-border rounded-xl shadow-lg ${freshOpen ? 'animate-in fade-in-0 zoom-in-95 duration-150' : 'animate-in fade-in-0 duration-100'} origin-top p-2 w-52 z-50`}>
                                <div className="max-h-60 overflow-y-auto overscroll-contain">
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
                                <PanelClearButton show={(filters.source?.length ?? 0) > 0} onClear={() => setFilters({ ...filters, source: [] })} label="Clear source" />
                            </div>
                        , document.body)}
                    </div>
                    {/* Passout year dropdown — inline from xl */}
                    <div className={cn('relative', !pillVisible('year') && 'hidden')} onMouseLeave={closeOnLeave}>
                        <button
                            ref={el => { triggerRefs.current.year = el; }}
                            onClick={() => toggle('year')}
                            onMouseEnter={() => openOnEnter('year')}
                            aria-expanded={open === 'year'}
                            aria-haspopup="listbox"
                            className={cn(pillBase, filters.year !== null ? 'text-foreground' : pillDefault, open === 'year' && pillOpen)}
                        >
                            Batch
                            {filters.year !== null && <span className="bg-muted text-foreground rounded-md px-1.5 text-sm font-medium shrink-0 flex items-center justify-center h-5 min-w-5">1</span>}
                            <ChevronDownIcon className={cn('h-3.5 w-3.5 shrink-0 opacity-50 transition-transform', open === 'year' && 'rotate-180')} />
                        </button>

                        {open === 'year' && anchorRect && createPortal((() => {
                            let itemIdx = 0;
                            return (
                            <div ref={panelRef} onMouseEnter={cancelClose} onMouseLeave={scheduleClose} style={panelStyle('year')} className={`bg-card border border-border rounded-xl shadow-lg ${freshOpen ? 'animate-in fade-in-0 zoom-in-95 duration-150' : 'animate-in fade-in-0 duration-100'} origin-top p-2 w-44 z-50`}>
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
                                <PanelClearButton show={filters.year !== null} onClear={() => setFilters({ ...filters, year: null })} label="Clear batch" />
                                </div>
                            );
                        })(), document.body)}
                    </div>

                    {/* Company dropdown — behind All Filters */}
                    <div className={cn('relative', !pillVisible('company') && 'hidden')} onMouseLeave={closeOnLeave}>
                        <button
                            ref={el => { triggerRefs.current.company = el; }}
                            onClick={() => toggle('company')}
                            onMouseEnter={() => openOnEnter('company')}
                            aria-expanded={open === 'company'}
                            aria-haspopup="listbox"
                            className={cn(pillBase, filters.company && filters.company.length > 0 ? 'text-foreground' : pillDefault, open === 'company' && pillOpen)}
                        >
                            Company
                            {filters.company && filters.company.length > 0 && (
                                <span className="bg-muted text-foreground rounded-md px-1.5 text-sm font-medium shrink-0 flex items-center justify-center h-5 min-w-5">
                                    {filters.company.length}
                                </span>
                            )}
                            <ChevronDownIcon className={cn('h-3.5 w-3.5 shrink-0 opacity-50 transition-transform', open === 'company' && 'rotate-180')} />
                        </button>
                        {open === 'company' && anchorRect && createPortal(
                            <div ref={panelRef} onMouseEnter={cancelClose} onMouseLeave={scheduleClose} style={panelStyle('company')} className={`bg-card border border-border rounded-xl shadow-lg ${freshOpen ? 'animate-in fade-in-0 zoom-in-95 duration-150' : 'animate-in fade-in-0 duration-100'} origin-top p-2 w-72 min-w-72 z-50 flex flex-col gap-1 max-h-80`}>
                                <div className="px-1 pb-1 pt-0.5 shrink-0">
                                    <input
                                        type="text"
                                        value={companySearch}
                                        onChange={e => setCompanySearch(e.target.value)}
                                        placeholder="Search companies..."
                                        className="w-full h-9 px-3 rounded-lg border border-transparent bg-muted/60 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:bg-muted/80"
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
                                <PanelClearButton show={(filters.company?.length ?? 0) > 0} onClear={() => setFilters({ ...filters, company: [] })} label="Clear company" />
                            </div>
                        , document.body)}
                    </div>
                </>
            )}

            {/* All Filters toggle — reveals the rest of the pills inline.
                Badge counts active filters that only live behind this pill. */}
            <button
                type="button"
                onClick={() => setShowAllPills(prev => !prev)}
                aria-expanded={showAllPills}
                className={cn(
                    pillBase,
                    'ml-auto border border-border/60 bg-card/70',
                    showAllPills || hiddenActiveCount > 0 ? 'text-foreground' : pillDefault,
                    showAllPills && pillOpen
                )}
            >
                <AdjustmentsHorizontalIcon className="w-4 h-4 shrink-0" />
                All Filters
                {hiddenActiveCount > 0 && (
                    <span className="bg-primary text-primary-foreground rounded-md px-1.5 text-sm font-semibold shrink-0 flex items-center justify-center h-5 min-w-5">
                        {hiddenActiveCount}
                    </span>
                )}
            </button>
        </div>
    );
}
