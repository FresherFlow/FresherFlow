'use client';

import Image from 'next/image';
import { cn } from "@/ui/cn";

interface LogoImageProps {
    width: number;
    height: number;
    className?: string;
}

export function LogoImage({ width, height, className }: LogoImageProps) {
    return (
        <div className="flex items-center justify-center rounded-lg bg-logo-bg p-1 shrink-0 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src="/logo-white-optimized.png"
                alt="FresherFlow Logo"
                width={width}
                height={height}
                className={cn("object-contain", className)}
            />
        </div>
    );
}

export default LogoImage;







