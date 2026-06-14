import Link from 'next/link';
import DevicePhoneMobileIcon from '@heroicons/react/24/outline/DevicePhoneMobileIcon';

const TRUST_FEATURES = [
    { title: 'Direct to Official Apply', text: 'Skip ad shorteners, middlemen, and tracking links. Apply directly on official Greenhouse, Lever, or company career portals.' },
    { title: 'Works on Weak Networks', text: 'No infinite loading spinners. The app is optimized to load feeds instantly and work even on spotty college Wi-Fi.' },
    { title: 'Offline Saves & Reminders', text: 'Save interesting roles for offline access immediately and apply later when you have time, without losing track.' },
    { title: 'Deadline Monitoring', text: 'Active tracking of application deadlines. Expired listings are removed automatically, so you do not waste time on dead roles.' },
];

export function TrustLedger() {
    return (
        <section className="py-10 md:py-14 px-6 border-t border-border/40 bg-muted/10">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[0.45fr_1fr] gap-10 items-start">
                <div className="flex flex-col h-full">
                    <div className="space-y-4">
                        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight leading-tight">
                            Built for a better job search.
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Most job boards are flooded with expired postings, affiliate redirects, and fake company profiles. We built FresherFlow to give students a reliable, clean, and direct application experience.
                        </p>
                    </div>

                    <div className="mt-8 pt-8 border-t border-border/60 space-y-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold tracking-widest uppercase border border-primary/20">
                            <DevicePhoneMobileIcon className="w-4 h-4" />
                            Native Mobile Experience
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-xl font-extrabold tracking-tight">Available on Android</h3>
                            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed max-w-sm">
                                Get the full experience with our Android app. Featuring zero-latency feeds, immediate offline saves, and instant push notifications.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <Link href="/download" className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-foreground text-background font-bold text-sm hover:bg-foreground/90 transition-colors">
                                Download APK
                            </Link>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {TRUST_FEATURES.map((item) => (
                        <div key={item.title} className="premium-card p-5 space-y-2 border border-border/80 bg-card/65 shadow-sm">
                            <h3 className="text-sm md:text-base font-bold text-foreground tracking-tight">{item.title}</h3>
                            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
