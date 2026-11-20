import { AlertTriangle, Info, Lightbulb } from "lucide-react";
import { cn } from "@/ui/cn";

type Variant = "note" | "tip" | "warning";

const config: Record<Variant, { icon: typeof Info; label: string; className: string }> = {
  note: {
    icon: Info,
    label: "Note",
    className: "border-signal-heat/30 bg-signal-heat/5 text-signal-heat",
  },
  tip: {
    icon: Lightbulb,
    label: "Tip",
    className: "border-signal-live/30 bg-signal-live/5 text-signal-live",
  },
  warning: {
    icon: AlertTriangle,
    label: "Warning",
    className: "border-signal-aging/30 bg-signal-aging/5 text-signal-aging",
  },
};

/** Docs callout. Tokens only; the icon + label mean colour is never the sole signal. */
export function Callout({
  variant = "note",
  title,
  children,
}: {
  variant?: Variant;
  title?: string;
  children: React.ReactNode;
}) {
  const { icon: Icon, label, className } = config[variant];
  return (
    <aside className={cn("mt-6 flex gap-3 rounded-lg border p-4", className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title ?? label}</p>
        <div className="mt-1 text-sm leading-6 text-muted-foreground [&>p]:mt-0">{children}</div>
      </div>
    </aside>
  );
}
