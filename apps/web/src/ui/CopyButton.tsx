"use client";
import { cn } from "@/lib/utils/utils";
import { VariantProps, cva } from "class-variance-authority";
import { LucideIcon, Copy, Check } from "lucide-react";
import toast from "react-hot-toast";
import { useCopyToClipboard } from "../hooks/use-copy-to-clipboard";

const copyButtonVariants = cva(
  "relative group rounded-full p-1.5 transition-all duration-75",
  {
    variants: {
      variant: {
        default: "bg-transparent hover:bg-neutral-100 active:bg-neutral-200 dark:hover:bg-neutral-800 dark:active:bg-neutral-700",
        neutral: "bg-transparent hover:bg-neutral-100 active:bg-neutral-200 dark:hover:bg-neutral-800 dark:active:bg-neutral-700",
        ghost: "bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export function CopyButton({
  variant = "default",
  value,
  className,
  icon,
  iconClassName,
  successMessage,
}: {
  value: string;
  className?: string;
  icon?: any;
  iconClassName?: string;
  successMessage?: string;
} & VariantProps<typeof copyButtonVariants>) {
  const [copied, copyToClipboard] = useCopyToClipboard();
  const Comp = icon || Copy;
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        toast.promise(copyToClipboard(value), {
          loading: "Copying...",
          success: successMessage || "Copied to clipboard!",
          error: "Failed to copy",
        });
      }}
      className={cn(copyButtonVariants({ variant }), className)}
      type="button"
    >
      <span className="sr-only">Copy</span>
      {copied ? (
        <Check className={cn("h-3.5 w-3.5", iconClassName)} />
      ) : (
        <Comp className={cn("h-3.5 w-3.5", iconClassName)} />
      )}
    </button>
  );
}
