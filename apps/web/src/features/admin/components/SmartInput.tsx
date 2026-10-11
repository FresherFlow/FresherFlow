import * as React from "react";
import { Field } from "@/ui/Field";
import { Input } from "@/ui/Input";

export interface SmartInputProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    icon?: React.ReactNode;
    containerClassName?: string;
    labelClassName?: string;
    helpText?: React.ReactNode;
    error?: React.ReactNode;
    required?: boolean;
}

const SmartInput = React.forwardRef<HTMLInputElement, SmartInputProps>(
    ({ className, value, label, icon, containerClassName, labelClassName, helpText, error, required, id, ...props }, ref) => {
        const fallbackId = React.useId();
        const inputId = id ?? fallbackId;

        // Wire the help text and the error to the control that produced them, so
        // a screen reader announces "<label>, <error>" together instead of
        // reading the error as unrelated prose elsewhere on the page.
        const descriptionId = helpText ? `${inputId}-description` : undefined;
        const errorId = error ? `${inputId}-error` : undefined;
        const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

        return (
            <Field
                className={containerClassName}
                label={label}
                icon={icon}
                description={helpText}
                descriptionId={descriptionId}
                error={error}
                errorId={errorId}
                required={required}
                labelClassName={labelClassName}
                htmlFor={inputId}
            >
                <Input
                    ref={ref}
                    id={inputId}
                    value={value}
                    required={required}
                    aria-describedby={describedBy}
                    aria-invalid={error ? true : undefined}
                    className={className}
                    {...props}
                />
            </Field>
        );
    }
);
SmartInput.displayName = "SmartInput";

export { SmartInput };
