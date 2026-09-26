'use client';

import React, { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

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
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin') ?? false;
  const [sweepKey, setSweepKey] = React.useState(0);

  // Expose the sweep trigger to the rest of the app
  React.useEffect(() => {
    triggerSweepGlobal = () => setSweepKey(prev => prev + 1);
  }, []);

  // Admin is dynamic no-store with no page transition — bypass entirely (flat, no animation).
  // WS3: keep this bypass. The sweep must never render on /admin routes (admin blink).
  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <div className="relative overflow-clip flex-1 flex flex-col min-h-screen w-full">
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
            @media (prefers-reduced-motion: reduce) {
              .ff-page-sweep {
                animation: none !important;
                display: none !important;
              }
            }
          `}</style>
          <div
            key={`sweep-anim-${sweepKey}`}
            className="ff-page-sweep fixed inset-0 z-50 pointer-events-none bg-background shadow-xl border-l-8 border-t-8 border-primary/20 motion-reduce:hidden"
            style={{
              transformOrigin: 'top left',
              animation: 'pageSweepAnim 1.4s cubic-bezier(0.65, 0, 0.35, 1) forwards'
            }}
          >
            {/* Subtle diagonal shadow detail — tokens only, flat */}
            <div className="absolute inset-0 bg-gradient-to-br from-muted/10 via-foreground/10 to-transparent" />
          </div>
        </>
      )}
    </div>
  );
}
