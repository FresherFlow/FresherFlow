'use client';

import { useRouter } from 'next/navigation';
import { Button, type ButtonProps } from '@/ui/Button';

interface NavigateButtonProps extends ButtonProps {
    href: string;
    target?: string;
}

export function NavigateButton({ href, target, onClick, children, ...props }: NavigateButtonProps) {
    const router = useRouter();

    return (
        <Button
            {...props}
            onClick={(e) => {
                if (onClick) onClick(e);
                if (target === '_blank') {
                    window.open(href, '_blank');
                } else {
                    router.push(href);
                }
            }}
        >
            {children}
        </Button>
    );
}
