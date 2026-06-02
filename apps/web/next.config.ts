import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import path from "node:path";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

function resolveHost(value: string | undefined, fallback: string): string {
  const raw = (value || '').trim();
  if (!raw) return fallback;
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return raw.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').toLowerCase();
  }
}

function resolveWebOrigin(...values: Array<string | undefined>): string {
  for (const candidate of values) {
    const raw = candidate?.trim();
    if (!raw) continue;
    try {
      return new URL(raw).origin;
    } catch {
      try {
        return new URL(`https://${raw}`).origin;
      } catch {
        continue;
      }
    }
  }

  return IS_PRODUCTION ? "" : "http://localhost:3000";
}

function resolveDevApiOrigin(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_API_URL,
    process.env.API_URL,
    process.env.INTERNAL_API_URL,
    "http://localhost:5000",
  ];

  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (!value) continue;
    try {
      const url = new URL(/^https?:\/\//i.test(value) ? value : `http://${value}`);
      return url.origin;
    } catch {
      continue;
    }
  }

  return "http://localhost:5000";
}

const DEV_API_ORIGIN = resolveDevApiOrigin();
const ADMIN_HOST = resolveHost(
  process.env.ADMIN_WEB_HOST || process.env.NEXT_PUBLIC_ADMIN_WEB_HOST,
  IS_PRODUCTION ? "" : "localhost"
);
const APP_ORIGIN = resolveWebOrigin(
  process.env.NEXT_PUBLIC_APP_WEB_HOST,
  process.env.APP_WEB_HOST,
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.NEXT_PUBLIC_SITE_URL
);

const nextConfig: NextConfig = {
  output: 'standalone',
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
  transpilePackages: [
    "@fresherflow/types", 
    "@fresherflow/schemas", 
    "@fresherflow/constants", 
    "@fresherflow/domain", 
    "@fresherflow/utils",
    "@fresherflow/api-client",
    "@repo/ui"
  ],

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
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.google.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'icons.duckduckgo.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    const baseHeaders = [
      // Needed for Google Identity popup/postMessage flows on login.
      { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
      { key: "Cross-Origin-Embedder-Policy", value: "unsafe-none" },
      // Standard Security Headers
      { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains; preload" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ...(APP_ORIGIN
        ? [
            { key: "Access-Control-Allow-Credentials", value: "true" },
            { key: "Access-Control-Allow-Origin", value: APP_ORIGIN },
            { key: "Access-Control-Allow-Methods", value: "GET,OPTIONS,PATCH,DELETE,POST,PUT" },
            { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, X-Requested-From, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, sentry-trace, baggage" },
          ]
        : []),
    ];

    return [
      ...(ADMIN_HOST
        ? [{
            source: "/:path*",
            has: [{ type: "host" as const, value: ADMIN_HOST }],
            headers: [
              { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
            ],
          }]
        : []),
      {
        source: "/admin",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
        ],
      },
      {
        source: "/:path*",
        headers: baseHeaders,
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
        destination: `${DEV_API_ORIGIN}/api/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/index",
        destination: "/",
        permanent: true,
      },
      {
        source: "/download",
        destination: "/app",
        permanent: true,
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        tls: false,
        net: false,
        fs: false,
        child_process: false,
        readline: false,
      };
    }
    return config;
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
