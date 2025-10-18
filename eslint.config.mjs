import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import localRules from "eslint-plugin-local-rules";
import prettier from "eslint-plugin-prettier";
import { defineConfig } from "eslint/config";
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([{
    extends: compat.extends(
        "plugin:prettier/recommended",
        "plugin:@typescript-eslint/recommended",
        "prettier",
    ),

    plugins: {
        prettier,
        "local-rules": localRules,
    },

    languageOptions: {
        globals: {
            ...globals.browser,
            Atomics: "readonly",
            SharedArrayBuffer: "readonly",
        },

        parser: tsParser,
        ecmaVersion: 2018,
        sourceType: "module",
    },

    files: ["**/*.ts"],

    rules: {
        "consistent-return": 0,
        "import/prefer-default-export": 0,
        "import/no-unresolved": 0,
        "import/extensions": 0,
        "lines-between-class-members": 0,
        "no-plusplus": 0,
        "no-undef": 0,
        "no-console": 0,
        "no-nested-ternary": 0,
        "no-new": 0,
        "no-param-reassign": 0,
        "no-continue": 0,
        "no-unused-expressions": 0,
        "no-useless-constructor": 0,
        "@typescript-eslint/no-useless-constructor": [2],
        "prettier/prettier": 2,
        "no-use-before-define": 0,
        "@typescript-eslint/no-use-before-define": 2,
        "@typescript-eslint/array-type": 0,
        "@typescript-eslint/indent": 0,
        "@typescript-eslint/explicit-function-return-type": 0,
        "@typescript-eslint/explicit-member-accessibility": 0,
        "@typescript-eslint/explicit-module-boundary-types": 0,
        "@typescript-eslint/ban-types": 0,
        "local-rules/validate-calculate-damage": ["error"],
    },
}, {
    files: ["**/*.spec.ts"],

    rules: {
        "@typescript-eslint/no-explicit-any": 0,
    },
}]);