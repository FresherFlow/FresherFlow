import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Discovery Engine - Admin',
  description: 'Manage FresherFlow Discovery Engine crawlers, adapters, and target companies.',
};

export default function AdminDiscoveryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
