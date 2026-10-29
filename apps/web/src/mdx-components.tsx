import type { MDXComponents } from "mdx/types";

/**
 * Element mapping for every `.mdx` page in the app.
 *
 * WHY HERE: `@next/mdx` requires this file for App Router MDX and fails the
 * build without it. The styles are applied as utility classes rather than via
 * a `prose` wrapper because `@tailwindcss/typography` is not a dependency of
 * this app — `prose` on the docs page was inert, so the markdown rendered as
 * unstyled body text.
 *
 * Tokens only: no hardcoded colors, so the docs follow the light/dark theme
 * the rest of the site uses.
 */

const components: MDXComponents = {
  h1: ({ children }) => (
    <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="font-display mt-12 border-b border-border pb-2 text-2xl font-bold tracking-tight text-foreground">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-8 text-lg font-semibold text-foreground">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-6 text-base font-semibold text-foreground">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
      {children}
    </p>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      className="text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="mt-4 list-disc space-y-2 pl-6 text-sm leading-7 text-muted-foreground sm:text-base">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-4 list-decimal space-y-2 pl-6 text-sm leading-7 text-muted-foreground sm:text-base">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mt-6 border-l-2 border-border pl-4 text-sm italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-10 border-border" />,
  // Inline code and fenced blocks share the atom; a block is a `pre` wrapping
  // a `code`, so the inner element must not paint a second background.
  code: ({ children, className }) => {
    const isBlock = Boolean(className);
    if (isBlock) {
      return <code className={className}>{children}</code>;
    }
    return (
      <code className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mt-6 overflow-x-auto rounded-lg border border-border bg-muted p-4 font-mono text-xs leading-6 text-foreground sm:text-sm">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="mt-6 overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-border">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="py-2 pr-4 font-semibold text-foreground">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-b border-border py-2 pr-4 align-top text-muted-foreground">
      {children}
    </td>
  ),
};

/**
 * Next calls this with the component set it has collected so far; merging keeps
 * those and fills in the mapping above.
 */
export function useMDXComponents(inherited?: MDXComponents): MDXComponents {
  return { ...inherited, ...components };
}
