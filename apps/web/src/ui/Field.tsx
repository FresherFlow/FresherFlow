import * as React from "react";
import { cn } from "@/ui/cn";

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
    label?: React.ReactNode;
    description?: React.ReactNode;
    error?: React.ReactNode;
    required?: boolean;
    htmlFor?: string;
    labelClassName?: string;
    icon?: React.ReactNode;
    /**
     * Ids the control can point at with `aria-describedby`.
     *
     * `description` and `error` used to render as bare `<div>`s with no `id`, so
     * no control could reference them — a screen reader read the help text and
     * the error as unrelated prose, and the error was never announced.
     */
    descriptionId?: string;
    errorId?: string;
}

export const Field = React.forwardRef<HTMLDivElement, FieldProps>(
    ({ className, label, description, error, required, htmlFor, labelClassName, icon, descriptionId, errorId, children, ...props }, ref) => {
        return (
            <div ref={ref} className={cn("space-y-1.5 w-full", className)} {...props}>
                {label && (
                    <label 
                        htmlFor={htmlFor} 
                        className={cn("text-sm font-medium text-muted-foreground/80 flex items-center gap-1.5", labelClassName)}
                    >
                        {icon}
                        {label} {required && <span className="text-destructive/70">*</span>}
                    </label>
                )}
                {description && (
                    <div id={descriptionId} className="text-xs text-muted-foreground/70 mb-1.5">
                        {description}
                    </div>
                )}
                {children}
                {error && (
                    <div id={errorId} role="alert" className="text-xs text-destructive mt-1.5">
                        {error}
                    </div>
                )}
            </div>
        );
    }
);
Field.displayName = "Field";
