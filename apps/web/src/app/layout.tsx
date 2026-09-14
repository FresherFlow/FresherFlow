import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";
import { ConditionalAuthProvider } from "@/lib/providers/ConditionalAuthProvider";
import { SmartToaster } from '@/lib/components/SmartToaster';
import { ScrollToTop } from '@/ui/ScrollToTop';
import { ThemeProvider } from "@/lib/providers/ThemeContext";
import { InstallPromptProvider } from "@/lib/providers/InstallPromptContext";

// WEB PIVOT: keep these imports disabled until web app mode returns.
// import ServiceWorkerRegister from "@/lib/providers/ServiceWorkerRegister";
// import PushNotificationProvider from "@/lib/providers/PushNotificationProvider";
import { themeScriptContent } from '@/lib/components/ThemeScript';
// import OfflineNotification from "@/ui/OfflineNotification";
import dynamic from "next/dynamic";
import { Inter, Geist, Bricolage_Grotesque, IBM_Plex_Mono } from "next/font/google";

const InstallAppBanner = dynamic(() => import("@/ui/InstallAppBanner"));

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

import { PageTransitionWrapper } from '@/lib/components/PageTransitionWrapper';
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { getHeadInjectionScripts } from '@/lib/components/HeadInjections';
import { InlineScript } from '@/lib/components/InlineScript';
import { SITE_URL } from "@/lib/utils/runtimeConfig";
import { cn } from "@/lib/utils/utils";
import { AuthFormDataProvider } from '@/lib/auth/AuthFormDataContext';
import { ErrorBoundary } from '@/lib/components/ErrorBoundary';

const geist = Geist({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });

// Plan 17 §17.2 type system: Bricolage Grotesque carries the display voice,
// IBM Plex Mono the "official record" voice (stamps, board eyebrows, counts).
// Build-time self-hosted by next/font — no npm dependency, no runtime fetch.
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
});

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
    default: "FresherFlow — Jobs, powered by freshers.",
    template: "%s | FresherFlow",
  },
  description: "FresherFlow is a community of freshers who share opportunities, discuss hiring, and keep each other informed — so no fresher applies blind.",
  openGraph: {
    type: "website",
    siteName: "FresherFlow",
    title: "FresherFlow — Jobs, powered by freshers.",
    description: "FresherFlow is a community of freshers who share opportunities, discuss hiring, and keep each other informed — so no fresher applies blind.",
    images: [
      {
        url: OG_IMAGE_URL,
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "FresherFlow — Jobs, powered by freshers.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FresherFlow — Jobs, powered by freshers.",
    description: "FresherFlow is a community of freshers who share opportunities, discuss hiring, and keep each other informed — so no fresher applies blind.",
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
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable, bricolage.variable, plexMono.variable)}>
      <head>
        <meta charSet="utf-8" />
        <meta name="color-scheme" content="light dark" />
        <InlineScript id="head-init-script" html={themeScriptContent.trim() + '\n' + getHeadInjectionScripts().trim()} />
        <link rel="preconnect" href="https://static.cloudflareinsights.com" />
        <link rel="manifest" href="/manifest.webmanifest" id="ff-manifest-link" />
        {/* DNS prefetch and preconnect for faster initial connections */}
        <link rel="preconnect" href="https://cdn.fresherflow.in" />
        <link rel="dns-prefetch" href="https://cdn.fresherflow.in" />
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_API_URL || 'https://api.fresherflow.in'} crossOrigin="anonymous" />
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_API_URL || 'https://api.fresherflow.in'} />
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
      </head>
      <body className={`${inter.variable} min-h-screen flex flex-col antialiased bg-background text-foreground selection:bg-primary/20`} suppressHydrationWarning>
        <ThemeProvider>
            <PageTransitionWrapper>
              <AuthFormDataProvider>
                <ConditionalAuthProvider>
                  <InstallPromptProvider>
                    <ErrorBoundary>
                      {children}
                    </ErrorBoundary>
                    <InstallAppBanner />
                  </InstallPromptProvider>
                </ConditionalAuthProvider>
              </AuthFormDataProvider>
            </PageTransitionWrapper>
        </ThemeProvider>
        <SmartToaster />
        <ScrollToTop />
        {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
        {enableVercelAnalytics ? <Analytics /> : null}
        {enableSpeedInsights ? <SpeedInsights /> : null}
        <InlineScript
          id="release-pointer-capture-patch"
          html={`
              if (typeof window !== 'undefined' && Element.prototype.releasePointerCapture) {
                const originalRelease = Element.prototype.releasePointerCapture;
                Element.prototype.releasePointerCapture = function(pointerId) {
                  try {
                    originalRelease.call(this, pointerId);
                  } catch (e) {}
                };
              }
            `}
        />
        {process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_CF_BEACON_TOKEN && (
          <Script
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon={`{"token": "${process.env.NEXT_PUBLIC_CF_BEACON_TOKEN}"}`}
            strategy="afterInteractive"
          />
        )}
      </body>
    </html>
  );
}
