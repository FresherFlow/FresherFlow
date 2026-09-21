import * as React from "react";
import { cn } from "@/ui/cn";

/**
 * Material Design Compliant Input
 *
 * HARD RULES:
 * - min-height: 3rem (48px) - Material Design minimum
 * - font-size: 1rem (16px) - prevents zoom on iOS
 * - padding: standardized, no arbitrary values
 * - All inputs MUST use this component
 */

/**
 * Surface + typography treatments owned by this primitive.
 *
 * - `search`: the compact search field used in the category header bars. Its
 *   card surface and shape already come from the base classes; only the xs type
 *   is added here (call sites keep the height/layout classes).
 * - `searchGlow`: same as `search`, plus the soft focus glow used by the govt
 *   header search row.
 */
const inputVariants = {
    default: "",
    search: "text-xs",
    searchGlow:
        "text-xs shadow-xs focus:bg-background focus:ring-2 focus:ring-ring/30 transition-shadow duration-150 ease-out",
} as const;

export type InputVariant = keyof typeof inputVariants;

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    /** Surface + typography treatment. Defaults to `default`. */
    variant?: InputVariant;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, variant = "default", ...props }, ref) => {
        return (
            <input
                type={type}
                className={cn(
                    "flex h-11 w-full rounded-xl border border-border bg-card px-4 py-2 text-sm",
                    "placeholder:text-muted-foreground/60 placeholder:tracking-widest focus:placeholder:opacity-0",
                    "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "transition-all",
                    inputVariants[variant],
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
