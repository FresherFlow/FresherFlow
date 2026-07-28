'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils/utils';

interface LogoImageProps {
    width: number;
    height: number;
    className?: string;
}

export function LogoImage({ width, height, className }: LogoImageProps) {
    return (
        <div className="flex items-center justify-center rounded-lg bg-zinc-900 dark:bg-zinc-900 p-1 shrink-0 shadow-sm">
            <Image
                src="/logo-white-optimized.png"
                alt="FresherFlow Logo"
                width={width}
                height={height}
                priority
                className={cn("object-contain", className)}
                suppressHydrationWarning
            />
        </div>
    );
}

export default LogoImage;







