import LoginForm from './LoginForm';

export const metadata = {
    title: 'Sign In | FresherFlow',
    description: 'Sign in to FresherFlow - access your personalized feed of verified jobs, internships, and walk-ins for freshers.',
    robots: {
        index: false,
        follow: false,
    },
};

export default function LoginPage() {
    return <LoginForm />;
}
