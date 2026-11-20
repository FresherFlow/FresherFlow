"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/ui/cn";
import { getDocsOrder, type SkillNavItem } from "./docs-nav";

function PagerLink({
  href,
  label,
  title,
  direction,
}: {
  href: string;
  label: string;
  title: string;
  direction: "prev" | "next";
}) {
  const isPrev = direction === "prev";
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col gap-1 rounded-lg border border-border bg-card p-4 transition-colors duration-150 ease-out",
        "[@media(hover:hover)_and_(pointer:fine)]:hover:border-primary/50",
        isPrev ? "sm:items-start" : "sm:col-start-2 sm:items-end"
      )}
    >
      <span className="flex items-center gap-1.5 text-micro font-medium uppercase tracking-widest text-muted-foreground">
        {isPrev && <ArrowLeft className="size-3.5" aria-hidden="true" />}
        {label}
        {!isPrev && <ArrowRight className="size-3.5" aria-hidden="true" />}
      </span>
      <span className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
        {title}
      </span>
    </Link>
  );
}

export function DocsPager({ skills }: { skills: SkillNavItem[] }) {
  const pathname = usePathname();
  const order = getDocsOrder(skills);
  const index = order.findIndex((item) => item.href === pathname);
  if (index === -1) return null;

  const prev = order[index - 1];
  const next = order[index + 1];
  if (!prev && !next) return null;

  return (
    <nav
      className="mt-16 grid gap-3 border-t border-border pt-8 sm:grid-cols-2"
      aria-label="Documentation pagination"
    >
      {prev ? (
        <PagerLink href={prev.href} label="Previous" title={prev.title} direction="prev" />
      ) : (
        <span aria-hidden="true" />
      )}
      {next && <PagerLink href={next.href} label="Next" title={next.title} direction="next" />}
    </nav>
  );
}
