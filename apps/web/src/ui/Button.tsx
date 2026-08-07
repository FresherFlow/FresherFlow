import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/utils";

/**
 * Material Design Compliant Button
 * 
 * HARD RULES (non-negotiable):
 * - Default: h-12 (48px) - Material Design minimum
 * - Small: h-10 (40px) - absolute minimum for secondary actions
 * - Large: h-14 (56px) - primary CTAs
 * - Icon: 48x48px square - touch-safe
 * - NO arbitrary values allowed outside this file
 * - Text: minimum text-sm (14px), prefer text-base (16px)
 */
const buttonVariants = cva(
    "inline-flex items-center justify-center cursor-pointer whitespace-nowrap rounded-xl font-medium focus-visible:outline-none focus:outline-none disabled:pointer-events-none disabled:opacity-50 border border-transparent transition-transform duration-[160ms] ease-out active:scale-[0.97]",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground shadow-sm [@media(hover:hover)_and_(pointer:fine)]:hover:bg-primary/90",
                destructive: "bg-destructive text-destructive-foreground shadow-sm [@media(hover:hover)_and_(pointer:fine)]:hover:bg-destructive/90",
                outline: "border border-border bg-background text-foreground shadow-sm [@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted/60",
                secondary: "bg-secondary text-secondary-foreground shadow-sm [@media(hover:hover)_and_(pointer:fine)]:hover:bg-secondary/80",
                ghost: "[@media(hover:hover)_and_(pointer:fine)]:hover:bg-muted [@media(hover:hover)_and_(pointer:fine)]:hover:text-foreground",
                link: "text-primary underline-offset-4 [@media(hover:hover)_and_(pointer:fine)]:hover:underline",
            },
            size: {
                default: "h-12 px-6 py-2 text-base",
                sm: "h-10 px-4 text-sm",
                lg: "h-14 px-8 text-lg",
                icon: "h-12 w-12",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button";
        return (
            <Comp
                className={cn(buttonVariants({ variant, size }), className)}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export { Button, buttonVariants };
