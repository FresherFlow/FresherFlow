import { NavigationWrapper } from '@/lib/components/NavigationWrapper';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <NavigationWrapper>
      {children}
    </NavigationWrapper>
  );
}
