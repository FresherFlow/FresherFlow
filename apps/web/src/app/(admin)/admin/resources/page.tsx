import { Metadata } from 'next';
import AdminResourcesClient from './components/AdminResourcesClient';

export const metadata: Metadata = {
    title: 'Manage Resources | Admin | FresherFlow',
    description: 'Manage shared resources',
};

export default function AdminResourcesPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Resources</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    Review and approve resources shared by users.
                </p>
            </div>
            <AdminResourcesClient />
        </div>
    );
}
