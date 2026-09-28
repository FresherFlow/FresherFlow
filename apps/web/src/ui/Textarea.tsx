import * as React from "react";
import { cn } from "@/ui/cn";

/**
 * Material Design Compliant Textarea
 */
export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, ...props }, ref) => {
        return (
            <textarea
                className={cn(
                    // Semantic tokens, not the pre-v4 indirection. Tailwind v4
                    // defines `--color-border` / `--color-card` (see
                    // `globals.css`), so `hsl(var(--border))` resolved against an
                    // undefined variable and every Textarea in the app rendered
                    // with no border colour and no background.
                    "flex min-h-[80px] w-full rounded-xl border border-border bg-card px-4 py-2 text-sm",
                    "text-foreground placeholder:text-muted-foreground/60",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    // transform/opacity only — `transition-all` on a control the
                    // user types in repaints on every keystroke.
                    "transition-[border-color,box-shadow] resize-y",
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);
Textarea.displayName = "Textarea";

export { Textarea };
