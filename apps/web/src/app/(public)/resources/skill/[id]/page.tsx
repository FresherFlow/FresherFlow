import React from 'react';
import { getResourcesFeed } from '@/features/resources/api/getResourcesFeed';
import { notFound } from 'next/navigation';
import { ResourceCard } from '@/features/resources/components/ResourceCard';
import { ArrowLeft, Award } from 'lucide-react';
import Link from 'next/link';

interface SkillResourcesPageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata(props: SkillResourcesPageProps) {
    const params = await props.params;
    const feed = await getResourcesFeed();
    let skillName: string | undefined;
    for (const res of feed.resources) {
        const found = res.skills.find(s => s.toLowerCase().replace(/\s+/g, '-') === params.id);
        if (found) {
            skillName = found;
            break;
        }
    }
    return {
        title: `${skillName || 'Skill'} Prep Resources`,
        description: `Preparation material, interview guides, and resources for ${skillName || 'this skill'}.`,
    };
}

export default async function SkillResourcesPage(props: SkillResourcesPageProps) {
    const params = await props.params;
    const feed = await getResourcesFeed();
    
    // Find actual skill name
    let skillName: string | undefined;
    
    for (const res of feed.resources) {
        const found = res.skills.find(s => s.toLowerCase().replace(/\s+/g, '-') === params.id);
        if (found) {
            skillName = found;
            break;
        }
    }

    if (!skillName) {
        notFound();
    }

    const skillResources = feed.resources.filter(r => 
        r.skills.some(s => s.toLowerCase() === skillName!.toLowerCase())
    );

    return (
        <div className="container max-w-5xl mx-auto py-8 px-4 space-y-8">
            <Link href="/resources" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground font-medium transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Directory
            </Link>
            
            <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Award className="w-6 h-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{skillName} Resources</h1>
                    <p className="text-muted-foreground font-semibold mt-1">
                        {skillResources.length} Prep Guide{skillResources.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {skillResources.map(collection => (
                    <ResourceCard 
                        key={collection.id} 
                        collection={collection} 
                    />
                ))}
            </div>
        </div>
    );
}
