'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '@/ui/Button';

/**
 * Save state for a section form that persists on submit.
 *
 * Every section needs the same three things — a real in-flight flag, a success
 * or failure report, and no claim of "saved" when the write failed — so it is
 * written once here instead of once per section. The task returns `true` only
 * when the write actually happened; a validation failure inside a handler
 * returns `false` and shows its own message.
 */
export function useSectionSave() {
    const [saving, setSaving] = useState(false);

    const save = async (task: () => Promise<boolean>, successMessage = 'Saved.') => {
        setSaving(true);
        try {
            const saved = await task();
            if (saved) toast.success(successMessage);
            return saved;
        } catch {
            toast.error('Could not save. Check your connection and try again.');
            return false;
        } finally {
            setSaving(false);
        }
    };

    return { saving, save };
}

/**
 * The end of a section form: what state the form is in, and the one button that
 * submits it. There is no Cancel — the fields hold what is saved until you
 * change them, so there is nothing to cancel back to.
 */
export function SectionFooter({
    isDirty,
    saving,
    saveLabel = 'Save',
    savedHint,
}: {
    isDirty: boolean;
    saving: boolean;
    saveLabel?: string;
    savedHint?: string;
}) {
    return (
        <div className="flex items-center justify-end gap-3 border-t border-border/50 pt-4">
            <span className="mr-auto text-xs text-muted-foreground" aria-live="polite">
                {saving ? 'Saving…' : isDirty ? 'Unsaved changes' : savedHint ?? 'All changes saved'}
            </span>
            <Button type="submit" size="sm" disabled={!isDirty || saving}>
                {saving ? 'Saving…' : saveLabel}
            </Button>
        </div>
    );
}
