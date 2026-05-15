import { redirect } from 'next/navigation';

export default function FrozenUserRoute() {
  redirect('/download');
}

// /* WEB PIVOT: old user route implementation preserved below for later restoration.
// import Link from 'next/link';
// import { redirect } from 'next/navigation';
// // import LoginForm from './LoginForm';
// 
// export const metadata = {
//     title: 'Sign In',
//     description: 'Sign in to FresherFlow - access your personalized feed of verified jobs, internships, and walk-ins for freshers.',
//     packets: {
//         google: 'notranslate'
//     },
//     robots: {
//         index: false,
//         follow: false,
//     },
// };
// 
// export default function LoginPage() {
//     // TEMPORARY PIVOT: Redirect web users to download page
//     redirect('/download');
// 
//     return (
//         <>
//             {/* TEMPORARY PIVOT: Redirect web users to mobile for auth */}
//             <div className="min-h-screen flex items-center justify-center pt-20 px-4">
//                 <div className="max-w-md w-full space-y-8 p-8 rounded-3xl border border-border bg-card text-center shadow-xl">
//                     <div className="space-y-4">
//                         <h1 className="text-2xl font-bold tracking-tight">Login moved to Mobile</h1>
//                         <p className="text-muted-foreground">
//                             Personalized features like Saved Jobs and the Application Tracker are now exclusive to the FresherFlow Mobile App.
//                         </p>
//                     </div>
//                     <div className="pt-4 flex flex-col gap-3">
//                         <Link 
//                             href="/opportunities" 
//                             className="premium-button w-full justify-center text-xs capitalize tracking-widest"
//                          >
//                             Get the Mobile App
//                         </Link>
//                         <Link 
//                             href="/" 
//                             className="text-sm font-medium text-primary hover:underline"
//                         >
//                             Continue as Guest
//                         </Link>
//                     </div>
//                     <p className="pt-6 text-[10px] text-muted-foreground uppercase tracking-widest leading-loose">
//                         Official Discovery Layer • Guest Access Enabled
//                     </p>
//                 </div>
//             </div>
// 
//             {/* 
//             <LoginForm /> 
//             */}
//         </>
//     );
// }
// 
// */
// 
// 

