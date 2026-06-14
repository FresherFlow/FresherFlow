import * as React from "react";
import { cn } from "@repo/ui/utils/cn";

export interface SmartInputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    icon?: React.ReactNode;
    containerClassName?: string;
    labelClassName?: string;
    helpText?: React.ReactNode;
    required?: boolean;
}

const SmartInput = React.forwardRef<HTMLInputElement, SmartInputProps>(
    ({ className, value, label, icon, containerClassName, labelClassName, helpText, required, ...props }, ref) => {
        // Determine if empty
        const isEmpty = value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);

        return (
            <div className={cn("space-y-1.5 w-full", containerClassName)}>
                {label && (
                    <label className={cn("text-sm font-medium text-muted-foreground/80 flex items-center gap-1.5", labelClassName)}>
                        {icon}
                        {label} {required && <span className="text-destructive/70">*</span>}
                    </label>
                )}
                {helpText && (
                    <div className="text-[12px] text-muted-foreground/70 mb-1.5">
                        {helpText}
                    </div>
                )}
                <input
                    ref={ref}
                    value={value}
                    required={required}
                    className={cn(
                        "flex w-full px-2.5 py-1.5 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50 placeholder:text-transparent hover:placeholder:text-muted-foreground/50 focus:placeholder:text-muted-foreground/50 transition-colors duration-200",
                        "border border-solid border-input bg-background text-foreground",
                        "focus:border-primary focus:bg-background focus:ring-0",
                        className
                    )}
                    {...props}
                />
            </div>
        );
    }
);
SmartInput.displayName = "SmartInput";

export { SmartInput };
