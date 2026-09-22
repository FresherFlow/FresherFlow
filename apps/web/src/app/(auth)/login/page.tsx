import type { Metadata } from 'next';
import LoginForm from './_components/LoginForm';

export const revalidate = false;

interface LoginPageProps {
    searchParams: Promise<{ intent?: string; ref?: string }>;
}

export async function generateMetadata({ searchParams }: LoginPageProps): Promise<Metadata> {
    const { intent, ref } = await searchParams;
    const isSignupIntent = intent === 'signup' || Boolean(ref);

    return isSignupIntent
        ? {
            title: 'Create your account',
            description: 'Create your free FresherFlow account with your email — off-campus jobs, internships and walk-in drives for freshers.',
            robots: {
                index: false,
                follow: false,
            },
        }
        : {
            title: 'Sign In',
            description: 'Sign in to FresherFlow - find off-campus jobs, internships, and walk-in drives shared by freshers.',
            robots: {
                index: false,
                follow: false,
            },
        };
}

export default function LoginPage() {
    return <LoginForm />;
}
