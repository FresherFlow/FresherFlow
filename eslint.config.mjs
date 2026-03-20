import js from "@eslint/js";
import tseslint from "typescript-eslint";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default [
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true,
        tsconfigRootDir: __dirname,
      },
    },
  },
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/*.d.ts",
      "**/*.d.ts.map",
      "packages/domain/src/**/*.js",
      "packages/parser/build/**",
      "packages/parser/src/**/*.js",
      "packages/utils/src/*.js",
      "packages/types/index.js",
      "packages/types/index.js.map"
    ],
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
            { group: ["apps/*"], message: "Apps cannot import other apps" },
            { group: ["@repo/database", "@repo/redis"], message: "UI cannot access infrastructure" },
            { group: ["@repo/database", "@repo/redis", "@repo/api-client"], message: "Domain cannot depend on infra or API" },
            { group: ["@repo/domain"], message: "Utils cannot depend on domain" },
            { group: ["../..*", "../../..*"], message: "No relative cross-layer imports allowed (use path aliases)" }
          ],
        },
      ],
    },
  },
  // 2. Domain (strictest)
  {
    files: ["packages/domain/**/*"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: ["@repo/api-client", "@repo/database", "@repo/redis", "apps/*"] }
      ]
    }
  },
  // 3. UI apps (web/mobile/admin)
  {
    files: ["apps/web/**/*", "apps/mobile/**/*", "apps/admin-mobile/**/*"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: ["@repo/database", "@repo/redis", "apps/api"] }
      ]
    }
  },
  // 4. API layer
  {
    files: ["apps/api/**/*"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: ["apps/web", "apps/mobile"] }
      ]
    }
  }
];
