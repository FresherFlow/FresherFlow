import Link from 'next/link';
import ChevronRightIcon from '@heroicons/react/24/outline/ChevronRightIcon';

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbProps {
    items: BreadcrumbItem[];
}

/**
 * Shared breadcrumb nav.
 * Last item is always rendered as plain text (current page).
 * All prior items are links.
 */
export function Breadcrumb({ items }: BreadcrumbProps) {
    return (
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium select-none" aria-label="Breadcrumb">
            {items.map((item, index) => {
                const isLast = index === items.length - 1;
                return (
                    <span key={index} className="flex items-center gap-1.5">
                        {index > 0 && <ChevronRightIcon className="w-3.5 h-3.5 shrink-0" />}
                        {isLast || !item.href ? (
                            <span className={isLast ? 'text-foreground font-semibold' : ''}>
                                {item.label}
                            </span>
                        ) : (
                            <Link href={item.href} className="hover:text-primary transition-colors">
                                {item.label}
                            </Link>
                        )}
                    </span>
                );
            })}
        </nav>
    );
}
