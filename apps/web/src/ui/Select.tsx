import * as React from "react";
import { cn } from "@/lib/utils/utils";

/**
 * Material Design Compliant Select
 * 
 * HARD RULES:
 * - Native select (mobile-friendly, no JS required)
 * - min-height: 3rem (48px)
 * - font-size: 1rem (16px)
 * - Works on ALL devices without platform-specific tricks
 */
export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, children, ...props }, ref) => {
        return (
            <select
                className={cn(
                    "flex h-12 w-full rounded-md border-2 border-border bg-card px-3 py-2 text-base",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "appearance-none cursor-pointer",
                    // Custom dropdown arrow
                    "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHZpZXdCb3g9IjAgMCAyMCAyMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNiA4TDEwIDEyTDE0IDgiIHN0cm9rZT0iIzZiNzI4MCIgc3Ryb2tlLXdpZHRoPSIxLjUiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==')] bg-no-repeat bg-right pr-10",
                    "transition-colors",
                    className
                )}
                ref={ref}
                {...props}
            >
                {children}
            </select>
        );
    }
);
Select.displayName = "Select";

export { Select };
