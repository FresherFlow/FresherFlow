import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConditionalAuthProvider } from "@/components/providers/ConditionalAuthProvider";
import { SmartToaster } from "@/components/providers/SmartToaster";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { InstallPromptProvider } from "@/contexts/InstallPromptContext";
import { NavigationWrapper } from "@/components/providers/NavigationWrapper";
import ServiceWorkerRegister from "@/components/providers/ServiceWorkerRegister";
import PushNotificationProvider from "@/components/providers/PushNotificationProvider";
import { ThemeScript } from "@/components/providers/ThemeScript";
import OfflineNotification from "@/components/ui/OfflineNotification";
import InstallAppBanner from "@/components/ui/InstallAppBanner";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import GoogleAnalytics from "@/components/providers/GoogleAnalytics";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://fresherflow.in"),
  applicationName: "FresherFlow",
  title: {
    default: "FresherFlow",
    template: "%s | FresherFlow",
  },
  description: "Verified fresher jobs, internships, and walk-ins in India. Direct apply links, profile-fit ranking, and closing-soon alerts on FresherFlow.",
  alternates: {
    canonical: "./",
  },
  openGraph: {
    type: "website",
    siteName: "FresherFlow",
    title: "FresherFlow - Verified Fresher Jobs & Internships in India",
    description: "Verified fresher jobs, internships, and walk-ins in India with direct apply links.",
    images: [
      {
        url: "https://fresherflow.in/opengraph-image",
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "FresherFlow - Verified Fresher Jobs and Internships",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FresherFlow - Verified Fresher Jobs & Internships in India",
    description: "Verified fresher jobs, internships, and walk-ins in India with direct apply links.",
    images: ["https://fresherflow.in/twitter-image"],
  },
  icons: {
    icon: "/favicon-32x32.png",
    shortcut: "/favicon-32x32.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "FresherFlow",
    statusBarStyle: "default"
  }
};

import { AuthFormDataProvider } from "@/contexts/AuthFormDataContext";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <ThemeScript />
        {/* Dynamic theme-color updated via ThemeScript & ThemeContext */}
        <meta name="theme-color" content="#f8fafc" id="theme-color-meta" />
        <meta property="og:image" content="https://fresherflow.in/opengraph-image" />
        <meta property="og:image:secure_url" content="https://fresherflow.in/opengraph-image" />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <link rel="preload" as="image" href="/logo-optimized.png?v=3" fetchPriority="high" />
        <link rel="preload" as="image" href="/logo-white-optimized.png?v=3" fetchPriority="high" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "FresherFlow",
              url: "https://fresherflow.in",
              logo: "https://fresherflow.in/fresherflow-logo-v2.png",
            }),
          }}
        />
        {/* Dynamic Manifest Loader for Admin PWA */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (window.location.pathname.startsWith('/admin')) {
                var link = document.createElement('link');
                link.rel = 'manifest';
                link.href = '/admin-manifest.json';
                document.head.appendChild(link);
              } else {
                var link = document.createElement('link');
                link.rel = 'manifest';
                link.href = '/manifest.webmanifest';
                document.head.appendChild(link);
              }
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} antialiased bg-background text-foreground selection:bg-primary/20`} suppressHydrationWarning>
        <ThemeProvider>
          <AuthFormDataProvider>
            <ConditionalAuthProvider>
              <InstallPromptProvider>
                <NavigationWrapper>
                  <ErrorBoundary>
                    {children}
                  </ErrorBoundary>
                </NavigationWrapper>
                <InstallAppBanner />
              </InstallPromptProvider>
              <PushNotificationProvider />
            </ConditionalAuthProvider>
          </AuthFormDataProvider>
        </ThemeProvider>
        <ServiceWorkerRegister />
        <SmartToaster />
        <OfflineNotification />
        <Suspense fallback={null}>
          <GoogleAnalytics ga_id={process.env.NEXT_PUBLIC_GA_ID || ''} />
        </Suspense>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

