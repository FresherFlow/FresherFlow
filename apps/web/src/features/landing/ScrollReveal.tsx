'use client';
import { useEffect, useRef, useState, HTMLAttributes } from 'react';
import { cn } from '@repo/ui/utils/cn';

interface ScrollRevealProps extends HTMLAttributes<HTMLDivElement> {
  delay?: number;
  className?: string;
  children: React.ReactNode;
}

export function ScrollReveal({ children, delay = 0, className, ...props }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasRevealed, setHasRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasRevealed(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.05, rootMargin: '-20px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        'transition-all duration-[500ms] ease-[cubic-bezier(0.23,1,0.32,1)]',
        hasRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3',
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
      {...props}
    >
      {children}
    </div>
  );
}
