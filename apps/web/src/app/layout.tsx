import type { Metadata, Viewport } from "next";
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
import { GoogleAnalytics } from "@next/third-parties/google";
import { ADMIN_WEB_HOST, SITE_URL } from "@/lib/runtimeConfig";

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
    default: "FresherFlow",
    template: "%s | FresherFlow",
  },
  description: "Verified fresher jobs, internships, and walk-ins in India. Direct apply links, profile-fit ranking, and closing-soon alerts on FresherFlow.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    siteName: "FresherFlow",
    title: "FresherFlow - Verified Fresher Jobs & Internships in India",
    description: "Verified fresher jobs, internships, and walk-ins in India with direct apply links.",
    images: [
      {
        url: OG_IMAGE_URL,
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

import { AuthFormDataProvider } from "@/contexts/AuthFormDataContext";
import { ErrorBoundary } from "@/components/providers/ErrorBoundary";

export default function RootLayout({
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
        {/* Dynamic theme-color updated via ThemeScript & ThemeContext */}
        <ThemeScript />
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                var manifestLink = document.getElementById('ff-manifest-link');
                if (!manifestLink) return;
                var hostname = window.location.hostname.toLowerCase();
                if (hostname === '${ADMIN_WEB_HOST}'.toLowerCase()) {
                  manifestLink.setAttribute('href', '/admin-manifest.json');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased bg-background text-foreground selection:bg-primary/20" suppressHydrationWarning>
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
        {gaId ? <GoogleAnalytics gaId={gaId} /> : null}
        {enableVercelAnalytics ? <Analytics /> : null}
        {enableSpeedInsights ? <SpeedInsights /> : null}
      </body>
    </html>
  );
}


