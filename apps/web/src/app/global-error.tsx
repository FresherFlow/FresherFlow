"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Something went wrong</h2>
          <p style={{ color: '#666', fontSize: '0.875rem' }}>{error?.message || 'An unexpected error occurred.'}</p>
          {error?.digest && <p style={{ color: '#999', fontSize: '0.75rem', marginTop: '0.5rem' }}>Error ID: {error.digest}</p>}
        </div>
      </body>
    </html>
  );
}
