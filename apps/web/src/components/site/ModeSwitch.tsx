'use client';

import { useSiteMode } from '@/contexts/SiteModeContext';
import { isGovernmentModeEnabled } from '@/lib/siteMode';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { triggerPageSweep } from '@/components/providers/PageTransitionWrapper';

export function ModeSwitch({ className }: { className?: string }) {
  const isProduction = process.env.NODE_ENV === 'production';
  const { mode, setMode } = useSiteMode();

  if (isProduction || !isGovernmentModeEnabled()) return null;

  const handleToggle = (newMode: 'private' | 'govt') => {
    if (newMode === mode) return;
    triggerPageSweep();
    setMode(newMode);
  };

  return (
    <div className={cn(
      "relative flex items-center bg-muted p-1 rounded-lg border border-border/20 self-center h-8",
      className
    )}>
      {/* Active background */}
      <motion.div
        className="absolute inset-y-1 bg-background rounded-md shadow-sm z-0"
        initial={false}
        animate={{
          x: mode === 'private' ? 4 : 70,
          width: mode === 'private' ? 66 : 56,
        }}
        transition={{
          type: "spring",
          stiffness: 450,
          damping: 35
        }}
      />

      <div className="relative flex items-center z-10">
        <button
          onClick={() => handleToggle('private')}
          className={cn(
            "w-[66px] h-6 flex items-center justify-center text-sm font-semibold transition-all duration-300 ml-1",
            mode === 'private' ? "text-foreground" : "text-muted-foreground/60 hover:text-foreground"
          )}
        >
          Private
        </button>
        <button
          onClick={() => handleToggle('govt')}
          className={cn(
            "w-[56px] h-6 flex items-center justify-center text-sm font-semibold transition-all duration-300 mr-1",
            mode === 'govt' ? "text-foreground" : "text-muted-foreground/60 hover:text-foreground"
          )}
        >
          Govt
        </button>
      </div>
    </div>
  );
}
