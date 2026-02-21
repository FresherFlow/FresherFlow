'use client';

import { useEffect } from 'react';
import toast from 'react-hot-toast';

const SW_VERSION = '1.8.0';

export default function ServiceWorkerRegister() {
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (!('serviceWorker' in navigator)) return;

        const isLocalhost =
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1';

        // Avoid SW navigation/cache side effects in local dev.
        if (isLocalhost || process.env.NODE_ENV !== 'production') {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                registrations.forEach((registration) => {
                    void registration.unregister();
                });
            }).catch(() => {
                // Ignore cleanup errors in dev
            });
            return;
        }

        const register = async () => {
            try {
                const registration = await navigator.serviceWorker.register(`/sw.js?v=${SW_VERSION}`);
                await registration.update();

                if (registration.waiting) {
                    toast((t) => (
                        <div className="flex items-center gap-3">
                            <span className="text-sm">App update available</span>
                            <button
                                className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground"
                                onClick={() => {
                                    registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
                                    toast.dismiss(t.id);
                                }}
                            >
                                Update
                            </button>
                        </div>
                    ), { duration: 8000 });
                }

                registration.addEventListener('updatefound', () => {
                    const installing = registration.installing;
                    if (!installing) return;
                    installing.addEventListener('statechange', () => {
                        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                            toast((t) => (
                                <div className="flex items-center gap-3">
                                    <span className="text-sm">New version ready</span>
                                    <button
                                        className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground"
                                        onClick={() => {
                                            registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
                                            toast.dismiss(t.id);
                                        }}
                                    >
                                        Reload
                                    </button>
                                </div>
                            ), { duration: 10000 });
                        }
                    });
                });
            } catch (err) {
                // Silent fail - app should still work without SW
                console.warn('Service worker registration failed', err);
            }
        };

        register();

        const onControllerChange = () => {
            window.location.reload();
        };
        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

        return () => {
            navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
        };
    }, []);

    return null;
}
