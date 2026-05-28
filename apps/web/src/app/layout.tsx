import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ConditionalAuthProvider } from "@/components/providers/ConditionalAuthProvider";
import { SmartToaster } from "@/components/providers/SmartToaster";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { InstallPromptProvider } from "@/contexts/InstallPromptContext";
import { NavigationWrapper } from "@/components/providers/NavigationWrapper";
// WEB PIVOT: keep these imports disabled until web app mode returns.
// import ServiceWorkerRegister from "@/components/providers/ServiceWorkerRegister";
// import PushNotificationProvider from "@/components/providers/PushNotificationProvider";
// import { ThemeScript } from "@/components/providers/ThemeScript";
// import OfflineNotification from "@/components/ui/OfflineNotification";
import InstallAppBanner from "@/components/ui/InstallAppBanner";
import { SiteModeProvider } from "@/contexts/SiteModeContext";
import { PageTransitionWrapper } from "@/components/providers/PageTransitionWrapper";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { GoogleAnalytics } from "@next/third-parties/google";
import { HeadInjections } from "@/components/providers/HeadInjections";
import { SITE_URL } from "@/lib/runtimeConfig";
import { SiteMode } from "@/lib/siteMode";
import { AuthFormDataProvider } from "@/contexts/AuthFormDataContext";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";

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
  alternates: {
    canonical: "/",
  },
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
  const initialSiteMode: SiteMode = 'private';
  const gaId = process.env.NEXT_PUBLIC_GA_ID || '';
  const enableVercelAnalytics = process.env.NEXT_PUBLIC_ENABLE_VERCEL_ANALYTICS === 'true';
  const enableSpeedInsights = process.env.NEXT_PUBLIC_ENABLE_SPEED_INSIGHTS === 'true';
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="theme-color" content="#e2eaf2" id="theme-color-meta" />
        <HeadInjections />
        <meta property="og:image" content={OG_IMAGE_URL} />
        <meta property="og:image:secure_url" content={OG_IMAGE_URL} />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <link rel="manifest" href="/manifest.webmanifest" id="ff-manifest-link" />
        <link rel="preload" as="image" href="/logo-optimized.png?v=3" fetchPriority="high" />
        <link rel="preload" as="image" href="/logo-white-optimized.png?v=3" fetchPriority="high" />
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
      <body className="antialiased bg-background text-foreground selection:bg-primary/20" suppressHydrationWarning>
        <ThemeProvider>
          <SiteModeProvider initialMode={initialSiteMode}>
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
          </SiteModeProvider>
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
