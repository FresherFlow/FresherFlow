import React from 'react';
import { getResourcesFeed } from '@/features/resources/api/getResourcesFeed';
import { notFound } from 'next/navigation';
import { ResourceCard } from '@/features/resources/components/ResourceCard';
import { ArrowLeft, Building } from 'lucide-react';
import Link from 'next/link';

interface CompanyResourcesPageProps {
    params: {
        id: string;
    };
}

export async function generateMetadata({ params }: CompanyResourcesPageProps) {
    const feed = await getResourcesFeed();
    const companyName = Object.keys(feed.companyMetadata || {}).find(
        name => name.toLowerCase().replace(/\s+/g, '-') === params.id
    );
    
    return {
        title: `${companyName || 'Company'} Prep Resources | FresherFlow`,
    };
}

export default async function CompanyResourcesPage({ params }: CompanyResourcesPageProps) {
    const feed = await getResourcesFeed();
    
    // Find actual company name from feed based on slug
    const companyName = Array.from(new Set(feed.resources.map(r => r.company).filter(Boolean))).find(
        name => name!.toLowerCase().replace(/\s+/g, '-') === params.id
    );

    if (!companyName) {
        notFound();
    }

    const companyResources = feed.resources.filter(r => r.company === companyName);
    const meta = feed.companyMetadata?.[companyName];

    return (
        <div className="container max-w-5xl mx-auto py-8 px-4 space-y-8">
            <Link href="/resources" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground font-medium transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Directory
            </Link>
            
            <div className="flex items-center gap-6 mb-8">
                <div className="w-20 h-20 rounded-2xl bg-accent flex items-center justify-center overflow-hidden border">
                    {meta?.logoUrl ? (
                        <img src={meta.logoUrl} alt={companyName} className="w-full h-full object-contain p-2" />
                    ) : (
                        <Building className="w-10 h-10 text-muted-foreground" />
                    )}
                </div>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{companyName}</h1>
                    <p className="text-muted-foreground font-semibold mt-1">
                        {companyResources.length} Prep Guide{companyResources.length !== 1 ? 's' : ''}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {companyResources.map(collection => (
                    <ResourceCard 
                        key={collection.id} 
                        collection={collection} 
                    />
                ))}
            </div>
        </div>
    );
}
