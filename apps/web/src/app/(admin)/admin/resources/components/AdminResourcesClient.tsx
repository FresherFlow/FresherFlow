'use client';

import { useState, useEffect, useRef } from 'react';
import { adminApi } from '@/lib/api/admin';
import { SharedResource, ResourceItemStatus, ResourceItemType } from '@fresherflow/types';
import { 
    CheckCircleIcon, 
    XCircleIcon, 
    PencilSquareIcon,
    TrashIcon,
    PlusIcon,
    ArrowTopRightOnSquareIcon,
    DocumentTextIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { SmartInput } from '@/features/admin/ui/SmartInput';
import { SmartTextarea } from '@/features/admin/ui/SmartTextarea';
import { SmartSelect } from '@/features/admin/ui/SmartSelect';

const inputClasses = `
    flex w-full px-2.5 py-1.5 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50
    placeholder:text-muted-foreground/50 border border-solid border-input bg-background text-foreground
    focus:border-primary focus:bg-background focus:ring-0 transition-colors duration-200 rounded-md
`;

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
            if (spaceBelow < 200) {
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

    const isFilled = isMulti ? search.length > 0 || selectedItems.length > 0 : !!value;

    return (
        <div className="flex flex-col gap-1.5" ref={wrapperRef}>
            <label className="text-sm font-medium text-muted-foreground/80 flex items-center gap-1.5">
                {label}
            </label>
            
            {isMulti && selectedItems.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1">
                    {selectedItems.map(item => (
                        <span key={item} className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted border border-border text-foreground rounded text-xs font-medium">
                            {item}
                            <button type="button" onClick={() => handleRemove(item)} className="text-muted-foreground hover:text-destructive">
                                <XCircleIcon className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            <div className="relative">
                <input 
                    type="text" 
                    value={isMulti ? search : value} 
                    data-filled={isFilled}
                    onChange={(e) => {
                        if (isMulti) setSearch(e.target.value);
                        else onChange(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    className={inputClasses}
                />

                {isOpen && currentSearchTerm && filteredOptions.length > 0 && (
                    <ul ref={listRef} className={`absolute z-[99] w-full max-h-40 overflow-y-auto bg-card border border-border rounded-md shadow-lg ${
                        dropdownPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
                    }`}>
                        {filteredOptions.map((opt, i) => (
                            <li 
                                key={i} 
                                onClick={() => handleSelect(opt)}
                                className={`px-3 py-1.5 text-sm cursor-pointer ${
                                    i === activeIndex ? 'bg-primary/10 text-primary font-medium' : 'text-foreground hover:bg-muted'
                                }`}
                            >
                                {opt}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
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
        description: '',
        company: '',
        skills: '',
        status: ResourceItemStatus.PENDING_REVIEW,
        items: [] as { id?: string; title: string; type: string; url: string }[]
    });
    const [isSaving, setIsSaving] = useState(false);
    const [resourceToDelete, setResourceToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [uiMode, setUiMode] = useState<'SINGLE' | 'COLLECTION'>('SINGLE');

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
                limit: 50 // Increased limit for denser table
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
        setUiMode(resource.items && resource.items.length === 1 ? 'SINGLE' : 'COLLECTION');
        setFormState({
            title: resource.title || '',
            description: resource.description || '',
            company: resource.company || '',
            skills: resource.skills?.join(', ') || '',
            status: resource.status,
            items: resource.items?.map(item => ({
                id: item.id,
                title: item.title,
                type: item.type,
                url: item.url
            })) || []
        });
        setIsCreateModalOpen(true);
    };

    const openCreateModal = () => {
        setEditingResource(null);
        setUiMode('SINGLE');
        setFormState({
            title: '',
            description: '',
            company: '',
            skills: '',
            status: ResourceItemStatus.APPROVED,
            items: [{ title: '', type: 'LINK', url: '' }]
        });
        setIsCreateModalOpen(true);
    };

    const handleModalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const skillsArray = formState.skills.split(',').map(s => s.trim()).filter(Boolean);
            let itemsToSubmit = formState.items;
            
            if (uiMode === 'SINGLE') {
                if (formState.items.length === 0) {
                    toast.error('URL is required');
                    setIsSaving(false);
                    return;
                }
                const item = formState.items[0];
                if (!formState.title.trim() || !item.url.trim()) {
                    toast.error('Title and URL are required');
                    setIsSaving(false);
                    return;
                }
                itemsToSubmit = [{
                    id: item.id,
                    title: formState.title.trim(),
                    type: item.type as any,
                    url: item.url.trim()
                }];
            } else {
                if (formState.items.length === 0) {
                    toast.error('At least one item is required in the collection');
                    setIsSaving(false);
                    return;
                }
                for (const item of formState.items) {
                    if (!item.title.trim() || !item.url.trim()) {
                        toast.error('All items must have a title and a valid URL');
                        setIsSaving(false);
                        return;
                    }
                }
                itemsToSubmit = formState.items.map(item => ({
                    id: item.id,
                    title: item.title.trim(),
                    type: item.type as any,
                    url: item.url.trim()
                }));
            }

            if (isCreateModalOpen && !editingResource) {
                await adminApi.adminResourcesApi.createResource({
                    title: formState.title,
                    description: formState.description || null,
                    company: formState.company || null,
                    skills: skillsArray,
                    status: formState.status,
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    items: itemsToSubmit.map(({ id, ...rest }) => rest)
                });
                toast.success('Resource created successfully');
            } else if (editingResource) {
                await adminApi.adminResourcesApi.updateResource(editingResource.id, {
                    title: formState.title,
                    description: formState.description || null,
                    company: formState.company || null,
                    skills: skillsArray,
                    status: formState.status,
                    items: itemsToSubmit
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

    const handleUrlChange = (url: string, index: number) => {
        const lowerUrl = url.toLowerCase();
        let detectedType = 'LINK';
        if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) detectedType = 'YOUTUBE';
        else if (lowerUrl.endsWith('.pdf')) detectedType = 'PDF';
        else if (lowerUrl.includes('roadmap.sh')) detectedType = 'ROADMAP';
        else if (
            lowerUrl.includes('drive.google.com') || lowerUrl.includes('dropbox.com') ||
            lowerUrl.includes('onedrive') || lowerUrl.includes('box.com') || lowerUrl.includes('sharepoint')
        ) detectedType = 'FILE';

        setFormState(f => {
            const items = [...f.items];
            if (items.length === 0) items.push({ title: f.title, type: detectedType, url });
            else items[index] = { ...items[index], url, type: detectedType };
            return { ...f, items };
        });
    };

    const formPanelContent = (isCreateModalOpen || editingResource) ? (
        <div className="bg-card border border-border rounded-xl p-5 md:p-6 shadow-sm mb-6 animate-in slide-in-from-top duration-300">
            <div className="flex items-center justify-between mb-5 border-b border-border pb-3">
                <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <PencilSquareIcon className="w-5 h-5 text-muted-foreground" />
                    {editingResource ? 'Edit Resource' : 'Create Resource'}
                </h2>
                <div className="flex items-center gap-4">
                    <div className="flex bg-muted p-1 rounded-md">
                        <button
                            type="button"
                            onClick={() => {
                                setUiMode('SINGLE');
                                if (formState.items.length === 0) setFormState(f => ({ ...f, items: [{ title: '', type: 'LINK', url: '' }] }));
                            }}
                            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${uiMode === 'SINGLE' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Single Link
                        </button>
                        <button
                            type="button"
                            onClick={() => setUiMode('COLLECTION')}
                            className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${uiMode === 'COLLECTION' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            Collection
                        </button>
                    </div>
                    <button onClick={closeModal} className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <XCircleIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
            
            <form onSubmit={handleModalSubmit} className="space-y-5">
                {uiMode === 'SINGLE' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="md:col-span-2">
                            <SmartInput 
                                label="Resource Title"
                                type="text" 
                                required
                                value={formState.title} 
                                onChange={(e) => setFormState(f => ({...f, title: e.target.value}))}
                                placeholder="e.g. Complete Java Roadmap"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <SmartInput 
                                label="Target URL"
                                type="url" 
                                required
                                value={formState.items[0]?.url || ''} 
                                onChange={(e) => handleUrlChange(e.target.value, 0)}
                                placeholder="https://..."
                            />
                        </div>
                        <div>
                            <SmartSelect
                                label="Resource Type"
                                required
                                value={formState.items[0]?.type || 'LINK'}
                                onChange={(val) => {
                                    setFormState(f => {
                                        const items = [...f.items];
                                        if (items.length > 0) items[0] = { ...items[0], type: val };
                                        return { ...f, items };
                                    });
                                }}
                                options={[
                                    { value: ResourceItemType.LINK, label: 'LINK' },
                                    { value: ResourceItemType.YOUTUBE, label: 'YOUTUBE' },
                                    { value: ResourceItemType.PDF, label: 'PDF' },
                                    { value: ResourceItemType.ROADMAP, label: 'ROADMAP' },
                                    { value: ResourceItemType.FILE, label: 'FILE' },
                                    { value: ResourceItemType.WEBSITE, label: 'WEBSITE' },
                                ]}
                            />
                        </div>
                        <AutocompleteInput
                            label="Company"
                            value={formState.company}
                            onChange={(val) => setFormState(f => ({...f, company: val}))}
                            options={availableCompanies}
                            placeholder="Optional..."
                        />
                        <div>
                            <SmartSelect
                                label="Status"
                                required
                                value={formState.status}
                                onChange={(val) => setFormState(f => ({...f, status: val as ResourceItemStatus}))}
                                options={[
                                    { value: ResourceItemStatus.PENDING_REVIEW, label: 'Pending Review' },
                                    { value: ResourceItemStatus.APPROVED, label: 'Approved' },
                                ]}
                            />
                        </div>
                        <AutocompleteInput
                            label="Skills"
                            value={formState.skills}
                            onChange={(val) => setFormState(f => ({...f, skills: val}))}
                            options={availableSkills}
                            placeholder="Optional..."
                            isMulti={true}
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        <div className="lg:col-span-2 space-y-4">
                            <h3 className="text-sm font-semibold border-b border-border pb-2 text-foreground">Collection Details</h3>
                            <SmartInput 
                                label="Title"
                                type="text" 
                                required
                                value={formState.title} 
                                onChange={(e) => setFormState(f => ({...f, title: e.target.value}))}
                                placeholder="e.g. Front-end Dev Package"
                            />
                            <SmartTextarea 
                                label="Description"
                                value={formState.description} 
                                onChange={(e) => setFormState(f => ({...f, description: e.target.value}))}
                                placeholder="e.g. Essential resources, books, and links."
                                rows={3}
                            />
                            <div className="grid grid-cols-2 gap-3">
                                <SmartSelect
                                    label="Status"
                                    required
                                    value={formState.status}
                                    onChange={(val) => setFormState(f => ({...f, status: val as ResourceItemStatus}))}
                                    options={[
                                        { value: ResourceItemStatus.PENDING_REVIEW, label: 'Pending' },
                                        { value: ResourceItemStatus.APPROVED, label: 'Approved' },
                                    ]}
                                />
                                <AutocompleteInput
                                    label="Company"
                                    value={formState.company}
                                    onChange={(val) => setFormState(f => ({...f, company: val}))}
                                    options={availableCompanies}
                                    placeholder="Optional..."
                                />
                            </div>
                            <AutocompleteInput
                                label="Skills"
                                value={formState.skills}
                                onChange={(val) => setFormState(f => ({...f, skills: val}))}
                                options={availableSkills}
                                placeholder="Optional..."
                                isMulti={true}
                            />
                        </div>

                        <div className="lg:col-span-3 space-y-3">
                            <div className="flex items-center justify-between border-b border-border pb-2">
                                <h3 className="text-sm font-semibold text-foreground">Curated Items</h3>
                                <button
                                    type="button"
                                    onClick={() => setFormState(f => ({
                                        ...f,
                                        items: [...f.items, { title: '', type: 'LINK', url: '' }]
                                    }))}
                                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 bg-primary/10 px-2.5 py-1 rounded-md"
                                >
                                    <PlusIcon className="w-3 h-3 font-bold" /> Add Item
                                </button>
                            </div>
                            <div className="space-y-3 pr-1">
                                {formState.items.map((item, index) => (
                                    <div key={index} className="relative p-4 bg-muted/15 border border-border rounded-lg flex flex-col gap-3">
                                        {formState.items.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => setFormState(f => ({
                                                    ...f,
                                                    items: f.items.filter((_, idx) => idx !== index)
                                                }))}
                                                className="absolute top-2 right-2 p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        )}
                                        <div className="grid grid-cols-3 gap-3 pr-6">
                                            <div className="col-span-2">
                                                <SmartInput 
                                                    label="Item Title"
                                                    type="text" 
                                                    required
                                                    value={item.title} 
                                                    onChange={(e) => {
                                                        const newItems = [...formState.items];
                                                        newItems[index] = { ...newItems[index], title: e.target.value };
                                                        setFormState(f => ({ ...f, items: newItems }));
                                                    }}
                                                    placeholder="e.g. Official Documentation"
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <SmartSelect
                                                    label="Type"
                                                    required
                                                    value={item.type}
                                                    onChange={(val) => {
                                                        const newItems = [...formState.items];
                                                        newItems[index] = { ...newItems[index], type: val };
                                                        setFormState(f => ({ ...f, items: newItems }));
                                                    }}
                                                    options={[
                                                        { value: ResourceItemType.LINK, label: 'LINK' },
                                                        { value: ResourceItemType.YOUTUBE, label: 'YOUTUBE' },
                                                        { value: ResourceItemType.PDF, label: 'PDF' },
                                                        { value: ResourceItemType.ROADMAP, label: 'ROADMAP' },
                                                        { value: ResourceItemType.FILE, label: 'FILE' },
                                                        { value: ResourceItemType.WEBSITE, label: 'WEBSITE' },
                                                    ]}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <SmartInput 
                                                label="URL"
                                                type="url" 
                                                required
                                                value={item.url} 
                                                onChange={(e) => handleUrlChange(e.target.value, index)}
                                                placeholder="https://..."
                                            />
                                        </div>
                                    </div>
                                ))}
                                {formState.items.length === 0 && (
                                    <div className="p-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg bg-muted/5">
                                        No items added yet. Click &quot;Add Item&quot; to start.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                
                <div className="pt-4 border-t border-border flex justify-end gap-3 mt-2">
                    <button 
                        type="button" 
                        onClick={closeModal}
                        className="px-4 py-1.5 text-sm font-semibold border border-border rounded-md hover:bg-muted transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        type="submit" 
                        disabled={isSaving}
                        className="px-6 py-1.5 text-sm font-bold bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                        {isSaving ? 'Saving...' : 'Save Resource'}
                    </button>
                </div>
            </form>
        </div>
    ) : null;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between bg-card border border-border p-2 rounded-lg shadow-sm">
                <div className="flex bg-muted p-1 rounded-md">
                    <button
                        className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${
                            activeTab === ResourceItemStatus.PENDING_REVIEW 
                                ? 'bg-background shadow-sm text-foreground' 
                                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                        }`}
                        onClick={() => { setActiveTab(ResourceItemStatus.PENDING_REVIEW); setPage(1); }}
                    >
                        Pending Review
                    </button>
                    <button
                        className={`px-4 py-1.5 text-sm font-medium rounded transition-colors ${
                            activeTab === ResourceItemStatus.APPROVED 
                                ? 'bg-background shadow-sm text-foreground' 
                                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                        }`}
                        onClick={() => { setActiveTab(ResourceItemStatus.APPROVED); setPage(1); }}
                    >
                        Approved
                    </button>
                </div>
                <button
                    onClick={openCreateModal}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 shadow-sm transition-colors"
                >
                    <PlusIcon className="w-4 h-4" />
                    Create Resource
                </button>
            </div>

            {formPanelContent}

            <div className="border border-border rounded-lg bg-card shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="p-10 text-center text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                        Loading resources...
                    </div>
                ) : resources.length === 0 ? (
                    <div className="p-10 text-center flex flex-col items-center">
                        <DocumentTextIcon className="w-8 h-8 text-muted-foreground/30 mb-2" />
                        <h3 className="text-sm font-medium text-foreground">No resources found</h3>
                        <p className="text-xs text-muted-foreground mt-1">There are no {activeTab.toLowerCase().replace('_', ' ')} resources to display.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="text-xs text-muted-foreground bg-muted/50 border-b border-border uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3 font-semibold">Title & Items</th>
                                    <th className="px-4 py-3 font-semibold">Type</th>
                                    <th className="px-4 py-3 font-semibold">Metadata</th>
                                    <th className="px-4 py-3 font-semibold">Date</th>
                                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {resources.map((resource) => (
                                    <tr key={resource.id} className="hover:bg-muted/20 transition-colors">
                                        <td className="px-4 py-3 align-top max-w-[300px] whitespace-normal">
                                            <div className="font-medium text-foreground text-sm leading-tight mb-1">{resource.title}</div>
                                            {resource.description && (
                                                <div className="text-xs text-muted-foreground line-clamp-1 mb-2">{resource.description}</div>
                                            )}
                                            {resource.items && resource.items.length > 0 && (
                                                <div className="space-y-1">
                                                    {resource.items.slice(0, 2).map((item) => (
                                                        <a href={item.url} target="_blank" rel="noopener noreferrer" key={item.id} className="inline-flex items-center gap-1 text-xs text-primary hover:underline bg-primary/5 px-1.5 py-0.5 rounded mr-1 mb-1 border border-primary/10">
                                                            <DocumentTextIcon className="w-3 h-3" />
                                                            <span className="truncate max-w-[150px]">{item.title}</span>
                                                            <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                                                        </a>
                                                    ))}
                                                    {(resource.items.length > 2) && (
                                                        <span className="inline-flex text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-medium">
                                                            +{resource.items.length - 2} more
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border border-border">
                                                {resource.items?.length === 1 ? 'Single' : 'Collection'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 align-top max-w-[200px] whitespace-normal">
                                            <div className="flex flex-col gap-1.5">
                                                {resource.company && (
                                                    <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{resource.company}</span>
                                                )}
                                                {resource.skills && resource.skills.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {resource.skills.map((skill, i) => (
                                                            <span key={i} className="px-1.5 py-0.5 bg-background shadow-sm border border-border text-[10px] rounded text-foreground font-medium">
                                                                {skill}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-top text-xs text-muted-foreground">
                                            {new Date(resource.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3 align-top text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {activeTab === ResourceItemStatus.PENDING_REVIEW && (
                                                    <button onClick={() => handleApprove(resource.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors" title="Approve">
                                                        <CheckCircleIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button onClick={() => openEditModal(resource)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Edit">
                                                    <PencilSquareIcon className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleReject(resource.id)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-md transition-colors" title="Delete">
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 bg-card border border-border rounded-lg shadow-sm">
                    <span className="text-xs font-medium text-muted-foreground">
                        Showing page {page} of {totalPages}
                    </span>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-3 py-1 text-xs font-medium rounded-md border border-border bg-background hover:bg-muted disabled:opacity-50 disabled:hover:bg-background transition-colors"
                        >
                            Previous
                        </button>
                        <button 
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages}
                            className="px-3 py-1 text-xs font-medium rounded-md border border-border bg-background hover:bg-muted disabled:opacity-50 disabled:hover:bg-background transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            {resourceToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                    <div className="bg-card w-full max-w-sm rounded-xl border border-border shadow-lg p-6 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 mx-auto bg-destructive/10 rounded-full flex items-center justify-center mb-4">
                            <ExclamationTriangleIcon className="w-6 h-6 text-destructive" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">Delete Resource?</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            This action cannot be undone. Are you sure you want to permanently delete this resource?
                        </p>
                        <div className="flex justify-center gap-3">
                            <button 
                                type="button"
                                onClick={() => setResourceToDelete(null)}
                                className="px-4 py-2 text-sm font-medium rounded-md border border-border hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                type="button"
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="px-4 py-2 text-sm font-medium rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
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
