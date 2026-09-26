import toast from 'react-hot-toast';

export interface AppError extends Error {
    code?: string;
    statusCode?: number;
    completionPercentage?: number;
    requiredCompletion?: number;
}

export function getErrorMessage(error: unknown, fallbackMessage?: string): string {
    const raw = extractRawMessage(error);
    const clean = toCleanMessage(raw);
    if (clean && clean !== 'An unexpected error occurred. Please try again.') {
        return clean;
    }
    return fallbackMessage || clean || 'Something went wrong. Please check your connection.';
}

function extractRawMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    if (typeof error === 'object' && error !== null) {
        const maybe = error as { error?: { message?: string } | string; message?: string };
        if (typeof maybe.error === 'string') return maybe.error;
        if (typeof maybe.error?.message === 'string') return maybe.error.message;
        if (typeof maybe.message === 'string') return maybe.message;
    }
    return 'An unexpected error occurred. Please try again.';
}

/**
 * Strip stack frames, filesystem paths, and "Error:" prefixes so toasts and
 * console lines show one human sentence. Validation text passes through
 * untouched (e.g. "skills: Add at least one skill").
 */
export function toCleanMessage(input: string): string {
    const text = (input || '').trim();
    if (!text) return 'An unexpected error occurred. Please try again.';
    if (text.length > 10000) return 'Invalid request. Please check your input and try again.';
    let firstLine = text.split('\n')[0].trim();
    // Cut off appended stack starting mid-line ("... at foo (bar.ts:1:2)")
    const stackIdx = firstLine.search(/\s+at\s+\S+\s*\(/);
    if (stackIdx > 0) firstLine = firstLine.slice(0, stackIdx).trim();
    let out = firstLine
        .replace(/^Error:\s*/i, '')
        .replace(/[A-Za-z]:\\[^\s"']*/g, '[path]')
        .replace(/\/(app|home|usr|var|tmp|opt|srv)[^\s"']*/g, '[path]')
        .replace(/\.tsx?:\d+:\d+/g, '')
        .replace(/\.js:\d+:\d+/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    if (out.length > 300) out = `${out.slice(0, 297)}...`;
    return out || 'An unexpected error occurred. Please try again.';
}

/**
 * Standardized error toast notification
 */
export function toastError(error: unknown, fallbackMessage?: string, options?: Record<string, unknown>) {
    const message = getErrorMessage(error, fallbackMessage);
    const finalMessage = message || fallbackMessage || 'Something went wrong. Please check your connection.';

    toast.error(finalMessage, {
        id: 'global-error-toast', // Prevent multiple identical toasts
        ...options
    });

    // Single concise dev line only — never the full object/stack.
    if (process.env.NODE_ENV !== 'production') {
        const err = error as { statusCode?: number; message?: string };
        const clean = toCleanMessage(err?.message || finalMessage);
        const isRateLimited = err?.statusCode === 429 || clean.includes('Too many');
        const isExpectedOtp = err?.statusCode === 401 || clean.includes('Invalid verification code') || clean.includes('No OTP found') || clean.includes('OTP expired');
        if (isRateLimited) console.warn(`[RateLimit] ${clean}`);
        else if (isExpectedOtp) console.warn(`[Auth OTP] ${clean}`);
        else console.error(`[Error] ${clean}`);
    }
}
