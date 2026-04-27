// ESLint 9 flat config wrapping legacy `eslint-config-expo` (Classic)
const { FlatCompat } = require("@eslint/eslintrc");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  resolvePluginsRelativeTo: __dirname,
});

/** @type {import("eslint").Linter.Config[]} */
module.exports = [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      ".expo/**",
      "ios/**",
      "android/**",
      "eslint.config.js",
      "jest.config.js",
      "jest.setup.js",
      "jest.setup.node.js",
      "babel.config.js",
      "metro.config.js",
      "tailwind.config.js",
    ],
  },
  ...compat.extends("expo"),
  // Add project-specific rules only after upgrading eslint-config-expo / eslint
  // to a stack where @typescript-eslint plugin resolves in flat + compat reliably.
];
