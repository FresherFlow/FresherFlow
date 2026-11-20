"use client";

import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { CopyButton } from "@/ui/CopyButton";

function toText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(toText).join("");
  if (isValidElement(node)) return toText((node.props as { children?: ReactNode }).children);
  return "";
}

/** Fenced code block with a language label and the app's existing CopyButton. */
export function CodeBlock({ children }: { children: ReactNode }) {
  const items = Children.toArray(children);
  const codeEl = items.find((item) => isValidElement(item)) as ReactElement | undefined;
  const className = (codeEl?.props as { className?: string } | undefined)?.className ?? "";
  const language = /language-([\w-]+)/.exec(className)?.[1];
  const code = items.map(toText).join("").replace(/\n$/, "");

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
      <div className="absolute right-2 top-2 opacity-0 transition-opacity focus-within:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:group-hover/code:opacity-100">
        <CopyButton value={code} />
      </div>
    </div>
  );
}
