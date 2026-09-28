import type { Metadata } from 'next';
import ReportsClient from '@/features/moderation/components/ReportsQueue';

export const metadata: Metadata = {
    title: { absolute: 'Reports | FresherFlow Admin' },
    robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/** Short purpose line for the page. It replaced a sentence that leaked internal
 *  engineering commentary (which datastore backs the queue, and what is or is
 *  not a dependency) into text a moderator reads while triaging. */
const PAGE_DESCRIPTION = 'Triage reports the community filed on jobs and comments.';

export default function Page() {
    return (
        // `flex-1 min-h-0 overflow-y-auto` is load-bearing: the admin shell
        // clips its content column, so a page without its own scroll container
        // cannot be scrolled and the last reports are unreachable. `min-h-0` is
        // what lets this flex child shrink far enough for `overflow-y-auto` to
        // engage at all.
        //
        // The header lives here, not in `ReportsClient`: the same component is
        // also a tab of `/admin/dashboard` and a page under `/moderation`, and
        // both of those shells already have an h1. Keeping the heading at the
        // route means it can never double up, and it also means a refetch (the
        // queue re-fetches on every status change) cannot take the heading off
        // screen the way a loading branch inside the component did.
        //
        // The `h1` stays in the document but is visually hidden below `lg`:
        // `TopHeaderBar` prints the route name at `lg+` and `MobileTopNav`
        // prints it below `lg`, so on a phone this heading was the name a
        // second time. `sr-only` rather than `hidden` keeps the page's
        // heading for screen readers, and `lg:not-sr-only` restores the
        // desktop rendering exactly. The description is body copy, so it is
        // `text-base` — matching the scale used on /admin/users and /admin/audit.
        //
        // No page-level top padding: AdminLayoutClient already reserves the
        // mobile top offset with `pt-14 md:pt-18 lg:pt-0` on the content column.
        // `pb-20` clears the fixed AdminBottomNav, which does render on this
        // path and is `md:hidden`, so `md:p-8` — which includes the bottom edge —
        // takes over from there.
        <div className="flex-1 min-h-0 overflow-y-auto space-y-6 p-4 text-foreground md:p-8">
            <div className="flex shrink-0 flex-wrap items-end justify-between gap-2">
                <div>
                    <h1 className="sr-only lg:not-sr-only text-2xl font-semibold tracking-tight text-foreground">User reports</h1>
                    <p className="mt-1 text-base text-muted-foreground">{PAGE_DESCRIPTION}</p>
                </div>
            </div>

            <ReportsClient />
        </div>
    );
}
