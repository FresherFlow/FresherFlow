import React from 'react';
import { getResourcesFeed } from '@/features/resources/api/getResourcesFeed';
import { notFound } from 'next/navigation';
import { getDomainInfo, getColorByUrl, getIconByUrl } from '@/features/resources/components/ResourceCard';
import { Badge } from '@/ui/Badge';
import { ChevronRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface ResourceDetailPageProps {
    params: Promise<{ id: string }>;
}

export async function generateMetadata(props: ResourceDetailPageProps) {
    const params = await props.params;
    const feed = await getResourcesFeed();
    const collection = feed.resources.find(c => c.id === params.id);
    if (!collection) return { title: 'Resource Not Found' };
    
    return {
        title: `${collection.title} | Prep Resources`,
        description: collection.description || `Preparation material and resources for ${collection.title}`,
    };
}

export default async function ResourceDetailPage(props: ResourceDetailPageProps) {
    const params = await props.params;
    const feed = await getResourcesFeed();
    const collection = feed.resources.find(c => c.id === params.id);

    if (!collection) {
        notFound();
    }

    return (
        <div className="container max-w-3xl mx-auto py-8 px-4 space-y-8">
            <Link href="/resources" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground font-medium transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Resources
            </Link>
            
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">{collection.title}</h1>
                {collection.company && (
                    <p className="text-lg text-muted-foreground font-semibold mb-4">
                        {collection.company}
                    </p>
                )}
                {collection.description && (
                    <p className="text-foreground leading-relaxed mb-6">{collection.description}</p>
                )}
                
                {collection.skills && collection.skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-8">
                        {collection.skills.map((skill) => (
                            <Badge key={skill} variant="secondary">
                                {skill}
                            </Badge>
                        ))}
                    </div>
                )}
            </div>

            <div className="space-y-4">
                <h2 className="text-xl font-bold border-b pb-2">Resources ({collection.items.length})</h2>
                <div className="grid gap-3">
                    {collection.items.map((item) => {
                        const colorClass = getColorByUrl(item.url, item.type);
                        const { host } = getDomainInfo(item.url);
                        
                        return (
                            <a 
                                key={item.id} 
                                href={item.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center p-4 rounded-xl border bg-card hover:bg-accent hover:border-primary/30 transition-all group"
                            >
                                <div className={`p-3 rounded-lg ${colorClass} mr-4`}>
                                    {getIconByUrl(item.url, item.type, "w-6 h-6")}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-base font-bold truncate group-hover:text-primary transition-colors">
                                        {item.title}
                                    </p>
                                    <p className="text-xs text-muted-foreground font-medium mt-1 truncate">
                                        {host}
                                    </p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity ml-4" />
                            </a>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
