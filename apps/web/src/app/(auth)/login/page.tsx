import LoginForm from './LoginForm';

export const revalidate = false;

export const metadata = {
    title: 'Sign In',
    description: 'Sign in to FresherFlow - find off-campus jobs, internships, and walk-in drives shared by freshers.',
    robots: {
        index: false,
        follow: false,
    },
};

export default function LoginPage() {
    return <LoginForm />;
}
