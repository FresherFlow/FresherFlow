import { redirect } from 'next/navigation';

export default function FrozenUserRoute() {
  redirect('/app');
}

// /* WEB PIVOT: old user route implementation preserved below for later restoration.
// import type { Metadata } from 'next';
// import LogoutClient from './LogoutClient';
// 
// export const metadata: Metadata = {
//     robots: {
//         index: false,
//         follow: false,
//     },
// };
// 
// export default function LogoutPage() {
//     return <LogoutClient />;
// }
// 
// */
// 
// 

