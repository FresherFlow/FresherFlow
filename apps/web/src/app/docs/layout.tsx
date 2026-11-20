import type { Metadata } from "next";
import { NavigationWrapper } from "@/features/navigation/NavigationWrapper";

export const metadata: Metadata = {
  description:
    "Guides and reference for the FresherFlow platform, API, MCP server and agent skills.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <NavigationWrapper>
      <div className="docs-article mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
        {children}
      </div>
    </NavigationWrapper>
  );
}
