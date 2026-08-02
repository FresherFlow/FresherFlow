'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/ui/Dialog';

interface PayloadModalProps {
  open: boolean;
  data: unknown;
  onClose: () => void;
  title?: string;
}

export function PayloadModal({ open, data, onClose, title }: PayloadModalProps) {
  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col p-6 bg-card border border-border">
        <DialogHeader>
          <DialogTitle className="text-xs font-bold font-mono text-foreground truncate">
            {title || 'Raw Payload Inspector'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 bg-muted/30 rounded-lg border border-border font-mono text-[11px] text-foreground mt-2">
          <pre>{JSON.stringify(data, null, 2)}</pre>
        </div>
      </DialogContent>
    </Dialog>
  );
}
