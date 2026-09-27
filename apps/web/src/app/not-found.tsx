'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ErrorState } from '@/features/shell/ErrorState';
import { Button } from '@/ui/Button';

// Static page — never changes. Permanently cache after first render to avoid
// compute charges on every bot hit against unknown/expired URLs.
export const revalidate = false;

const QUICK_LINKS = [
    { href: '/jobs', label: 'Jobs' },
    { href: '/jobs/internships', label: 'Internships' },
    { href: '/drives/walk-in', label: 'Walk-ins' },
];

export default function NotFoundPage() {
    const router = useRouter();
    return (
        <ErrorState
            code="404"
            title="Oops! Page not found."
            message="The link may be outdated, moved, or typed wrong. The rest of the platform is fine."
        >
            <Button variant="outline" onClick={() => router.back()}>
                Go back
            </Button>
            <Button asChild>
                <Link href="/">Back to home</Link>
            </Button>
            <div className="flex w-full items-center justify-center gap-4 pt-2 text-sm">
                {QUICK_LINKS.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                        {link.label}
                    </Link>
                ))}
            </div>
        </ErrorState>
    );
}
