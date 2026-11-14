'use client';

import { Toaster, ToastBar } from 'react-hot-toast';

/**
 * The app's toast host.
 *
 * Two rules learned the hard way:
 *
 * 1. Let the library render the toast. `<ToastBar>` handles both string and
 *    element messages; the previous hand-rendered card wrapped the message in a
 *    `<p>`, and the app's custom toasts pass a `<div>` — a block inside a
 *    paragraph is invalid HTML, React raised a hydration error on the root
 *    layout and re-rendered the toaster, and every toast played its life a
 *    second time after finishing.
 *
 * 2. Style it with the app's tokens rather than the library's defaults, so it
 *    belongs to the page (`--color-card`, `--color-border`, `--color-foreground`)
 *    and follows the theme instead of sitting there as a dark grey box.
 */
const TOAST_STYLE: React.CSSProperties = {
    background: 'var(--color-card)',
    color: 'var(--color-card-foreground)',
    border: '1px solid var(--color-border)',
    borderRadius: '8px',
    boxShadow: '0 6px 24px -12px rgb(0 0 0 / 0.28)',
    padding: '10px 12px',
    fontSize: '13px',
    fontWeight: 500,
    maxWidth: '380px',
};

export function SmartToaster() {
    return (
        <Toaster
            position="top-right"
            reverseOrder={false}
            gutter={8}
            containerStyle={{ top: 24, right: 24, left: 24, bottom: 24 }}
            toastOptions={{
                duration: 4000,
                style: TOAST_STYLE,
                success: {
                    iconTheme: { primary: 'var(--color-success)', secondary: 'var(--color-card)' },
                },
                error: {
                    iconTheme: { primary: 'var(--color-destructive)', secondary: 'var(--color-card)' },
                },
            }}
        >
            {(t) => <ToastBar toast={t} />}
        </Toaster>
    );
}
