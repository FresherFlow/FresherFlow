"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronRight, Search } from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/ui/Collapsible";
import { Separator } from "@/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/ui/Breadcrumb";
import { NavUser } from "@/features/navigation/NavUser";
import { LogoImage } from "@/features/shell/LogoImage";
import { SPACES, PERSONAL_GROUP, COMMUNITY_GROUP } from "@/features/navigation/navConfig";
import { isSpaceItemActive, type SpaceNavGroup } from "@/features/navigation/navConfig";

// ── Brand — same as AppSidebar ──
function Brand() {
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton asChild size="lg">
          <Link href="/">
            <LogoImage width={28} height={28} className="h-7 w-7 shrink-0 object-contain" />
            <span className="truncate text-base font-semibold tracking-tight">FresherFlow</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

function FilterableGroup({
  group,
  pathname,
  searchParams,
}: {
  group: SpaceNavGroup;
  pathname: string;
  searchParams: ReturnType<typeof useSearchParams>;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = isSpaceItemActive(item, pathname, searchParams);
            return (
              <SidebarMenuItem key={item.title + item.href}>
                <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                  <Link href={item.href} aria-current={active ? "page" : undefined}>
                    <Icon className="size-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function SidebarDemoInner() {
  const pathname = usePathname() || "/jobs";
  const searchParams = useSearchParams();
  const [q, setQ] = React.useState("");

  const jobs = SPACES.find((s) => s.id === "jobs")!;
  const govt = SPACES.find((s) => s.id === "govt")!;

  // Filter helper for the search box — demonstrates handling many routes with search
  const filter = (items: SpaceNavGroup["items"]) =>
    q.trim().length === 0
      ? items
      : items.filter((i) => i.title.toLowerCase().includes(q.toLowerCase()));

  const govtCategoriesFiltered: SpaceNavGroup = {
    ...govt.groups[0],
    items: filter(govt.groups[0].items),
  };
  const browseFiltered: SpaceNavGroup = { ...jobs.groups[0], items: filter(jobs.groups[0].items) };
  const discoverFiltered: SpaceNavGroup = { ...jobs.groups[1], items: filter(jobs.groups[1].items) };
  const personalFiltered: SpaceNavGroup = {
    ...PERSONAL_GROUP,
    items: filter(PERSONAL_GROUP.items),
  };
  const communityFiltered: SpaceNavGroup = {
    ...COMMUNITY_GROUP,
    items: filter(COMMUNITY_GROUP.items),
  };

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="gap-2">
          <Brand />
          {/* Search — like sidebar-01 SearchForm, lets many-routes stay findable without scrolling */}
          <form onSubmit={(e) => e.preventDefault()}>
            <SidebarGroup className="py-0">
              <SidebarGroupContent className="relative">
                <label htmlFor="dev-sb-search" className="sr-only">
                  Search
                </label>
                <SidebarInput
                  id="dev-sb-search"
                  placeholder="Search routes..."
                  className="pl-8"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 opacity-50" />
              </SidebarGroupContent>
            </SidebarGroup>
          </form>
        </SidebarHeader>

        <SidebarContent>
          {/* NO SpaceSwitcher — all routes visible at once. This is the fix: 
              the old sucked sidebar hid 50% of routes behind Jobs/Govt toggle.
              New one stacks Browse + Discover + (collapsible) Government + Personal.
              Govt is collapsible like sidebar-02/sidebar-07 nav-main, so 10 categories don't push Personal off-screen. */}
          {browseFiltered.items.length > 0 && (
            <FilterableGroup group={browseFiltered} pathname={pathname} searchParams={searchParams} />
          )}
          {discoverFiltered.items.length > 0 && (
            <FilterableGroup group={discoverFiltered} pathname={pathname} searchParams={searchParams} />
          )}

          {/* Government — collapsible like shadcn sidebar-02 / sidebar-07 nav-main */}
          {govtCategoriesFiltered.items.length > 0 && (
            <Collapsible defaultOpen className="group/collapsible">
              <SidebarGroup>
                <SidebarGroupLabel
                  asChild
                  className="group/label text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                >
                  <CollapsibleTrigger className="flex w-full items-center">
                    {govtCategoriesFiltered.label}
                    <ChevronRight className="ml-auto size-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {govtCategoriesFiltered.items.map((item) => {
                        const Icon = item.icon;
                        const active = isSpaceItemActive(item, pathname, searchParams);
                        return (
                          <SidebarMenuItem key={item.title + item.href}>
                            <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                              <Link href={item.href} aria-current={active ? "page" : undefined}>
                                <Icon className="size-4" />
                                <span>{item.title}</span>
                              </Link>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          )}

          {govt.groups[1].items.filter((i) => filter([i]).length > 0).length > 0 && (
            <FilterableGroup
              group={{ ...govt.groups[1], items: filter(govt.groups[1].items) }}
              pathname={pathname}
              searchParams={searchParams}
            />
          )}

          <SidebarSeparator className="mx-2" />

          {/* Personal — secondary group like sidebar-08 nav-secondary (size sm) */}
          {personalFiltered.items.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel>Personal</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {personalFiltered.items.map((item) => {
                    const Icon = item.icon;
                    const active = isSpaceItemActive(item, pathname, searchParams);
                    return (
                      <SidebarMenuItem key={item.title + item.href}>
                        <SidebarMenuButton asChild size="sm" isActive={active} tooltip={item.title}>
                          <Link href={item.href} aria-current={active ? "page" : undefined}>
                            <Icon className="size-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}

          {/* Community tabs as their own group */}
          {communityFiltered.items.length > 0 && (
            <SidebarGroup>
              <SidebarGroupLabel>Community</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {communityFiltered.items.map((item) => {
                    const Icon = item.icon;
                    const active = isSpaceItemActive(item, pathname, searchParams);
                    return (
                      <SidebarMenuItem key={item.title + item.href}>
                        <SidebarMenuButton asChild size="sm" isActive={active} tooltip={item.title}>
                          <Link href={item.href} aria-current={active ? "page" : undefined}>
                            <Icon className="size-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarFooter>
          <NavUser />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">All routes</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>Overview</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="grid auto-rows-min gap-4 md:grid-cols-3 mt-4">
            <div className="aspect-video rounded-xl bg-muted/50" />
            <div className="aspect-video rounded-xl bg-muted/50" />
            <div className="aspect-video rounded-xl bg-muted/50" />
          </div>
          <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function Page() {
  return (
    <React.Suspense fallback={null}>
      <SidebarDemoInner />
    </React.Suspense>
  );
}
