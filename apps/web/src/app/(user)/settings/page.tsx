import { permanentRedirect } from 'next/navigation';

// The account hub moved to /account — forward any ?tab= with it.
export default async function SettingsPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string }>;
}) {
    const { tab } = await searchParams;
    permanentRedirect(tab ? `/account?tab=${tab}` : '/account');
}
