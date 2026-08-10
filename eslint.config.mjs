import js from "@eslint/js";
import tseslint from "typescript-eslint";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      "packages/domain/src/**/*.js",
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
  // 2. Domain (strictest - Pure business logic)
  {
    files: ["packages/domain/**/*"],
    rules: {
      "no-restricted-imports": [
        "error",
        { 
          patterns: [
            "@repo/api-client", 
            "@repo/database", 
            "@repo/redis", 
            "apps/*"
          ] 
        }
      ]
    }
  },
  // 3. UI Layer (web/mobile/admin)
  {
    files: ["apps/web/**/*", "apps/mobile/**/*", "apps/admin-mobile/**/*"],
    rules: {
      "no-restricted-imports": [
        "error",
        { 
          patterns: [
            "@repo/database", 
            "@repo/redis", 
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
  // 5. Scripts & Scrapers (scraping / utility / plugin / ingestion packages)
  {
    files: ["scripts/**/*", "packages/plugins/**/*", "packages/parser/**/*", "apps/ingestion/**/*", "packages/utils/**/*"],
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
