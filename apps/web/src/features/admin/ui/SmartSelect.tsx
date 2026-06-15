import * as React from "react";
import { cn } from "@repo/ui/utils/cn";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

export interface SmartSelectOption {
    label: string;
    value: string;
}

export interface SmartSelectProps {
    value?: string;
    onChange: (value: string) => void;
    options: SmartSelectOption[];
    label?: string;
    icon?: React.ReactNode;
    containerClassName?: string;
    labelClassName?: string;
    helpText?: React.ReactNode;
    required?: boolean;
    placeholder?: string;
}

export function SmartSelect({
    value,
    onChange,
    options,
    label,
    icon,
    containerClassName,
    labelClassName,
    helpText,
    required,
    placeholder = "Select...",
}: SmartSelectProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const selectedOption = options.find((opt) => opt.value === value);
    const isEmpty = !selectedOption;

    return (
        <div className={cn("space-y-1.5 w-full", containerClassName)} ref={containerRef}>
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
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className={cn(
                        "flex w-full items-center justify-between rounded-sm px-2.5 py-1.5 text-sm outline-none transition-none",
                        "border border-solid text-left border-input bg-background",
                        !isEmpty ? "text-foreground" : "text-muted-foreground/50",
                        isOpen ? "border-primary" : "focus:border-primary",
                    )}
                >
                    <span>{selectedOption ? selectedOption.label : placeholder}</span>
                    <ChevronDownIcon
                        className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform duration-200",
                            isOpen ? "rotate-180" : ""
                        )}
                    />
                </button>

                {isOpen && (
                    <ul className="absolute left-0 top-full mt-1 w-full max-h-60 overflow-y-auto bg-background border border-input rounded-sm z-50 outline-none">
                        {options.map((option) => (
                            <li key={option.value}>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={cn(
                                        "w-full text-left px-2.5 py-1.5 text-sm transition-none",
                                        option.value === value
                                            ? "bg-primary text-primary-foreground font-medium"
                                            : "text-foreground hover:bg-muted"
                                    )}
                                >
                                    {option.label}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
