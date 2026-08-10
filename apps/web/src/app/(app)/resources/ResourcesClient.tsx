"use client";

import React, { useMemo, useState } from 'react';
import { ResourcesFeed, ResourceSector } from '@fresherflow/types';
import { Search, Building, Award, BookOpen, X, ChevronRight, Landmark } from 'lucide-react';
import { ResourceCard } from '@/features/resources/components/ResourceCard';
import { Input } from '@/ui/Input';
import { Card } from '@/ui/Card';
import { Badge } from '@/ui/Badge';
import Link from 'next/link';

interface ResourcesClientProps {
    feed: ResourcesFeed;
}

export function ResourcesClient({ feed }: ResourcesClientProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilterSkills, setActiveFilterSkills] = useState<string[]>([]);
    
    // For now, default to PRIVATE as per user prompt "just wire up a basic generic feed for now without complex sector filtering"
    const sector = ResourceSector.PRIVATE;
    
    const resources = useMemo(() => {
        return (feed.resources || []).filter(res => res.sector === sector);
    }, [feed.resources, sector]);

    const companyGroups = useMemo(() => {
        const counts: Record<string, number> = {};
        resources.forEach(res => {
            if (res.company) {
                counts[res.company] = (counts[res.company] || 0) + 1;
            }
        });

        return Object.entries(counts).map(([name, count]) => {
            const meta = feed.companyMetadata?.[name];
            return {
                id: name.toLowerCase().replace(/\s+/g, '-'),
                name,
                logoUrl: meta?.logoUrl || undefined,
                count,
            };
        }).sort((a, b) => b.count - a.count);
    }, [resources, feed.companyMetadata]);

    const skillGroups = useMemo(() => {
        const counts: Record<string, number> = {};
        resources.forEach(res => {
            res.skills.forEach(skill => {
                counts[skill] = (counts[skill] || 0) + 1;
            });
        });

        return Object.entries(counts)
            .map(([name, count]) => ({
                id: name.toLowerCase().replace(/\s+/g, '-'),
                name,
                count,
            }))
            .sort((a, b) => b.count - a.count);
    }, [resources]);

    const filteredResources = useMemo(() => {
        let result = resources;
        
        if (activeFilterSkills.length > 0) {
            result = result.filter(res => 
                res.skills.some(skill => 
                    activeFilterSkills.some(fSkill => fSkill.toLowerCase() === skill.toLowerCase())
                )
            );
        }

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            result = result.filter(res => 
                res.title.toLowerCase().includes(query) ||
                res.company?.toLowerCase().includes(query) ||
                res.skills.some(s => s.toLowerCase().includes(query))
            );
        }

        return result;
    }, [resources, searchQuery, activeFilterSkills]);

    return (
        <div className="space-y-8">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                    type="text" 
                    placeholder="Search companies, skills, roadmaps..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-12 text-base rounded-xl"
                />
                {searchQuery && (
                    <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-accent rounded-full text-muted-foreground"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>

            {activeFilterSkills.length > 0 && (
                <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/10 rounded-xl">
                    <div>
                        <p className="font-semibold text-foreground">Matched Job Skills</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            Showing resources matching: {activeFilterSkills.join(', ')}
                        </p>
                    </div>
                    <button 
                        onClick={() => setActiveFilterSkills([])}
                        className="px-3 py-1.5 bg-primary text-primary-foreground text-sm font-semibold rounded-md hover:bg-primary/90"
                    >
                        Clear
                    </button>
                </div>
            )}

            {!searchQuery && activeFilterSkills.length === 0 && (
                <>
                    {companyGroups.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-muted-foreground ml-1">
                                <Building className="w-5 h-5 text-primary" />
                                <h2 className="font-bold text-sm tracking-wider uppercase">Companies Prep Packs</h2>
                            </div>
                            <div className="flex overflow-x-auto pb-4 gap-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
                                {companyGroups.map(company => (
                                    <Link key={company.id} href={`/resources/company/${company.id}`} className="flex-none">
                                        <Card className="w-32 p-4 flex flex-col items-center justify-center text-center hover:border-primary/50 transition-colors">
                                            <div className="w-12 h-12 rounded-lg bg-accent flex items-center justify-center mb-3 overflow-hidden">
                                                {company.logoUrl ? (
                                                    <img src={company.logoUrl} alt={company.name} className="w-full h-full object-contain" />
                                                ) : (
                                                    <Building className="w-6 h-6 text-muted-foreground" />
                                                )}
                                            </div>
                                            <p className="font-bold text-sm line-clamp-1 w-full">{company.name}</p>
                                            <div className="mt-2 bg-primary/10 text-primary px-2 py-0.5 rounded-md text-[10px] font-bold">
                                                {company.count} Guide{company.count !== 1 ? 's' : ''}
                                            </div>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {skillGroups.length > 0 && (
                        <div className="space-y-4 pt-4">
                            <div className="flex items-center gap-2 text-muted-foreground ml-1">
                                <Award className="w-5 h-5 text-primary" />
                                <h2 className="font-bold text-sm tracking-wider uppercase">Skill Topic Hubs</h2>
                            </div>
                            <div className="flex flex-wrap gap-3">
                                {skillGroups.map(skill => (
                                    <Link key={skill.id} href={`/resources/skill/${skill.id}`}>
                                        <Badge variant="outline" className="px-3 py-1.5 text-sm hover:bg-primary/5 hover:border-primary/30 transition-colors gap-2 cursor-pointer border-primary/20">
                                            <BookOpen className="w-3.5 h-3.5 text-primary" />
                                            <span className="text-primary font-bold">{skill.name}</span>
                                            <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-bold">
                                                {skill.count}
                                            </span>
                                        </Badge>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 text-muted-foreground ml-1 mb-4">
                    <BookOpen className="w-5 h-5 text-primary" />
                    <h2 className="font-bold text-sm tracking-wider uppercase">
                        {searchQuery ? "Search Results" : activeFilterSkills.length > 0 ? "Matched Prep Guides" : "Explore All Prep Guides"}
                    </h2>
                </div>
                
                {filteredResources.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                        <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p className="font-semibold">No matching resources found.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
