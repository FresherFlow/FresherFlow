'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link2, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { profileApi } from '@/lib/api/profile';
import { Input } from '@/ui/Input';
import { Textarea } from '@/ui/Textarea';
import { Button } from '@/ui/Button';
import { ProfileSectionCard } from '@/features/profile/components/sections/ProfileSectionCard';
import {
    buildHeadlinePayload,
    splitFullName,
    validateHeadlinePayload,
    type HeadlineDraft as Draft,
} from '@/features/profile/headline';

/**
 * Headline & Bio — a form, always open.
 *
 * Photo: minimal professional URL input only — no preset gallery. Users who
 * want a photo paste a URL; empty falls back to initials. Preview is a
 * h-16 w-16 rounded-full on the left, URL field on the right. Public photo
 * appears at fresherflow.in/u/[username].
 */
export function HeadlineSection() {
    const { user, profile, updateProfileState } = useAuth();

    const saved: Draft = {
        ...splitFullName(user?.fullName),
        headline: profile?.headline || '',
        about: profile?.about || '',
        avatarUrl: profile?.avatarUrl || '',
    };

    const [draft, setDraft] = useState<Draft>(saved);
    const [saving, setSaving] = useState(false);
    const [avatarBroken, setAvatarBroken] = useState(false);

    // Re-hydrate when the stored profile changes underneath us.
    useEffect(() => {
        setDraft({
            ...splitFullName(user?.fullName),
            headline: profile?.headline || '',
            about: profile?.about || '',
            avatarUrl: profile?.avatarUrl || '',
        });
        setAvatarBroken(false);
    }, [user?.fullName, profile]);

    const isDirty =
        draft.firstName !== saved.firstName ||
        draft.lastName !== saved.lastName ||
        draft.headline !== saved.headline ||
        draft.about !== saved.about ||
        draft.avatarUrl !== saved.avatarUrl;

    const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
        setDraft((prev) => ({ ...prev, [key]: value }));

    const handleSave = async () => {
        const payload = buildHeadlinePayload(draft);
        const problem = validateHeadlinePayload(payload);
        if (problem) {
            toast.error(problem);
            return;
        }

        setSaving(true);
        try {
            // Persist first, then update the local cache — the UI never says
            // "saved" for a write the server rejected.
            await profileApi.updateProfile(payload as never);
            updateProfileState(payload);
            toast.success('Profile updated.');
        } catch {
            toast.error('Could not save. Check your connection and try again.');
        } finally {
            setSaving(false);
        }
    };

    const initials = (draft.firstName[0] || '') + (draft.lastName[0] || '');
    const trimmedAvatar = draft.avatarUrl.trim();
    const hasAvatar = Boolean(trimmedAvatar) && !avatarBroken;

    return (
        <ProfileSectionCard title="Headline & Bio">
            <form
                className="space-y-5"
                onSubmit={(e) => {
                    e.preventDefault();
                    void handleSave();
                }}
            >
                {/* Photo — clean premium: preview left, single URL input right */}
                <div className="flex gap-4">
                    <div className="shrink-0">
                        {hasAvatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={trimmedAvatar}
                                alt="Profile photo preview"
                                onError={() => setAvatarBroken(true)}
                                className="h-16 w-16 rounded-full border border-border/60 object-cover shadow-sm"
                            />
                        ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border/60 bg-muted text-sm font-semibold text-muted-foreground shadow-sm">
                                {initials.toUpperCase() || 'U'}
                            </div>
                        )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                            <label
                                htmlFor="profile-avatar"
                                className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground"
                            >
                                <Link2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                                Photo URL
                            </label>
                            {hasAvatar && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setAvatarBroken(false);
                                        set('avatarUrl', '');
                                    }}
                                    className="ml-auto inline-flex items-center gap-1.5 whitespace-nowrap text-xs h-7 px-2"
                                >
                                    <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                                    Remove photo
                                </Button>
                            )}
                        </div>
                        <Input
                            id="profile-avatar"
                            type="url"
                            inputMode="url"
                            value={draft.avatarUrl}
                            onChange={(e) => {
                                setAvatarBroken(false);
                                set('avatarUrl', e.target.value);
                            }}
                            placeholder="https://example.com/photo.jpg"
                        />
                        <p className="text-[11px] text-muted-foreground">
                            Shown on fresherflow.in/u/{user?.username ?? 'username'} — leave empty to use initials
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                        <label htmlFor="profile-first-name" className="text-xs font-medium text-foreground">
                            First name
                        </label>
                        <Input
                            id="profile-first-name"
                            value={draft.firstName}
                            onChange={(e) => set('firstName', e.target.value)}
                            autoComplete="given-name"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label htmlFor="profile-last-name" className="text-xs font-medium text-foreground">
                            Last name
                        </label>
                        <Input
                            id="profile-last-name"
                            value={draft.lastName}
                            onChange={(e) => set('lastName', e.target.value)}
                            autoComplete="family-name"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="profile-headline" className="text-xs font-medium text-foreground">
                        Headline
                    </label>
                    <Input
                        id="profile-headline"
                        value={draft.headline}
                        onChange={(e) => set('headline', e.target.value)}
                        placeholder="Final-year CSE student · Python & SQL"
                        maxLength={120}
                    />
                    <p className="text-xs text-muted-foreground">
                        {draft.headline.length}/120 — this is the line on your profile card.
                    </p>
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="profile-about" className="text-xs font-medium text-foreground">
                        About
                    </label>
                    <Textarea
                        id="profile-about"
                        rows={5}
                        value={draft.about}
                        onChange={(e) => set('about', e.target.value)}
                        placeholder="What you have built, what you are learning, and the kind of role you want."
                    />
                </div>

                <div className="flex items-center justify-end gap-3 border-t border-border/50 pt-4">
                    <span className="mr-auto text-xs text-muted-foreground" aria-live="polite">
                        {saving ? 'Saving…' : isDirty ? 'Unsaved changes' : 'All changes saved'}
                    </span>
                    <Button type="submit" size="sm" disabled={!isDirty || saving}>
                        {saving ? 'Saving…' : 'Save'}
                    </Button>
                </div>
            </form>
        </ProfileSectionCard>
    );
}
