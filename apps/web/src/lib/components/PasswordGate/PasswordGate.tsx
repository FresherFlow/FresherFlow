'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import { verifyPassword } from './actions';

interface Props {
    title?: string;
    cookieName: string;
}

export default function PasswordGate({ title = 'Secure Portal', cookieName }: Props) {
    const router = useRouter();
    const [user, setUser] = useState('');
    const [pw, setPw] = useState('');
    const [error, setError] = useState(false);
    const [loading, setLoading] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = await verifyPassword(user, pw, cookieName);
        setLoading(false);
        if (!res.success) {
            setError(true);
            setPw('');
        } else {
            router.refresh();
        }
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <form onSubmit={submit} className="w-full max-w-sm space-y-4 bg-card border border-border p-8">
                <div className="flex flex-col items-center gap-2 mb-2">
                    <LockClosedIcon className="w-8 h-8 text-primary" />
                    <h1 className="text-lg font-bold tracking-tight text-foreground">{title}</h1>
                </div>
                <div className="space-y-3">
                    <input
                        type="text"
                        placeholder="Username"
                        autoFocus
                        value={user}
                        onChange={e => { setUser(e.target.value); setError(false); }}
                        className="w-full bg-background border border-border px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={pw}
                        onChange={e => { setPw(e.target.value); setError(false); }}
                        className="w-full bg-background border border-border px-4 py-3 text-sm focus:outline-none focus:border-primary transition-all"
                    />
                </div>
                {error && <p className="text-xs text-red-500">Incorrect username or password</p>}
                <button
                    type="submit"
                    disabled={!user || !pw || loading}
                    className="w-full h-11 bg-primary text-primary-foreground text-sm font-bold tracking-widest disabled:opacity-50"
                >
                    {loading ? '...' : 'Enter'}
                </button>
            </form>
        </div>
    );
}
