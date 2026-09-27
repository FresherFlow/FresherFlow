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
 * Repeat suppressor for the dev console line. Retries and strict-mode double
 * invokes printed the identical line two or three times per failure.
 */
const errorLineSeen = new Map<string, number>();
const ERROR_LINE_WINDOW_MS = 4000;

function shouldLogErrorOnce(key: string): boolean {
    const now = Date.now();
    const last = errorLineSeen.get(key);
    if (last !== undefined && now - last < ERROR_LINE_WINDOW_MS) return false;
    errorLineSeen.set(key, now);
    if (errorLineSeen.size > 100) {
        for (const [k, v] of errorLineSeen) {
            if (now - v >= ERROR_LINE_WINDOW_MS) errorLineSeen.delete(k);
        }
    }
    return true;
}

/**
 * Stable id per message so a burst of identical failures collapses into one
 * toast instead of stacking. A single global id was worse than useless: two
 * unrelated errors replaced each other, while a bare `toast.error()` from a
 * hook produced no id at all and did not dedupe with this helper.
 */
function toastIdFor(message: string): string {
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
        hash = (hash * 31 + message.charCodeAt(i)) | 0;
    }
    return `error-${Math.abs(hash)}`;
}

/**
 * Standardized error toast notification
 */
export function toastError(error: unknown, fallbackMessage?: string, options?: Record<string, unknown>) {
    const message = getErrorMessage(error, fallbackMessage);
    const finalMessage = message || fallbackMessage || 'Something went wrong. Please check your connection.';

    toast.error(finalMessage, {
        ...options,
        // Derived last so a caller cannot accidentally opt out of dedupe.
        id: toastIdFor(finalMessage),
    });

    // Dev console output. Two rules:
    // 1. A 5xx is our own envelope (DB unavailable, schema pending). The toast
    //    already says it and the cause is a deployment state, not a code bug —
    //    logging it just repeated the same line on every poll.
    // 2. `console.error` is intercepted by the Next dev overlay, which appends
    //    a stack and a source code frame to the message. A one-line log became
    //    a nine-line block, so nothing here uses console.error.
    if (process.env.NODE_ENV !== 'production') {
        const err = error as { statusCode?: number; message?: string };
        const status = err?.statusCode ?? 0;
        if (status >= 500) return;

        const clean = toCleanMessage(err?.message || finalMessage);
        const isRateLimited = status === 429 || clean.includes('Too many');
        const isExpectedOtp = status === 401 || clean.includes('Invalid verification code') || clean.includes('No OTP found') || clean.includes('OTP expired');
        if (!shouldLogErrorOnce(toastIdFor(clean))) return;

        if (isRateLimited) console.warn(`[RateLimit] ${clean}`);
        else if (isExpectedOtp) console.warn(`[Auth OTP] ${clean}`);
        else console.warn(`[Error] ${clean}`);
    }
}
