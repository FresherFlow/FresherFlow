'use client';

import { useInstallPrompt } from "@/lib/providers/InstallPromptContext";

export default function InstallAppBanner() {
    const { showBanner, dismissBanner, promptInstall } = useInstallPrompt();

    if (!showBanner) return null;

    return (
        <div className="fixed top-16 inset-x-0 z-[80] px-3 md:px-6">
            <div className="mx-auto max-w-3xl rounded-xl border border-primary/30 bg-card/95 backdrop-blur p-3 shadow-lg">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-foreground">Install FresherFlow app</p>
                        <p className="text-xs text-muted-foreground">Get faster access and instant job alerts.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => void promptInstall('banner')}
                            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-95"
                        >
                            Install App
                        </button>
                        <button
                            type="button"
                            onClick={dismissBanner}
                            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                        >
                            Later
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

