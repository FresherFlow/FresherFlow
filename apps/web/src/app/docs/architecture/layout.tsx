import type { Metadata } from "next";

// MDX pages compile as client components here, so `metadata` cannot be
// exported from page.mdx. Keep it in this server component instead.
export const metadata: Metadata = {
  title: "Architecture — FresherFlow Docs",
  description:
    "Apps, shared packages, data flow and deployment boundaries in the FresherFlow monorepo.",
};

export default function ArchitectureLayout({ children }: { children: React.ReactNode }) {
  return children;
}
