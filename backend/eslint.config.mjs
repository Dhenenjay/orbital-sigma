import js from "@eslint/js";

export default [
  {
    ignores: ["node_modules/**", "convex/_generated/**", ".convex/**"],
  },
  js.configs.recommended,
];
