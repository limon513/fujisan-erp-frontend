import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import prettier from "eslint-config-prettier";
import globals from "globals";

const eslintConfig = defineConfig([
  ...nextVitals,
  prettier,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    // Plain JS has no type checker: catch undefined variables at lint time
    rules: { "no-undef": "error" },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
