import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,

  // browser source (ES modules): index.js + modules + constants
  {
    files: ["index.js", "modules/**/*.js", "constants/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser },
    },
  },

  // node tooling + tests (ES modules)
  {
    files: ["tests/**/*.mjs", "eslint.config.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node },
    },
  },

  {
    ignores: ["assets/**", "node_modules/**"],
  },
];
