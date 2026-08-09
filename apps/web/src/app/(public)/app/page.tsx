import { ArrowDownTrayIcon, DevicePhoneMobileIcon, CheckBadgeIcon, ClockIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { APP_LINKS } from '@/lib/config/links';
import DownloadMockup from '@/lib/layout/DownloadMockup';

export const metadata = {
    title: {
        absolute: 'Download FresherFlow Android App',
    },
    description: 'Join the fresher job sharing community. Share verified off-campus opportunities and get instant apply alerts with zero redirect spam.',
    alternates: {
        canonical: '/app',
    },
    openGraph: {
        type: 'website',
        title: 'Download FresherFlow Android App',
        description: 'Join the fresher job sharing community. Share verified off-campus opportunities and get instant apply alerts with zero redirect spam.',
        images: [
            {
                url: '/app/opengraph-image',
                width: 1200,
                height: 630,
                type: 'image/png',
                alt: 'Download FresherFlow Android App',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Download FresherFlow Android App',
        description: 'Join the fresher job sharing community. Share verified off-campus opportunities and get instant apply alerts with zero redirect spam.',
        images: ['/app/twitter-image'],
    }
};

export default function DownloadPage() {
    return (
        <div className="w-full flex-1 pt-3 pb-2 px-4 sm:px-5 md:pt-4 md:pb-4 md:px-8 space-y-12 md:space-y-14 max-w-6xl mx-auto selection:bg-primary/20">
            {/* Hero Section */}
            <div className="flex flex-col lg:grid lg:grid-cols-[1.18fr_0.82fr] gap-6 lg:gap-8 items-center">
                {/* Content Column */}
                <div className="flex flex-col space-y-6 md:space-y-7 w-full">
                    {/* 1. Headline */}
                    <div className="space-y-4 order-1">
                        <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/60 backdrop-blur shadow-sm">
                            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
                                Verified Opportunities. Instant Alerts.
                            </span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
                            Never Miss an <span className="text-primary">Off-Campus Deadline.</span>
                        </h1>
                        <p className="text-sm sm:text-base md:text-lg text-muted-foreground leading-relaxed">
                            Get instant alerts, save jobs offline, and track every application in one place.
                        </p>
                        <p className="hidden sm:block text-xs font-bold text-primary tracking-wide leading-none border-l-2 border-primary/40 pl-3 select-none">
                            Direct apply links. No junk in between.
                        </p>
                    </div>

                    {/* Trust Badges Credibility Banner */}
                    <div className="order-2 hidden sm:grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
                        <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/50 bg-card/25">
                            <CheckBadgeIcon className="w-4 h-4 text-success shrink-0" />
                            <div className="flex flex-col leading-tight">
                                <span className="text-[11px] font-bold text-foreground">Manually Reviewed</span>
                                <span className="text-[9px] text-muted-foreground mt-0.5">Verified Sources Only</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/50 bg-card/25">
                            <ShieldCheckIcon className="w-4 h-4 text-primary shrink-0" />
                            <div className="flex flex-col leading-tight">
                                <span className="text-[11px] font-bold text-foreground">Official Apply Links</span>
                                <span className="text-[9px] text-muted-foreground mt-0.5">No Redirect Spam</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/50 bg-card/25 col-span-2 sm:col-span-1">
                            <ClockIcon className="w-4 h-4 text-primary shrink-0" />
                            <div className="flex flex-col leading-tight">
                                <span className="text-[11px] font-bold text-foreground">Updated Daily</span>
                                <span className="text-[9px] text-muted-foreground mt-0.5">Expired Posts Removed</span>
                            </div>
                        </div>
                    </div>

                    {/* 2. Interactive Mockup on Mobile (Order 3 below LG, Hidden in this column on LG) */}
                    <div className="order-3 lg:hidden w-full pt-1 pb-1 flex justify-center">
                        <DownloadMockup />
                    </div>

                    {/* 3. Hero Buttons (Order 4 below LG - Placed at the bottom for comfortable thumb reach) */}
                    <div className="flex flex-col w-full sm:max-w-xl order-4 items-start select-none pb-6">
                        {/* Download CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-3.5 sm:gap-4 w-full">
                            <a
                                href={APP_LINKS.androidDownload}
                                className="premium-button w-full sm:w-auto px-5 py-3 text-[12px] uppercase font-bold tracking-widest flex items-center justify-center gap-2 !shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 bg-primary text-primary-foreground border border-primary/20 shrink-0"
                            >
                                <ArrowDownTrayIcon className="w-4 h-4" />
                                Download Android App
                            </a>
                            <div className="premium-button-outline w-full sm:w-auto px-5 py-3 text-[12px] uppercase font-semibold tracking-widest flex items-center justify-center gap-2 cursor-not-allowed opacity-75 bg-transparent border border-border/40 text-muted-foreground/80 !shadow-none shrink-0">
                                <DevicePhoneMobileIcon className="w-4 h-4 text-foreground/75" />
                                iOS Coming Soon
                            </div>
                        </div>

                        {/* Universal APK Helper Text Block (12px before helper text) */}
                        <div className="mt-2.5 pl-1.5 select-none leading-normal text-left">
                            <p className="text-[11px] text-muted-foreground/90">
                                Older or 32-bit device?<br />
                                <a
                                    href="https://github.com/MukeshCheekatla/FresherFlow/releases/latest/download/FresherFlow-universal.apk"
                                    className="text-primary hover:underline font-bold inline-flex items-center gap-0.5 mt-1"
                                >
                                    Try the Universal APK.
                                    <ArrowDownTrayIcon className="w-3 h-3" />
                                </a>
                            </p>
                        </div>

                        {/* Version Text Block (6px before version text) */}
                        <div className="mt-1.5 pl-1.5">
                            <span className="text-[9px] text-muted-foreground/35 tracking-wider uppercase font-bold">
                                Version {APP_LINKS.currentVersion}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Desktop Interactive Mockup (Visible only on LG+) */}
                <div className="hidden lg:flex w-full justify-end">
                    <DownloadMockup />
                </div>
            </div>

            {/* How Verification Works */}
            <div className="border-t border-border/40 pt-12 space-y-8">
                <div className="text-center space-y-2 max-w-xl mx-auto">
                    <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">How our verification works.</h2>
                    <p className="text-sm text-muted-foreground max-w-lg mx-auto">Every opportunity is reviewed before it appears on FresherFlow.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div className="p-4 md:p-5 space-y-2.5 rounded-xl border border-border bg-card/45">
                        <div className="p-2 bg-success/10 rounded-lg w-max">
                            <ShieldCheckIcon className="w-5 h-5 text-success" />
                        </div>
                        <h3 className="font-bold text-sm text-foreground">1. Direct-Source Checks</h3>
                        <p className="text-sm leading-relaxed text-muted-foreground">We trace every listing back to official career platforms like Greenhouse, Lever, Workday, or direct company pages.</p>
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
                        <p className="text-sm leading-relaxed text-muted-foreground">Closed or expired opportunities are removed immediately so you only see active listings.</p>
                    </div>
                </div>
            </div>

            {/* App vs Web Comparison */}
            <div className="border-t border-border/40 pt-12 space-y-6">
                <div className="text-center space-y-2 max-w-xl mx-auto">
                    <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Choose your experience.</h2>
                    <p className="text-sm text-muted-foreground">The web feed is great for browsing, but the app is built for serious job hunting.</p>
                </div>

                {/* Mobile Comparison Table (Compact row comparison) */}
                <div className="md:hidden divide-y divide-border/50 border border-border/80 rounded-xl overflow-hidden bg-card/25">
                    {[
                        { feature: 'Browse Opportunity Feed', web: true, app: true },
                        { feature: 'Filter by Batch & Skill', web: true, app: true },
                        { feature: 'Instant Push Notifications', web: false, app: true },
                        { feature: 'Offline Saving & Reading', web: false, app: true },
                        { feature: 'Application Tracker', web: false, app: true },
                    ].map((row) => (
                        <div key={row.feature} className="p-3.5 flex items-center justify-between text-xs">
                            <span className="font-semibold text-foreground">{row.feature}</span>
                            <div className="flex items-center gap-5 shrink-0">
                                <div className="flex flex-col items-center">
                                    <span className="text-[8px] uppercase tracking-wider font-bold text-muted-foreground">Web</span>
                                    <span className="mt-0.5 text-xs">{row.web ? '✅' : '❌'}</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-[8px] uppercase tracking-wider font-extrabold text-primary">App</span>
                                    <span className="mt-0.5 text-xs">{row.app ? '✅' : '❌'}</span>
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
