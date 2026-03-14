import React from 'react';
import { CompactSection, Field } from '@/features/profile/components/ProfileSection';

interface IdentitySectionProps {
    fullName: string;
    setFullName: (v: string) => void;
    email?: string;
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
    return (
        <CompactSection
            title="Personal Details"
            onSave={onSave}
            saving={saving}
            isEditing={isEditing}
            onToggleEdit={onToggleEdit}
            viewContent={
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Full Name</p>
                        <p className="text-sm md:text-base font-medium text-foreground">{fullName || <span className="opacity-50 italic">Not set</span>}</p>
                    </div>
                    <div>
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Verified Email</p>
                        <p className="text-sm md:text-base font-medium text-foreground opacity-80 break-all">{email}</p>
                    </div>
                </div>
            }
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Full Name">
                    <input 
                        type="text" 
                        value={fullName} 
                        onChange={e => setFullName(e.target.value)} 
                        className="premium-input text-sm h-11 md:h-10" 
                        placeholder="Enter name" 
                    />
                </Field>
                <Field label="Email Address">
                    <input 
                        type="email" 
                        value={email || ''} 
                        disabled 
                        className="premium-input text-sm h-11 md:h-10 opacity-50 cursor-not-allowed bg-muted" 
                    />
                </Field>
            </div>
        </CompactSection>
    );
};
