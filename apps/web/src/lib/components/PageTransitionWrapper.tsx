'use client';

import React, { ReactNode } from 'react';

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
    <div className="relative overflow-hidden flex-1 flex flex-col min-h-screen w-full">
      {/* Main content layer */}
      <div key="content-body" className="relative z-10 flex-1 flex flex-col w-full">
        {children}
      </div>

      {/* Page sweep overlay layer */}
      {/*
          This layer flies on top of the screen.
          When sweepKey changes, it runs the "paper peel" animation.
      */}
      {sweepKey > 0 && (
        <>
          <style>{`
            @keyframes pageSweepAnim {
              0% {
                clip-path: polygon(0% 0%, 0% 0%, 0% 0%, 0% 0%);
                opacity: 1;
              }
              70% {
                clip-path: polygon(0% 0%, 210% 0%, 0% 210%, 0% 0%);
                opacity: 1;
              }
              100% {
                clip-path: polygon(0% 0%, 300% 0%, 0% 300%, 0% 0%);
                opacity: 0;
              }
            }
          `}</style>
          <div
            key={`sweep-anim-${sweepKey}`}
            className="fixed inset-0 z-[200] pointer-events-none bg-background shadow-[0_0_100px_rgba(0,0,0,0.2)] border-l-[12px] border-t-[12px] border-primary/20"
            style={{
              transformOrigin: 'top left',
              background: 'linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--muted)) 60%, hsl(var(--accent)/0.1) 100%)',
              animation: 'pageSweepAnim 1.4s cubic-bezier(0.65, 0, 0.35, 1) forwards'
            }}
          >
            {/* Subtle diagonal shadow detail */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-black/10 to-transparent" />
          </div>
        </>
      )}
    </div>
  );
}
