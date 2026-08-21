'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { UsernameGate } from '@/lib/components/ProfileGate';
import toast from 'react-hot-toast';
import {
    ArrowLeftIcon,
    UserIcon,
    ShieldExclamationIcon,
    ArrowLeftOnRectangleIcon,
    CheckBadgeIcon,
    ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/ui/Dialog';

function maskEmail(email: string): string {
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    const [local, domain] = parts;
    if (local.length <= 2) {
        return `${local[0] || '*'}***@${domain}`;
    }
    return `${local.slice(0, 2)}***@${domain}`;
}

function SettingsPageContent() {
    const router = useRouter();
    const { user, logout } = useAuth();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [confirmInput, setConfirmInput] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const maskedEmail = user?.email ? maskEmail(user.email) : 'Not provided';
    const expectedConfirmText = user?.username || 'DELETE';

    const handleDeleteAccount = () => {
        if (confirmInput.trim().toLowerCase() !== expectedConfirmText.toLowerCase()) {
            toast.error(`Please type "${expectedConfirmText}" to confirm.`);
            return;
        }
        setIsDeleting(true);
        setTimeout(() => {
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
            setConfirmInput('');
            toast.error('Account deletion is coming soon. Please contact support to request data removal.');
        }, 500);
    };

    const handleSignOutAll = () => {
        if (logout) {
            void logout('/login');
        } else {
            router.push('/logout');
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto px-4 py-6 md:py-8 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border/40 pb-4">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="p-2 hover:bg-muted rounded-xl transition-colors cursor-pointer"
                    aria-label="Go back"
                >
                    <ArrowLeftIcon className="w-5 h-5 text-muted-foreground" />
                </button>
                <div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
                        Account Settings
                    </h1>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Manage your account credentials, security preferences, and session actions.
                    </p>
                </div>
            </div>

            {/* Account Information Card */}
            <section className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                    <UserIcon className="w-4 h-4 text-muted-foreground" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Account Information
                    </h2>
                </div>

                <div className="bg-card border border-border/70 rounded-2xl p-5 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/40">
                        <div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                                Email Address
                            </span>
                            <span className="text-sm font-semibold text-foreground font-mono mt-0.5 block">
                                {maskedEmail}
                            </span>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-muted text-muted-foreground text-[11px] font-medium self-start sm:self-auto">
                            Passwordless / OTP Verified
                        </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block">
                                Candidate Handle
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-sm font-bold text-foreground">
                                    @{user?.username || 'candidate'}
                                </span>
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold border border-primary/20">
                                    <CheckBadgeIcon className="w-3 h-3" /> Candidate
                                </span>
                            </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                            {user?.fullName || 'Active User'}
                        </span>
                    </div>
                </div>
            </section>

            {/* Account Danger Zone */}
            <section className="space-y-2 pt-2">
                <div className="flex items-center gap-2 px-1">
                    <ShieldExclamationIcon className="w-4 h-4 text-destructive" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-destructive">
                        Danger Zone
                    </h2>
                </div>

                <div className="bg-card border border-destructive/30 rounded-2xl p-5 shadow-xs space-y-4">
                    {/* Log Out All Sessions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/40">
                        <div className="space-y-0.5">
                            <h3 className="text-sm font-bold text-foreground">Sign Out of All Sessions</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Terminate active login sessions across all your devices and browsers.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleSignOutAll}
                            className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                        >
                            <ArrowLeftOnRectangleIcon className="w-4 h-4" />
                            <span>Sign Out</span>
                        </button>
                    </div>

                    {/* Delete Account */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-0.5">
                            <h3 className="text-sm font-bold text-destructive">Delete Candidate Account</h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                                Permanently delete your profile, saved jobs, application tracker data, and account records.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsDeleteModalOpen(true)}
                            className="px-4 py-2 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 text-xs font-bold rounded-xl transition-colors shrink-0 cursor-pointer"
                        >
                            Delete Account
                        </button>
                    </div>
                </div>
            </section>

            {/* Confirmation Dialog for Account Deletion */}
            <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <div className="flex items-center gap-2 text-destructive mb-1">
                            <ExclamationTriangleIcon className="w-5 h-5 shrink-0" />
                            <DialogTitle className="text-destructive font-bold text-base">
                                Delete Candidate Account
                            </DialogTitle>
                        </div>
                        <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                            This action is permanent and cannot be undone. All your saved opportunities, profile data, and application tracker records will be removed.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <p className="text-xs font-medium text-foreground">
                            To confirm deletion, please type <span className="font-mono font-bold">{expectedConfirmText}</span> below:
                        </p>
                        <input
                            type="text"
                            value={confirmInput}
                            onChange={(e) => setConfirmInput(e.target.value)}
                            placeholder={expectedConfirmText}
                            className="w-full h-10 rounded-xl border border-border bg-background px-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-destructive/30"
                        />
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <button
                            type="button"
                            onClick={() => {
                                setIsDeleteModalOpen(false);
                                setConfirmInput('');
                            }}
                            className="px-4 py-2 rounded-xl bg-muted text-foreground text-xs font-semibold hover:bg-muted/80 transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={isDeleting || confirmInput.trim().toLowerCase() !== expectedConfirmText.toLowerCase()}
                            onClick={handleDeleteAccount}
                            className="px-4 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-semibold hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
                        >
                            {isDeleting ? 'Deleting...' : 'Confirm Deletion'}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function SettingsPage() {
    return (
        <UsernameGate>
            <SettingsPageContent />
        </UsernameGate>
    );
}
