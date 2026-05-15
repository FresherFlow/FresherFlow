import { redirect } from 'next/navigation';
// import RedirectToApp from '@/components/ui/RedirectToApp';

export const metadata = {
    title: 'Account Settings',
    description: 'Manage your FresherFlow account - now exclusive to the mobile app.',
};

export default function AccountPage() {
    // TEMPORARY PIVOT: Redirect web users to download page
    redirect('/download');

    // return <RedirectToApp title="Account Settings moved to Mobile" />;
}
