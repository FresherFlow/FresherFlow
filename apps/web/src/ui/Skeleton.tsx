'use client';

import { cn } from "@/lib/utils/utils";

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className, ...props }: SkeletonProps) {
    return (
        <div
            className={cn("animate-pulse rounded bg-muted", className)}
            {...props}
        />
    );
}
