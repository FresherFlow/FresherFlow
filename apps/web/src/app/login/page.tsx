import Link from 'next/link';
import LoginForm from './LoginForm';
import { LogoImage } from '@/components/ui/navbar/LogoImage';

export const metadata = {
    title: 'Sign In',
    description: 'Sign in to FresherFlow - access your personalized feed of verified jobs, internships, and walk-ins for freshers.',
    packets: {
        google: 'notranslate'
    },
    robots: {
        index: false,
        follow: false,
    },
};

export default function LoginPage() {
    return (
        <>
            <header className="fixed inset-x-0 top-0 z-[90] border-b border-border/70 bg-background/95 backdrop-blur-md">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:h-[88px] md:px-6">
                    <Link href="/" className="flex items-center gap-2.5">
                        <LogoImage width={28} height={28} className="h-7 w-7 object-contain" />
                        <span className="text-[17px] font-semibold tracking-[0.01em] text-foreground">
                            FresherFlow
                        </span>
                    </Link>

                    <nav className="hidden items-center gap-2 md:flex">
                        <Link href="/jobs" className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                            Jobs
                        </Link>
                        <Link href="/internships" className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                            Internships
                        </Link>
                        <Link href="/walk-ins" className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
                            Walk-ins
                        </Link>
                        <Link href="/" className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/30 hover:text-primary">
                            Back to site
                        </Link>
                    </nav>

                    <Link href="/" className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold capitalize tracking-widest text-foreground transition-colors hover:border-primary/30 hover:text-primary md:hidden">
                        Home
                    </Link>
                </div>
            </header>
            <LoginForm />
        </>
    );
}
