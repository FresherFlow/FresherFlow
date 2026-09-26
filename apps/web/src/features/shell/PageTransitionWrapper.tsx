'use client';
/* eslint-disable shadcn/no-unknown-classes */

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
  const [sweepKey, setSweepKey] = React.useState(0);
  const pathname = usePathname();

  // Expose the sweep trigger to the rest of the app
  React.useEffect(() => {
    triggerSweepGlobal = () => setSweepKey(prev => prev + 1);
  }, []);

  // Admin routes own their shell (TopHeaderBar + AdminSidebar), so they get no
  // wrapper divs and no sweep: return the tree unchanged.
  const isAdminRoute = pathname === '/admin' || pathname?.startsWith('/admin/');
  if (isAdminRoute) return <>{children}</>;

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
            @layer components {
              .page-sweep {
                animation: pageSweepAnim 300ms cubic-bezier(0.65, 0, 0.35, 1) forwards;
              }
            }
          `}</style>
          <div
            key={`sweep-anim-${sweepKey}`}
            className="page-sweep motion-reduce:animate-none fixed inset-0 z-50 pointer-events-none border-l-8 border-t-8 border-primary/20"
            style={{
              transformOrigin: 'top left',
              background: 'linear-gradient(135deg, var(--color-background) 0%, var(--color-muted) 60%, oklch(from var(--color-accent) l c h / 0.1) 100%)',
            }}
          />
        </>
      )}
    </div>
  );
}
