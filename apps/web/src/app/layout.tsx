import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ConditionalAuthProvider } from "@/lib/providers/ConditionalAuthProvider";
import { SmartToaster } from '@/lib/components/SmartToaster';
import { ThemeProvider } from "@/lib/providers/ThemeContext";
import { InstallPromptProvider } from "@/lib/providers/InstallPromptContext";
import { NavigationWrapper } from '@/lib/components/NavigationWrapper';
// WEB PIVOT: keep these imports disabled until web app mode returns.
// import ServiceWorkerRegister from "@/lib/providers/ServiceWorkerRegister";
// import PushNotificationProvider from "@/lib/providers/PushNotificationProvider";
// import { ThemeScript } from '@/lib/components/ThemeScript';
// import OfflineNotification from "@/ui/OfflineNotification";
import dynamic from "next/dynamic";
import { Inter } from "next/font/google";

const InstallAppBanner = dynamic(() => import("@/ui/InstallAppBanner"));

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['300', '400', '500', '600', '700', '800', '900']
});

import { PageTransitionWrapper } from '@/lib/components/PageTransitionWrapper';
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { HeadInjections } from '@/lib/components/HeadInjections';
import { SITE_URL } from "@/lib/utils/runtimeConfig";
import { AuthFormDataProvider } from '@/lib/auth/AuthFormDataContext';
import { ErrorBoundary } from '@/lib/components/ErrorBoundary';

const SITE_ORIGIN = SITE_URL;
const METADATA_BASE = SITE_ORIGIN ? new URL(SITE_ORIGIN) : undefined;
const OG_IMAGE_URL = SITE_ORIGIN ? `${SITE_ORIGIN}/opengraph-image` : '/opengraph-image';
const TWITTER_IMAGE_URL = SITE_ORIGIN ? `${SITE_ORIGIN}/twitter-image` : '/twitter-image';
const LOGO_URL = SITE_ORIGIN ? `${SITE_ORIGIN}/fresherflow-logo-v2.png` : '/fresherflow-logo-v2.png';

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: METADATA_BASE,
  applicationName: "FresherFlow",
  title: {
    default: "FresherFlow - Verified Off-Campus Opportunities",
    template: "%s | FresherFlow",
  },
  description: "The community-driven fresher job network. Share verified opportunities with zero redirect spam.",
  openGraph: {
    type: "website",
    siteName: "FresherFlow",
    title: "FresherFlow - Verified Off-Campus Opportunities",
    description: "The community-driven fresher job network. Share verified opportunities with zero redirect spam.",
    images: [
      {
        url: OG_IMAGE_URL,
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "FresherFlow - Verified Off-Campus Opportunities",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FresherFlow - Verified Off-Campus Opportunities",
    description: "The community-driven fresher job network. Share verified opportunities with zero redirect spam.",
    images: [TWITTER_IMAGE_URL],
  },
  icons: {
    icon: "/favicon-32x32.png",
    shortcut: "/favicon-32x32.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "FresherFlow",
    statusBarStyle: "black-translucent"
  }
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID || '';
  const enableVercelAnalytics = process.env.NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS === 'true';
  const enableSpeedInsights = process.env.NEXT_PUBLIC_ENABLE_SPEED_INSIGHTS === 'true';
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#e2eaf2" id="theme-color-meta" />
        <HeadInjections />
        <link rel="manifest" href="/manifest.webmanifest" id="ff-manifest-link" />
        <link rel="preload" as="image" href="/logo-optimized.png?v=3" />
        <link rel="preload" as="image" href="/logo-white-optimized.png?v=3" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "FresherFlow",
              ...(SITE_ORIGIN ? { url: SITE_ORIGIN } : {}),
              logo: LOGO_URL,
            }),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && Element.prototype.releasePointerCapture) {
                const originalRelease = Element.prototype.releasePointerCapture;
                Element.prototype.releasePointerCapture = function(pointerId) {
                  try {
                    originalRelease.call(this, pointerId);
                  } catch (e) {}
                };
              }
            `
          }}
        />
      </head>
      <body className={`${inter.variable} min-h-screen flex flex-col antialiased bg-background text-foreground selection:bg-primary/20`} suppressHydrationWarning>
        <ThemeProvider>
            <PageTransitionWrapper>
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
                  {/* WEB PIVOT: disabled push subscription API calls. */}
                  {/* <PushNotificationProvider /> */}
                </ConditionalAuthProvider>
              </AuthFormDataProvider>
            </PageTransitionWrapper>
        </ThemeProvider>
        {/* WEB PIVOT: disabled service worker/offline runtime. */}
        {/* <ServiceWorkerRegister /> */}
        <SmartToaster />
        {/* <OfflineNotification /> */}
        {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
        {enableVercelAnalytics ? <Analytics /> : null}
        {enableSpeedInsights ? <SpeedInsights /> : null}
      </body>
    </html>
  );
}
