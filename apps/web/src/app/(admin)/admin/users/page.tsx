'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api/admin';
import { useFirebaseAdmin } from '@/lib/hooks/useFirebaseAdmin';
import LoadingScreen from '@/ui/LoadingScreen';

interface UserData {
    id: string;
    firebase_uid?: string;
    username?: string;
    email?: string;
    fullName?: string;
    role?: string;
    trustLevel?: string;
    createdAt?: string;
}

export default function AdminUsersPage() {
    const { isAuthenticated } = useFirebaseAdmin();
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated) return;

        const fetchUsers = async () => {
            try {
                const res = await adminApi.getUsers() as { users: UserData[] };
                setUsers(res.users || []);
            } catch (err) {
                console.error('[Admin API Users Fetch Fail]', err);
            } finally {
                setLoading(false);
            }
        };

        void fetchUsers();
    }, [isAuthenticated]);

    if (loading) {
        return <LoadingScreen message="Loading users data..." />;
    }

    return (
        <div className="space-y-6 pb-12 animate-in fade-in duration-500 text-foreground">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">Registered Users</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage and view all student profiles registered on the platform.
                    </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-full border border-border">
                    <span className="font-bold text-foreground">{users.length}</span> Total Users
                </div>
            </header>

            <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                            <tr>
                                <th className="px-6 py-4 font-semibold">User Profile</th>
                                <th className="px-6 py-4 font-semibold">Username</th>
                                <th className="px-6 py-4 font-semibold">Firebase UID</th>
                                <th className="px-6 py-4 font-semibold text-right">Joined At</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                                            <svg className="w-10 h-10 mb-3 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                            <p className="font-medium text-foreground">No registered users found.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-muted/40 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase border border-primary/20 shrink-0">
                                                    {(user.fullName || user.email || user.username || 'U')[0]}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-foreground tracking-tight flex items-center gap-2">
                                                        {user.fullName || <span className="italic text-muted-foreground">No Name</span>}
                                                        {user.trustLevel === 'VERIFIED' && (
                                                            <span className="bg-emerald-500/10 text-emerald-600 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-emerald-500/20">Verified</span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mt-0.5">
                                                        {user.email || 'No email provided'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-[13px] text-foreground">
                                            {user.username ? (
                                                <span className="font-medium">@{user.username}</span>
                                            ) : (
                                                <span className="text-muted-foreground italic">None</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-[11px] text-muted-foreground">
                                            <div className="bg-muted px-2 py-1 rounded-md inline-block">
                                                {user.firebase_uid || user.id}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-muted-foreground text-right whitespace-nowrap">
                                            {user.createdAt ? (
                                                <div className="flex flex-col items-end">
                                                    <span className="font-medium text-foreground/80">
                                                        {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                    <span className="text-[10px] mt-0.5">
                                                        {new Date(user.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            ) : (
                                                '—'
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Mobile Card View */}
                <div className="md:hidden grid grid-cols-1 divide-y divide-border">
                    {users.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="flex flex-col items-center justify-center text-muted-foreground">
                                <svg className="w-10 h-10 mb-3 text-muted-foreground/30" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                <p className="font-medium text-foreground">No registered users found.</p>
                            </div>
                        </div>
                    ) : (
                        users.map((user) => (
                            <div key={user.id} className="p-4 hover:bg-muted/20 transition-colors">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm uppercase border border-primary/20 shrink-0">
                                        {(user.fullName || user.email || user.username || 'U')[0]}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-foreground tracking-tight flex items-center gap-2 truncate">
                                            <span className="truncate">{user.fullName || <span className="italic text-muted-foreground">No Name</span>}</span>
                                            {user.trustLevel === 'VERIFIED' && (
                                                <span className="bg-emerald-500/10 text-emerald-600 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider border border-emerald-500/20 shrink-0">Verified</span>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-0.5 truncate">
                                            {user.email || 'No email provided'}
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-muted/40 p-2 rounded-lg border border-border/50">
                                        <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-0.5">Username</p>
                                        {user.username ? (
                                            <p className="font-mono text-foreground">@{user.username}</p>
                                        ) : (
                                            <p className="text-muted-foreground italic">None</p>
                                        )}
                                    </div>
                                    <div className="bg-muted/40 p-2 rounded-lg border border-border/50">
                                        <p className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground mb-0.5">Joined</p>
                                        <p className="text-foreground">
                                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-2 text-[10px] text-muted-foreground font-mono truncate px-1">
                                    UID: {user.firebase_uid || user.id}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
