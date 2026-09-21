import js from "@eslint/js";
import tseslint from "typescript-eslint";
import { plugin as shadcn } from "@shadcn/lint";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Component contracts for @shadcn/lint: what a page may change on our
// primitives. Button owns size + shape; pages own placement (margin, w-full).
// If a variant/size is genuinely missing, add it to apps/web/src/ui — the
// error messages tell agents exactly that.
const shadcnRestyleOptions = {
  allow: ["layout"],
  message: {
    spacing:
      "{{component}} owns its spacing. Use a size: {{sizes}} — or margin/gap on the parent. If a size is missing, add it to apps/web/src/ui.",
    shape:
      "{{component}} owns its shape. Use a variant: {{variants}} — never restyle at the call site. If a variant is missing, add it to apps/web/src/ui.",
  },
  contracts: [
    {
      pattern: "^Button$",
      allow: ["w-full", "mt-*", "mb-*", "mx-*", "my-*", "ml-*", "mr-*"],
    },
    { pattern: "^CardTitle$", allow: ["layout", "typography"], deny: ["font-*"] },
    { pattern: "^CardContent$", allow: ["layout", "spacing"] },
    { pattern: "^Badge$", allow: ["layout"] },
    { pattern: "^Input$", allow: ["layout", "spacing"] },
  ],
};

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/.artifacts/**",
      "**/*.d.ts",
      "**/*.d.ts.map",
      "**/src/generated/**",
      "**/prisma/**",
      "**/build/**",
      "packages/parser/src/**/*.js",
      "packages/utils/src/*.js",
      "packages/types/index.js",
      "packages/types/index.js.map"
    ],
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: "off",
    },
    plugins: {
      "react-hooks": {
        rules: {
          "exhaustive-deps": { meta: {}, create: () => ({}) },
          "rules-of-hooks": { meta: {}, create: () => ({}) },
        },
      },
      "@next/next": {
        rules: {
          "no-img-element": { meta: {}, create: () => ({}) },
          "no-html-link-for-pages": { meta: {}, create: () => ({}) },
        },
      },
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tseslint.parser,
    },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // 1. Mono-repo Global Boundaries
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["apps/*"], message: "Apps cannot import other apps" }
          ],
        },
      ],
      "@typescript-eslint/no-unused-expressions": "off",
      "no-unused-expressions": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
      "react-hooks/immutability": "off",
    },
  },
  // 2. Shared packages (no phantom workspace names)
  // Next.js API routes run on the server — database access is legal there.
  {
    files: ["apps/web/src/app/api/**/*"],
    rules: {
      "no-restricted-imports": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "no-empty": "off",
    },
  },
  // 3. UI Layer (web/mobile/admin)
  {
    files: ["apps/web/**/*", "apps/mobile/**/*", "apps/admin-mobile/**/*"],
    ignores: ["apps/web/src/app/api/**/*"],
    rules: {
      "no-restricted-imports": [
        "error",
        { 
          patterns: [
            "@fresherflow/database",
            "apps/api"
          ] 
        }
      ],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "no-extra-semi": "off",
      "no-undef": "off",
      "no-empty": "off",
      "prefer-const": "off",
      "react-hooks/exhaustive-deps": "off"
    }
  },
  // 3b. Web layering — the contract in apps/web/AGENTS.md.
  // app/ → features/ → ui/, hooks/, lib/.  No back-edges.
  //
  // Error, not warn: `pnpm --filter ./apps/web check:structure` reports 0 violations,
  // so a back-edge now fails lint the moment it is introduced.
  {
    files: ["apps/web/src/ui/**/*", "apps/web/src/hooks/**/*"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/*", "@/features/**"],
              message:
                "ui/ and hooks/ are the bottom layer and must not import features/. Move the component into features/<domain>/ instead — see apps/web/AGENTS.md.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["apps/web/src/lib/**/*"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features/*", "@/features/**"],
              message:
                "lib/ is infrastructure and must not import features/ (back-edge). Move the shared piece down into lib/ (lib/cache, lib/utils, …) or inject it from app/ — see apps/web/AGENTS.md.",
            },
          ],
        },
      ],
    },
  },
  {
    // A route-private app/<route>/components|hooks file is owned by that route only.
    files: ["apps/web/src/**/*"],
    ignores: ["apps/web/src/app/**/*"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/**/components/*", "@/app/**/components/**", "@/app/**/hooks/*", "@/app/**/hooks/**"],
              message:
                "Route-private components/hooks cannot be imported from outside their route. If two places need it, it belongs in src/features/<domain>/ — see apps/web/AGENTS.md.",
            },
          ],
        },
      ],
    },
  },
  // 4. API layer
  {
    files: ["apps/api/**/*"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: ["apps/web", "apps/mobile"] }
      ],
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off"
    }
  },
  // @shadcn/lint — design-system enforcement for the web app.
  // Theme tokens live in apps/web/src/app/globals.css (--background, --foreground,
  // --ff-band-*, --ff-accent, ...); guidance in apps/web/DESIGN_SYSTEM.md.
  {
    files: ["apps/web/src/**/*.{ts,tsx}"],
    plugins: { shadcn },
    settings: {
      shadcn: {
        ui: "@/ui",
        note: "Use theme tokens from apps/web/src/app/globals.css (bg-background, text-foreground, --ff-* variables) instead of raw colors. See apps/web/DESIGN_SYSTEM.md. To change a primitive, extend the component in apps/web/src/ui — never restyle at the call site.",
      },
    },
    rules: {
      // Raw palette colors break light/dark theming — always a real bug here.
      // Error on the surfaces we keep clean (landing, navigation, shared lib
      // components); warn elsewhere until the pre-existing backlog is migrated.
      "shadcn/no-raw-colors": "warn",
      // Restyle contracts: warn app-wide while the backlog is migrated, then
      // flip to error (the clean zones below are already error).
      "shadcn/no-restyle": ["warn", shadcnRestyleOptions],
      // Button.tsx documents "no arbitrary values outside this file" — enforce it.
      "shadcn/no-arbitrary-values": "warn",
      // Typo / dead-class check. Keep enabled in ui/ too per docs (checks plain
      // elements and helpers). Start at warn per adoption guide, promote later.
      "shadcn/no-unknown-classes": "warn",
      "shadcn/require-static-classes": "warn",
    },
  },
  // The ui directory *defines* the primitives — it composes classes by design,
  // so restyle/arbitrary-value/require-static rules only apply to component *usage*.
  {
    files: ["apps/web/src/ui/**"],
    plugins: { shadcn },
    rules: {
      "shadcn/no-restyle": "off",
      "shadcn/no-arbitrary-values": "off",
      "shadcn/require-static-classes": "off",
    },
  },
  // Landing uses fluid clamp typography and the brand orange --ff-accent
  // (bg-[var(--ff-accent)], text-[clamp(...)]) by design — those are
  // intentional arbitrary values, not scale drift. Lint would otherwise
  // flatten them to text-3xl/bg-primary and kill the orange.
  {
    files: ["apps/web/src/features/landing/**"],
    plugins: { shadcn },
    rules: {
      "shadcn/no-arbitrary-values": "off",
    },
  },
  {
    files: [
      "apps/web/src/features/navigation/**",
      "apps/web/src/features/shell/**",
    ],
    plugins: { shadcn },
    rules: {
      "shadcn/no-raw-colors": "error",
      // Promote to "error" once the shadcn backlog (28 restyle + ~300
      // arbitrary-values hits measured here) is migrated to variants/tokens.
      "shadcn/no-restyle": ["warn", shadcnRestyleOptions],
      "shadcn/no-arbitrary-values": "warn",
      "shadcn/no-unknown-classes": "warn",
      "shadcn/require-static-classes": "warn",
    },
  },
  // Collapsible shell tracks --sidebar-w; width / left / padding-left use
  // custom cubic-bezier(0.7,0,0,1) — intentional.
  {
    files: ["apps/web/src/features/navigation/AppSidebar.tsx", "apps/web/src/features/navigation/NavigationWrapper.tsx", "apps/web/src/features/navigation/TopHeaderBar.tsx"],
    plugins: { shadcn },
    rules: {
      "shadcn/no-arbitrary-values": "off",
    },
  },
  // Wrapper primitives that forward className strings opaquely — the value is
  // still static at the call site, but the linter cannot see through the prop.
  {
    files: ["apps/web/src/features/admin/ui/**"],
    plugins: { shadcn },
    rules: {
      "shadcn/require-static-classes": "off",
    },
  },
  // 5. Scripts & Scrapers (scraping / utility / plugin / ingestion packages)
  {
    files: ["scripts/**/*", "packages/plugins/**/*", "packages/parser/**/*", "apps/ingestion/**/*", "packages/utils/**/*", "packages/pipeline/**/*"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "no-extra-semi": "off",
      "no-undef": "off",
      "no-empty": "off",
      "prefer-const": "off",
      "no-useless-escape": "off",
      "no-constant-condition": "off",
      "no-irregular-whitespace": "off"
    }
  }
];
