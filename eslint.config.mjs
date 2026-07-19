import { defineConfig, globalIgnores } from "eslint/config";
import nextPlugin from "@next/eslint-plugin-next";

export default defineConfig([
  globalIgnores([".next/**", "node_modules/**", "supabase/functions/**"]),
  nextPlugin.configs["core-web-vitals"],
  {
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
]);
