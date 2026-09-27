'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/ui/Collapsible';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    useSidebar,
} from '@/ui/sidebar';
import { Badge } from '@/ui/Badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/ui/DropdownMenu';
import { isSpaceItemActive } from '@/features/navigation/navMatchers';
import type {
    SidebarNavCollapsibleData,
    SidebarNavGroupData,
    SidebarNavLinkData,
    SidebarNavSubItem,
} from '@/features/navigation/sidebar-data';

type SearchParamsLike = Pick<URLSearchParams, 'get'> | null | undefined;

type ActiveProps = {
    pathname: string;
    searchParams: SearchParamsLike;
};

/**
 * User-side port of `AdminNavGroup` (itself the faithful port of
 * shadcn-admin's `NavGroup`): `SidebarGroup` + `SidebarGroupLabel` +
 * `SidebarMenu`, a controlled `Collapsible` parent per nested group, and a
 * right-side `DropdownMenu` when the rail is collapsed to icons.
 *
 * Active matching reuses `isSpaceItemActive`, so `?tab=` items match
 * path + query and `exact` items pin to the path.
 */
export function NavGroup({ group }: { group: SidebarNavGroupData }) {
    const { state, isMobile } = useSidebar();
    const pathname = usePathname() || '';
    const searchParams = useSearchParams();

    return (
        <SidebarGroup>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarMenu>
                {group.items.map((item) => {
                    if (!item.items) {
                        return (
                            <SidebarMenuLink
                                key={`${item.title}-${item.href}`}
                                item={item}
                                pathname={pathname}
                                searchParams={searchParams}
                            />
                        );
                    }

                    if (state === 'collapsed' && !isMobile) {
                        return (
                            <SidebarCollapsedDropdown
                                key={`${item.title}-group`}
                                item={item}
                                pathname={pathname}
                                searchParams={searchParams}
                            />
                        );
                    }

                    return (
                        <SidebarMenuCollapsible
                            key={`${item.title}-group`}
                            item={item}
                            pathname={pathname}
                            searchParams={searchParams}
                        />
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}

function formatBadge(badge: number): string {
    return badge.toLocaleString('en-IN');
}

function hasBadge(badge: number | undefined): badge is number {
    return badge !== undefined && badge > 0;
}

function NavBadge({ children }: { children: ReactNode }) {
    return <Badge className="rounded-full px-1 py-0 text-xs">{children}</Badge>;
}

function SidebarMenuLink({
    item,
    pathname,
    searchParams,
}: { item: SidebarNavLinkData } & ActiveProps) {
    const { setOpenMobile } = useSidebar();
    const ItemIcon = item.icon;
    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                asChild
                isActive={isSpaceItemActive(item, pathname, searchParams)}
                tooltip={item.title}
            >
                <Link href={item.href} onClick={() => setOpenMobile(false)}>
                    <ItemIcon />
                    <span>{item.title}</span>
                    {hasBadge(item.badge) && <NavBadge>{formatBadge(item.badge)}</NavBadge>}
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}

function SidebarMenuCollapsible({
    item,
    pathname,
    searchParams,
}: { item: SidebarNavCollapsibleData } & ActiveProps) {
    const { setOpenMobile } = useSidebar();
    const ItemIcon = item.icon;
    const hasActiveChild = item.items.some((sub) =>
        isSpaceItemActive(sub, pathname, searchParams),
    );

    // Controlled, not `defaultOpen`: `defaultOpen` is read once on mount, so a
    // route change left the submenu shut with the active row hidden. Re-open
    // whenever a child becomes active, while still honouring manual collapse.
    const [open, setOpen] = useState(hasActiveChild);
    useEffect(() => {
        if (hasActiveChild) setOpen(true);
    }, [hasActiveChild]);

    return (
        <Collapsible asChild open={open} onOpenChange={setOpen} className="group/collapsible">
            <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                    <SidebarMenuButton tooltip={item.title} isActive={hasActiveChild}>
                        <ItemIcon />
                        <span>{item.title}</span>
                        {hasBadge(item.badge) && <NavBadge>{formatBadge(item.badge)}</NavBadge>}
                        <ChevronRight className="ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <SidebarMenuSub>
                        {item.items.map((subItem) => (
                            <SidebarMenuSubRow
                                key={subItem.href}
                                item={subItem}
                                pathname={pathname}
                                searchParams={searchParams}
                                onNavigate={() => setOpenMobile(false)}
                            />
                        ))}
                    </SidebarMenuSub>
                </CollapsibleContent>
            </SidebarMenuItem>
        </Collapsible>
    );
}

function SidebarMenuSubRow({
    item,
    pathname,
    searchParams,
    onNavigate,
}: { item: SidebarNavSubItem; onNavigate: () => void } & ActiveProps) {
    const SubIcon = item.icon;
    return (
        <SidebarMenuSubItem>
            <SidebarMenuSubButton
                asChild
                isActive={isSpaceItemActive(item, pathname, searchParams)}
            >
                <Link href={item.href} onClick={onNavigate}>
                    {SubIcon && <SubIcon />}
                    <span>{item.title}</span>
                    {hasBadge(item.badge) && <NavBadge>{formatBadge(item.badge)}</NavBadge>}
                </Link>
            </SidebarMenuSubButton>
        </SidebarMenuSubItem>
    );
}

function SidebarCollapsedDropdown({
    item,
    pathname,
    searchParams,
}: { item: SidebarNavCollapsibleData } & ActiveProps) {
    const ItemIcon = item.icon;
    const isActive = item.items.some((sub) => isSpaceItemActive(sub, pathname, searchParams));
    return (
        <SidebarMenuItem>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <SidebarMenuButton tooltip={item.title} isActive={isActive}>
                        <ItemIcon />
                        <span>{item.title}</span>
                        {hasBadge(item.badge) && <NavBadge>{formatBadge(item.badge)}</NavBadge>}
                        <ChevronRight className="ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start" sideOffset={4}>
                    <DropdownMenuLabel>
                        {item.title} {hasBadge(item.badge) ? `(${formatBadge(item.badge)})` : ''}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {item.items.map((sub) => {
                        const SubIcon = sub.icon;
                        return (
                            <DropdownMenuItem key={`${sub.title}-${sub.href}`} asChild>
                                <Link
                                    href={sub.href}
                                    className={isSpaceItemActive(sub, pathname, searchParams) ? 'bg-secondary' : ''}
                                >
                                    {SubIcon && <SubIcon className="size-4 shrink-0" />}
                                    <span className="max-w-52 text-wrap">{sub.title}</span>
                                    {hasBadge(sub.badge) && (
                                        <span className="ms-auto text-xs">{formatBadge(sub.badge)}</span>
                                    )}
                                </Link>
                            </DropdownMenuItem>
                        );
                    })}
                </DropdownMenuContent>
            </DropdownMenu>
        </SidebarMenuItem>
    );
}
