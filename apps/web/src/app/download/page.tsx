import { ArrowDownTrayIcon, DevicePhoneMobileIcon, CheckBadgeIcon, BellIcon, ClockIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { APP_LINKS } from '@/config/links';

export const metadata = {
    title: 'Download FresherFlow App',
    description: 'Get the FresherFlow mobile app for the best experience. Access verified jobs, internships, and walk-ins with real-time alerts.',
};

export default function DownloadPage() {
    return (
        <div className="w-full flex-1 py-6 px-4 sm:px-5 md:py-16 md:px-8 space-y-12 md:space-y-24 max-w-6xl mx-auto selection:bg-primary/20">
            {/* Hero Section */}
            <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-10 md:gap-16 items-center">
                {/* Content & Ordering wrapper for mobile */}
                <div className="space-y-5 md:space-y-8 flex flex-col md:block">
                    {/* 1. Headline */}
                    <div className="space-y-4 order-1">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/60 backdrop-blur shadow-sm">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                                Verified Opportunities. Instant Alerts.
                            </span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
                            Never Miss an <span className="text-primary">Off-Campus Deadline.</span>
                        </h1>
                        <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed max-w-lg">
                            Get instant push alerts, save opportunities for offline access, and track your application status directly on your phone.
                        </p>
                    </div>

                    {/* 2. Mobile Screenshot Placeholder (Hidden on Desktop, Positioned Above CTAs on Mobile) */}
                    <div className="order-2 md:hidden py-4 flex justify-center w-full">
                        <div className="relative border-[5px] border-card bg-card/25 rounded-[1.8rem] shadow-xl overflow-hidden aspect-[9/19] w-44 border-border flex items-center justify-center">
                            {/* Speaker Notch */}
                            <div className="absolute top-0 inset-x-0 h-5 bg-card flex items-center justify-center z-20">
                                <div className="w-10 h-0.5 bg-muted-foreground/30 rounded-full" />
                            </div>
                            {/* Placeholder Content */}
                            <div className="p-4 text-center space-y-1.5 select-none">
                                <DevicePhoneMobileIcon className="w-6 h-6 text-muted-foreground/40 mx-auto" />
                                <p className="text-[11px] font-bold text-muted-foreground/80 leading-snug">Screenshot Placeholder</p>
                                <p className="text-[9px] text-muted-foreground/50 leading-snug">Real App Screen</p>
                            </div>
                        </div>
                    </div>

                    {/* 3. Hero Buttons */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2 order-3">
                        <a
                            href={APP_LINKS.androidDownload}
                            className="premium-button w-full sm:w-auto px-5 py-3 text-[11px] uppercase tracking-wide flex items-center justify-center gap-2 shadow-md"
                        >
                            <ArrowDownTrayIcon className="w-4 h-4" />
                            Download for Android ({APP_LINKS.currentVersion})
                        </a>
                        <button className="premium-button-outline w-full sm:w-auto px-5 py-3 text-[11px] uppercase tracking-wide flex items-center justify-center gap-2 cursor-not-allowed opacity-60">
                            <DevicePhoneMobileIcon className="w-4 h-4" />
                            Coming to iOS
                        </button>
                    </div>

                    {/* 4. Features list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 order-4">
                        <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card/40">
                            <div className="p-1.5 bg-primary/10 rounded-lg">
                                <BellIcon className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground text-sm">Instant Push Alerts</h3>
                                <p className="text-sm text-muted-foreground mt-0.5">Get notified immediately when a walk-in drive or off-campus role matching your profile goes live.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card/40">
                            <div className="p-1.5 bg-primary/10 rounded-lg">
                                <ClockIcon className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground text-sm">Deadline Reminders</h3>
                                <p className="text-sm text-muted-foreground mt-0.5">Track closing dates and receive alerts before applications shut down.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Desktop Mockup Display Placeholder (Hidden on Mobile) */}
                <div className="hidden md:flex justify-center w-full">
                    <div className="relative border-[6px] border-card bg-card/25 rounded-[2.3rem] shadow-2xl overflow-hidden aspect-[9/19] w-72 border-border flex items-center justify-center">
                        {/* Speaker Notch */}
                        <div className="absolute top-0 inset-x-0 h-6 bg-card flex items-center justify-center z-20">
                            <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
                        </div>
                        {/* Placeholder Content */}
                        <div className="p-6 text-center space-y-2 select-none">
                            <DevicePhoneMobileIcon className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                            <p className="text-xs font-bold text-muted-foreground/80">Screenshot Placeholder</p>
                            <p className="text-[10px] text-muted-foreground/50">Replace with real app screenshot</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* How Verification Works */}
            <div className="border-t border-border/40 pt-16 space-y-10">
                <div className="text-center space-y-3 max-w-xl mx-auto">
                    <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">How our verification works.</h2>
                    <p className="text-sm text-muted-foreground max-w-lg mx-auto">We manually review links, companies, and deadlines before publishing.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-4 md:p-5 space-y-2.5 rounded-xl border border-border bg-card/45">
                        <div className="p-2 bg-success/10 rounded-lg w-max">
                            <ShieldCheckIcon className="w-5 h-5 text-success" />
                        </div>
                        <h3 className="font-bold text-sm text-foreground">1. Direct-Source Checks</h3>
                        <p className="text-sm leading-relaxed text-muted-foreground">We trace the link back to official career platforms like Greenhouse, Lever, Workday, or direct company pages before publishing.</p>
                    </div>
                    <div className="p-4 md:p-5 space-y-2.5 rounded-xl border border-border bg-card/45">
                        <div className="p-2 bg-success/10 rounded-lg w-max">
                            <CheckBadgeIcon className="w-5 h-5 text-success" />
                        </div>
                        <h3 className="font-bold text-sm text-foreground">2. Spam Filtering</h3>
                        <p className="text-sm leading-relaxed text-muted-foreground">We aggressively filter out third-party blogs, mandatory sign-up traps, and MLM postings that clutter standard job boards.</p>
                    </div>
                    <div className="p-4 md:p-5 space-y-2.5 rounded-xl border border-border bg-card/45">
                        <div className="p-2 bg-success/10 rounded-lg w-max">
                            <ClockIcon className="w-5 h-5 text-success" />
                        </div>
                        <h3 className="font-bold text-sm text-foreground">3. Active Expiry Sweeps</h3>
                        <p className="text-sm leading-relaxed text-muted-foreground">Once applications close or the link expires, the posting is archived immediately so you only browse active listings.</p>
                    </div>
                </div>
            </div>

            {/* App vs Web Comparison */}
            <div className="border-t border-border/40 pt-16 space-y-8">
                <div className="text-center space-y-2 max-w-xl mx-auto">
                    <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Choose your experience.</h2>
                    <p className="text-sm text-muted-foreground">The web feed is great for browsing, but the app is built for serious job hunting.</p>
                </div>

                {/* Mobile Comparison Cards (Visible only on mobile/tablet) */}
                <div className="md:hidden space-y-4">
                    {[
                        { feature: 'Browse Opportunity Feed', web: true, app: true },
                        { feature: 'Filter by Batch & Skill', web: true, app: true },
                        { feature: 'Instant Push Notifications', web: false, app: true },
                        { feature: 'Offline Saving & Reading', web: false, app: true },
                        { feature: 'Application Tracker', web: false, app: true },
                    ].map((row) => (
                        <div key={row.feature} className="p-4 rounded-xl border border-border bg-card/35 space-y-3">
                            <h4 className="font-bold text-foreground text-sm">{row.feature}</h4>
                            <div className="grid grid-cols-2 gap-3 text-xs">
                                <div className="p-2 rounded bg-muted/20 flex flex-col items-center">
                                    <span className="text-muted-foreground text-[10px] uppercase font-semibold">Web Platform</span>
                                    <span className="mt-1 font-bold text-foreground text-sm">{row.web ? 'Yes' : 'No'}</span>
                                </div>
                                <div className="p-2 rounded bg-primary/10 border border-primary/20 flex flex-col items-center">
                                    <span className="text-primary text-[10px] uppercase font-semibold">Mobile App</span>
                                    <span className="mt-1 font-bold text-primary text-sm">{row.app ? 'Yes' : 'No'}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Desktop Comparison Table (Visible only on md+) */}
                <div className="hidden md:block max-w-3xl mx-auto overflow-hidden rounded-xl border border-border bg-card/35">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-border bg-muted/20 text-sm font-semibold text-foreground">
                                <th className="p-4">Features</th>
                                <th className="p-4 text-center">Web Platform</th>
                                <th className="p-4 text-center text-primary">Mobile App</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-muted-foreground divide-y divide-border/60">
                            <tr>
                                <td className="p-4 font-medium text-foreground">Browse Opportunity Feed</td>
                                <td className="p-4 text-center">Yes</td>
                                <td className="p-4 text-center text-foreground font-semibold">Yes</td>
                            </tr>
                            <tr>
                                <td className="p-4 font-medium text-foreground">Filter by Batch & Skill</td>
                                <td className="p-4 text-center">Yes</td>
                                <td className="p-4 text-center text-foreground font-semibold">Yes</td>
                            </tr>
                            <tr>
                                <td className="p-4 font-medium text-foreground">Instant Push Notifications</td>
                                <td className="p-4 text-center">No</td>
                                <td className="p-4 text-center text-primary font-bold">Yes</td>
                            </tr>
                            <tr>
                                <td className="p-4 font-medium text-foreground">Offline Saving & Reading</td>
                                <td className="p-4 text-center">No</td>
                                <td className="p-4 text-center text-primary font-bold">Yes</td>
                            </tr>
                            <tr>
                                <td className="p-4 font-medium text-foreground">Application Tracker</td>
                                <td className="p-4 text-center">No</td>
                                <td className="p-4 text-center text-primary font-bold">Yes</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
