import { Metadata } from 'next';
import AdminResourcesClient from './components/AdminResourcesClient';
import { SKILLS_METADATA_URL, COMPANIES_METADATA_URL } from '@/lib/utils/runtimeConfig';



export const dynamic = 'force-dynamic';

export default async function AdminResourcesPage() {
    let initialSkills: string[] = [];
    let initialCompanies: string[] = [];

    try {
        const [skillsRes, companiesRes] = await Promise.all([
            fetch(SKILLS_METADATA_URL, { next: { revalidate: 3600 } }),
            fetch(COMPANIES_METADATA_URL, { next: { revalidate: 3600 } })
        ]);
        if (skillsRes.ok) {
            const data = await skillsRes.json();
            if (Array.isArray(data)) initialSkills = data;
        }
        if (companiesRes.ok) {
            const data = await companiesRes.json();
            if (Array.isArray(data)) {
                initialCompanies = data.map((c: any) => typeof c === 'string' ? c : c?.name || '').filter(Boolean);
            }
        }
    } catch (err) {
        console.error('Failed to fetch from CDN on server:', err);
    }

    return (
        <div className="p-4 md:p-8 pt-16 md:pt-8 space-y-6 flex-1 min-h-0 overflow-y-auto pb-28 md:pb-8">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Resources</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    Review and approve resources shared by users.
                </p>
            </div>
            <AdminResourcesClient 
                initialSkills={Array.isArray(initialSkills) ? initialSkills : []} 
                initialCompanies={Array.isArray(initialCompanies) ? initialCompanies : []} 
            />
        </div>
    );
}
