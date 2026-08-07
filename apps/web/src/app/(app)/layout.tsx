import { NavigationWrapper } from '@/lib/components/NavigationWrapper';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <NavigationWrapper>
      {children}
    </NavigationWrapper>
  );
}
