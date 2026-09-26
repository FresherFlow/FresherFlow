import Link from "next/link";
import { LogoImage } from "@/features/shell/LogoImage";
import { ThemeSwitcher } from "@/ui/ThemeSwitcher";

interface AuthShellProps {
    /** Brand-panel content rendered in the left column (desktop only). */
    left: React.ReactNode;
    /** Form content rendered in the right column, which fills its track. */
    children: React.ReactNode;
}

/**
 * Compact auth box shared by login, choose-username and onboarding.
 *
 * A centered, content-hugging card (~45/55 split on desktop, capped at
 * max-w-5xl) painted in the page background color — no contrasting card
 * surface. Screens own their left-panel and right-panel content; this
 * shell owns only the box.
 *
 * The right column scrolls internally when its content exceeds the viewport
 * cap, so the page never scrolls on desktop. The theme switcher floats at
 * the top-right of the card on every auth route.
 */
export function AuthShell({ left, children }: AuthShellProps) {
    return (
        <div className="flex h-full min-h-0 flex-1 justify-center overflow-y-auto bg-background p-4 lg:items-center lg:overflow-hidden lg:ff-shell-gutter lg:py-8">
            <div className="relative m-auto w-full max-w-md animate-in fade-in duration-300 border border-transparent bg-transparent lg:h-150 lg:max-w-5xl lg:ff-shell-max-h lg:overflow-hidden lg:rounded-4xl lg:border-border lg:bg-background lg:shadow-lg">
                <div className="hidden absolute right-4 top-4 z-10 lg:block lg:right-6 lg:top-6">
                    <ThemeSwitcher />
                </div>
                <div className="lg:grid lg:h-full lg:min-h-0 lg:ff-auth-split">
                    <div className="relative hidden min-h-0 w-full flex-col gap-6 overflow-hidden border-r border-border bg-background p-8 lg:flex">
                        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-40 ff-dot-grid" />
                        <Link
                            href="/"
                            aria-label="FresherFlow home"
                            className="relative flex items-center gap-2 text-xl font-bold tracking-tight hover:opacity-80 transition-opacity"
                        >
                            <LogoImage width={24} height={24} className="h-6 w-6 shrink-0" />
                            FresherFlow
                        </Link>
                        <div className="relative flex min-h-0 flex-1 flex-col justify-center overflow-hidden">{left}</div>
                    </div>
                    <div id="auth-panel" className="relative flex min-h-0 w-full flex-col gap-6 overflow-y-auto overscroll-contain rounded-3xl bg-card px-7 pb-7 pt-6 lg:h-full lg:ff-shell-max-h lg:justify-start lg:rounded-none lg:bg-muted/30 lg:p-10">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
