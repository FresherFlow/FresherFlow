'use client';

import { useEffect, useRef, useState } from 'react';
import { fresherNeedsApi } from '@fresherflow/api-client';
import type { SavedSearch } from '@fresherflow/api-client';
import { Button } from '@/ui/Button';
import { Input } from '@/ui/Input';
import { Field } from '@/ui/Field';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/ui/Dialog';

/**
 * "New search" dialog. The reference doctrine for taking new things: creation
 * lives in an overlay (Dialog for a small focused task, Sheet for a large
 * one), never as an inline form that pushes the list down. Controlled open
 * state; fields reset whenever the dialog closes, like the reference
 * new-chat / mutate-drawer resets.
 */
export function NewSearchDialog({
    open,
    onOpenChange,
    onSaved,
    onError,
    initial,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSaved: () => void;
    onError: () => void;
    /** Filter values the caller prefills from — the feed sends its active set. */
    initial?: { city?: string; company?: string; batch?: string | number };
}) {
    const [name, setName] = useState('');
    const [city, setCity] = useState('');
    const [company, setCompany] = useState('');
    const [batch, setBatch] = useState('');
    const [saving, setSaving] = useState(false);
    const initialRef = useRef(initial);
    initialRef.current = initial;

    // Fields land from the caller's filter set when the dialog opens and clear
    // when it closes — one effect owns both directions, so a controlled `open`
    // that flips without going through onOpenChange still resets.
    useEffect(() => {
        const preset = open ? initialRef.current : undefined;
        setName('');
        setCity(preset?.city ?? '');
        setCompany(preset?.company ?? '');
        setBatch(preset?.batch != null && preset.batch !== '' ? String(preset.batch) : '');
        setSaving(false);
    }, [open]);

    const handleOpenChange = (next: boolean) => {
        onOpenChange(next);
    };

    async function save(e: React.FormEvent) {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        try {
            const filters: SavedSearch['filters'] = {};
            if (city.trim()) filters.city = city.trim();
            if (company.trim()) filters.company = company.trim();
            if (batch) filters.batch = parseInt(batch, 10);
            await fresherNeedsApi.createSavedSearch({
                name: name.trim() || 'My search',
                filters,
                alertEnabled: true,
            });
            onSaved();
            handleOpenChange(false);
        } catch {
            onError();
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>New search</DialogTitle>
                    <DialogDescription>
                        Name it, narrow it — alerts land when new jobs match.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={save} className="space-y-4">
                    <Field label="Name" htmlFor="new-search-name">
                        <Input
                            id="new-search-name"
                            variant="form"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Bangalore walk-ins"
                            maxLength={80}
                            autoFocus
                        />
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                        <Field label="City (optional)" htmlFor="new-search-city">
                            <Input
                                id="new-search-city"
                                variant="form"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                placeholder="Bengaluru"
                                maxLength={80}
                            />
                        </Field>
                        <Field label="Batch (optional)" htmlFor="new-search-batch">
                            <Input
                                id="new-search-batch"
                                variant="form"
                                value={batch}
                                onChange={(e) => setBatch(e.target.value)}
                                placeholder="2026"
                                inputMode="numeric"
                            />
                        </Field>
                    </div>
                    <Field label="Company (optional)" htmlFor="new-search-company">
                        <Input
                            id="new-search-company"
                            variant="form"
                            value={company}
                            onChange={(e) => setCompany(e.target.value)}
                            placeholder="Zoho"
                            maxLength={120}
                        />
                    </Field>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? 'Saving…' : 'Save search'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
