import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Source Health - Admin',
  description: 'Per-source discovery yield: what each site gave, what is live, what expired.',
};

export default function AdminSourcesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
