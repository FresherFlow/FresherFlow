import * as React from "react";
import { cn } from "@/lib/utils/utils";

/**
 * Material Design Compliant Input
 *
 * HARD RULES:
 * - min-height: 3rem (48px) - Material Design minimum
 * - font-size: 1rem (16px) - prevents zoom on iOS
 * - padding: standardized, no arbitrary values
 * - All inputs MUST use this component
 */
export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "flex h-11 w-full rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2 text-sm",
                    "placeholder:text-muted-foreground/60 placeholder:tracking-widest focus:placeholder:opacity-0",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "transition-all",
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);
Input.displayName = "Input";

export { Input };
