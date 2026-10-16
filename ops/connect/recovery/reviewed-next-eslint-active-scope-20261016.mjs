import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import reactPlugin from "eslint-plugin-react";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    plugins: { react: reactPlugin },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
      "react/no-unescaped-entities": "warn",
    },
  },
  // Node test/release helpers use CommonJS by design. Preserve lint rules
  // everywhere else; TS ESM import prohibition does not apply to .cjs files.
  {
    files: ["**/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  // These root maintenance tools run as CommonJS; keep other lint rules active.
  {
    files: ["find_client_issues.js", "scan_client_missing.js", "scan_client_routes.js", "prisma/lock-assps-data.js", "prisma/seed-demo.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Legacy snapshot is also excluded from active TypeScript compilation.
    "src-backup-*/**",
  ]),
]);

export default eslintConfig;
