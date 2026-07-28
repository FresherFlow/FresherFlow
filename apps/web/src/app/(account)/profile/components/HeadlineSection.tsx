'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { profileApi } from '@/lib/api/profile';
import toast from 'react-hot-toast';
import { Input } from '@/ui/Input';
import { Button } from '@/ui/Button';
import { PlusIcon, PencilSquareIcon, CheckIcon } from '@heroicons/react/24/outline';
import { cn } from '@/ui/cn';

interface HeadlineSectionProps {
    isEditingExternal?: boolean;
    onCloseExternal?: () => void;
}

export function HeadlineSection({ isEditingExternal, onCloseExternal }: HeadlineSectionProps = {}) {
    const { user, profile, updateProfileState, refreshUser } = useAuth();
    const [internalIsEditing, setInternalIsEditing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isEditing = isEditingExternal ?? internalIsEditing;
    const setIsEditing = (val: boolean) => {
        setInternalIsEditing(val);
        if (!val && onCloseExternal) onCloseExternal();
    };

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [headline, setHeadline] = useState(profile?.headline || '');
    const [about, setAbout] = useState(profile?.about || '');
    const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl || '');

    useEffect(() => {
        if (user?.fullName) {
            const parts = user.fullName.trim().split(' ');
            setFirstName(parts[0] || '');
            setLastName(parts.slice(1).join(' ') || '');
        } else {
            setFirstName('');
            setLastName('');
        }
        if (profile) {
            setHeadline(profile.headline || '');
            setAbout(profile.about || '');
            setAvatarUrl(profile.avatarUrl || '');
        }
    }, [user?.fullName, profile]);

    const handleSave = () => {
        const combinedName = `${firstName.trim()} ${lastName.trim()}`.trim();
        if (!combinedName) {
            toast.error('Full name cannot be empty');
            return;
        }

        const payload = {
            fullName: combinedName,
            headline: headline.trim() || undefined,
            about: about.trim() || undefined,
            avatarUrl: avatarUrl.trim() || null,
        };

        // Local first -> Firebase RTDB -> Non-blocking API sync
        updateProfileState(payload, () => profileApi.updateProfile(payload as any));
        toast.success('Updated successfully!');
        setIsEditing(false);
    };

    const hasContent = Boolean(profile?.headline || profile?.about);

    return (
        <div className="w-full">
            <div className="flex justify-between items-start mb-2">
                <h3 className="text-base font-bold text-foreground">Headline & Bio</h3>
                {!isEditing && (
                    <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setIsEditing(true)} 
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        title="Edit Name, Headline & Bio"
                    >
                        {hasContent ? <PencilSquareIcon className="w-4 h-4" /> : <PlusIcon className="w-4 h-4" />}
                    </Button>
                )}
            </div>

            {hasContent ? (
                <div className="space-y-2 mt-1">
                    {profile?.headline && (
                        <p className="text-base font-semibold text-foreground">{profile.headline}</p>
                    )}
                    {profile?.about && (
                        <p className="text-sm text-foreground/80 whitespace-pre-line">{profile.about}</p>
                    )}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground italic">Add a professional headline and bio.</p>
            )}

            {isEditing && (
                <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 shadow-2xl animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border shadow-2xl p-8 space-y-6">
                        <div className="flex justify-between items-center pb-2 border-b border-border/40">
                            <h3 className="font-bold text-lg text-foreground">Edit Identity, Headline & Bio</h3>
                            <button onClick={() => setIsEditing(false)} className="text-muted-foreground hover:text-foreground">✕</button>
                        </div>
                        <div className="space-y-6">
                            {/* Candidate Name Fields */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">Candidate Full Name</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <Input
                                            type="text"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            placeholder="First Name"
                                            disabled={isSubmitting}
                                            className="h-10 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <Input
                                            type="text"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            placeholder="Last Name"
                                            disabled={isSubmitting}
                                            className="h-10 text-sm"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Avatar URL */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">Avatar / Logo URL (Optional)</label>
                                <Input
                                    type="url"
                                    value={avatarUrl}
                                    onChange={(e) => setAvatarUrl(e.target.value)}
                                    placeholder="https://example.com/my-avatar.png"
                                    disabled={isSubmitting}
                                    className="h-10 text-sm"
                                />
                            </div>

                            {/* Headline */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">Professional Headline</label>
                                <Input
                                    type="text"
                                    value={headline}
                                    onChange={(e) => setHeadline(e.target.value)}
                                    placeholder="e.g. Full Stack Developer | Final Year CS Undergrad"
                                    disabled={isSubmitting}
                                    className="h-10 text-sm"
                                />
                            </div>

                            {/* Bio / About */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">Executive Summary / Bio</label>
                                <textarea
                                    rows={4}
                                    value={about}
                                    onChange={(e) => setAbout(e.target.value)}
                                    placeholder="Tell recruiters about your background, key achievements, and career aspirations..."
                                    disabled={isSubmitting}
                                    className={cn(
                                        "flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm",
                                        "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20",
                                        "disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                                    )}
                                />
                            </div>
                            
                            <div className="flex justify-end gap-4 pt-1">
                                <Button variant="outline" className="h-10 px-4 text-xs font-medium" onClick={() => setIsEditing(false)} disabled={isSubmitting}>Cancel</Button>
                                <Button className="h-10 px-4 gap-1.5 text-xs font-medium" onClick={handleSave} disabled={isSubmitting}>
                                    <CheckIcon className="w-3.5 h-3.5" /> Save Changes
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

