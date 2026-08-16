'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import ArrowRightIcon from '@heroicons/react/24/outline/ArrowRightIcon';
import LinkIcon from '@heroicons/react/24/outline/LinkIcon';
import CheckIcon from '@heroicons/react/24/outline/CheckIcon';
import ShareIcon from '@heroicons/react/24/outline/ShareIcon';
import { analytics } from '@/lib/api/analytics';
import { buildInviteUrl } from '@/lib/utils/share';
import { referralApi } from '@/lib/api/client';
import { SHARE_BASE_URL } from '@/lib/utils/runtimeConfig';
import { calculateProfileCompletion } from '@fresherflow/utils';

// Profile completion banner
export function ProfileCompletionBanner() {
    const { profile, isLoading } = useAuth();
    const pct = calculateProfileCompletion(profile).percentage;

    if (isLoading || !profile || pct >= 100) return null;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 bg-card border border-border/50 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
            <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">
                        Profile completeness
                    </p>
                    <span className="text-sm font-medium text-muted-foreground">{pct}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                    />
                </div>
            </div>
            <div className="shrink-0">
                <Link
                    href="/profile/complete"
                    className="inline-flex items-center justify-center h-9 px-4 text-xs font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap active:scale-95"
                >
                    Complete profile
                </Link>
            </div>
        </div>
    );
}

// Referral link button
export function ReferralLinkButton() {
    const { user } = useAuth();
    const [copied, setCopied] = useState(false);
    const [shared, setShared] = useState(false);
    const [referralCode, setReferralCode] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        if (!user?.id) return;
        referralApi.getMe()
            .then((res) => {
                const data = res as { referralCode: string } | null;
                if (!cancelled && data?.referralCode) setReferralCode(data.referralCode);
            })
            .catch(() => { /* silent */ });
        return () => { cancelled = true; };
    }, [user?.id]);

    if (!user?.id) return null;

    const origin = typeof window !== 'undefined' ? window.location.origin : SHARE_BASE_URL;
    // Use short code if loaded, otherwise fall back to user id (will update once fetched)
    const referralUrl = buildInviteUrl(origin, referralCode ?? user.id);

    const shareData = {
        title: 'Join me on FresherFlow',
        text: 'Use FresherFlow to find verified fresher jobs, internships, and walk-ins.',
        url: referralUrl,
    };

    const flashState = (type: 'copied' | 'shared') => {
        if (type === 'copied') {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            return;
        }
        setShared(true);
        setTimeout(() => setShared(false), 2000);
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(referralUrl);
            analytics.inviteShare('copy_link');
            flashState('copied');
        } catch {
            const el = document.createElement('textarea');
            el.value = referralUrl;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
            analytics.inviteShare('copy_link_fallback');
            flashState('copied');
        }
    };

    const handleShare = async () => {
        if (navigator.share && (!navigator.canShare || navigator.canShare(shareData))) {
            try {
                await navigator.share(shareData);
                analytics.inviteShare('native_share');
                flashState('shared');
                return;
            } catch (error) {
                if ((error as Error).name === 'AbortError') return;
            }
        }
        await handleCopy();
    };

    return (
        <div className="inline-flex items-center gap-1.5">
            <button
                onClick={handleShare}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold capitalize tracking-widest text-muted-foreground hover:text-primary transition-colors"
                title="Share your invite link"
            >
                {shared ? (
                    <>
                        <CheckIcon className="w-3.5 h-3.5 text-success" />
                        <span className="text-success">Shared</span>
                    </>
                ) : (
                    <>
                        <ShareIcon className="w-3.5 h-3.5" />
                        Invite a friend
                    </>
                )}
            </button>
            <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 text-[11px] font-bold capitalize tracking-widest text-muted-foreground hover:text-primary transition-colors"
                title="Copy your invite link"
            >
                {copied ? (
                    <>
                        <CheckIcon className="w-3.5 h-3.5 text-success" />
                        <span className="text-success">Copied</span>
                    </>
                ) : (
                    <>
                        <LinkIcon className="w-3.5 h-3.5" />
                        Copy link
                    </>
                )}
            </button>
        </div>
    );
}
