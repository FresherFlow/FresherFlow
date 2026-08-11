'use client';

import toast from 'react-hot-toast';
import Link from 'next/link';

/**
 * Non-intrusive login prompt toast that displays a toast with a "Log in" action button
 * instead of forcefully redirecting unauthenticated users to /login.
 */
export function promptLoginToast(
  message = 'Sign in to save opportunities',
  redirectPath?: string
) {
  const currentPath = typeof window !== 'undefined'
    ? `${window.location.pathname}${window.location.search}`
    : '/';
  const targetPath = redirectPath || currentPath;
  const loginUrl = `/login?redirect=${encodeURIComponent(targetPath)}`;

  toast((t) => (
    <div className="flex items-center justify-between gap-3 w-full py-0.5">
      <span className="text-xs font-medium text-foreground">{message}</span>
      <Link
        href={loginUrl}
        onClick={() => toast.dismiss(t.id)}
        className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity whitespace-nowrap shrink-0"
      >
        Log in
      </Link>
    </div>
  ), {
    id: 'login-prompt-toast',
    duration: 5000,
  });
}
