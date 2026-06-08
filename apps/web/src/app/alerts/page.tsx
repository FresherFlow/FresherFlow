import { notFound } from 'next/navigation';

export default function FrozenUserRoute() {
  notFound();
}

// /* WEB PIVOT: old user route implementation preserved below for later restoration.
// import { redirect } from 'next/navigation';
// // import RedirectToApp from '@/components/ui/RedirectToApp';
// 
// export const metadata = {
//     title: 'Alerts',
//     description: 'Relevant job updates based on your profile - now available on mobile.',
// };
// 
// export default function AlertsPage() {
//     // TEMPORARY PIVOT: Redirect web users to download page
//     redirect('/download');
// 
//     // return <RedirectToApp title="Alerts moved to Mobile" />;
// }
// 
// */
// 
// 

