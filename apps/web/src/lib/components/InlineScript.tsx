'use client'

/**
 * Renders an inline script that executes once, during HTML parsing on the
 * server, and is never executed by React on the client.
 *
 * On the server the `type` is `text/javascript`, so the browser runs the
 * script synchronously before first paint. On the client it renders
 * `type="text/plain"`, which React treats as a non-executable data block and
 * therefore never warns about ("Encountered a script tag while rendering
 * React component"). `suppressHydrationWarning` swallows the type mismatch
 * between server markup and the client tree.
 */
export function InlineScript({ html, id }: { html: string; id?: string }) {
  return (
    <script
      id={id}
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}