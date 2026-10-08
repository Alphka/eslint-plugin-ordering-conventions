import ordering from "./lib/index.js"
import js from "@eslint/js"

/* The plugin lints itself: the rules that apply to plain JavaScript run over its own source. */
export default [
	js.configs.recommended,
	{
		files: ["**/*.js"],
		languageOptions: {
			ecmaVersion: 2023,
			sourceType: "module"
		},
		plugins: { "ordering-conventions": ordering },
		rules: {
			"ordering-conventions/import-order": "error",
			"ordering-conventions/hook-declaration-order": "error",
			"ordering-conventions/parameter-destructuring-order": "error"
		}
	},
	{
		files: ["tests/**/*.js"],
		languageOptions: {
			globals: { URL: "readonly" }
		}
	},
	{
		ignores: ["node_modules/"]
	}
]
