'use client';

import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// We create a way to trigger the sweep that doesn't rely on the SiteMode context swap
// By making the switch tell this wrapper to sweep
let triggerSweepGlobal: () => void = () => {};

export function triggerPageSweep() {
  triggerSweepGlobal();
}

interface PageTransitionWrapperProps {
  children: ReactNode;
}

export function PageTransitionWrapper({ children }: PageTransitionWrapperProps) {
  const [sweepKey, setSweepKey] = React.useState(0);

  // Expose the sweep trigger to the rest of the app
  React.useEffect(() => {
    triggerSweepGlobal = () => setSweepKey(prev => prev + 1);
  }, []);

  return (
    <div className="relative overflow-hidden min-h-screen">
      {/* Main content layer */}
      <div key="content-body" className="relative z-10">
        {children}
      </div>

      {/* Page sweep overlay layer */}
      {/*
          This layer flies on top of the screen.
          It is completely decoupled from the data switch.
          When sweepKey changes, it runs the "paper peel" animation.
      */}
      <AnimatePresence mode="wait">
        {sweepKey > 0 && (
          <motion.div
            key={`sweep-anim-${sweepKey}`}
            initial={{
              clipPath: 'polygon(0% 0%, 0% 0%, 0% 0%, 0% 0%)',
              opacity: 1
            }}
            animate={{
              clipPath: 'polygon(0% 0%, 300% 0%, 0% 300%, 0% 0%)',
              opacity: [1, 1, 0] // Covers the screen, then hides
            }}
            exit={{
              opacity: 0,
              transition: { duration: 0.2 }
            }}
            transition={{
              duration: 1.4,
              ease: [0.65, 0, 0.35, 1],
              opacity: { times: [0, 0.7, 1], duration: 1.4 }
            }}
            className="fixed inset-0 z-[200] pointer-events-none bg-background shadow-[0_0_100px_rgba(0,0,0,0.2)] border-l-[12px] border-t-[12px] border-primary/20"
            style={{
              transformOrigin: 'top left',
              background: 'linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--muted)) 60%, hsl(var(--accent)/0.1) 100%)',
            }}
          >
            {/* Subtle diagonal shadow detail */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-black/10 to-transparent" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
