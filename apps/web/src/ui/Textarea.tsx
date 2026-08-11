import * as React from "react";
import { cn } from "@/lib/utils/utils";

/**
 * Material Design Compliant Textarea
 */
export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, ...props }, ref) => {
        return (
            <textarea
                className={cn(
                    "flex min-h-[80px] w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2 text-sm",
                    "placeholder:text-muted-foreground/60 focus:placeholder:opacity-0",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "transition-all resize-y",
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
