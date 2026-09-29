'use client';

import { Button } from '@/ui/Button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/ui/Dialog';
import { Input } from '@/ui/Input';
import { Label } from '@/ui/label';
import { Textarea } from '@/ui/Textarea';
import { cn } from '@/ui/cn';
import { useIntroRequest } from '@/features/profile/hooks/useIntroRequest';

/**
 * The recruiter's "Apply to Hire" dialog on the public profile page.
 *
 * The form, its validation and the POST all live in `useIntroRequest` and
 * `publicProfile.ts`; this component only decides what to render for each of the
 * three request states (editing / sending / sent). The page owns `isOpen` so the
 * CTA stays the single place that opens the flow.
 */
export default function ApplyToHireModal({
    username,
    candidateId,
    candidateName,
    isOpen,
    onClose,
}: {
    username: string;
    /** Required by the intro-request endpoint, which resolves the target by id. */
    candidateId: string;
    candidateName: string;
    isOpen: boolean;
    onClose: () => void;
}) {
    const { state, form, isRecruiter, setIsRecruiter, setField, submit } = useIntroRequest({
        username,
        candidateId,
        enabled: isOpen,
    });

    const handleClose = () => {
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-md">
                {state === 'sent' ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Request sent</DialogTitle>
                            <DialogDescription>
                                {candidateName} has your details and will get back to you.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button type="button" onClick={handleClose}>
                                Done
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <form
                        onSubmit={(event) => {
                            event.preventDefault();
                            void submit();
                        }}
                        className="space-y-4"
                    >
                        <DialogHeader>
                            <DialogTitle>Hiring {candidateName}?</DialogTitle>
                            <DialogDescription>
                                {candidateName}&apos;s public profile shows skills, projects and
                                availability. Send a short intro and your details go straight to them.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-2">
                            <Label htmlFor="intro-name">Your name</Label>
                            <Input
                                id="intro-name"
                                value={form.name}
                                onChange={(event) => setField('name', event.target.value)}
                                autoComplete="name"
                                placeholder="Priya Sharma"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="intro-company">Company</Label>
                            <Input
                                id="intro-company"
                                value={form.company}
                                onChange={(event) => setField('company', event.target.value)}
                                autoComplete="organization"
                                placeholder="Acme Technologies"
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="intro-email">Email</Label>
                                <Input
                                    id="intro-email"
                                    type="email"
                                    value={form.email}
                                    onChange={(event) => setField('email', event.target.value)}
                                    autoComplete="email"
                                    placeholder="you@company.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="intro-phone">Phone</Label>
                                <Input
                                    id="intro-phone"
                                    type="tel"
                                    value={form.phone}
                                    onChange={(event) => setField('phone', event.target.value)}
                                    autoComplete="tel"
                                    placeholder="+91 90000 00000"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="intro-message">Message</Label>
                            <Textarea
                                id="intro-message"
                                value={form.message}
                                onChange={(event) => setField('message', event.target.value)}
                                rows={4}
                                placeholder="What role are you hiring for?"
                            />
                        </div>

                        <label
                            className={cn(
                                'flex cursor-pointer items-start gap-2 text-xs text-muted-foreground select-none',
                            )}
                        >
                            <input
                                type="checkbox"
                                checked={isRecruiter}
                                onChange={(event) => setIsRecruiter(event.target.checked)}
                                className="mt-0.5 h-4 w-4 rounded border-border/80 accent-primary"
                            />
                            <span>I am contacting {candidateName} about a role.</span>
                        </label>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={state === 'sending'}>
                                {state === 'sending' ? 'Sending…' : 'Send request'}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
