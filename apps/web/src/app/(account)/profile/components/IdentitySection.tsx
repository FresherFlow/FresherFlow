'use client';

import React from 'react';
import { Input } from '@/ui/Input';
import { Badge } from '@/ui/Badge';
import { Button } from '@/ui/Button';
import { CheckBadgeIcon, PencilSquareIcon, CheckIcon } from '@heroicons/react/24/outline';

interface IdentitySectionProps {
    fullName: string;
    setFullName: (v: string) => void;
    email?: string;
    username?: string;
    isEditing: boolean;
    onToggleEdit: () => void;
    onSave: () => void;
    saving: boolean;
}

export const IdentitySection = ({
    fullName,
    setFullName,
    email,
    isEditing,
    onToggleEdit,
    onSave,
    saving
}: IdentitySectionProps) => {
    const initials = fullName ? fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U';

    return (
        <div className="w-full bg-card rounded-xl border border-border/60 shadow-sm p-5 h-full flex flex-col justify-center">
            {!isEditing ? (
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-bold shrink-0">
                            {initials}
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold text-foreground flex items-center gap-1.5">
                                {fullName || <span className="italic text-muted-foreground font-normal">Not set</span>}
                                {email && <CheckBadgeIcon className="w-5 h-5 text-primary" />}
                            </h2>
                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                                {email || 'No email available'}
                                {email && <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">Verified</Badge>}
                            </p>
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={onToggleEdit} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                        <PencilSquareIcon className="w-4 h-4" />
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-base font-bold text-foreground">Personal Info</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Full Name"
                            disabled={saving}
                        />
                        <Input
                            type="email"
                            value={email || ''}
                            disabled
                            className="bg-muted opacity-70"
                        />
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={onToggleEdit} disabled={saving}>Cancel</Button>
                        <Button size="sm" onClick={onSave} disabled={saving} className="gap-1.5">
                            <CheckIcon className="w-3.5 h-3.5" /> Save
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
