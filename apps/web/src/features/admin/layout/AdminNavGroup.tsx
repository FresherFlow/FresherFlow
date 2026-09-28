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
    AdminNavCollapsibleData,
    AdminNavGroupData,
    AdminNavLinkData,
    AdminNavSubItem,
} from '@/features/admin/layout/admin-sidebar-data';

type SearchParamsLike = Pick<URLSearchParams, 'get'> | null | undefined;

type ActiveProps = {
    pathname: string;
    searchParams: SearchParamsLike;
};

/**
 * Faithful port of shadcn-admin's `NavGroup` (`SidebarGroup` +
 * `SidebarGroupLabel` + `SidebarMenu`), adapted to Next.js App Router.
 *
 * Active matching reuses `isSpaceItemActive` — the exact matcher `NavMain`
 * uses — so `?tab=` discovery items match path + query (with `tab=dashboard`
 * matching a missing tab) and `exact` items such as Listings pin to the path.
 */
export function AdminNavGroup({ group }: { group: AdminNavGroupData }) {
    const { state, isMobile } = useSidebar();
    const pathname = usePathname() || '';
    const searchParams = useSearchParams();
    // Same mount gate as the user-side NavGroup: the collapsed-rail dropdown
    // branch depends on persisted open-state + window width, both unavailable
    // during SSR. Rendering it before mount hydrates mismatched.
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const collapsedRail = mounted && state === 'collapsed' && !isMobile;

    return (
        <SidebarGroup>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarMenu>
                {group.items.map((item) => {
                    if (!item.items) {
                        return (
                            <AdminSidebarMenuLink
                                key={`${item.title}-${item.href}`}
                                item={item}
                                pathname={pathname}
                                searchParams={searchParams}
                            />
                        );
                    }

                    if (collapsedRail) {
                        return (
                            <AdminSidebarCollapsedDropdown
                                key={`${item.title}-group`}
                                item={item}
                                pathname={pathname}
                                searchParams={searchParams}
                            />
                        );
                    }

                    return (
                        <AdminSidebarMenuCollapsible
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

function formatAdminBadge(badge: string | number): string {
    return typeof badge === 'number' ? badge.toLocaleString('en-IN') : badge;
}

function hasAdminBadge(badge: string | number | undefined): badge is string | number {
    if (badge === undefined) return false;
    return typeof badge === 'string' ? badge.length > 0 : badge > 0;
}

function AdminNavBadge({ children }: { children: ReactNode }) {
    return <Badge className="rounded-full px-1 py-0 text-xs">{children}</Badge>;
}

function AdminSidebarMenuLink({
    item,
    pathname,
    searchParams,
}: { item: AdminNavLinkData } & ActiveProps) {
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
                    {hasAdminBadge(item.badge) && (
                        <AdminNavBadge>{formatAdminBadge(item.badge)}</AdminNavBadge>
                    )}
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}

function AdminSidebarMenuCollapsible({
    item,
    pathname,
    searchParams,
}: { item: AdminNavCollapsibleData } & ActiveProps) {
    const { setOpenMobile } = useSidebar();
    const ItemIcon = item.icon;
    const hasActiveChild = item.items.some((sub) =>
        isSpaceItemActive(sub, pathname, searchParams),
    );

    // Controlled, not `defaultOpen`: `defaultOpen` is read once on mount, so a
    // route change (e.g. the header switcher jumping to /admin/discovery) left
    // the submenu shut with the active row hidden. Re-open whenever a child
    // becomes active, while still honouring a manual collapse.
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
                        {hasAdminBadge(item.badge) && (
                            <AdminNavBadge>{formatAdminBadge(item.badge)}</AdminNavBadge>
                        )}
                        <ChevronRight className="ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                    <SidebarMenuSub>
                        {item.items.map((subItem) => (
                            <AdminSidebarMenuSubRow
                                key={subItem.title}
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

function AdminSidebarMenuSubRow({
    item,
    pathname,
    searchParams,
    onNavigate,
}: { item: AdminNavSubItem; onNavigate: () => void } & ActiveProps) {
    const SubIcon = item.icon;
    return (
        <SidebarMenuSubItem key={item.title}>
            <SidebarMenuSubButton
                asChild
                isActive={isSpaceItemActive(item, pathname, searchParams)}
            >
                <Link href={item.href} onClick={onNavigate}>
                    {SubIcon && <SubIcon />}
                    <span>{item.title}</span>
                    {hasAdminBadge(item.badge) && (
                        <AdminNavBadge>{formatAdminBadge(item.badge)}</AdminNavBadge>
                    )}
                </Link>
            </SidebarMenuSubButton>
        </SidebarMenuSubItem>
    );
}

function AdminSidebarCollapsedDropdown({
    item,
    pathname,
    searchParams,
}: { item: AdminNavCollapsibleData } & ActiveProps) {
    const ItemIcon = item.icon;
    const isActive = item.items.some((sub) => isSpaceItemActive(sub, pathname, searchParams));
    return (
        <SidebarMenuItem>
            <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                    <SidebarMenuButton tooltip={item.title} isActive={isActive}>
                        <ItemIcon />
                        <span>{item.title}</span>
                        {hasAdminBadge(item.badge) && (
                            <AdminNavBadge>{formatAdminBadge(item.badge)}</AdminNavBadge>
                        )}
                        <ChevronRight className="ms-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start" sideOffset={4}>
                    <DropdownMenuLabel>
                        {item.title} {hasAdminBadge(item.badge) ? `(${formatAdminBadge(item.badge)})` : ''}
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
                                    {hasAdminBadge(sub.badge) && (
                                        <span className="ms-auto text-xs">{formatAdminBadge(sub.badge)}</span>
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
