// @ts-check
//
// Minimal ESLint v9 flat config used by `apps/api` and `packages/shared`.
// `apps/web` runs through `next lint` which uses .eslintrc.json (kept
// separate because Next 14's lint integration doesn't yet load flat config).
//
// Goal: catch real bugs (unused imports, missing `await`, etc.) without
// failing on stylistic preferences. Warnings are emitted but don't fail
// CI; only ESLint-level errors do.

import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  {
    // Generated, vendored, and build outputs we never want to lint
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.next/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/prisma/migrations/**",
      "**/*.d.ts",
      // Per-app .eslintrc files are handled by each app's own runner
      "apps/web/**",
    ],
  },

  // ESLint recommended baseline (catches real bugs)
  js.configs.recommended,

  // TypeScript files
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
      globals: {
        // Node + browser-ish — the api targets node, shared package is iso
        process: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        Buffer: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      // TS handles these better than core ESLint
      "no-unused-vars": "off",
      "no-undef": "off", // TS already enforces this
      "no-redeclare": "off",
      "no-empty": ["warn", { allowEmptyCatch: true }],

      // TypeScript-flavoured replacements
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },

  // JS files (rare in this project — config files mostly)
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        process: "readonly",
        console: "readonly",
        module: "readonly",
        require: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
      },
    },
  },
];
