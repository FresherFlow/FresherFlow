'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { profileApi } from '@/lib/api/profile';
import toast from 'react-hot-toast';
import { Input } from '@/ui/Input';
import { Button } from '@/ui/Button';
import { PencilSquareIcon, PlusIcon, CheckIcon, GlobeAltIcon } from '@heroicons/react/24/outline';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/ui/Dialog';

export function PortfolioLinksSection() {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { profile, updateProfileState, refreshUser } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [portfolioUrl, setPortfolioUrl] = useState('');

    useEffect(() => {
        if (profile) {
            setPortfolioUrl(profile.portfolioUrl || '');
        }
    }, [profile]);

    const handleSave = () => {
        const payload = {
            portfolioUrl: portfolioUrl.trim() || undefined,
        };

        // Local first -> Firebase RTDB -> Non-blocking API sync
        updateProfileState(payload, () => profileApi.updateProfile(payload));
        toast.success('Updated successfully');
        setIsEditing(false);
    };

    const hasLinks = Boolean(profile?.portfolioUrl);

    return (
        <div className="w-full bg-card rounded-xl border border-border/60 shadow-sm p-5 h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-foreground">Projects & Portfolio</h3>
                {!isEditing && (
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                        {hasLinks ? <PencilSquareIcon className="w-4 h-4" /> : <PlusIcon className="w-4 h-4" />}
                    </Button>
                )}
            </div>

            {hasLinks ? (
                <div className="flex flex-col gap-2.5">
                    {profile?.portfolioUrl && (
                        <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-sm font-medium text-foreground hover:text-primary transition-colors group p-2 -mx-2 rounded-lg hover:bg-muted/50">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><GlobeAltIcon className="w-4 h-4" /></div>
                            <span className="truncate">Personal Portfolio</span>
                        </a>
                    )}
                </div>
            ) : (
                <p className="text-sm text-muted-foreground italic">Add links to your work.</p>
            )}

            <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Projects & Portfolio</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                            <Input type="url" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="Portfolio / Personal Website" disabled={isSubmitting} className="h-10" />
                            
                            <div className="flex justify-end gap-4 pt-2">
                                <Button variant="outline" className="h-10 px-4" onClick={() => setIsEditing(false)} disabled={isSubmitting}>Cancel</Button>
                                <Button className="h-10 px-4 gap-1.5" onClick={handleSave} disabled={isSubmitting}><CheckIcon className="w-3.5 h-3.5" /> Save</Button>
                            </div>
                        </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
