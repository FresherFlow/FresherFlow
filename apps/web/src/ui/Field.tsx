import * as React from "react";
import { cn } from "@/lib/utils/utils";

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
    label?: React.ReactNode;
    description?: React.ReactNode;
    error?: React.ReactNode;
    required?: boolean;
    htmlFor?: string;
    labelClassName?: string;
    icon?: React.ReactNode;
}

export const Field = React.forwardRef<HTMLDivElement, FieldProps>(
    ({ className, label, description, error, required, htmlFor, labelClassName, icon, children, ...props }, ref) => {
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
                    <div className="text-[12px] text-muted-foreground/70 mb-1.5">
                        {description}
                    </div>
                )}
                {children}
                {error && (
                    <div className="text-[12px] text-destructive mt-1.5">
                        {error}
                    </div>
                )}
            </div>
        );
    }
);
Field.displayName = "Field";
