import toast from 'react-hot-toast';

export interface AppError extends Error {
    code?: string;
    statusCode?: number;
    completionPercentage?: number;
    requiredCompletion?: number;
}

export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    return 'An unexpected error occurred. Please try again.';
}

/**
 * Standardized error toast notification
 */
export function toastError(error: unknown, fallbackMessage?: string, options?: Record<string, unknown>) {
    const message = getErrorMessage(error);
    const finalMessage = message && message !== 'An unexpected error occurred. Please try again.'
        ? message
        : fallbackMessage || 'Something went wrong. Please check your connection.';

    toast.error(finalMessage, {
        id: 'global-error-toast', // Prevent multiple identical toasts
        ...options
    });

    // Log to console if not in production — keep single clean warn for expected OTP/limit (like reference dub: one line), not silent
    if (process.env.NODE_ENV !== 'production') {
        const err = error as { statusCode?: number; message?: string };
        const isRateLimited = err?.statusCode === 429 || err?.message?.includes('Too many');
        const isExpectedOtp = err?.statusCode === 401 || err?.message?.includes('Invalid verification code') || err?.message?.includes('No OTP found') || err?.message?.includes('OTP expired');
        if (isRateLimited) console.warn('[RateLimit]', err?.message || 'Too many requests');
        else if (isExpectedOtp) console.warn('[Auth OTP]', err?.message || 'Invalid code');
        else console.error('[GlobalErrorHandler]', error);
    }
}
