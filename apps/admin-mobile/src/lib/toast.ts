/**
 * Global toast system.
 * Usage anywhere in app: toast.error('message', 'optional detail')
 * ToastProvider must be mounted at the app root for toasts to appear.
 */

export type ToastType = 'error' | 'warning' | 'success' | 'info';

export interface ToastItem {
    id: string;
    type: ToastType;
    title: string;
    detail?: string;
    duration?: number;
}

type ShowFn = (item: Omit<ToastItem, 'id'>) => void;

let _show: ShowFn | null = null;

/** Called by ToastProvider on mount to register its show function. */
export function _registerToastProvider(fn: ShowFn) {
    _show = fn;
}

function show(type: ToastType, title: string, detail?: string, duration?: number) {
    console[type === 'error' || type === 'warning' ? 'error' : 'log'](
        `[Toast:${type.toUpperCase()}] ${title}${detail ? ' — ' + detail : ''}`,
    );
    _show?.({ type, title, detail, duration });
}

export const toast = {
    error: (title: string, detail?: string) => show('error', title, detail, 5000),
    warning: (title: string, detail?: string) => show('warning', title, detail, 4000),
    success: (title: string, detail?: string) => show('success', title, detail, 3000),
    info: (title: string, detail?: string) => show('info', title, detail, 3500),
};
