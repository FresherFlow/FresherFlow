import { useState } from 'react';

/**
 * Generic toggle hook for dialog state (shadcn-admin pattern).
 *
 * Setting the same value again closes the dialog (resets to `null`),
 * so a single setter both opens and toggles-closed.
 *
 * @example const [open, setOpen] = useDialogState<'approve' | 'reject'>();
 */
export function useDialogState<T extends string | null>(initial: T | null = null) {
    const [open, _setOpen] = useState<T | null>(initial);

    const setOpen = (value: T | null) => _setOpen((prev) => (prev === value ? null : value));

    return [open, setOpen] as const;
}

export default useDialogState;
