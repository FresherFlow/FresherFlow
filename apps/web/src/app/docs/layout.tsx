import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
} from "@/ui/sidebar";
import { docsNav } from "@/features/docs/docs-nav";
import { DocsPager } from "@/features/docs/DocsPager";
import { listSkillDocs } from "@/lib/skills-docs";

export const metadata: Metadata = {
  description:
    "Guides and reference for the FresherFlow platform, API, MCP server and agent skills.",
};

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const skills = await listSkillDocs().then((items) =>
    items.map(({ slug, name }) => ({ slug, name }))
  );

  // open is locked true and no trigger is rendered: the rail never collapses
  // or disappears. Still the standard Sidebar primitives, no new component.
  return (
    <SidebarProvider open>
      <Sidebar className="min-h-svh border-r border-sidebar-border">
        <SidebarContent className="gap-1 px-1 py-4">
          {docsNav.map((section) => (
            <SidebarGroup key={section.title}>
              <SidebarGroupLabel className="!flex">{section.title}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild className="w-full!">
                        <Link href={item.href} title={item.description}>
                          <item.icon className="size-4 shrink-0" aria-hidden="true" />
                          <span className="truncate">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                      {item.href === "/docs/skills" && skills.length > 0 && (
                        <SidebarMenuSub>
                          {skills.map((skill) => (
                            <SidebarMenuSubItem key={skill.slug}>
                              <SidebarMenuSubButton asChild size="sm">
                                <Link href={`/docs/skills/${skill.slug}`}>{skill.name}</Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="sm" className="w-full!">
                <Link href="/">
                  <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
                  <span>Back to site</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <main className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
          {children}
          <DocsPager skills={skills} />
        </div>
      </main>
    </SidebarProvider>
  );
}
