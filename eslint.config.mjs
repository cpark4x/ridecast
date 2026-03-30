import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "test-results/**",
    "playwright-report/**",
    "next-env.d.ts",
    // Git worktrees — each has its own .next build artifacts that must not be linted
    ".worktrees/**",
    // React Native / Expo directory — uses RN-specific patterns incompatible with
    // Next.js ESLint rules (same reason native/ is excluded from tsconfig.json)
    "native/**",
  ]),
]);

export default eslintConfig;
