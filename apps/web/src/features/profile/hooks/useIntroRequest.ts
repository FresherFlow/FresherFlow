'use client';

import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { apiClient } from '@/lib/api/core';
import {
    EMPTY_INTRO_FORM,
    validateIntroRequest,
    type IntroForm,
} from '@/features/profile/publicProfile';

export type IntroRequestState = 'idle' | 'sending' | 'sent';

/**
 * The recruiter "request an intro" flow: form state, validation and the POST.
 *
 * Kept out of the page component so the page only decides what to render for each of the three
 * states, and so validation can change without touching JSX.
 */
export function useIntroRequest({
    username,
    candidateId,
    enabled = true,
}: {
    username: string | null;
    candidateId: string;
    enabled?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const [state, setState] = useState<IntroRequestState>('idle');
    const [form, setForm] = useState<IntroForm>(EMPTY_INTRO_FORM);
    const [isRecruiter, setIsRecruiter] = useState(false);

    const setField = useCallback((field: keyof IntroForm, value: string) => {
        setForm((previous) => ({ ...previous, [field]: value }));
    }, []);

    // Suppressed when disabled (the owner previewing their own page) so no CTA can open it.
    const open = useCallback(() => setIsOpen((current) => (enabled ? true : current)), [enabled]);
    const close = useCallback(() => setIsOpen(false), []);

    const reset = useCallback(() => {
        setIsOpen(false);
        setState('idle');
        setForm(EMPTY_INTRO_FORM);
        setIsRecruiter(false);
    }, []);

    const submit = useCallback(async () => {
        // Toast rather than window.alert: the dialog stays visible and the message sits
        // next to the field it refers to instead of blocking the whole tab.
        const problem = validateIntroRequest(form, isRecruiter);
        if (problem) {
            toast.error(problem);
            return;
        }
        if (!username) {
            toast.error('This profile cannot receive requests right now.');
            return;
        }

        setState('sending');
        try {
            await apiClient(`/api/public/profiles/${encodeURIComponent(username)}/intro-request`, {
                method: 'POST',
                body: JSON.stringify({
                    candidateId,
                    recruiterName: form.name.trim(),
                    recruiterCompany: form.company.trim() || undefined,
                    recruiterEmail: form.email.trim() || undefined,
                    recruiterPhone: form.phone.trim() || undefined,
                    message: form.message.trim() || undefined,
                }),
            });
            setState('sent');
        } catch {
            // Stay editable so the recruiter can retry without retyping.
            setState('idle');
            toast.error('Could not send the request. Please try again.');
        }
    }, [candidateId, form, isRecruiter, username]);

    return {
        isOpen,
        state,
        form,
        isRecruiter,
        setIsRecruiter,
        setField,
        open,
        close,
        reset,
        submit,
    };
}
