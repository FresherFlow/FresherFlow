'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/ui/Dialog';
import { PluginEntry, IngestionTarget } from '../types';

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
  const [ats, setAts] = useState('');
  const [slug, setSlug] = useState('');
  const [company, setCompany] = useState('');
  const [dryRun, setDryRun] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ats || !slug || !company) return;

    onRunCustom({ ats, slug, company }, dryRun);
    onClose();
    setSlug('');
    setCompany('');
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-md bg-card border border-border p-6">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold">Add & Run On-Demand Target</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 text-xs">
          <div>
            <label className="block font-mono text-muted-foreground mb-1">ATS Provider Engine</label>
            <select
              value={ats}
              onChange={(e) => setAts(e.target.value)}
              required
              className="w-full h-9 px-3 rounded-lg border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs"
            >
              <option value="">Select ATS Provider...</option>
              {adapters.map((p) => (
                <option key={p.provider} value={p.provider}>
                  {p.providerName} ({p.provider})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-mono text-muted-foreground mb-1">Company Name</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="e.g. Razorpay"
              required
              className="w-full h-9 px-3 rounded-lg border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary text-xs"
            />
          </div>

          <div>
            <label className="block font-mono text-muted-foreground mb-1">Board / Target Slug</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. razorpaysoftwareprivatelimited"
              required
              className="w-full h-9 px-3 rounded-lg border border-border/80 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono text-xs"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="dryRunCheck"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              className="rounded border-border/80 bg-background text-primary focus:ring-primary"
            />
            <label htmlFor="dryRunCheck" className="font-mono text-muted-foreground cursor-pointer">
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
