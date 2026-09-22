'use client';
/* eslint-disable shadcn/no-arbitrary-values, shadcn/no-unknown-classes, shadcn/no-restyle, shadcn/require-static-classes, shadcn/no-raw-colors */

import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@repo/ui/utils/cn';
import ChevronDownIcon from '@heroicons/react/24/outline/ChevronDownIcon';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import AdjustmentsHorizontalIcon from '@heroicons/react/24/outline/AdjustmentsHorizontalIcon';

/**
 * JobsFilterBar — Simplify-style single-row filter bar.
 *
 * Pills: Location · Type · Batch · All filters (+ When on walk-ins,
 * + Skills inline on wide screens). Panels open on hover AND click.
 * All filters is ONE compact card with every section inside it —
 * no side flyouts, no big rectangles.
 */

export interface JobsFilterBarFilters {
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

interface JobsFilterBarProps {
    filters: JobsFilterBarFilters;
    setFilters: (f: JobsFilterBarFilters) => void;
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

type OpenPanel = 'location' | 'type' | 'batch' | 'when' | 'skills' | 'all' | null;

const TYPE_OPTIONS = [
    { label: 'All types', value: null },
    { label: 'Jobs', value: 'JOB' },
    { label: 'Internships', value: 'INTERNSHIP' },
    { label: 'Walk-ins', value: 'WALKIN' },
];

const GOVT_SECTORS = ['Defense', 'Railways', 'Banking', 'Teaching', 'Police', 'SSC / UPSC', 'PSU'];
const GOVT_QUALIFICATIONS = ['10th Pass', '12th Pass', 'Diploma', 'Graduate', 'Postgraduate'];
const CORP_COURSES = ['B.Tech/B.E.', 'M.C.A.', 'MBA', 'B.Sc/B.Com/B.A', 'Diploma'];
const WORK_MODES = [
    { value: 'REMOTE', label: 'Remote' },
    { value: 'HYBRID', label: 'Hybrid' },
    { value: 'ON_SITE', label: 'On-site' },
];

const pillBase =
    'h-8 px-3.5 rounded-full text-sm font-medium flex items-center gap-1.5 whitespace-nowrap select-none cursor-pointer outline-none transition-colors duration-150';
const pillIdle = 'text-foreground hover:bg-muted';
const pillActive = 'bg-primary/10 text-primary font-semibold';

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

export function JobsFilterBar({
    filters,
    setFilters,
    selectedType,
    onTypeChange,
    pageType,
    aggregates,
    driveDate = 'all',
    onDriveDateChange,
}: JobsFilterBarProps) {
    const [open, setOpen] = useState<OpenPanel>(null);
    const [locSearch, setLocSearch] = useState('');
    const [skillSearch, setSkillSearch] = useState('');
    const [companySearch, setCompanySearch] = useState('');
    const [isWide, setIsWide] = useState(false);
    const barRef = useRef<HTMLDivElement>(null);

    const isGovt = pageType === 'GOVERNMENT';
    const isWalkin = pageType === 'WALKIN';

    // Wide screens earn the Skills pill inline.
    useEffect(() => {
        const mq = window.matchMedia('(min-width: 1280px)');
        const update = () => setIsWide(mq.matches);
        update();
        mq.addEventListener('change', update);
        return () => mq.removeEventListener('change', update);
    }, []);

    const clearSearches = () => {
        setLocSearch('');
        setSkillSearch('');
        setCompanySearch('');
    };

    useClickOutside(barRef, () => {
        setOpen(null);
        clearSearches();
    });

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setOpen(null);
                clearSearches();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    // Hover opens a panel; leaving the pill+panel wrapper closes it.
    // Click still toggles for touch / keyboard users.
    const openOnEnter = (panel: OpenPanel) => {
        setOpen(panel);
        if (panel !== 'location') setLocSearch('');
        if (panel !== 'skills' && panel !== 'all') setSkillSearch('');
        if (panel !== 'all') setCompanySearch('');
    };
    const closeOnLeave = () => {
        setOpen(null);
        clearSearches();
    };

    const locations = useMemo(
        () =>
            Object.entries(aggregates?.locations || {})
                .sort((a, b) => b[1] - a[1])
                .map(([loc, count]) => ({ loc, count })),
        [aggregates?.locations]
    );
    const locQuery = locSearch.trim().toLowerCase();
    const filteredLocations = useMemo(
        () => (locQuery ? locations.filter(l => l.loc.toLowerCase().includes(locQuery)) : locations),
        [locQuery, locations]
    );

    const skills = useMemo(
        () =>
            Object.entries(aggregates?.skills || {})
                .sort((a, b) => b[1] - a[1])
                .map(([skill, count]) => ({ skill, count })),
        [aggregates?.skills]
    );
    const skillQuery = skillSearch.trim().toLowerCase();
    const filteredSkills = useMemo(
        () => (skillQuery ? skills.filter(s => s.skill.toLowerCase().includes(skillQuery)) : skills),
        [skillQuery, skills]
    );

    const companies = useMemo(
        () =>
            Object.entries(aggregates?.companies || {})
                .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                .map(([company, count]) => ({ company, count })),
        [aggregates?.companies]
    );
    const compQuery = companySearch.trim().toLowerCase();
    const filteredCompanies = useMemo(
        () => (compQuery ? companies.filter(c => c.company.toLowerCase().includes(compQuery)) : companies),
        [compQuery, companies]
    );

    const sources = useMemo(
        () =>
            Object.entries(aggregates?.sources || {})
                .sort((a, b) => b[1] - a[1])
                .map(([source, count]) => ({ source, count })),
        [aggregates?.sources]
    );

    const years = useMemo(
        () =>
            Object.entries(aggregates?.years || {})
                .sort((a, b) => Number(b[0]) - Number(a[0]))
                .map(([year, count]) => ({ year: Number(year), count })),
        [aggregates?.years]
    );

    // Active counts per pill
    const locationCount = (filters.workMode?.length || 0) + (filters.location ? 1 : 0);
    const skillsCount = filters.skills?.length || 0;
    const companyCount = filters.company?.length || 0;
    const sourceCount = filters.source?.length || 0;
    const allCount = skillsCount + companyCount + sourceCount + (filters.course ? 1 : 0) +
        (isGovt ? (filters.sector ? 1 : 0) + (filters.qualification ? 1 : 0) : 0);

    const toggleWorkMode = (mode: string) => {
        const isSelected = filters.workMode?.includes(mode);
        const next = isSelected ? (filters.workMode || []).filter(m => m !== mode) : [...(filters.workMode || []), mode];
        setFilters({ ...filters, workMode: next.length > 0 ? next : null });
    };
    const toggleSkill = (skill: string) => {
        const isSelected = filters.skills?.includes(skill);
        setFilters({ ...filters, skills: isSelected ? (filters.skills || []).filter(s => s !== skill) : [...(filters.skills || []), skill] });
    };
    const toggleCompany = (company: string) => {
        const isSelected = filters.company?.includes(company);
        setFilters({ ...filters, company: isSelected ? (filters.company || []).filter(c => c !== company) : [...(filters.company || []), company] });
    };
    const toggleSource = (source: string) => {
        const isSelected = filters.source?.includes(source);
        setFilters({ ...filters, source: isSelected ? (filters.source || []).filter(s => s !== source) : [...(filters.source || []), source] });
    };

    // Compact card + tight rows — everything inside All filters is small.
    const panelCls =
        'absolute right-0 top-full mt-2 rounded-xl border border-border bg-card shadow-xl z-overlay animate-in fade-in-0 zoom-in-95 duration-150 origin-top before:absolute before:-top-2 before:inset-x-0 before:h-2 before:content-empty';
    const rowCls =
        'w-full text-left px-2.5 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 cursor-pointer outline-none select-none text-foreground hover:bg-muted';
    const searchBoxCls =
        'w-full h-8 pl-7 pr-2.5 rounded-md border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20';
    const sectionTitleCls = 'px-0.5 pt-2 pb-0.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70';

    const Check = ({ on }: { on: boolean }) => (
        <input type="checkbox" tabIndex={-1} checked={on} readOnly className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary pointer-events-none shrink-0" />
    );

    const searchInput = (value: string, onChange: (v: string) => void, placeholder: string) => (
        <div className="relative px-0.5 pb-1">
            <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
                type="text"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className={searchBoxCls}
                autoFocus
            />
        </div>
    );

    return (
        <div ref={barRef} className="relative inline-flex items-center rounded-full border border-border bg-card p-1 shadow-xs max-w-full">
            {/* Location */}
            <div className="relative" onMouseEnter={() => openOnEnter('location')} onMouseLeave={closeOnLeave}>
                <button
                    type="button"
                    onClick={() => { setOpen(prev => (prev === 'location' ? null : 'location')); setLocSearch(''); }}
                    aria-expanded={open === 'location'}
                    className={cn(pillBase, locationCount > 0 ? pillActive : pillIdle)}
                >
                    Location
                    {locationCount > 0 && (
                        <span className="bg-primary/15 text-primary rounded-full px-1.5 text-xs font-bold min-w-5 h-5 flex items-center justify-center">{locationCount}</span>
                    )}
                    <ChevronDownIcon className={cn('w-3.5 h-3.5 shrink-0 transition-transform duration-150', open === 'location' && 'rotate-180')} />
                </button>
                {open === 'location' && (
                    <div className={cn(panelCls, 'p-2 w-64 space-y-0.5')}>
                        {searchInput(locSearch, setLocSearch, 'Search city or state...')}
                        <div className="max-h-64 overflow-y-auto overscroll-contain space-y-0.5">
                            {!isGovt && (
                                <>
                                    <div className={sectionTitleCls}>Work Mode</div>
                                    {WORK_MODES.map(mode => (
                                        <button key={mode.value} type="button" onClick={() => toggleWorkMode(mode.value)} className={rowCls}>
                                            <Check on={!!filters.workMode?.includes(mode.value)} />
                                            <span>{mode.label}</span>
                                        </button>
                                    ))}
                                    <div className="my-1 border-t border-border/50" />
                                </>
                            )}
                            <button type="button" onClick={() => { setFilters({ ...filters, location: null }); setOpen(null); }} className={rowCls}>
                                <Check on={filters.location === null} />
                                <span>All Locations</span>
                            </button>
                            {filteredLocations.length > 0 && (
                                <>
                                    <div className={sectionTitleCls}>Locations</div>
                                    {filteredLocations.map(({ loc, count }) => (
                                        <button key={loc} type="button" onClick={() => { setFilters({ ...filters, location: filters.location === loc ? null : loc }); setOpen(null); }} className={rowCls}>
                                            <Check on={filters.location === loc} />
                                            <span className="truncate">{loc} ({count})</span>
                                        </button>
                                    ))}
                                </>
                            )}
                            {filteredLocations.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-3">No matching cities</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Type */}
            {onTypeChange && (
                <div className="relative" onMouseEnter={() => openOnEnter('type')} onMouseLeave={closeOnLeave}>
                    <button
                        type="button"
                        onClick={() => setOpen(prev => (prev === 'type' ? null : 'type'))}
                        aria-expanded={open === 'type'}
                        className={cn(pillBase, selectedType ? pillActive : pillIdle)}
                    >
                        {selectedType === 'JOB' ? 'Jobs' : selectedType === 'INTERNSHIP' ? 'Internships' : selectedType === 'WALKIN' ? 'Walk-ins' : 'Type'}
                        <ChevronDownIcon className={cn('w-3.5 h-3.5 shrink-0 transition-transform duration-150', open === 'type' && 'rotate-180')} />
                    </button>
                    {open === 'type' && (
                        <div className={cn(panelCls, 'p-1.5 w-44 space-y-0.5')}>
                            {TYPE_OPTIONS.map(opt => (
                                <button key={opt.label} type="button" onClick={() => { onTypeChange(opt.value); setOpen(null); }} className={rowCls}>
                                    <Check on={selectedType === opt.value} />
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Batch (passout year) */}
            <div className="relative" onMouseEnter={() => openOnEnter('batch')} onMouseLeave={closeOnLeave}>
                <button
                    type="button"
                    onClick={() => setOpen(prev => (prev === 'batch' ? null : 'batch'))}
                    aria-expanded={open === 'batch'}
                    className={cn(pillBase, filters.year !== null ? pillActive : pillIdle)}
                >
                    Batch
                    {filters.year !== null && (
                        <span className="bg-primary/15 text-primary rounded-full px-1.5 text-xs font-bold min-w-5 h-5 flex items-center justify-center">1</span>
                    )}
                    <ChevronDownIcon className={cn('w-3.5 h-3.5 shrink-0 transition-transform duration-150', open === 'batch' && 'rotate-180')} />
                </button>
                {open === 'batch' && (
                    <div className={cn(panelCls, 'p-1.5 w-40 space-y-0.5')}>
                        <button type="button" onClick={() => { setFilters({ ...filters, year: null }); setOpen(null); }} className={rowCls}>
                            <Check on={filters.year === null} />
                            <span>Any</span>
                        </button>
                        {years.map(({ year, count }) => (
                            <button key={year} type="button" onClick={() => { setFilters({ ...filters, year }); setOpen(null); }} className={rowCls}>
                                <Check on={filters.year === year} />
                                <span>{year} ({count})</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* When — walk-in pages only */}
            {isWalkin && onDriveDateChange && (
                <div className="relative" onMouseEnter={() => openOnEnter('when')} onMouseLeave={closeOnLeave}>
                    <button
                        type="button"
                        onClick={() => setOpen(prev => (prev === 'when' ? null : 'when'))}
                        aria-expanded={open === 'when'}
                        className={cn(pillBase, !!driveDate && driveDate !== 'all' ? pillActive : pillIdle)}
                    >
                        {driveDate === 'today' ? 'Today' : driveDate === 'thisWeek' ? 'This Week' : 'When'}
                        <ChevronDownIcon className={cn('w-3.5 h-3.5 shrink-0 transition-transform duration-150', open === 'when' && 'rotate-180')} />
                    </button>
                    {open === 'when' && (
                        <div className={cn(panelCls, 'p-1.5 w-40 space-y-0.5')}>
                            {([
                                { value: 'all' as const, label: 'All Dates' },
                                { value: 'today' as const, label: 'Today' },
                                { value: 'thisWeek' as const, label: 'This Week' },
                            ]).map(opt => (
                                <button key={opt.value} type="button" onClick={() => { onDriveDateChange(opt.value); setOpen(null); }} className={rowCls}>
                                    <input type="radio" tabIndex={-1} checked={driveDate === opt.value} readOnly className="w-4 h-4 rounded-full border-border text-primary accent-primary pointer-events-none shrink-0" />
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Skills — inline on wide screens */}
            {isWide && (
                <div className="relative" onMouseEnter={() => openOnEnter('skills')} onMouseLeave={closeOnLeave}>
                    <button
                        type="button"
                        onClick={() => { setOpen(prev => (prev === 'skills' ? null : 'skills')); setSkillSearch(''); }}
                        aria-expanded={open === 'skills'}
                        className={cn(pillBase, skillsCount > 0 ? pillActive : pillIdle)}
                    >
                        Skills
                        {skillsCount > 0 && (
                            <span className="bg-primary/15 text-primary rounded-full px-1.5 text-xs font-bold min-w-5 h-5 flex items-center justify-center">{skillsCount}</span>
                        )}
                        <ChevronDownIcon className={cn('w-3.5 h-3.5 shrink-0 transition-transform duration-150', open === 'skills' && 'rotate-180')} />
                    </button>
                    {open === 'skills' && (
                        <div className={cn(panelCls, 'p-2 w-64 space-y-0.5')}>
                            {searchInput(skillSearch, setSkillSearch, 'Search skills...')}
                            <div className="max-h-60 overflow-y-auto overscroll-contain space-y-0.5">
                                {filteredSkills.map(({ skill, count }) => (
                                    <button key={skill} type="button" onClick={() => toggleSkill(skill)} className={rowCls}>
                                        <Check on={!!filters.skills?.includes(skill)} />
                                        <span className="truncate flex-1">{skill}</span>
                                        <span className="text-muted-foreground text-xs shrink-0">({count})</span>
                                    </button>
                                ))}
                                {filteredSkills.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">No skills found</p>}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* All filters — ONE compact card, every section inside */}
            <div className="relative" onMouseEnter={() => openOnEnter('all')} onMouseLeave={closeOnLeave}>
                <button
                    type="button"
                    onClick={() => setOpen(prev => (prev === 'all' ? null : 'all'))}
                    aria-expanded={open === 'all'}
                    className={cn(pillBase, open === 'all' || allCount > 0 ? pillActive : pillIdle)}
                >
                    <AdjustmentsHorizontalIcon className="w-4 h-4 shrink-0" />
                    All filters
                    {allCount > 0 && (
                        <span className="bg-primary/15 text-primary rounded-full px-1.5 text-xs font-bold min-w-5 h-5 flex items-center justify-center">{allCount}</span>
                    )}
                    <ChevronDownIcon className={cn('w-3.5 h-3.5 shrink-0 transition-transform duration-150', open === 'all' && 'rotate-180')} />
                </button>

                {open === 'all' && (
                    <div className={cn(panelCls, 'p-2 w-60')}>
                        <div className="max-h-80 overflow-y-auto overscroll-contain space-y-0.5">
                            {/* Skills — only when not already inline on wide screens */}
                            {!isWide && (
                                <section>
                                    <div className={sectionTitleCls}>Skills</div>
                                    {searchInput(skillSearch, setSkillSearch, 'Search skills...')}
                                    {filteredSkills.slice(0, 12).map(({ skill, count }) => (
                                        <button key={skill} type="button" onClick={() => toggleSkill(skill)} className={rowCls}>
                                            <Check on={!!filters.skills?.includes(skill)} />
                                            <span className="truncate flex-1">{skill}</span>
                                            <span className="text-muted-foreground text-xs shrink-0">({count})</span>
                                        </button>
                                    ))}
                                    {filteredSkills.length === 0 && <p className="text-sm text-muted-foreground text-center py-1.5">No skills found</p>}
                                </section>
                            )}

                            {isGovt ? (
                                <>
                                    <section>
                                        <div className={sectionTitleCls}>Sector</div>
                                        {GOVT_SECTORS.map(opt => (
                                            <button key={opt} type="button" onClick={() => setFilters({ ...filters, sector: filters.sector === opt ? null : opt })} className={rowCls}>
                                                <Check on={filters.sector === opt} />
                                                {opt}
                                            </button>
                                        ))}
                                    </section>
                                    <section>
                                        <div className={sectionTitleCls}>Qualification</div>
                                        {GOVT_QUALIFICATIONS.map(opt => (
                                            <button key={opt} type="button" onClick={() => setFilters({ ...filters, qualification: filters.qualification === opt ? null : opt })} className={rowCls}>
                                                <Check on={filters.qualification === opt} />
                                                {opt}
                                            </button>
                                        ))}
                                    </section>
                                </>
                            ) : (
                                <>
                                    <section>
                                        <div className={sectionTitleCls}>Course</div>
                                        {CORP_COURSES.map(opt => (
                                            <button key={opt} type="button" onClick={() => setFilters({ ...filters, course: filters.course === opt ? null : opt })} className={rowCls}>
                                                <Check on={filters.course === opt} />
                                                {opt}
                                            </button>
                                        ))}
                                    </section>
                                    {sources.length > 0 && (
                                        <section>
                                            <div className={sectionTitleCls}>Source</div>
                                            {sources.slice(0, 8).map(({ source, count }) => (
                                                <button key={source} type="button" onClick={() => toggleSource(source)} className={rowCls}>
                                                    <Check on={!!filters.source?.includes(source)} />
                                                    <span className="truncate flex-1">{source}</span>
                                                    <span className="text-muted-foreground text-xs shrink-0">({count})</span>
                                                </button>
                                            ))}
                                        </section>
                                    )}
                                </>
                            )}

                            {filteredCompanies.length > 0 && (
                                <section>
                                    <div className={sectionTitleCls}>Company</div>
                                    {searchInput(companySearch, setCompanySearch, 'Search companies...')}
                                    {filteredCompanies.slice(0, 10).map(({ company, count }) => (
                                        <button key={company} type="button" onClick={() => toggleCompany(company)} className={rowCls}>
                                            <Check on={!!filters.company?.includes(company)} />
                                            <span className="truncate flex-1">{company}</span>
                                            <span className="text-muted-foreground text-xs shrink-0">({count})</span>
                                        </button>
                                    ))}
                                </section>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
