import { redirect } from 'next/navigation';

export default function FrozenUserRoute() {
  redirect('/download');
}

// /* WEB PIVOT: old user route implementation preserved below for later restoration.
// import { redirect } from 'next/navigation';
// // import RedirectToApp from '@/components/ui/RedirectToApp';
// // import DashboardClient from './DashboardClient';
// 
// export const metadata = {
//     title: 'Dashboard',
//     description: 'Your personalized dashboard for freshers - latest jobs, walk-ins, and internships curated for your profile.',
// };
// 
// export default function DashboardPage() {
//     // TEMPORARY PIVOT: Redirect web users to download page
//     redirect('/download');
// 
//     // return <RedirectToApp title="Dashboard moved to Mobile" />;
//     
//     // return <DashboardClient />;
// }
// 
// */
// 
// 

