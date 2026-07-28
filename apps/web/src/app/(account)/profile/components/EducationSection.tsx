'use client';

import React, { useState, useRef, useEffect } from 'react';
import { EDUCATION_LEVELS, DIPLOMA_DEGREES, UG_DEGREES, PG_DEGREES, getSpecializations } from '@fresherflow/domain';
import { cn } from '@/ui/cn';
import { Input } from '@/ui/Input';
import { Button } from '@/ui/Button';
import { Badge } from '@/ui/Badge';
import { Profile } from '@fresherflow/types';
import { ChevronDownIcon, PencilSquareIcon, CheckIcon, BuildingLibraryIcon } from '@heroicons/react/24/outline';
import { useClickOutside } from '@/lib/hooks/useClickOutside';

const INDIAN_STATES = [
    'Andhra Pradesh', 'Telangana', 'Karnataka', 'Tamil Nadu', 'Maharashtra',
    'Delhi', 'Uttar Pradesh', 'West Bengal', 'Gujarat', 'Kerala',
    'Rajasthan', 'Madhya Pradesh', 'Punjab', 'Haryana', 'Bihar', 'Odisha',
    'Assam', 'Chhattisgarh', 'Jharkhand', 'Uttarakhand', 'Himachal Pradesh',
    'Andaman and Nicobar Islands', 'Arunachal Pradesh', 'Chandigarh',
    'Dadra and Nagar Haveli', 'Daman and Diu', 'Goa', 'Jammu and Kashmir',
    'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Puducherry', 'Sikkim', 'Tripura'
];

export interface CollegeItem {
    id?: string;
    name: string;
    district?: string;
    type?: string;
    state?: string;
}

const collegeCache: Record<string, CollegeItem[]> = {};

function slugifyState(stateName: string): string {
    return stateName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function fetchCollegesForState(stateName: string): Promise<CollegeItem[]> {
    if (!stateName) return [];
    const slug = slugifyState(stateName);
    if (collegeCache[slug] && collegeCache[slug].length > 0) return collegeCache[slug];

    const cdnBase = (process.env.NEXT_PUBLIC_CDN_URL || 'https://cdn.fresherflow.in').replace(/\/+$/, '');
    
    // 1. Try fetching live data from CDN directly
    try {
        const res = await fetch(`${cdnBase}/api/colleges/${slug}.json`);
        if (res.ok) {
            const json = await res.json();
            const list: CollegeItem[] = Array.isArray(json) ? json : json.colleges || [];
            collegeCache[slug] = list;
            return list;
        }
    } catch {
        // Fallback to Next.js API proxy if browser CORS blocks direct CDN fetch in local dev
    }

    // 2. Fallback to /api/colleges/[slug] proxy (fetches live CDN server-side or local reference)
    try {
        const fallbackRes = await fetch(`/api/colleges/${slug}`);
        if (!fallbackRes.ok) return [];
        const json = await fallbackRes.json();
        const list: CollegeItem[] = Array.isArray(json) ? json : json.colleges || [];
        collegeCache[slug] = list;
        return list;
    } catch (err) {
        console.error('Failed to fetch colleges:', err);
        return [];
    }
}

function CustomSelect({ value, onChange, options, placeholder = 'Select...', disabled = false }: { value: string; onChange: (val: string) => void; options: string[]; placeholder?: string; disabled?: boolean; }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    useClickOutside(ref, () => setOpen(false));

    return (
        <div className="relative w-full" ref={ref}>
            <button
                type="button" disabled={disabled} onClick={() => setOpen(!open)}
                className={cn('w-full flex items-center justify-between px-3 h-10 rounded-md border text-sm', disabled ? 'bg-muted text-muted-foreground opacity-50' : 'bg-background hover:bg-muted/40')}
            >
                <span className="truncate">{value || placeholder}</span>
                <ChevronDownIcon className={cn('w-4 h-4 text-muted-foreground', open && 'rotate-180')} />
            </button>
            {open && !disabled && (
                <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-card border rounded-md shadow-lg max-h-52 overflow-y-auto p-1">
                    {options.map((opt) => (
                        <button key={opt} type="button" onClick={() => { onChange(opt); setOpen(false); }} className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-muted">
                            {opt}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

interface EducationSectionProps {
    profile?: Profile | null;
    tenthYear: string; setTenthYear: (v: string) => void;
    twelfthYear: string; setTwelfthYear: (v: string) => void;
    educationLevel: string; setEducationLevel: (v: string) => void;
    gradCourse: string; setGradCourse: (v: string) => void;
    gradSpecialization: string; setGradSpecialization: (v: string) => void;
    gradYear: string; setGradYear: (v: string) => void;
    collegeId: string; setCollegeId: (v: string) => void;
    collegeName: string; setCollegeName: (v: string) => void;
    collegeState: string; setCollegeState: (v: string) => void;
    hasPG: boolean; setHasPG: (v: boolean) => void;
    pgCourse: string; setPgCourse: (v: string) => void;
    pgSpecialization: string; setPgSpecialization: (v: string) => void;
    pgYear: string; setPgYear: (v: string) => void;
    isEditing: boolean; onToggleEdit: () => void;
    onSave: () => void; saving: boolean;
}

export const EducationSection = ({
    profile, tenthYear, setTenthYear, twelfthYear, setTwelfthYear, educationLevel, setEducationLevel,
    gradCourse, setGradCourse, gradSpecialization, setGradSpecialization, gradYear, setGradYear,
    collegeId: _collegeId, setCollegeId, collegeName, setCollegeName, collegeState, setCollegeState,
    hasPG, setHasPG, pgCourse, setPgCourse, pgSpecialization, setPgSpecialization, pgYear, setPgYear,
    isEditing, onToggleEdit, onSave, saving
}: EducationSectionProps) => {
    const courseOptions = educationLevel === 'DIPLOMA' ? DIPLOMA_DEGREES : UG_DEGREES;

    const [collegeList, setCollegeList] = useState<CollegeItem[]>([]);
    const [isLoadingColleges, setIsLoadingColleges] = useState(false);
    const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);
    const collegeRef = useRef<HTMLDivElement>(null);
    useClickOutside(collegeRef, () => setShowCollegeDropdown(false));

    useEffect(() => {
        if (!collegeState && collegeName.trim().length < 2) {
            setCollegeList([]);
            return;
        }

        setIsLoadingColleges(true);
        const params = new URLSearchParams();
        if (collegeName.trim()) params.set('q', collegeName.trim());
        if (collegeState) params.set('state', collegeState);
        params.set('limit', '15');

        const timer = setTimeout(() => {
            fetch(`/api/colleges/search?${params.toString()}`)
                .then((res) => (res.ok ? res.json() : []))
                .then((list) => {
                    setCollegeList(list);
                    setIsLoadingColleges(false);
                })
                .catch(() => {
                    setIsLoadingColleges(false);
                });
        }, 150);

        return () => clearTimeout(timer);
    }, [collegeName, collegeState]);

    const handleStateSelect = (stateName: string) => {
        setCollegeState(stateName);
        setShowCollegeDropdown(true);
    };

    const handleSelectCollege = (col: CollegeItem) => {
        setCollegeId(col.id || col.name);
        setCollegeName(col.name);
        if (col.state) {
            setCollegeState(col.state);
        }
        setShowCollegeDropdown(false);
    };

    const timelineItems = [];
    if (profile?.pgCourse) timelineItems.push({ title: profile.pgCourse, sub: profile.pgSpecialization, yr: profile.pgYear, b: 'Postgrad' });
    if (profile?.gradCourse) timelineItems.push({
        title: profile.gradCourse,
        sub: [profile.collegeName || collegeName, profile.gradSpecialization || gradSpecialization].filter(Boolean).join(' • '),
        yr: profile.gradYear,
        b: profile.educationLevel === 'DIPLOMA' ? 'Diploma' : 'Undergrad'
    });
    if (profile?.twelfthYear) timelineItems.push({ title: '12th / Inter', yr: profile.twelfthYear, b: 'School' });
    if (profile?.tenthYear) timelineItems.push({ title: '10th Class', yr: profile.tenthYear, b: 'School' });

    return (
        <div className="w-full bg-card rounded-xl border border-border/60 shadow-sm p-5">
            <div className="flex justify-between items-center mb-5">
                <h3 className="text-base font-bold text-foreground">Education</h3>
                {!isEditing && (
                    <Button variant="ghost" size="sm" onClick={onToggleEdit} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                        <PencilSquareIcon className="w-4 h-4" />
                    </Button>
                )}
            </div>

            {timelineItems.length > 0 ? (
                <div className="space-y-4 border-l-2 border-muted pl-4 ml-2">
                    {timelineItems.map((item, idx) => (
                        <div key={idx} className="relative">
                            <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-card" />
                            <div className="flex justify-between items-start gap-2">
                                <div>
                                    <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                                        {item.title} <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{item.b}</Badge>
                                    </div>
                                    {item.sub && <p className="text-xs text-muted-foreground">{item.sub}</p>}
                                </div>
                                <span className="text-xs font-medium text-muted-foreground shrink-0">{item.yr}</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : null}

            {isEditing && (
                <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 shadow-2xl animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border shadow-2xl p-8 space-y-6">
                        <div className="flex justify-between items-center pb-2 border-b border-border/40">
                            <h3 className="font-bold text-lg text-foreground">Edit Education</h3>
                            <button onClick={onToggleEdit} className="text-muted-foreground hover:text-foreground">✕</button>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Degree / Graduation Details</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-xs text-muted-foreground font-medium mb-1 block">Degree (Course)</label>
                                        <CustomSelect value={gradCourse} options={courseOptions} disabled={saving} onChange={(val) => { setGradCourse(val); setGradSpecialization(''); }} placeholder="Degree (e.g. B.Tech)" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground font-medium mb-1 block">Field of Study (Specialization)</label>
                                        <CustomSelect value={gradSpecialization} options={getSpecializations(gradCourse)} onChange={(val) => setGradSpecialization(val)} placeholder="Specialization" disabled={!gradCourse || saving} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground font-medium mb-1 block">College State</label>
                                        <CustomSelect
                                            value={collegeState}
                                            options={INDIAN_STATES}
                                            disabled={saving}
                                            onChange={handleStateSelect}
                                            placeholder="Select State..."
                                        />
                                    </div>
                                    <div className="relative sm:col-span-2" ref={collegeRef}>
                                        <label className="text-xs text-muted-foreground font-medium mb-1 block">College / University</label>
                                        <Input
                                            type="text"
                                            value={collegeName}
                                            onChange={(e) => {
                                                setCollegeName(e.target.value);
                                                setShowCollegeDropdown(true);
                                            }}
                                            onFocus={() => setShowCollegeDropdown(true)}
                                            placeholder="Type to search college (e.g. CBIT, IIT, JNTU)..."
                                            disabled={saving}
                                            className="h-10 text-sm"
                                        />

                                        {showCollegeDropdown && (collegeState || collegeName.trim().length >= 2) && (
                                            <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl max-h-56 overflow-y-auto p-1 space-y-1">
                                                {isLoadingColleges ? (
                                                    <p className="text-xs text-muted-foreground p-3 text-center">Searching colleges...</p>
                                                ) : collegeList.length > 0 ? (
                                                    collegeList.map((col, idx) => (
                                                        <button
                                                            key={col.id || idx}
                                                            type="button"
                                                            onClick={() => handleSelectCollege(col)}
                                                            className="w-full text-left p-2.5 rounded-lg hover:bg-muted/70 transition-colors flex flex-col gap-0.5"
                                                        >
                                                            <span className="font-bold text-xs text-foreground leading-snug">{col.name}</span>
                                                            <span className="text-[10px] text-muted-foreground font-medium">
                                                                {[col.district, col.type, col.state].filter(Boolean).join(' • ')}
                                                            </span>
                                                        </button>
                                                    ))
                                                ) : (
                                                    <p className="text-xs text-muted-foreground p-3 text-center">No colleges found matching "{collegeName}".</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground font-medium mb-1 block">Graduation Year</label>
                                        <Input type="text" maxLength={4} value={gradYear} onChange={e => setGradYear(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 2025" disabled={saving} className="h-10" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Postgraduate / Master's Degree (Optional)</label>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-xs text-muted-foreground font-medium mb-1 block">PG Course</label>
                                        <CustomSelect value={pgCourse} options={PG_DEGREES} disabled={saving} onChange={(val) => setPgCourse(val)} placeholder="PG Course (e.g. M.Tech)" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground font-medium mb-1 block">PG Specialization</label>
                                        <CustomSelect value={pgSpecialization} options={getSpecializations(pgCourse)} onChange={(val) => setPgSpecialization(val)} placeholder="PG Specialization" disabled={!pgCourse || saving} />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground font-medium mb-1 block">PG Passout Year</label>
                                        <Input type="text" maxLength={4} value={pgYear} onChange={e => setPgYear(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 2026" disabled={saving} className="h-10" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Schooling & Pre-University Timeline</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-muted-foreground font-medium">12th / Inter Passout Year</label>
                                        <Input type="text" maxLength={4} value={twelfthYear} onChange={e => setTwelfthYear(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 2020" disabled={saving} className="h-10" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-muted-foreground font-medium">10th Class Passout Year</label>
                                        <Input type="text" maxLength={4} value={tenthYear} onChange={e => setTenthYear(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 2018" disabled={saving} className="h-10" />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-4 pt-2 border-t border-border/40">
                                <Button variant="outline" className="h-10 px-4" onClick={onToggleEdit} disabled={saving}>Cancel</Button>
                                <Button className="h-10 px-4 gap-1.5" onClick={onSave} disabled={saving}><CheckIcon className="w-3.5 h-3.5" /> Save</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
