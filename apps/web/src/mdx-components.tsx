import type { MDXComponents } from "mdx/types";
import { isValidElement, type ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Info, Lightbulb } from "lucide-react";

import { CopyButton } from "@/ui/CopyButton";
import { cn } from "@/ui/cn";

/** Flatten MDX children to plain text so code blocks can be copied. */
function nodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement(node)) {
    return nodeText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

/** Back link at the top of every doc page. */
/** Copyable endpoint row, matching the OpenSEO docs' URL boxes. */
export function DocEndpoint({ value }: { value: string }) {
  return (
    <div className="mt-6 flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
      <code className="min-w-0 flex-1 overflow-x-auto font-mono text-sm text-foreground">
        {value}
      </code>
      <CopyButton value={value} />
    </div>
  );
}

export function DocBackLink() {
  return (
    <Link
      href="/docs"
      className="mb-8 inline-flex items-center gap-1.5 text-meta font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="size-3.5" aria-hidden="true" />
      Back to Docs
    </Link>
  );
}

const callouts = {
  note: { icon: Info, label: "Note", className: "border-signal-heat/30 bg-signal-heat/5 text-signal-heat" },
  tip: { icon: Lightbulb, label: "Tip", className: "border-signal-live/30 bg-signal-live/5 text-signal-live" },
  warning: {
    icon: AlertTriangle,
    label: "Warning",
    className: "border-signal-aging/30 bg-signal-aging/5 text-signal-aging",
  },
};

/** Docs callout. Icon and label carry the meaning; colour only reinforces it. */
export function DocCallout({
  variant = "note",
  title,
  children,
}: {
  variant?: keyof typeof callouts;
  title?: string;
  children: ReactNode;
}) {
  const { icon: Icon, label, className } = callouts[variant];
  return (
    <aside className={cn("mt-6 flex gap-3 rounded-lg border p-4", className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title ?? label}</p>
        <div className="mt-1 text-sm leading-6 text-foreground/90 [&>p]:mt-0">{children}</div>
      </div>
    </aside>
  );
}

/**
 * Element mapping for every `.mdx` page in the app.
 *
 * `@next/mdx` requires this file for App Router MDX. Styles are utility
 * classes, not a `prose` wrapper, because `@tailwindcss/typography` is not a
 * dependency of this app. Tokens only, so docs follow the site's theme.
 */
const components: MDXComponents = {
  DocBackLink,
  DocCallout,
  DocEndpoint,
  h1: ({ children }) => (
    <h1 className="font-display text-4xl font-extrabold tracking-tight text-foreground text-balance">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="font-display mt-12 scroll-mt-24 border-b border-border pb-2 text-2xl font-bold tracking-tight text-foreground">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-8 scroll-mt-24 text-lg font-semibold text-foreground">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="mt-6 text-base font-semibold text-foreground">{children}</h4>
  ),
  p: ({ children }) => (
    <p className="mt-5 text-base leading-7 text-foreground text-pretty">{children}</p>
  ),
  a: ({ children, href }) => {
    const destination = href ?? "#";
    const className =
      "font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground";
    return destination.startsWith("/") ? (
      <Link href={destination} className={className}>
        {children}
      </Link>
    ) : (
      <a href={destination} className={className}>
        {children}
      </a>
    );
  },
  ul: ({ children }) => (
    <ul className="mt-5 list-disc space-y-2 pl-6 text-base leading-7 text-foreground">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-5 list-decimal space-y-2 pl-6 text-base leading-7 text-foreground">
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
  code: ({ children, className }) => {
    if (className) return <code className={className}>{children}</code>;
    return (
      <code className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono ff-code-inline-size text-foreground">
        {children}
      </code>
    );
  },
  pre: ({ children }) => {
    const code = nodeText(children).replace(/\n$/, "");
    const codeElement = Array.isArray(children)
      ? children.find((child) => isValidElement(child))
      : children;
    const language =
      (isValidElement(codeElement) &&
        /language-([\w-]+)/.exec((codeElement.props as { className?: string }).className ?? "")?.[1]) ||
      null;

    return (
      <div className="group/code relative mt-6 overflow-hidden rounded-lg border border-border bg-muted">
        {language && (
          <div className="flex h-8 items-center border-b border-border px-3 font-mono text-micro uppercase tracking-widest text-muted-foreground">
            {language}
          </div>
        )}
        <pre className="overflow-x-auto p-4 pr-12 font-mono text-xs leading-6 text-foreground sm:text-sm">
          {children}
        </pre>
        <div className="absolute right-2 top-2">
          <CopyButton value={code} />
        </div>
      </div>
    );
  },
  table: ({ children }) => (
    <div className="mt-6 overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-border bg-muted/60">{children}</thead>
  ),
  th: ({ children }) => (
    <th className="px-4 py-2.5 font-semibold text-foreground">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-b border-border px-4 py-2.5 align-top text-foreground/90 last:border-b-0">
      {children}
    </td>
  ),
};

export function useMDXComponents(inherited?: MDXComponents): MDXComponents {
  return { ...inherited, ...components };
}
