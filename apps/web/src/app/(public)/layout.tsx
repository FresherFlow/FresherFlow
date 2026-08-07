import { Navbar, MobileNav } from '@/lib/navigation/Navigation';
import { Footer } from '@/ui/Footer';

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      <main className="relative w-full overflow-x-hidden flex-1 flex flex-col pt-[calc(3.75rem+env(safe-area-inset-top))] md:pt-[4.75rem] pb-4 md:pb-8 min-h-screen">
        {children}
      </main>
      <Footer />
      <MobileNav />
    </>
  );
}
