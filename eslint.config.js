// Shared ESLint flat config. Per-package configs extend this.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "no-restricted-syntax": [
        "error",
        {
          selector: "ExportDefaultDeclaration",
          message: "Named exports only. See docs/standards/CODING_STANDARDS.md"
        }
      ]
    },
    ignores: ["dist/**", "node_modules/**", "coverage/**"]
  }
);
