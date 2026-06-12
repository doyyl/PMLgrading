import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";

// Vite + React SPA — the old eslint-config-next presets no longer apply.
const eslintConfig = defineConfig([
  globalIgnores([".next/**", "dist/**", "out/**", "build/**", "next-env.d.ts", "src/app/**", "src/proxy.ts", "src/lib/supabase/server.ts"]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    },
  },
]);

export default eslintConfig;
