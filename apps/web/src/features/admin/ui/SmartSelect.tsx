import * as React from "react";
import { cn } from "@repo/ui/utils/cn";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/ui/Select";
import { Field } from "@/ui/Field";

export interface SmartSelectOption {
    label: string;
    value: string;
}

export interface SmartSelectProps extends Omit<React.SelectHTMLAttributes<HTMLButtonElement>, "onChange" | "value"> {
    value?: string;
    onChange?: (value: string) => void;
    options: SmartSelectOption[];
    label?: string;
    icon?: React.ReactNode;
    containerClassName?: string;
    labelClassName?: string;
    helpText?: React.ReactNode;
    error?: React.ReactNode;
    required?: boolean;
    placeholder?: string;
}

export const SmartSelect = React.forwardRef<HTMLButtonElement, SmartSelectProps>(({
    value,
    onChange,
    options,
    label,
    icon,
    containerClassName,
    labelClassName,
    helpText,
    error,
    required,
    placeholder = "Select...",
    className,
    id,
    disabled,
    ...props
}, ref) => {
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
            <Select
                value={value || undefined}
                onValueChange={(val) => {
                    if (onChange) onChange(val);
                }}
                disabled={disabled}
                required={required}
            >
                <SelectTrigger
                    ref={ref}
                    id={inputId}
                    className={cn(!value && "text-muted-foreground/50", className)}
                    {...props}
                >
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </Field>
    );
});
SmartSelect.displayName = "SmartSelect";
