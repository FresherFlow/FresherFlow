import { NavigationWrapper } from '@/lib/components/NavigationWrapper';

export const dynamic = 'force-dynamic';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <NavigationWrapper>
      {children}
    </NavigationWrapper>
  );
}
