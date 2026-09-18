import { AuthHeader } from './components/AuthHeader';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Subtle Grid Background Pattern */}
      <div className="absolute inset-0 z-0 pointer-events-none" style={{backgroundImage:'linear-gradient(to right,#4f4f4f2e 1px,transparent 1px),linear-gradient(to bottom,#4f4f4f2e 1px,transparent 1px)',backgroundSize:'14px 24px',maskImage:'radial-gradient(ellipse 60% 50% at 50% 0%,#000 70%,transparent 100%)',WebkitMaskImage:'radial-gradient(ellipse 60% 50% at 50% 0%,#000 70%,transparent 100%)'}} />
      
      <div className="relative z-10 flex-1 flex flex-col min-h-screen">
        <AuthHeader />
        {children}
      </div>
    </main>
  );
}
