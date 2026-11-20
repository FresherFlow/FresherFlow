import type { Metadata } from "next";

// MDX pages compile as client components here, so `metadata` cannot be
// exported from page.mdx. Keep it in this server component instead.
export const metadata: Metadata = {
  title: "Overview — FresherFlow Docs",
  description:
    "What FresherFlow is, how its apps and packages fit together, and where to go next.",
};

export default function OverviewLayout({ children }: { children: React.ReactNode }) {
  return children;
}
