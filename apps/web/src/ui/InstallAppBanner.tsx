'use client';

import { useInstallPrompt } from "@/lib/providers/InstallPromptContext";
import Image from "next/image";
import XMarkIcon from "@heroicons/react/24/outline/XMarkIcon";
import ArrowDownTrayIcon from "@heroicons/react/24/outline/ArrowDownTrayIcon";

export default function InstallAppBanner() {
    const { showBanner, dismissBanner, promptInstall } = useInstallPrompt();

    if (!showBanner) return null;

    return (
        <div className="fixed bottom-6 inset-x-0 z-[80] px-3 md:px-6 flex justify-center">
            <div className="relative w-full max-w-[420px] rounded-[20px] border border-border bg-card p-4 shadow-lg">
                <button 
                    onClick={dismissBanner}
                    className="absolute right-3 top-3 p-1.5 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                    aria-label="Close"
                >
                    <XMarkIcon className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-3.5 mb-4 pr-8">
                    <div className="w-[52px] h-[52px] shrink-0 rounded-[14px] bg-white border border-border flex items-center justify-center p-1.5 shadow-sm">
                        <Image 
                            src="/icon-192x192.png" 
                            alt="FresherFlow Logo" 
                            width={40} 
                            height={40} 
                            className="w-full h-full object-contain rounded-xl"
                        />
                    </div>
                    <div className="flex flex-col">
                        <h3 className="text-[15px] font-bold text-foreground leading-tight mb-0.5">Install FresherFlow</h3>
                        <p className="text-xs leading-snug text-muted-foreground">Add to home screen for the full app experience</p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => void promptInstall('banner')}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-primary hover:bg-primary/90 px-4 py-2.5 text-[14px] font-semibold text-primary-foreground transition-colors shadow-sm"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4 stroke-2" />
                        <span>Install App</span>
                    </button>
                    <button
                        type="button"
                        onClick={dismissBanner}
                        className="shrink-0 rounded-xl bg-muted hover:bg-muted/80 border border-transparent px-4 py-2.5 text-[14px] font-medium text-foreground transition-colors"
                    >
                        Not now
                    </button>
                </div>
            </div>
        </div>
    );
}

