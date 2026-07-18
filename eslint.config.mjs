import { defineConfig, globalIgnores } from "eslint/config";
import { flatConfig } from "@next/eslint-plugin-next";

export default defineConfig([
  globalIgnores([".next/**", "node_modules/**", "supabase/functions/**"]),
  flatConfig.coreWebVitals,
  {
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
]);
