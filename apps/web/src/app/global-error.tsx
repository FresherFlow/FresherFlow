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
          {/* Never render `error.message`. This boundary is the one guaranteed to
              run in production, and a server-component failure puts server-side
              detail in that message — the app's own rule is to log the detail
              server-side and show the client a generic string. Sentry above has
              the real error; the digest below is enough to correlate it. */}
          <p style={{ color: '#666', fontSize: '0.875rem' }}>An unexpected error occurred. Please try again.</p>
          {error?.digest && <p style={{ color: '#999', fontSize: '0.75rem', marginTop: '0.5rem' }}>Error ID: {error.digest}</p>}
        </div>
      </body>
    </html>
  );
}
