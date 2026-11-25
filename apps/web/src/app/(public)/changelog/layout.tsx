import type { Metadata } from 'next';

// MDX pages compile as Client Components, so `metadata` cannot be exported
// from page.mdx. The route layout is the Server Component that owns it.
export const metadata: Metadata = {
    title: 'Changelog',
    description: 'A short, dated record of what changed on FresherFlow.',
    alternates: {
        canonical: '/changelog',
    },
};

export default function ChangelogLayout({ children }: { children: React.ReactNode }) {
    return children;
}
