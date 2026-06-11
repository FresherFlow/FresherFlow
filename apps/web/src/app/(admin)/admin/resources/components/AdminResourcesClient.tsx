'use client';

import { useState, useEffect, useRef } from 'react';
import { adminApi } from '@/lib/api/admin';
import { SharedResource, ResourceItemStatus } from '@fresherflow/types';
import { 
    CheckCircleIcon, 
    XCircleIcon, 
    PencilSquareIcon,
    TrashIcon,
    PlusIcon,
    ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';

import { toast } from 'react-hot-toast';

function AutocompleteInput({ 
    label, 
    value, 
    onChange, 
    options, 
    placeholder, 
    isMulti = false 
}: { 
    label: string, 
    value: string, 
    onChange: (val: string) => void, 
    options: string[], 
    placeholder?: string,
    isMulti?: boolean
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const [activeIndex, setActiveIndex] = useState(-1);
    const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
    const wrapperRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedItems = isMulti ? value.split(',').map(s => s.trim()).filter(Boolean) : [value].filter(Boolean);
    const currentSearchTerm = isMulti ? search : value;

    useEffect(() => {
        if (isOpen && wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            if (spaceBelow < 250) {
                setDropdownPosition('top');
            } else {
                setDropdownPosition('bottom');
            }
        }
    }, [isOpen, search, selectedItems.length]);

    const filteredOptions = options.filter(opt => 
        opt.toLowerCase().includes(currentSearchTerm.toLowerCase()) && 
        !selectedItems.includes(opt)
    ).slice(0, 10);

    useEffect(() => {
        setActiveIndex(-1);
    }, [currentSearchTerm, options]);

    useEffect(() => {
        if (activeIndex >= 0 && listRef.current) {
            const el = listRef.current.children[activeIndex] as HTMLElement;
            if (el) {
                el.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [activeIndex]);

    const handleSelect = (opt: string) => {
        if (isMulti) {
            const newItems = [...selectedItems, opt];
            onChange(newItems.join(', '));
            setSearch('');
            setActiveIndex(-1);
            // Keep it open for multiple selection
        } else {
            onChange(opt);
            setIsOpen(false);
            setActiveIndex(-1);
        }
    };

    const handleRemove = (item: string) => {
        if (!isMulti) return;
        const newItems = selectedItems.filter(i => i !== item);
        onChange(newItems.join(', '));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown') setIsOpen(true);
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
                handleSelect(filteredOptions[activeIndex]);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
            
            {isMulti && selectedItems.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2 max-h-24 overflow-y-auto">
                    {selectedItems.map(item => (
                        <span key={item} className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs font-medium">
                            {item}
                            <button type="button" onClick={() => handleRemove(item)} className="hover:text-primary/70">
                                <XCircleIcon className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            <input 
                type="text" 
                value={isMulti ? search : value} 
                onChange={(e) => {
                    if (isMulti) setSearch(e.target.value);
                    else onChange(e.target.value);
                    setIsOpen(true);
                }}
                onFocus={(e) => {
                    setIsOpen(true);
                    // On mobile, scroll the input into view so the dropdown is visible
                    setTimeout(() => {
                        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 300);
                }}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />

            {isOpen && currentSearchTerm && filteredOptions.length > 0 && (
                <ul ref={listRef} className={`absolute z-[9999] w-full max-h-48 overflow-y-auto bg-card border border-border rounded-lg shadow-lg ${
                    dropdownPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
                }`}>
                    {filteredOptions.map((opt, i) => (
                        <li 
                            key={i} 
                            onClick={() => handleSelect(opt)}
                            className={`px-3 py-2 text-sm cursor-pointer ${
                                i === activeIndex ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                            }`}
                        >
                            {opt}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

interface AdminResourcesClientProps {
    initialSkills?: string[];
    initialCompanies?: string[];
}

export default function AdminResourcesClient({ initialSkills = [], initialCompanies = [] }: AdminResourcesClientProps) {
    const [resources, setResources] = useState<SharedResource[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<ResourceItemStatus>(ResourceItemStatus.PENDING_REVIEW);
    
    const [availableSkills, setAvailableSkills] = useState<string[]>(initialSkills);
    const [availableCompanies, setAvailableCompanies] = useState<string[]>(initialCompanies);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [editingResource, setEditingResource] = useState<SharedResource | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
    const [formState, setFormState] = useState({
        title: '',
        url: '',
        type: 'LINK',
        company: '',
        skills: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [resourceToDelete, setResourceToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Dependencies from props, no need to fetch here
    useEffect(() => {
        if (initialSkills.length > 0) setAvailableSkills(initialSkills.sort());
        if (initialCompanies.length > 0) setAvailableCompanies(initialCompanies.sort());
    }, [initialSkills, initialCompanies]);

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

    const handleReject = (id: string) => {
        setResourceToDelete(id);
    };

    const confirmDelete = async () => {
        if (!resourceToDelete) return;
        setIsDeleting(true);
        try {
            await adminApi.adminResourcesApi.deleteResource(resourceToDelete);
            toast.success('Resource deleted');
            loadResources();
            setResourceToDelete(null);
        } catch (error) {
            console.error(error);
            toast.error('Failed to delete resource');
        } finally {
            setIsDeleting(false);
        }
    };

    const openEditModal = (resource: SharedResource) => {
        setEditingResource(resource);
        setFormState({
            title: resource.title || '',
            url: resource.url || '',
            type: resource.type || 'LINK',
            company: resource.company || '',
            skills: resource.skills?.join(', ') || ''
        });
        setIsCreateModalOpen(false);
    };

    const openCreateModal = () => {
        setEditingResource(null);
        setFormState({
            title: '',
            url: '',
            type: 'LINK',
            company: '',
            skills: ''
        });
        setIsCreateModalOpen(true);
    };

    const handleModalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const skillsArray = formState.skills.split(',').map(s => s.trim()).filter(Boolean);
            
            if (isCreateModalOpen) {
                await adminApi.adminResourcesApi.createResource({
                    title: formState.title,
                    url: formState.url,
                    type: formState.type,
                    company: formState.company || null,
                    skills: skillsArray,
                });
                toast.success('Resource created successfully');
            } else if (editingResource) {
                await adminApi.adminResourcesApi.updateResource(editingResource.id, {
                    title: formState.title,
                    company: formState.company || null,
                    skills: skillsArray
                });
                toast.success('Resource updated successfully');
            }
            
            setIsCreateModalOpen(false);
            setEditingResource(null);
            loadResources();
        } catch (error: any) {
            console.error(error);
            toast.error(error?.message || 'Failed to save resource');
        } finally {
            setIsSaving(false);
        }
    };

    const closeModal = () => {
        setIsCreateModalOpen(false);
        setEditingResource(null);
    };

    if (isCreateModalOpen || editingResource) {
        return (
            <div className="bg-card rounded-xl border border-border p-4 sm:p-6 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
                    <h2 className="text-xl font-bold">
                        {isCreateModalOpen ? 'Create New Resource' : 'Edit Resource'}
                    </h2>
                    <button 
                        onClick={closeModal}
                        className="p-2 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
                        aria-label="Close"
                    >
                        <XCircleIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <form onSubmit={handleModalSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                        <div className="space-y-5">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Basic Details</h3>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">URL</label>
                                <input 
                                    type="url" 
                                    required
                                    disabled={!!editingResource} 
                                    value={formState.url} 
                                    onChange={(e) => setFormState(f => ({...f, url: e.target.value}))}
                                    className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                                    placeholder="https://..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Title</label>
                                <input 
                                    type="text" 
                                    required
                                    value={formState.title} 
                                    onChange={(e) => setFormState(f => ({...f, title: e.target.value}))}
                                    className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    placeholder="e.g. Complete Java Roadmap 2024"
                                />
                            </div>
                            
                            {isCreateModalOpen && (
                                <div>
                                    <label className="block text-sm font-medium mb-1.5">Resource Type</label>
                                    <select 
                                        value={formState.type} 
                                        onChange={(e) => setFormState(f => ({...f, type: e.target.value}))}
                                        className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                    >
                                        <option value="LINK">Link</option>
                                        <option value="YOUTUBE">YouTube</option>
                                        <option value="GOOGLE_DRIVE">Google Drive</option>
                                        <option value="WEBSITE">Website</option>
                                        <option value="ROADMAP">Roadmap</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="space-y-5">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Tagging & Metadata</h3>
                            <div className="relative z-20">
                                <AutocompleteInput
                                    label="Company (Optional)"
                                    value={formState.company}
                                    onChange={(val) => setFormState(f => ({...f, company: val}))}
                                    options={availableCompanies}
                                    placeholder="Start typing company name..."
                                />
                            </div>
                            <div className="relative z-10">
                                <AutocompleteInput
                                    label="Skills"
                                    value={formState.skills}
                                    onChange={(val) => setFormState(f => ({...f, skills: val}))}
                                    options={availableSkills}
                                    placeholder="Start typing skill..."
                                    isMulti={true}
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div className="pt-6 mt-8 border-t border-border flex flex-col-reverse sm:flex-row items-center justify-end gap-3 sm:gap-4">
                        <button 
                            type="button" 
                            onClick={closeModal}
                            className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-muted-foreground bg-muted/50 hover:bg-muted rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSaving}
                            className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors shadow-sm"
                        >
                            {isSaving ? 'Saving...' : 'Save Resource'}
                        </button>
                    </div>
                </form>
            </div>
        );
    }

    return (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex flex-col sm:flex-row border-b border-border sm:items-center justify-between p-4 sm:p-0 sm:pr-4 gap-4 sm:gap-0">
                <div className="flex w-full sm:w-auto overflow-x-auto">
                    <button
                        className={`whitespace-nowrap px-6 py-3 text-sm font-medium transition-colors ${
                            activeTab === ResourceItemStatus.PENDING_REVIEW 
                                ? 'bg-primary/10 text-primary border-b-2 border-primary' 
                                : 'text-muted-foreground hover:bg-muted/50'
                        }`}
                        onClick={() => { setActiveTab(ResourceItemStatus.PENDING_REVIEW); setPage(1); }}
                    >
                        Pending Review
                    </button>
                    <button
                        className={`whitespace-nowrap px-6 py-3 text-sm font-medium transition-colors ${
                            activeTab === ResourceItemStatus.APPROVED 
                                ? 'bg-primary/10 text-primary border-b-2 border-primary' 
                                : 'text-muted-foreground hover:bg-muted/50'
                        }`}
                        onClick={() => { setActiveTab(ResourceItemStatus.APPROVED); setPage(1); }}
                    >
                        Approved
                    </button>
                </div>
                <button
                    onClick={openCreateModal}
                    className="hidden sm:flex flex-shrink-0 items-center justify-center gap-1 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors w-auto"
                >
                    <PlusIcon className="w-4 h-4" />
                    Create Resource
                </button>
            </div>

            <div className="relative min-h-[300px]">
                {isLoading && (
                    <div className="absolute inset-0 z-10 bg-background/50 flex items-center justify-center backdrop-blur-[2px]">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin shadow-lg" />
                    </div>
                )}
                {resources.length === 0 && !isLoading ? (
                    <div className="p-8 text-center text-muted-foreground">
                        No resources found in this category.
                    </div>
                ) : (
                    <>
                        {/* Mobile Card Layout */}
                        <div className="block md:hidden space-y-4 p-4">
                            {resources.map((resource) => (
                                <div key={resource.id} className="bg-card border border-border rounded-xl p-4 space-y-3 shadow-sm">
                                    <div>
                                        <p className="font-semibold text-foreground line-clamp-2" title={resource.title}>
                                            {resource.title}
                                        </p>
                                        <a 
                                            href={resource.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="text-xs text-primary hover:underline flex items-center gap-1 mt-1.5"
                                        >
                                            <span className="truncate max-w-[240px]">{resource.url}</span>
                                            <ArrowTopRightOnSquareIcon className="w-3 h-3 shrink-0" />
                                        </a>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-[10px] font-bold uppercase tracking-wider">
                                            {resource.type}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                            {new Date(resource.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>

                                    {(resource.company || (resource.skills && resource.skills.length > 0)) && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {resource.company && (
                                                <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[10px] font-medium border border-primary/20">
                                                    {resource.company}
                                                </span>
                                            )}
                                            {resource.skills?.map((skill, i) => (
                                                <span key={i} className="px-2 py-0.5 bg-muted rounded text-[10px] font-medium text-muted-foreground border border-border">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/50 mt-3">
                                        <button 
                                            onClick={() => openEditModal(resource)}
                                            className="p-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 rounded-md transition-colors"
                                            title="Edit"
                                        >
                                            <PencilSquareIcon className="w-5 h-5" />
                                        </button>
                                        {activeTab === ResourceItemStatus.PENDING_REVIEW && (
                                            <button 
                                                onClick={() => handleApprove(resource.id)}
                                                className="p-2 text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 rounded-md transition-colors"
                                                title="Approve"
                                            >
                                                <CheckCircleIcon className="w-5 h-5" />
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleReject(resource.id)}
                                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                            title="Delete"
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table Layout */}
                        <div className="hidden md:block overflow-x-auto">
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
                                    {resources.map((resource) => (
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
                                                        onClick={() => openEditModal(resource)}
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
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

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



            {/* Mobile FAB for Create Resource */}
            <button
                onClick={openCreateModal}
                className="fixed bottom-20 right-4 z-40 sm:hidden flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-95 transition-all outline-none"
                aria-label="Create Resource"
            >
                <PlusIcon className="w-6 h-6" />
            </button>
            {/* Delete Confirmation Modal */}
            {resourceToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-md rounded-2xl border border-border shadow-2xl p-6">
                        <h3 className="text-lg font-bold text-foreground">Delete Resource</h3>
                        <p className="text-sm text-muted-foreground mt-2">
                            Are you sure you want to permanently delete this resource? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-border">
                            <button 
                                type="button"
                                onClick={() => setResourceToDelete(null)}
                                className="px-4 py-2 text-sm font-semibold rounded-xl border border-border hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="button"
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="px-4 py-2 text-sm font-semibold rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
