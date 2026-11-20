import type { Metadata } from "next";

// MDX pages compile as client components here, so `metadata` cannot be
// exported from page.mdx. Keep it in this server component instead.
export const metadata: Metadata = {
  title: "API Reference — FresherFlow Docs",
  description:
    "Base URL, authentication, public and account endpoints, admin routes, validation and error shapes.",
};

export default function ApiLayout({ children }: { children: React.ReactNode }) {
  return children;
}
