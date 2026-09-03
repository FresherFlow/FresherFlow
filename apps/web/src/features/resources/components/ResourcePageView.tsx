'use client';

import { cn } from '@repo/ui/utils/cn';
import { useMemo, useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useFeedHeader } from '@/lib/context/FeedHeaderContext';
import { ResourcesFeed, ResourceSector } from '@fresherflow/types';
import { ResourceCard } from '@/features/resources/components/ResourceCard';
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import XMarkIcon from '@heroicons/react/24/outline/XMarkIcon';
import AcademicCapIcon from '@heroicons/react/24/outline/AcademicCapIcon';
import ChevronDownIcon from '@heroicons/react/24/outline/ChevronDownIcon';
import { Breadcrumb } from '@/ui/Breadcrumb';
import { Input } from '@/ui/Input';
import { EmptyState } from '@/ui/EmptyState';
import { SkillPill } from '@/ui/SkillPill';
import { Button } from '@/ui/Button';

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

const chipBase = 'h-8 px-3 rounded-lg text-[13px] font-medium flex items-center gap-1.5 transition-all whitespace-nowrap select-none cursor-pointer';
const chipDefault = 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground';
const chipActive = 'bg-muted text-foreground font-semibold';

export function ResourcePageView({ feed }: { feed: ResourcesFeed }) {
    const [search, setSearch] = useState('');
    const [skillSearch, setSkillSearch] = useState('');
    const [activeSkills, setActiveSkills] = useState<string[]>([]);
    const [isSkillsOpen, setIsSkillsOpen] = useState(false);

    const { setCount } = useFeedHeader();
    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

    const skillsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setPortalTarget(document.getElementById('top-header-portal-target'));
    }, []);

    useEffect(() => {
        const listener = (e: MouseEvent | TouchEvent) => {
            if (!skillsRef.current || skillsRef.current.contains(e.target as Node)) return;
            setIsSkillsOpen(false);
        };
        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);
        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, []);

    const sector = ResourceSector.PRIVATE;
    const resources = useMemo(() => {
        return (feed.resources || []).filter(res => res.sector === sector);
    }, [feed.resources, sector]);

    const filteredResources = useMemo(() => {
        let result = resources;
        
        if (activeSkills.length > 0) {
            result = result.filter(res => 
                res.skills.some(skill => 
                    activeSkills.some(fSkill => fSkill.toLowerCase() === skill.toLowerCase())
                )
            );
        }

        if (search.trim()) {
            const query = search.toLowerCase().trim();
            result = result.filter(res => 
                res.title.toLowerCase().includes(query) ||
                res.company?.toLowerCase().includes(query) ||
                res.skills.some(s => s.toLowerCase().includes(query))
            );
        }

        return result;
    }, [resources, search, activeSkills]);

    useEffect(() => {
        setCount(filteredResources.length);
        return () => setCount(null);
    }, [filteredResources.length, setCount]);

    const headerPortalContent = (
        <>
            <div className="flex items-center lg:flex">
                <Breadcrumb items={[
                    { label: 'Home', href: '/' },
                    { label: 'Prep Resources', href: '#' }
                ]} />
            </div>
            
            <div className="relative group w-full max-w-xl mx-auto flex-1 lg:ml-6 hidden lg:block">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                    type="text"
                    placeholder="Search resources, guides, materials..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="pl-9 h-9 text-xs rounded-xl bg-card border-border shadow-sm w-full focus:bg-background"
                />
                {search && (
                    <button onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded-full p-0.5 hover:bg-muted">
                        <XMarkIcon className="w-3 h-3" />
                    </button>
                )}
            </div>
        </>
    );

    const toggleSkill = (skill: string) => {
        setActiveSkills(prev => 
            prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
        );
    };

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col" style={{ height: 'calc(100vh - 3.5rem)' }}>
            {portalTarget && headerPortalContent ? createPortal(headerPortalContent, portalTarget) : null}

            {/* Sticky header */}
            <div className="shrink-0 bg-background/95 border-b border-border/50 px-3 md:px-6 pt-3 pb-0 space-y-2.5">
                <div className="relative group lg:hidden">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                        type="text"
                        placeholder="Search resources, guides, materials..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 h-9 text-xs rounded-xl bg-card border-border shadow-sm w-full focus:bg-background"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground rounded-full p-0.5 hover:bg-muted">
                            <XMarkIcon className="w-3 h-3" />
                        </button>
                    )}
                </div>

                <div className="flex items-center justify-between md:grid md:grid-cols-3 gap-3 pb-3">
                    <div className="flex items-baseline gap-2 md:gap-2.5 min-w-0">
                        <h1 className="text-lg md:text-2xl font-extrabold text-foreground tracking-tight leading-tight truncate">
                            Prep Resources
                        </h1>
                        <span className="text-xs md:text-sm font-medium text-muted-foreground shrink-0 whitespace-nowrap">
                            {filteredResources.length} found
                        </span>
                    </div>

                    <div className="flex items-center justify-end md:justify-center gap-2 shrink-0">
                        <div className="relative" ref={skillsRef}>
                                <button
                                    onClick={() => setIsSkillsOpen(!isSkillsOpen)}
                                    aria-expanded={isSkillsOpen}
                                    className={cn(chipBase, activeSkills.length > 0 ? chipActive : chipDefault)}
                                >
                                    <AcademicCapIcon className="w-3.5 h-3.5" />
                                    Skills
                                    {activeSkills.length > 0 && (
                                        <span className="bg-primary/20 text-primary rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none shrink-0 ml-1">
                                            {activeSkills.length}
                                        </span>
                                    )}
                                    <ChevronDownIcon className={cn('w-3 h-3 transition-transform', isSkillsOpen && 'rotate-180')} />
                                </button>
                                {isSkillsOpen && (
                                    <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-lg p-2 w-56 z-[100] flex flex-col gap-1 max-h-80">
                                        <div className="px-1 pb-1 pt-0.5 shrink-0">
                                            <input
                                                type="text"
                                                value={skillSearch}
                                                onChange={e => setSkillSearch(e.target.value)}
                                                placeholder="Search skills..."
                                                className="w-full h-8 px-2.5 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                                                onClick={e => e.stopPropagation()}
                                            />
                                        </div>
                                        <div className="overflow-y-auto flex-1 overscroll-contain">
                                            {CANONICAL_SKILLS
                                                .filter(s => s.toLowerCase().includes(skillSearch.toLowerCase()))
                                                .map(opt => {
                                                    const isSelected = activeSkills.includes(opt);
                                                    return (
                                                    <button
                                                        key={opt}
                                                        onClick={() => toggleSkill(opt)}
                                                        className={cn(
                                                            'w-full text-left px-3 py-2 rounded-lg text-[12px] font-medium transition-all flex items-center gap-2',
                                                            'text-foreground hover:bg-muted/60'
                                                        )}
                                                    >
                                                        <input type="checkbox" checked={isSelected} readOnly className="w-4 h-4 rounded border-border text-primary focus:ring-primary accent-primary pointer-events-none shrink-0" />
                                                        <SkillPill skill={opt} className="bg-transparent border-none p-0 h-auto text-inherit shadow-none" />
                                                    </button>
                                                )})}
                                            {CANONICAL_SKILLS.filter(s => s.toLowerCase().includes(skillSearch.toLowerCase())).length === 0 && (
                                                <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                                                    No skills found
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                </div>

                {/* Active Chips */}
                <div className="flex flex-wrap items-center gap-2 pb-4">
                    {search && (
                        <button onClick={() => setSearch('')} className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full bg-muted/60 text-foreground text-xs font-medium hover:bg-muted transition-colors cursor-pointer outline-none">
                            <MagnifyingGlassIcon className="w-3.5 h-3.5 text-muted-foreground" />
                            {search}
                            <XMarkIcon className="w-3.5 h-3.5 text-muted-foreground ml-1" />
                        </button>
                    )}
                    {activeSkills.map(s => (
                        <button key={s} onClick={() => toggleSkill(s)} className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-medium hover:bg-indigo-100 transition-colors cursor-pointer outline-none">
                            <SkillPill skill={s} className="bg-transparent border-none p-0 h-auto text-inherit shadow-none" />
                            <XMarkIcon className="w-3.5 h-3.5 text-indigo-700 ml-1" />
                        </button>
                    ))}
                    {(search || activeSkills.length > 0) && (
                        <button
                            onClick={() => { setSearch(''); setActiveSkills([]); }}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors ml-1 outline-none"
                        >
                            <XMarkIcon className="w-3.5 h-3.5" />
                            clear all
                        </button>
                    )}
                </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-3 md:px-6 pb-2 space-y-4 pt-4">
                {filteredResources.length === 0 ? (
                    <EmptyState
                        title="No resources found"
                        description={search.trim() || activeSkills.length > 0 ? "Try removing some filters or search keywords." : undefined}
                        action={search.trim() || activeSkills.length > 0 ? <Button variant="outline" onClick={() => { setSearch(''); setActiveSkills([]); }} className="h-11 px-6 text-sm font-bold capitalize tracking-widest">Clear all filters</Button> : undefined}
                    />
                ) : (
                    <div className="flex flex-col gap-4 max-w-3xl mx-auto w-full">
                        {filteredResources.map(collection => (
                            <ResourceCard 
                                key={collection.id} 
                                collection={collection} 
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
