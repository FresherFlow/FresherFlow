import { ArrowDownTrayIcon, DevicePhoneMobileIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';

export const metadata = {
    title: 'Download FresherFlow App',
    description: 'Get the FresherFlow mobile app for the best experience. Access verified jobs, internships, and walk-ins with real-time alerts.',
};

export default function DownloadPage() {
    return (
        <div className="w-full flex-1 flex items-center justify-center py-6 sm:py-12 px-4">
            <div className="max-w-4xl w-full grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-8">
                    <div className="space-y-4">
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
                            Experience FresherFlow on <span className="text-primary">Mobile</span>
                        </h1>
                        <p className="text-lg text-muted-foreground leading-relaxed">
                            We&apos;ve moved our personalized features to mobile to provide a faster, more reliable experience with instant notifications.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="mt-1 p-1 bg-primary/10 rounded-full">
                                <CheckBadgeIcon className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">Verified Only</h3>
                                <p className="text-sm text-muted-foreground">Every listing is manually verified by our team.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="mt-1 p-1 bg-primary/10 rounded-full">
                                <CheckBadgeIcon className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">Instant Alerts</h3>
                                <p className="text-sm text-muted-foreground">Never miss a deadline with push notifications.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="mt-1 p-1 bg-primary/10 rounded-full">
                                <CheckBadgeIcon className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">One-Tap Apply</h3>
                                <p className="text-sm text-muted-foreground">Apply to jobs directly within the app.</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <button className="premium-button px-8 py-4 text-sm capitalize tracking-widest flex items-center justify-center gap-2">
                            <ArrowDownTrayIcon className="w-5 h-5" />
                            Download for Android
                        </button>
                        <button className="premium-button-outline px-8 py-4 text-sm capitalize tracking-widest flex items-center justify-center gap-2">
                            <DevicePhoneMobileIcon className="w-5 h-5" />
                            Coming to iOS
                        </button>
                    </div>
                </div>

                <div className="relative hidden md:block">
                    <div className="relative border-8 border-card bg-background rounded-[3rem] shadow-2xl overflow-hidden aspect-[9/19] max-w-[300px] mx-auto">
                        <div className="absolute top-0 inset-x-0 h-6 bg-card flex items-center justify-center">
                            <div className="w-16 h-1 bg-muted-foreground/20 rounded-full" />
                        </div>
                        <div className="p-6 pt-10 space-y-6">
                            <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
                            <div className="space-y-3">
                                <div className="h-24 w-full bg-muted/50 rounded-2xl animate-pulse" />
                                <div className="h-24 w-full bg-muted/50 rounded-2xl animate-pulse" />
                                <div className="h-24 w-full bg-muted/50 rounded-2xl animate-pulse" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
