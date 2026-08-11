import * as React from "react";
import { cn } from "@repo/ui/utils/cn";
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
                <Input
                    ref={ref}
                    id={inputId}
                    value={value}
                    required={required}
                    className={className}
                    {...props}
                />
            </Field>
        );
    }
);
SmartInput.displayName = "SmartInput";

export { SmartInput };
