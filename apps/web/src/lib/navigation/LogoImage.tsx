'use client';

import Image from 'next/image';
import { useTheme } from '@/lib/providers/ThemeContext';

interface LogoImageProps {
    width: number;
    height: number;
    className?: string;
}

export function LogoImage({ width, height, className }: LogoImageProps) {
    const { theme } = useTheme();
    const src = theme === 'dark' ? '/logo-white-optimized.png' : '/logo-optimized.png';

    return (
        <Image
            src={src}
            alt=""
            width={width}
            height={height}
            priority
            className={className}
            suppressHydrationWarning
        />
    );
}
export default LogoImage;






