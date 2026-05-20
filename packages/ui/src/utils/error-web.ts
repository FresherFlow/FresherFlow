import { toast } from 'react-hot-toast';

export interface AppError extends Error {
    code?: string;
    statusCode?: number;
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
 * Standardized error toast notification for the web
 */
export function toastError(error: unknown, fallbackMessage?: string, options?: Record<string, unknown>) {
    const message = getErrorMessage(error);
    const finalMessage = message && message !== 'An unexpected error occurred. Please try again.'
        ? message
        : fallbackMessage || 'Something went wrong. Please check your connection.';

    toast.error(finalMessage, {
        id: 'global-error-toast', 
        ...options
    });

    if (process.env.NODE_ENV !== 'production') {
        console.error('[GlobalErrorHandler]', error);
    }
}
