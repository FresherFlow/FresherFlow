import * as React from "react";
import { cn } from "@repo/ui/utils/cn";
import { Field } from "@/ui/Field";
import { Textarea } from "@/ui/Textarea";

export interface SmartTextareaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    icon?: React.ReactNode;
    containerClassName?: string;
    labelClassName?: string;
    helpText?: React.ReactNode;
    error?: React.ReactNode;
    required?: boolean;
}

const SmartTextarea = React.forwardRef<HTMLTextAreaElement, SmartTextareaProps>(
    ({ className, value, label, icon, containerClassName, labelClassName, helpText, error, required, id, ...props }, ref) => {
        const fallbackId = React.useId();
        const inputId = id ?? fallbackId;
        const isEmpty = value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);

        return (
            <Field
                className={containerClassName}
                label={label}
                icon={icon}
                description={helpText}
                error={error}
                required={required}
                labelClassName={labelClassName}
                htmlFor={inputId}
            >
                <Textarea
                    ref={ref}
                    id={inputId}
                    value={value}
                    required={required}
                    className={cn(!isEmpty && "border-transparent bg-muted/20 focus:border-primary focus:bg-background", className)}
                    {...props}
                />
            </Field>
        );
    }
);
SmartTextarea.displayName = "SmartTextarea";

export { SmartTextarea };
