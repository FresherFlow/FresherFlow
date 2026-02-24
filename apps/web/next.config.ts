import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@fresherflow/types", "@fresherflow/schemas", "@fresherflow/constants"],

  // Twitter-style navigation caching
  // Pages stay cached in router for 5 minutes
  // Back button = instant, no reload
  experimental: {
    staleTimes: {
      dynamic: 300, // 5 minutes for dynamic pages
      static: 300,  // 5 minutes for static pages
    },
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'logo.clearbit.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Needed for Google Identity popup/postMessage flows on login.
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          { key: "Cross-Origin-Embedder-Policy", value: "unsafe-none" },
          // Standard Security Headers
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  async rewrites() {
    // Note: We don't rewrite /api/* to localhost:5000 in production 
    // because it shadows internal Next.js routes like /api/og.
    // The API client uses absolute URLs (NEXT_PUBLIC_API_URL) so this is redundant.
    if (process.env.NODE_ENV === 'production') return [];

    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:5000/api/:path*",
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during bundling
  silent: true,
  org: "fresherflow",
  project: "javascript-nextjs",

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,
});
