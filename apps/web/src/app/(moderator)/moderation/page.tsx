import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
    title: { absolute: 'Moderation | FresherFlow' },
    robots: { index: false, follow: false },
};

const QUEUES = [
    { href: '/moderation/submissions', title: 'Job submissions', text: 'Community-shared jobs awaiting review. Approve to publish or reject with a reason the contributor sees.' },
    { href: '/moderation/interviews', title: 'Interview experiences', text: 'Interview write-ups go live immediately. Triage newest-first; remove or spam-flag what is inappropriate.' },
    { href: '/moderation/updates', title: 'Hiring updates', text: 'Hiring updates are live on arrival. Removal is permanent — only remove clear violations.' },
    { href: '/moderation/resources', title: 'Resources', text: 'Resource collections awaiting review. Approve to publish or remove to reject.' },
    { href: '/moderation/reports', title: 'Community reports', text: 'User reports on jobs and discussions. Resolve, dismiss, or remove the reported content and resolve.' },
    { href: '/moderation/content', title: 'Community content', text: 'Hiring-update posts triage: archive spam, remove violations, restore on appeal.' },
];

export default function ModerationOverviewPage() {
    return (
        <div className="space-y-4">
            <ul className="grid gap-3 sm:grid-cols-2">
                {QUEUES.map((queue) => (
                    <li key={queue.href} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                        <Link href={queue.href} className="font-medium text-foreground underline-offset-4 hover:underline">
                            {queue.title}
                        </Link>
                        <p className="mt-1 text-sm text-muted-foreground">{queue.text}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
}
