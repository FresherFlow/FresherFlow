'use client';

import Link from 'next/link';
import { LogoImage } from '@/components/ui/navbar/LogoImage';

export default function RedirectToApp({ title = "Feature moved to Mobile", message }: { title?: string; message?: string }) {
    return (
        <div className="min-h-screen flex items-center justify-center pt-20 px-4 bg-background">
            <div className="max-w-md w-full space-y-8 p-8 rounded-3xl border border-border bg-card text-center shadow-xl">
                <div className="flex justify-center mb-6">
                     <LogoImage width={48} height={48} className="h-12 w-12 object-contain" />
                </div>
                <div className="space-y-4">
                    <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                    <p className="text-muted-foreground">
                        {message || "To access personalized features like Saved Jobs, Application Tracker, and Notifications, please use the FresherFlow Mobile App."}
                    </p>
                </div>
                <div className="pt-4 flex flex-col gap-3">
                    <Link 
                        href="/opportunities" 
                        className="premium-button w-full justify-center text-xs capitalize tracking-widest"
                    >
                        Get the Mobile App
                    </Link>
                    <Link 
                        href="/" 
                        className="text-sm font-medium text-primary hover:underline"
                    >
                        Back to Home
                    </Link>
                </div>
                <p className="pt-6 text-[10px] text-muted-foreground uppercase tracking-widest leading-loose">
                    Official Discovery Layer • Mobile Optimized
                </p>
            </div>
        </div>
    );
}
