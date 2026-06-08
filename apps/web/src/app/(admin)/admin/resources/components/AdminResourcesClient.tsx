'use client';

import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api/admin';
import { SharedResource, ResourceItemStatus } from '@fresherflow/types';
import { 
    CheckCircleIcon, 
    XCircleIcon, 
    PencilSquareIcon,
    TrashIcon,
    ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { toast } from 'react-hot-toast';

export default function AdminResourcesClient() {
    const [resources, setResources] = useState<SharedResource[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<ResourceItemStatus>(ResourceItemStatus.PENDING_REVIEW);
    
    // Pagination
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Editing state
    const [editingResource, setEditingResource] = useState<SharedResource | null>(null);
    const [editForm, setEditForm] = useState({
        title: '',
        company: '',
        skills: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    const loadResources = async () => {
        setIsLoading(true);
        try {
            const response = await adminApi.adminResourcesApi.getResources({
                status: activeTab,
                page,
                limit: 20
            });
            setResources(response.resources || []);
            setTotalPages(response.pagination?.pages || 1);
        } catch (error) {
            console.error('Failed to load resources:', error);
            toast.error('Failed to load resources');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadResources();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, page]);

    const handleApprove = async (id: string) => {
        try {
            await adminApi.adminResourcesApi.updateResource(id, { status: ResourceItemStatus.APPROVED });
            toast.success('Resource approved');
            loadResources();
        } catch (error) {
            console.error(error);
            toast.error('Failed to approve resource');
        }
    };

    const handleReject = async (id: string) => {
        if (!window.confirm('Are you sure you want to permanently delete this resource?')) return;
        
        try {
            await adminApi.adminResourcesApi.deleteResource(id);
            toast.success('Resource deleted');
            loadResources();
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete resource');
        }
    };

    const handleEditClick = (resource: SharedResource) => {
        setEditingResource(resource);
        setEditForm({
            title: resource.title || '',
            company: resource.company || '',
            skills: resource.skills?.join(', ') || ''
        });
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingResource) return;

        setIsSaving(true);
        try {
            const skillsArray = editForm.skills.split(',').map(s => s.trim()).filter(Boolean);
            
            await adminApi.adminResourcesApi.updateResource(editingResource.id, {
                title: editForm.title,
                company: editForm.company,
                skills: skillsArray
            });
            
            toast.success('Resource updated successfully');
            setEditingResource(null);
            loadResources();
        } catch (error) {
            console.error(error);
            toast.error('Failed to update resource');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex border-b border-border">
                <button
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                        activeTab === ResourceItemStatus.PENDING_REVIEW 
                            ? 'bg-primary/10 text-primary border-b-2 border-primary' 
                            : 'text-muted-foreground hover:bg-muted/50'
                    }`}
                    onClick={() => { setActiveTab(ResourceItemStatus.PENDING_REVIEW); setPage(1); }}
                >
                    Pending Review
                </button>
                <button
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                        activeTab === ResourceItemStatus.APPROVED 
                            ? 'bg-primary/10 text-primary border-b-2 border-primary' 
                            : 'text-muted-foreground hover:bg-muted/50'
                    }`}
                    onClick={() => { setActiveTab(ResourceItemStatus.APPROVED); setPage(1); }}
                >
                    Approved
                </button>
            </div>

            <div className="relative min-h-[300px]">
                {isLoading && (
                    <div className="absolute inset-0 z-10 bg-background/50 flex items-center justify-center backdrop-blur-[2px]">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin shadow-lg" />
                    </div>
                )}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
                            <tr>
                                <th className="px-6 py-4 font-medium">Title & Link</th>
                                <th className="px-6 py-4 font-medium">Company / Tags</th>
                                <th className="px-6 py-4 font-medium">Type</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {resources.length === 0 && !isLoading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-16 text-center text-muted-foreground">
                                        No resources found in this category.
                                    </td>
                                </tr>
                            ) : (
                                resources.map((resource) => (
                                    <tr key={resource.id} className="hover:bg-muted/20 transition-colors">
                                        <td className="px-6 py-4 max-w-[300px]">
                                            <p className="font-semibold text-foreground truncate" title={resource.title}>
                                                {resource.title}
                                            </p>
                                            <a 
                                                href={resource.url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                                            >
                                                <span className="truncate max-w-[200px]">{resource.url}</span>
                                                <ArrowTopRightOnSquareIcon className="w-3 h-3 shrink-0" />
                                            </a>
                                            <p className="text-[10px] text-muted-foreground mt-1">
                                                Added: {new Date(resource.createdAt).toLocaleDateString()}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-foreground">{resource.company || '-'}</div>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {resource.skills?.slice(0, 3).map((skill, i) => (
                                                    <span key={i} className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium text-muted-foreground">
                                                        {skill}
                                                    </span>
                                                ))}
                                                {resource.skills?.length > 3 && (
                                                    <span className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-medium text-muted-foreground">
                                                        +{resource.skills.length - 3}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-[10px] font-bold uppercase tracking-wider">
                                                {resource.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => handleEditClick(resource)}
                                                    className="p-1.5 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 rounded-md transition-colors"
                                                    title="Edit"
                                                >
                                                    <PencilSquareIcon className="w-5 h-5" />
                                                </button>
                                                {activeTab === ResourceItemStatus.PENDING_REVIEW && (
                                                    <button 
                                                        onClick={() => handleApprove(resource.id)}
                                                        className="p-1.5 text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 rounded-md transition-colors"
                                                        title="Approve"
                                                    >
                                                        <CheckCircleIcon className="w-5 h-5" />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => handleReject(resource.id)}
                                                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                                    title="Delete"
                                                >
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/10">
                    <button 
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-3 py-1 text-sm font-medium rounded-md bg-card border border-border disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                    </span>
                    <button 
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="px-3 py-1 text-sm font-medium rounded-md bg-card border border-border disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            )}

            {/* Edit Modal */}
            {editingResource && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-card w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-border">
                            <h3 className="font-semibold text-lg">Edit Resource</h3>
                            <button 
                                onClick={() => setEditingResource(null)}
                                className="p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted"
                            >
                                <XCircleIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="p-4 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">URL</label>
                                <input 
                                    type="text" 
                                    disabled 
                                    value={editingResource.url} 
                                    className="w-full px-3 py-2 bg-muted/50 border border-border rounded-lg text-sm text-muted-foreground"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Title</label>
                                <input 
                                    type="text" 
                                    value={editForm.title} 
                                    onChange={(e) => setEditForm(f => ({...f, title: e.target.value}))}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Company (Optional)</label>
                                <input 
                                    type="text" 
                                    value={editForm.company} 
                                    onChange={(e) => setEditForm(f => ({...f, company: e.target.value}))}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-muted-foreground mb-1">Skills (Comma separated)</label>
                                <input 
                                    type="text" 
                                    value={editForm.skills} 
                                    onChange={(e) => setEditForm(f => ({...f, skills: e.target.value}))}
                                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>

                            
                            <div className="pt-4 flex items-center justify-end gap-3">
                                <button 
                                    type="button" 
                                    onClick={() => setEditingResource(null)}
                                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={isSaving}
                                    className="px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
                                >
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
