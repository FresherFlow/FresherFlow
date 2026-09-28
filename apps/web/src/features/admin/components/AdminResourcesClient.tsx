'use client';

/**
 * Resource moderation queue for `/admin/resources` and `/moderation/resources`.
 *
 * Layout follows the reworked admin pages (`admin/audit`, `admin/users`,
 * `admin/profile-pages`): the page hands down a bounded height, this component
 * fills it, and the shared `DataGrid` in `variant="bare"` owns the ONE scroll
 * container — toolbar, one `rounded-md border` frame, pagination pinned with
 * `mt-auto`. There is no page-level scroller, no second bordered surface and no
 * bespoke mobile list: the grid scrolls horizontally on narrow screens and pins
 * its first column instead (see `ui/data-grid/sticky`).
 *
 * Everything the page does is unchanged: the same `adminApi.adminResourcesApi`
 * calls, the same two queues (pending review / approved), the same
 * single-link vs collection form, the same approve / edit / delete actions and
 * the same toasts. Only the presentation moved into primitives.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
    ArrowTopRightOnSquareIcon,
    CheckCircleIcon,
    DocumentTextIcon,
    EllipsisHorizontalIcon,
    PencilSquareIcon,
    PlusIcon,
    TrashIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import {
    ResourceItem,
    ResourceItemStatus,
    ResourceItemType,
    ResourceSector,
    SharedResource,
} from '@fresherflow/types';
import { adminApi } from '@/lib/api/admin';
import { getErrorMessage } from '@/lib/utils/error';
import { useDebounce } from '@/hooks/useDebounce';
import { SkillPill } from '@/features/jobs/components/SkillPill';
import { SmartInput } from '@/features/admin/ui/SmartInput';
import { SmartSelect } from '@/features/admin/ui/SmartSelect';
import { SmartTextarea } from '@/features/admin/ui/SmartTextarea';
import { AlertDialog } from '@/ui/AlertDialog';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/ui/Dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/ui/DropdownMenu';
import { EmptyState } from '@/ui/EmptyState';
import { ErrorMessage } from '@/ui/ErrorMessage';
import { Field } from '@/ui/Field';
import { Input } from '@/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/Tabs';
import { cn } from '@/ui/cn';
import { DataGrid, type DataGridColumn } from '@/ui/data-grid/DataGrid';

/** Rows requested per page. The API caps `limit` at 100. */
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = 50;
/** The grid's box filters as you type; the query param waits for a pause. */
const SEARCH_DEBOUNCE_MS = 300;

type UiMode = 'SINGLE' | 'COLLECTION';

interface ResourceFormItem {
    id?: string;
    title: string;
    type: string;
    url: string;
}

interface ResourceFormState {
    title: string;
    description: string;
    company: string;
    skills: string;
    status: ResourceItemStatus;
    sector: ResourceSector;
    items: ResourceFormItem[];
}

const ITEM_TYPE_OPTIONS = [
    { value: ResourceItemType.LINK, label: 'LINK' },
    { value: ResourceItemType.YOUTUBE, label: 'YOUTUBE' },
    { value: ResourceItemType.PDF, label: 'PDF' },
    { value: ResourceItemType.ROADMAP, label: 'ROADMAP' },
    { value: ResourceItemType.FILE, label: 'FILE' },
    { value: ResourceItemType.WEBSITE, label: 'WEBSITE' },
];

const FORM_STATUS_OPTIONS = [
    { value: ResourceItemStatus.PENDING_REVIEW, label: 'Pending review' },
    { value: ResourceItemStatus.APPROVED, label: 'Approved' },
];

const SECTOR_OPTIONS = [
    { value: ResourceSector.PRIVATE, label: 'Private' },
    { value: ResourceSector.GOVERNMENT, label: 'Government' },
];

/** Per-queue copy: tab label, header count wording and the empty state. */
const TAB_META: Record<
    ResourceItemStatus,
    { label: string; emptyTitle: string; emptyBody: string }
> = {
    [ResourceItemStatus.PENDING_REVIEW]: {
        label: 'pending review',
        emptyTitle: 'Nothing waiting for review',
        emptyBody: 'Resources shared by users land here for approval.',
    },
    [ResourceItemStatus.APPROVED]: {
        label: 'approved',
        emptyTitle: 'No approved resources yet',
        emptyBody: 'Resources appear here once a reviewer approves them.',
    },
};

interface AdminResourcesClientProps {
    initialSkills?: string[];
    initialCompanies?: string[];
    /**
     * Page heading block (short `h1` + one line) for the admin route, which owns
     * its own copy in `app/(admin)/admin/resources/page.tsx`.
     *
     * The moderation queue renders its own explanatory paragraph above this
     * component, so it passes nothing and the row (heading + queue count +
     * "Create resource") is skipped there.
     */
    heading?: React.ReactNode;
}

// ─── Tag autocomplete ─────────────────────────────────────────────────────────

/**
 * Searchable single/multi picker over a fixed option list, used for Company and
 * Skills.
 *
 * Built from `Field` + `Input` with the ARIA combobox pattern
 * (`role="combobox"`, `aria-expanded`, `aria-activedescendant`, listbox +
 * options) so the arrow/enter/escape keyboard handling that already existed is
 * now announced. Selected values are removable chips built from `Button`, whose
 * 40px `sm` size is the design system's minimum touch target — a raw 16px
 * `<button>` inside a 20px chip was neither.
 */
function TagAutocomplete({
    label,
    value,
    onChange,
    options,
    placeholder,
    isMulti = false,
}: {
    label: string;
    value: string;
    onChange: (val: string) => void;
    options: string[];
    placeholder?: string;
    isMulti?: boolean;
}) {
    const inputId = useId();
    const listboxId = `${inputId}-listbox`;
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
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedItems = isMulti
        ? value
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
        : [value].filter(Boolean);
    const currentSearchTerm = isMulti ? search : value;

    useEffect(() => {
        if (isOpen && wrapperRef.current) {
            const rect = wrapperRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            setDropdownPosition(spaceBelow < 200 ? 'top' : 'bottom');
        }
    }, [isOpen, search, selectedItems.length]);

    const filteredOptions = options
        .filter(
            (opt) =>
                opt.toLowerCase().includes(currentSearchTerm.toLowerCase()) &&
                !selectedItems.includes(opt)
        )
        .slice(0, 10);

    useEffect(() => {
        setActiveIndex(-1);
    }, [currentSearchTerm, options]);

    useEffect(() => {
        if (activeIndex >= 0 && listRef.current) {
            const el = listRef.current.children[activeIndex] as HTMLElement | undefined;
            el?.scrollIntoView({ block: 'nearest' });
        }
    }, [activeIndex]);

    const handleSelect = (opt: string) => {
        if (isMulti) {
            onChange([...selectedItems, opt].join(', '));
            setSearch('');
            setActiveIndex(-1);
        } else {
            onChange(opt);
            setIsOpen(false);
            setActiveIndex(-1);
        }
    };

    const handleRemove = (item: string) => {
        onChange(selectedItems.filter((i) => i !== item).join(', '));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown') setIsOpen(true);
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex((prev) => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0 && activeIndex < filteredOptions.length) {
                handleSelect(filteredOptions[activeIndex]);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    const showList = isOpen && currentSearchTerm.length > 0 && filteredOptions.length > 0;

    return (
        <div className="flex flex-col gap-1.5" ref={wrapperRef}>
            <Field label={label} htmlFor={inputId}>
                {isMulti && selectedItems.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                        {selectedItems.map((item) => (
                            <Button
                                key={item}
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => handleRemove(item)}
                                aria-label={`Remove ${item}`}
                                title={`Remove ${item}`}
                            >
                                <span className="truncate">{item}</span>
                                <XMarkIcon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            </Button>
                        ))}
                    </div>
                ) : null}

                <div className="relative">
                    <Input
                        id={inputId}
                        type="text"
                        role="combobox"
                        aria-expanded={showList}
                        aria-controls={showList ? listboxId : undefined}
                        aria-autocomplete="list"
                        aria-activedescendant={
                            activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined
                        }
                        autoComplete="off"
                        value={isMulti ? search : value}
                        onChange={(e) => {
                            if (isMulti) setSearch(e.target.value);
                            else onChange(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                    />

                    {showList ? (
                        <ul
                            ref={listRef}
                            id={listboxId}
                            role="listbox"
                            aria-label={label}
                            className={cn(
                                'absolute z-50 max-h-40 w-full overflow-y-auto rounded-md border border-border bg-card shadow-lg',
                                dropdownPosition === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'
                            )}
                        >
                            {filteredOptions.map((opt, i) => (
                                <li
                                    key={opt}
                                    id={`${listboxId}-option-${i}`}
                                    role="option"
                                    aria-selected={i === activeIndex}
                                    // Keep focus in the input so the list does not
                                    // close between mousedown and click.
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => handleSelect(opt)}
                                    className={cn(
                                        'cursor-pointer px-3 py-1.5 text-sm text-foreground hover:bg-muted',
                                        i === activeIndex && 'bg-muted font-medium'
                                    )}
                                >
                                    {opt}
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </div>
            </Field>
        </div>
    );
}

// ─── Create / edit dialog ─────────────────────────────────────────────────────

function seedForm(resource: SharedResource | null): ResourceFormState {
    if (!resource) {
        return {
            title: '',
            description: '',
            company: '',
            skills: '',
            status: ResourceItemStatus.APPROVED,
            sector: ResourceSector.PRIVATE,
            items: [{ title: '', type: 'LINK', url: '' }],
        };
    }
    return {
        title: resource.title || '',
        description: resource.description || '',
        company: resource.company || '',
        skills: resource.skills?.join(', ') || '',
        status: resource.status,
        sector: resource.sector || ResourceSector.PRIVATE,
        items:
            resource.items?.map((item) => ({
                id: item.id,
                title: item.title,
                type: item.type,
                url: item.url,
            })) || [],
    };
}

function modeForResource(resource: SharedResource | null): UiMode {
    return resource && resource.items && resource.items.length === 1 ? 'SINGLE' : 'COLLECTION';
}

type ResourceFormDialogProps = {
    open: boolean;
    resource: SharedResource | null;
    availableSkills: string[];
    availableCompanies: string[];
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
};

/**
 * Create and edit share one dialog: `resource === null` creates, otherwise it
 * edits.
 *
 * The form itself lives in `ResourceForm`, a child of `DialogContent`. Radix
 * only mounts dialog content while the dialog is open, so that child mounts
 * fresh on every open and seeds its state from the resource being edited —
 * which is the whole reason the two are split. Without the split, closing the
 * dialog kept the previous resource's values and the next open showed them.
 */
function ResourceFormDialog({
    open,
    resource,
    availableSkills,
    availableCompanies,
    onOpenChange,
    onSaved,
}: ResourceFormDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-9/10 overflow-y-auto sm:max-w-2xl">
                <ResourceForm
                    resource={resource}
                    availableSkills={availableSkills}
                    availableCompanies={availableCompanies}
                    onOpenChange={onOpenChange}
                    onSaved={onSaved}
                />
            </DialogContent>
        </Dialog>
    );
}

function ResourceForm({
    resource,
    availableSkills,
    availableCompanies,
    onOpenChange,
    onSaved,
}: Omit<ResourceFormDialogProps, 'open'>) {
    const [form, setForm] = useState<ResourceFormState>(() => seedForm(resource));
    const [uiMode, setUiMode] = useState<UiMode>(() =>
        resource ? modeForResource(resource) : 'SINGLE'
    );
    const [isSaving, setIsSaving] = useState(false);

    const setField = <K extends keyof ResourceFormState>(
        key: K,
        value: ResourceFormState[K]
    ) => {
        setForm((f) => ({ ...f, [key]: value }));
    };

    const setItem = (index: number, patch: Partial<ResourceFormItem>) => {
        setForm((f) => {
            const items = [...f.items];
            items[index] = { ...items[index], ...patch };
            return { ...f, items };
        });
    };

    const handleUrlChange = (url: string, index: number) => {
        let detectedType = 'LINK';
        try {
            const parsed = new URL(url);
            const host = parsed.hostname.toLowerCase();
            const pathname = parsed.pathname.toLowerCase();

            if (host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be') {
                detectedType = 'YOUTUBE';
            } else if (pathname.endsWith('.pdf')) {
                detectedType = 'PDF';
            } else if (host === 'roadmap.sh' || host.endsWith('.roadmap.sh')) {
                detectedType = 'ROADMAP';
            } else if (
                host === 'drive.google.com' ||
                host.endsWith('.drive.google.com') ||
                host === 'dropbox.com' ||
                host.endsWith('.dropbox.com') ||
                host.split('.').includes('onedrive') ||
                host === 'box.com' ||
                host.endsWith('.box.com') ||
                host.split('.').includes('sharepoint')
            ) {
                detectedType = 'FILE';
            }
        } catch {
            // CodeQL [js/incomplete-url-substring-sanitization] false positive — display only
            const lowerUrl = url.toLowerCase();
            if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be'))
                detectedType = 'YOUTUBE';
            else if (lowerUrl.endsWith('.pdf')) detectedType = 'PDF';
            else if (lowerUrl.includes('roadmap.sh')) detectedType = 'ROADMAP';
            else if (
                lowerUrl.includes('drive.google.com') ||
                lowerUrl.includes('dropbox.com') ||
                lowerUrl.includes('onedrive') ||
                lowerUrl.includes('box.com') ||
                lowerUrl.includes('sharepoint')
            )
                detectedType = 'FILE';
        }

        setForm((f) => {
            const items = [...f.items];
            if (items.length === 0) items.push({ title: f.title, type: detectedType, url });
            else items[index] = { ...items[index], url, type: detectedType };
            return { ...f, items };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const skillsArray = form.skills
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
            let itemsToSubmit = form.items;

            if (uiMode === 'SINGLE') {
                if (form.items.length === 0) {
                    toast.error('URL is required');
                    setIsSaving(false);
                    return;
                }
                const item = form.items[0];
                if (!form.title.trim() || !item.url.trim()) {
                    toast.error('Title and URL are required');
                    setIsSaving(false);
                    return;
                }
                itemsToSubmit = [
                    {
                        id: item.id,
                        title: form.title.trim(),
                        type: item.type as ResourceItemType,
                        url: item.url.trim(),
                    },
                ];
            } else {
                if (form.items.length === 0) {
                    toast.error('At least one item is required in the collection');
                    setIsSaving(false);
                    return;
                }
                for (const item of form.items) {
                    if (!item.title.trim() || !item.url.trim()) {
                        toast.error('All items must have a title and a valid URL');
                        setIsSaving(false);
                        return;
                    }
                }
                itemsToSubmit = form.items.map((item) => ({
                    id: item.id,
                    title: item.title.trim(),
                    type: item.type as ResourceItemType,
                    url: item.url.trim(),
                }));
            }

            if (resource) {
                await adminApi.adminResourcesApi.updateResource(resource.id, {
                    title: form.title,
                    description: form.description || null,
                    company: form.company || null,
                    skills: skillsArray,
                    status: form.status,
                    sector: form.sector,
                    items: itemsToSubmit,
                });
                toast.success('Resource updated successfully');
            } else {
                await adminApi.adminResourcesApi.createResource({
                    title: form.title,
                    description: form.description || null,
                    company: form.company || null,
                    skills: skillsArray,
                    status: form.status,
                    sector: form.sector,
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    items: itemsToSubmit.map(({ id, ...rest }) => rest),
                });
                toast.success('Resource created successfully');
            }

            onOpenChange(false);
            onSaved();
        } catch (error: unknown) {
            console.error(`Failed to save resource - ${getErrorMessage(error)}`);
            toast.error(getErrorMessage(error, 'Failed to save resource'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleModeChange = (value: string) => {
        const next = value as UiMode;
        setUiMode(next);
        // A single-link form always needs one item row to hold the URL.
        if (next === 'SINGLE') {
            setForm((f) =>
                f.items.length === 0
                    ? { ...f, items: [{ title: '', type: 'LINK', url: '' }] }
                    : f
            );
        }
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle>{resource ? 'Edit resource' : 'Create resource'}</DialogTitle>
                <DialogDescription>
                    {uiMode === 'SINGLE'
                        ? 'One link, with its own title. The type is detected from the URL and can be overridden.'
                        : 'A collection of items, each with its own title, type and URL.'}
                </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
                <Tabs value={uiMode} onValueChange={handleModeChange}>
                    <TabsList>
                        <TabsTrigger value="SINGLE">Single link</TabsTrigger>
                        <TabsTrigger value="COLLECTION">Collection</TabsTrigger>
                    </TabsList>

                    <TabsContent value="SINGLE">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
                            <div className="sm:col-span-3">
                                <SmartInput
                                    label="Resource Title"
                                    type="text"
                                    required
                                    value={form.title}
                                    onChange={(e) => setField('title', e.target.value)}
                                    placeholder="e.g. Complete Java Roadmap"
                                />
                            </div>
                            <div className="sm:col-span-3">
                                <SmartInput
                                    label="Target URL"
                                    type="url"
                                    required
                                    value={form.items[0]?.url || ''}
                                    onChange={(e) => handleUrlChange(e.target.value, 0)}
                                    placeholder="https://..."
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <SmartSelect
                                    label="Resource Type"
                                    required
                                    value={form.items[0]?.type || 'LINK'}
                                    onChange={(val) => {
                                        setForm((f) => {
                                            const items = [...f.items];
                                            if (items.length > 0)
                                                items[0] = { ...items[0], type: val };
                                            return { ...f, items };
                                        });
                                    }}
                                    options={ITEM_TYPE_OPTIONS}
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <SmartSelect
                                    label="Status"
                                    required
                                    value={form.status}
                                    onChange={(val) =>
                                        setField('status', val as ResourceItemStatus)
                                    }
                                    options={FORM_STATUS_OPTIONS}
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <SmartSelect
                                    label="Sector"
                                    required
                                    value={form.sector}
                                    onChange={(val) => setField('sector', val as ResourceSector)}
                                    options={SECTOR_OPTIONS}
                                />
                            </div>
                            <div className="sm:col-span-3">
                                <TagAutocomplete
                                    label="Company"
                                    value={form.company}
                                    onChange={(val) => setField('company', val)}
                                    options={availableCompanies}
                                    placeholder="Optional..."
                                />
                            </div>
                            <div className="sm:col-span-3">
                                <TagAutocomplete
                                    label="Skills"
                                    value={form.skills}
                                    onChange={(val) => setField('skills', val)}
                                    options={availableSkills}
                                    placeholder="Optional..."
                                    isMulti
                                />
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="COLLECTION">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <SmartInput
                                    label="Title"
                                    type="text"
                                    required
                                    value={form.title}
                                    onChange={(e) => setField('title', e.target.value)}
                                    placeholder="e.g. Front-end Dev Package"
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <SmartSelect
                                        label="Status"
                                        required
                                        value={form.status}
                                        onChange={(val) =>
                                            setField('status', val as ResourceItemStatus)
                                        }
                                        options={FORM_STATUS_OPTIONS}
                                    />
                                    <SmartSelect
                                        label="Sector"
                                        required
                                        value={form.sector}
                                        onChange={(val) => setField('sector', val as ResourceSector)}
                                        options={SECTOR_OPTIONS}
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <SmartTextarea
                                        label="Description"
                                        value={form.description}
                                        onChange={(e) => setField('description', e.target.value)}
                                        placeholder="e.g. Essential resources, books, and links."
                                        rows={3}
                                    />
                                </div>
                                <TagAutocomplete
                                    label="Company"
                                    value={form.company}
                                    onChange={(val) => setField('company', val)}
                                    options={availableCompanies}
                                    placeholder="Optional..."
                                />
                                <TagAutocomplete
                                    label="Skills"
                                    value={form.skills}
                                    onChange={(val) => setField('skills', val)}
                                    options={availableSkills}
                                    placeholder="Optional..."
                                    isMulti
                                />
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between gap-2">
                                    <h3 className="text-sm font-semibold text-foreground">
                                        Curated Items
                                    </h3>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            setForm((f) => ({
                                                ...f,
                                                items: [
                                                    ...f.items,
                                                    { title: '', type: 'LINK', url: '' },
                                                ],
                                            }))
                                        }
                                    >
                                        <PlusIcon className="h-4 w-4" aria-hidden="true" />
                                        Add Item
                                    </Button>
                                </div>

                                {form.items.length === 0 ? (
                                    <EmptyState
                                        title="No items yet"
                                        description="Add the first item to this collection."
                                        icon="inbox"
                                        size="md"
                                        variant="ghost"
                                    />
                                ) : (
                                    <ul className="space-y-3">
                                        {form.items.map((item, index) => (
                                            <li
                                                key={index}
                                                className="flex flex-col gap-3 rounded-lg border border-border bg-muted/15 p-4"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-xs font-semibold text-muted-foreground">
                                                        Item {index + 1}
                                                    </span>
                                                    {form.items.length > 1 ? (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                setForm((f) => ({
                                                                    ...f,
                                                                    items: f.items.filter(
                                                                        (_, idx) => idx !== index
                                                                    ),
                                                                }))
                                                            }
                                                            aria-label={`Remove item ${index + 1}`}
                                                            title="Remove item"
                                                        >
                                                            <TrashIcon
                                                                className="h-4 w-4"
                                                                aria-hidden="true"
                                                            />
                                                        </Button>
                                                    ) : null}
                                                </div>
                                                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                                    <div className="sm:col-span-2">
                                                        <SmartInput
                                                            label="Item Title"
                                                            type="text"
                                                            required
                                                            value={item.title}
                                                            onChange={(e) =>
                                                                setItem(index, {
                                                                    title: e.target.value,
                                                                })
                                                            }
                                                            placeholder="e.g. Official Documentation"
                                                        />
                                                    </div>
                                                    <div>
                                                        <SmartSelect
                                                            label="Type"
                                                            required
                                                            value={item.type}
                                                            onChange={(val) =>
                                                                setItem(index, { type: val })
                                                            }
                                                            options={ITEM_TYPE_OPTIONS}
                                                        />
                                                    </div>
                                                </div>
                                                <SmartInput
                                                    label="URL"
                                                    type="url"
                                                    required
                                                    value={item.url}
                                                    onChange={(e) =>
                                                        handleUrlChange(e.target.value, index)
                                                    }
                                                    placeholder="https://..."
                                                />
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={isSaving}>
                        {isSaving ? 'Saving…' : 'Save Resource'}
                    </Button>
                </DialogFooter>
            </form>
        </>
    );
}

// ─── Grid columns ─────────────────────────────────────────────────────────────

function ItemLinks({ items }: { items: ResourceItem[] }) {
    return (
        <div className="flex flex-wrap gap-1">
            {items.slice(0, 2).map((item) => (
                <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex max-w-40 items-center gap-1 rounded-md border border-border/60 bg-secondary px-1.5 py-0.5 text-xs text-foreground hover:underline"
                >
                    <DocumentTextIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.title}</span>
                    <ArrowTopRightOnSquareIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
                </a>
            ))}
            {items.length > 2 ? (
                <span className="inline-flex items-center rounded-md border border-border/60 bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                    +{items.length - 2} more
                </span>
            ) : null}
        </div>
    );
}

function buildResourceColumns({
    canApprove,
    onApprove,
    onEdit,
    onRequestDelete,
}: {
    canApprove: boolean;
    onApprove: (id: string) => void;
    onEdit: (resource: SharedResource) => void;
    onRequestDelete: (id: string) => void;
}): DataGridColumn<SharedResource>[] {
    return [
        {
            id: 'resource',
            header: 'Resource',
            accessorFn: (row) => row.title || '',
            cell: ({ row }) => {
                const resource = row.original;
                return (
                    <div className="flex min-w-0 flex-col">
                        <span className="truncate font-semibold text-foreground">
                            {resource.title}
                        </span>
                        {resource.description ? (
                            <span className="truncate text-xs text-muted-foreground">
                                {resource.description}
                            </span>
                        ) : null}
                        {resource.items && resource.items.length > 0 ? (
                            <ItemLinks items={resource.items} />
                        ) : null}
                    </div>
                );
            },
            // Pinned so the resource stays identifiable while the rest of the
            // row scrolls underneath on narrow screens.
            meta: { sticky: 'left' },
        },
        {
            id: 'shape',
            header: 'Type',
            accessorFn: (row) => (row.items?.length === 1 ? 'Single' : 'Collection'),
            cell: ({ row }) => (
                <Badge variant="muted" size="sm">
                    {row.original.items?.length === 1 ? 'Single' : 'Collection'}
                </Badge>
            ),
        },
        {
            id: 'sector',
            header: 'Sector',
            accessorFn: (row) => row.sector || ResourceSector.PRIVATE,
            cell: ({ row }) => {
                const resource = row.original;
                return (
                    <div className="flex min-w-0 flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                            <Badge
                                variant={
                                    resource.sector === ResourceSector.GOVERNMENT
                                        ? 'warning'
                                        : 'secondary'
                                }
                                size="sm"
                            >
                                {resource.sector || ResourceSector.PRIVATE}
                            </Badge>
                            {resource.company ? (
                                <span className="truncate text-xs font-medium text-foreground">
                                    {resource.company}
                                </span>
                            ) : null}
                        </div>
                        {resource.skills && resource.skills.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                                {resource.skills.map((skill, i) => (
                                    <SkillPill key={`${skill}-${i}`} skill={skill} size="xs" />
                                ))}
                            </div>
                        ) : null}
                    </div>
                );
            },
        },
        {
            id: 'createdAt',
            header: 'Added',
            // Numeric accessor so the grid sorts by instant; a string accessor
            // would sort ISO timestamps lexicographically.
            accessorFn: (row) => {
                const time = new Date(row.createdAt).getTime();
                return Number.isNaN(time) ? 0 : time;
            },
            cell: ({ row }) => (
                <span className="whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(row.original.createdAt).toLocaleDateString()}
                </span>
            ),
        },
        {
            id: 'actions',
            header: 'Actions',
            enableSorting: false,
            enableHiding: false,
            cell: ({ row }) => {
                const resource = row.original;
                return (
                    <div className="flex justify-end">
                        <DropdownMenu modal={false}>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    aria-label={`Actions for ${resource.title}`}
                                >
                                    <EllipsisHorizontalIcon className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {canApprove ? (
                                    <DropdownMenuItem
                                        onClick={() => onApprove(resource.id)}
                                    >
                                        <CheckCircleIcon className="h-4 w-4" />
                                        Approve
                                    </DropdownMenuItem>
                                ) : null}
                                <DropdownMenuItem onClick={() => onEdit(resource)}>
                                    <PencilSquareIcon className="h-4 w-4" />
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onRequestDelete(resource.id)}>
                                    <TrashIcon className="h-4 w-4" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                );
            },
        },
    ];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminResourcesClient({
    initialSkills = [],
    initialCompanies = [],
    heading,
}: AdminResourcesClientProps) {
    const [resources, setResources] = useState<SharedResource[]>([]);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<ResourceItemStatus>(
        ResourceItemStatus.PENDING_REVIEW
    );

    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounce(search, SEARCH_DEBOUNCE_MS);

    const [availableSkills, setAvailableSkills] = useState<string[]>(initialSkills);
    const [availableCompanies, setAvailableCompanies] = useState<string[]>(initialCompanies);

    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingResource, setEditingResource] = useState<SharedResource | null>(null);

    const [resourceToDelete, setResourceToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        // Copied before sorting: `initialSkills` / `initialCompanies` arrive as
        // props, and sorting them in place would mutate the caller's array.
        if (initialSkills.length > 0) setAvailableSkills([...initialSkills].sort());
        if (initialCompanies.length > 0) setAvailableCompanies([...initialCompanies].sort());
    }, [initialSkills, initialCompanies]);

    const loadResources = useCallback(async () => {
        setIsLoading(true);
        setLoadError(null);
        try {
            const response = await adminApi.adminResourcesApi.getResources({
                status: activeTab,
                page,
                limit: pageSize,
                search: debouncedSearch.trim() || undefined,
            });
            setResources(response.resources || []);
            setTotal(response.pagination?.total ?? 0);
            setTotalPages(response.pagination?.pages || 1);
        } catch (error) {
            console.error(`Failed to load resources - ${getErrorMessage(error)}`);
            setLoadError(getErrorMessage(error, 'Failed to load resources. Please retry.'));
            toast.error('Failed to load resources');
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, page, pageSize, debouncedSearch]);

    useEffect(() => {
        void loadResources();
    }, [loadResources]);

    const handleApprove = useCallback(
        async (id: string) => {
            try {
                await adminApi.adminResourcesApi.updateResource(id, {
                    status: ResourceItemStatus.APPROVED,
                });
                toast.success('Resource approved');
                void loadResources();
            } catch (error) {
                console.error(`Failed to approve resource - ${getErrorMessage(error)}`);
                toast.error('Failed to approve resource');
            }
        },
        [loadResources]
    );

    const confirmDelete = async () => {
        if (!resourceToDelete) return;
        setIsDeleting(true);
        try {
            await adminApi.adminResourcesApi.deleteResource(resourceToDelete);
            toast.success('Resource deleted');
            setResourceToDelete(null);
            void loadResources();
        } catch (error) {
            console.error(`Failed to delete resource - ${getErrorMessage(error)}`);
            toast.error('Failed to delete resource');
        } finally {
            setIsDeleting(false);
        }
    };

    const openEditor = useCallback((resource: SharedResource | null) => {
        setEditingResource(resource);
        setIsEditorOpen(true);
    }, []);

    const handleTabChange = useCallback((value: string) => {
        setActiveTab(value as ResourceItemStatus);
        setPage(1);
        // Drop the other queue's rows and its total so the freshly mounted panel
        // never shows the previous tab's resources under the new tab label.
        setResources([]);
        setTotal(0);
    }, []);

    const canApprove = activeTab === ResourceItemStatus.PENDING_REVIEW;

    const columns = useMemo(
        () =>
            buildResourceColumns({
                canApprove,
                onApprove: (id) => void handleApprove(id),
                onEdit: openEditor,
                onRequestDelete: setResourceToDelete,
            }),
        [canApprove, handleApprove, openEditor]
    );

    // One node, two call sites: the grid shows it when its own search excludes
    // every loaded row, and the page shows it when the server returned nothing
    // for the current queue. A filtered-to-zero result must not read as "this
    // queue is empty" — the queue has rows, the search excluded them.
    const noMatches = (
        <EmptyState
            title="No matching resources"
            description="Nothing in this queue matches the current search."
            icon="search"
            size="md"
            variant="ghost"
            action={
                <Button type="button" size="sm" variant="outline" onClick={() => setSearch('')}>
                    Clear search
                </Button>
            }
        />
    );

    const emptyQueue = (
        <EmptyState
            title={TAB_META[activeTab].emptyTitle}
            description={TAB_META[activeTab].emptyBody}
            icon="inbox"
            size="md"
            variant="ghost"
        />
    );

    const renderQueue = () => {
        if (loadError && resources.length === 0) {
            return (
                <ErrorMessage
                    title="Could not load resources"
                    message={loadError}
                    onRetry={() => void loadResources()}
                    variant="card"
                />
            );
        }
        return (
            <DataGrid<SharedResource>
                data={resources}
                columns={columns}
                getRowId={(row) => row.id}
                title="Resources"
                count={total}
                countLabel="resources"
                // No bulk endpoint exists for the resources queue, so selection
                // is off rather than shipping dead checkboxes.
                enableSelection={false}
                // Only the first load blanks the body; a background refetch (tab
                // change, search, page change) keeps the rows on screen.
                isLoading={isLoading && resources.length === 0}
                loadingRowCount={6}
                // Server-paged, so the search must reach the API: the grid's
                // box only filters the rows it already holds.
                searchPlaceholder="Search resource titles…"
                searchValue={search}
                onSearchChange={setSearch}
                showViewOptions
                noResults={search.trim() ? noMatches : emptyQueue}
                serverPagination={{
                    pageIndex: page - 1,
                    pageCount: totalPages,
                    onPageChange: (index) => setPage(index + 1),
                    defaultPageSize: pageSize,
                    pageSizeOptions: PAGE_SIZE_OPTIONS,
                    onPageSizeChange: (size) => {
                        setPageSize(size);
                        setPage(1);
                    },
                }}
                /* The bare root already carries `flex min-h-0 flex-1 flex-col`
                   and renders exactly one `rounded-md border` surface, so the
                   page adds no frame of its own. */
                variant="bare"
            />
        );
    };

    const updating = isLoading && resources.length > 0;

    return (
        /* Layout only: the page owns padding and the bounded height, and the
           grid owns the scroll. No overflow here — a scroller on this node
           would nest inside the grid's own. Vertical rhythm comes from a plain
           wrapper below, because the tab primitives own their own spacing. */
        <Tabs value={activeTab} onValueChange={handleTabChange} className="flex min-h-0 flex-1 flex-col">
            <div className="shrink-0 space-y-4">
                {heading ? (
                    <div className="flex flex-wrap items-end justify-between gap-2">
                        {heading}
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" size="sm">
                                {total} {TAB_META[activeTab].label}
                            </Badge>
                            <Button type="button" size="sm" onClick={() => openEditor(null)}>
                                <PlusIcon className="h-4 w-4 sm:mr-1.5" aria-hidden="true" />
                                <span className="hidden sm:inline">Create resource</span>
                            </Button>
                        </div>
                    </div>
                ) : null}

                {/* `TabsList` is `inline-flex`, so a plain wrapper keeps it at
                    content width inside the row instead of stretching. The live
                    status sits here rather than in the page header so both
                    routes that mount this component get it. */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <TabsList>
                            <TabsTrigger value={ResourceItemStatus.PENDING_REVIEW}>
                                Pending review
                            </TabsTrigger>
                            <TabsTrigger value={ResourceItemStatus.APPROVED}>Approved</TabsTrigger>
                        </TabsList>
                    </div>
                    {updating ? (
                        <Badge variant="muted" size="sm" aria-live="polite">
                            Updating…
                        </Badge>
                    ) : null}
                </div>

                {loadError && resources.length > 0 ? (
                    <ErrorMessage
                        className="shrink-0"
                        message={loadError}
                        onRetry={() => void loadResources()}
                        variant="subtle"
                    />
                ) : null}
            </div>

            {/* Only the active panel renders, so each one owns the full height
                and hands it to the grid. */}
            <TabsContent
                value={ResourceItemStatus.PENDING_REVIEW}
                className="flex min-h-0 flex-1 flex-col"
            >
                {renderQueue()}
            </TabsContent>
            <TabsContent
                value={ResourceItemStatus.APPROVED}
                className="flex min-h-0 flex-1 flex-col"
            >
                {renderQueue()}
            </TabsContent>

            <ResourceFormDialog
                open={isEditorOpen}
                resource={editingResource}
                availableSkills={availableSkills}
                availableCompanies={availableCompanies}
                onOpenChange={setIsEditorOpen}
                onSaved={() => void loadResources()}
            />

            <AlertDialog
                show={!!resourceToDelete}
                title="Delete Resource?"
                message="This action cannot be undone. Are you sure you want to permanently delete this resource?"
                onConfirm={confirmDelete}
                onCancel={() => setResourceToDelete(null)}
                type="danger"
                confirmText={isDeleting ? 'Deleting...' : 'Delete'}
            />
        </Tabs>
    );
}
