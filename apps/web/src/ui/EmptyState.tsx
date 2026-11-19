
import MagnifyingGlassIcon from '@heroicons/react/24/outline/MagnifyingGlassIcon';
import InboxIcon from '@heroicons/react/24/outline/InboxIcon';

interface EmptyStateProps {
    title?: string;
    description?: string;
    /** Optional CTA button or link element */
    action?: React.ReactNode;
    /** Override icon. Defaults to MagnifyingGlass for 'no results', Inbox for 'no items' */
    icon?: 'search' | 'inbox';
    /** Size variant. Default: 'lg' (p-20). Use 'md' (p-12) for inline/nested empty states */
    size?: 'md' | 'lg';
    /** Visual variant. 'card' has border and background, 'ghost' has none. Default: 'card' */
    variant?: 'card' | 'ghost';
    /** Escape hatch for callers that need a raised surface or custom layout. */
    className?: string;
}

export function EmptyState({
    title = 'No results found',
    description = 'Try adjusting your search or filters.',
    action,
    icon = 'search',
    size = 'lg',
    variant = 'card',
    className,
}: EmptyStateProps) {
    const Icon = icon === 'inbox' ? InboxIcon : MagnifyingGlassIcon;
    const padding = size === 'md' ? 'p-12' : 'p-20';
    // Brand box language, matching `BrandButton` and the Key Facts chips:
    // sharp corners and a solid hairline. It was `rounded-2xl` with a dashed
    // border, which read as a placeholder rather than a surface.
    //
    // No fill by default. The box takes the page background and the border
    // delimits it — a `bg-card` panel sat as a white block on a grey page,
    // which is the thing an empty state should never look like. Callers that
    // genuinely need a raised surface can still pass `className`.
    const cardClasses = variant === 'card' ? 'border border-border-strong dark:border-transparent' : 'border border-transparent';

    return (
        <div className={`${padding} text-center rounded-xs ${cardClasses} ${className ?? ''} animate-in fade-in slide-in-from-bottom-2 zoom-in-[0.97] duration-200 ease-out-strong`}>
            <div className="w-12 h-12 bg-muted rounded-xs flex items-center justify-center mx-auto mb-4 text-muted-foreground animate-in zoom-in-[0.95] duration-200 ease-out-strong" style={{animationFillMode:'both'}}>
                <Icon className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-foreground tracking-tight">{title}</h2>
            {description && (
                <p className="text-sm font-medium text-muted-foreground mt-2 max-w-sm mx-auto">{description}</p>
            )}
            {action && <div className="mt-6">{action}</div>}
        </div>
    );
}
