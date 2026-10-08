const globals = require("globals");

module.exports = [
  {
    files: ["fuente/**/*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "script",
      // CECE_KEYS y CECE_BOVEDA vienen del bloque de configuración; EMOJI_SETS, del de emojis (cece-ai.html)
      globals: { ...globals.browser, CECE_KEYS: "readonly", CECE_BOVEDA: "readonly", EMOJI_SETS: "readonly" },
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { args: "none", caughtErrors: "none", ignoreRestSiblings: true }],
      "no-dupe-keys": "error",
      "no-duplicate-case": "error",
      "no-self-assign": "error",
      "no-self-compare": "error",
      "no-unreachable": "error",
      "no-const-assign": "error",
      "no-redeclare": "error",
      "no-unsafe-finally": "error",
      "no-unsafe-negation": "error",
      "no-unsafe-optional-chaining": "error",
      "no-constant-binary-expression": "error",
      "no-dupe-else-if": "error",
      "no-loss-of-precision": "error",
      "use-isnan": "error",
      "valid-typeof": "error",
      "no-async-promise-executor": "error",
      "no-invalid-regexp": "error",
      "no-misleading-character-class": "error",
    },
  },
  {
    files: ["herramientas/**/*.js", "eslint.config.js"],
    languageOptions: { ecmaVersion: 2024, sourceType: "commonjs", globals: { ...globals.node } },
  },
];
