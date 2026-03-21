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
        project: [
          "./tsconfig.json",
          "./apps/*/tsconfig.json",
          "./packages/*/tsconfig.json",
        ],
        tsconfigRootDir: __dirname,
      },
    },
    settings: {
      "import/resolver": {
        typescript: {
          project: [
            "./tsconfig.json",
            "./apps/*/tsconfig.json",
            "./packages/*/tsconfig.json",
          ],
        },
      },
    },
  },
  {
    ignores: [
      "**/dist/**",
      "**/.next/**",
      "**/.artifacts/**",
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
            { group: ["apps/*"], message: "Apps cannot import other apps" }
          ],
        },
      ],
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
