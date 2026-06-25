
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
}

export function EmptyState({
    title = 'No results found',
    description = 'Try adjusting your search or filters.',
    action,
    icon = 'search',
    size = 'lg',
}: EmptyStateProps) {
    const Icon = icon === 'inbox' ? InboxIcon : MagnifyingGlassIcon;
    const padding = size === 'md' ? 'p-12' : 'p-20';

    return (
        <div className={`${padding} text-center rounded-2xl border border-dashed border-border bg-card`}>
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                <Icon className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground tracking-tight">{title}</h3>
            {description && (
                <p className="text-sm font-medium text-muted-foreground mt-2 max-w-sm mx-auto">{description}</p>
            )}
            {action && <div className="mt-6">{action}</div>}
        </div>
    );
}
