'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/ui/Dialog';
import { PluginEntry, IngestionTarget } from '../types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Field } from '@/ui/Field';
import { Input } from '@/ui/Input';
import { NativeSelect as Select } from"@/ui/NativeSelect";

const targetSchema = z.object({
 ats: z.string().min(1, 'ATS provider is required'),
 company: z.string().min(1, 'Company name is required'),
 slug: z.string().min(1, 'Slug is required'),
 dryRun: z.boolean(),
});

type FormValues = z.infer<typeof targetSchema>;

interface AddTargetModalProps {
 open: boolean;
 adapters: PluginEntry[];
 onClose: () => void;
 onRunCustom: (target: IngestionTarget, isDryRun: boolean) => void;
}

export function AddTargetModal({
 open,
 adapters,
 onClose,
 onRunCustom,
}: AddTargetModalProps) {
 const {
 register,
 handleSubmit,
 reset,
 formState: { errors },
 } = useForm<FormValues>({
 resolver: zodResolver(targetSchema),
 defaultValues: {
 ats: '',
 company: '',
 slug: '',
 dryRun: false,
 },
 });

 const onSubmit = (data: FormValues) => {
 onRunCustom({ ats: data.ats, slug: data.slug, company: data.company }, data.dryRun);
 onClose();
 // Preserve ats and dryRun choices for subsequent openings
 reset({ ats: data.ats, company: '', slug: '', dryRun: data.dryRun });
 };

 return (
 <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
 <DialogContent className="max-w-md bg-card border border-border p-6">
 <DialogHeader>
 <DialogTitle className="text-sm font-bold">Add & Run On-Demand Target</DialogTitle>
 </DialogHeader>

 <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2 text-xs">
 <Field label="ATS Provider Engine" error={errors.ats?.message} required labelClassName="">
 <Select
 {...register('ats')}
 className="text-xs"
 >
 <option value="" disabled hidden>Select ATS Provider...</option>
 {adapters.map((p) => (
 <option key={p.provider} value={p.provider}>
 {p.providerName} ({p.provider})
 </option>
 ))}
 </Select>
 </Field>

 <Field label="Company Name" error={errors.company?.message} required labelClassName="">
 <Input
 {...register('company')}
 placeholder="e.g. Razorpay"
 className="text-xs"
 />
 </Field>

 <Field label="Board / Target Slug" error={errors.slug?.message} required labelClassName="">
 <Input
 {...register('slug')}
 placeholder="e.g. razorpaysoftwareprivatelimited"
 className="text-xs"
 />
 </Field>

 <div className="flex items-center gap-2 pt-1">
 <input
 type="checkbox"
 id="dryRunCheck"
 {...register('dryRun')}
 className="w-4 h-4 rounded border-border/80 bg-card text-primary focus:ring-1 focus:ring-primary focus:ring-offset-0 accent-primary cursor-pointer transition-colors"
 />
 <label htmlFor="dryRunCheck" className="text-muted-foreground cursor-pointer">
 Dry Run Mode (Preview without DB write)
 </label>
 </div>

 <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
 <button
 type="button"
 onClick={onClose}
 className="h-8 px-3 rounded-lg border border-border bg-muted/30 hover:bg-muted text-muted-foreground hover:text-foreground text-xs transition-colors"
 >
 Cancel
 </button>
 <button
 type="submit"
 className="h-8 px-4 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs transition-colors shadow-xs"
 >
 Run Target
 </button>
 </div>
 </form>
 </DialogContent>
 </Dialog>
 );
}

