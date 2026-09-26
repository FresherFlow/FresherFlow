'use client';

import { Input } from '@/ui/Input';
import { ProfileSectionCard } from '@/features/profile/components/sections/ProfileSectionCard';
import { combineFullName, splitFullName } from '@/features/profile/headline';

/**
 * The name onboarding needs before the education save will accept anything —
 * `requireFullName` is on there, and this is the only place it is collected.
 * It sits above the education section on the first step and is saved by it.
 */
export function IdentityCard({
    fullName,
    setFullName,
    email,
    disabled = false,
    bare = false,
}: {
    fullName: string;
    setFullName: (value: string) => void;
    email?: string;
    disabled?: boolean;
    bare?: boolean;
}) {
    // Stored as one `fullName` string (what the API and validation read);
    // asked as two fields. Split/join live in `features/profile/headline.ts`
    // next to the editor's copy, so both stay identical.
    const { firstName, lastName } = splitFullName(fullName);
    const setFirstName = (value: string) => {
        const clean = value.replace(/\s+/g, '');
        setFullName(combineFullName(clean, lastName));
    };
    const setLastName = (value: string) => {
        const clean = value.replace(/^\s+/, '');
        setFullName(combineFullName(firstName, clean));
    };
    return (
        <ProfileSectionCard
            title="Your name"
            description="Recruiters see this on your profile and on every intro request."
            bare={bare}
        >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                    <label htmlFor="onboarding-first-name" className="text-xs font-medium text-foreground">
                        First name
                    </label>
                    <Input
                        id="onboarding-first-name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="e.g. Krish"
                        autoComplete="given-name"
                        disabled={disabled}
                    />
                </div>
                <div className="space-y-1.5">
                    <label htmlFor="onboarding-last-name" className="text-xs font-medium text-foreground">
                        Last name
                    </label>
                    <Input
                        id="onboarding-last-name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="e.g. Sharma"
                        autoComplete="family-name"
                        disabled={disabled}
                    />
                </div>
            </div>
            <div className="mt-4 space-y-1.5">
                <label htmlFor="onboarding-email" className="text-xs font-medium text-foreground">
                    Email
                </label>
                <Input
                    id="onboarding-email"
                    value={email || ''}
                    placeholder="Not set"
                    readOnly
                    disabled
                    aria-describedby="onboarding-email-hint"
                />
                <p id="onboarding-email-hint" className="text-xs text-muted-foreground">
                    Used for job alerts — not shown on your public page.
                </p>
            </div>
        </ProfileSectionCard>
    );
}
