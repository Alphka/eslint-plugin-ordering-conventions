import { createRequire } from "node:module"
import parameterDestructuringOrder from "./rules/parameter-destructuring-order.js"
import tailwindApplyClassOrder from "./rules/tailwind-apply-class-order.js"
import hookDeclarationOrder from "./rules/hook-declaration-order.js"
import interfaceMemberOrder from "./rules/interface-member-order.js"
import tailwindClassOrder from "./rules/tailwind-class-order.js"
import jsxAttributeOrder from "./rules/jsx-attribute-order.js"
import jsonKeyOrder from "./rules/json-key-order.js"
import importOrder from "./rules/import-order.js"

const { version } = createRequire(import.meta.url)("../package.json")

/** @type {import("eslint").ESLint.Plugin} */
const plugin = {
	meta: { name: "eslint-plugin-ordering-conventions", version },
	rules: {
		"hook-declaration-order": hookDeclarationOrder,
		"import-order": importOrder,
		"interface-member-order": interfaceMemberOrder,
		"json-key-order": jsonKeyOrder,
		"jsx-attribute-order": jsxAttributeOrder,
		"parameter-destructuring-order": parameterDestructuringOrder,
		"tailwind-class-order": tailwindClassOrder,
		"tailwind-apply-class-order": tailwindApplyClassOrder
	}
}

/*
 * The configs are flat-config fragments with no `files` of their own: spread them into a config
 * object that scopes them, since only the caller knows which files a language applies to.
 */
plugin.configs = {
	/** Every rule that runs under the default JavaScript language. */
	recommended: {
		name: "ordering-conventions/recommended",
		plugins: { "ordering-conventions": plugin },
		rules: {
			"ordering-conventions/import-order": "error",
			"ordering-conventions/interface-member-order": "error",
			"ordering-conventions/parameter-destructuring-order": "error",
			"ordering-conventions/jsx-attribute-order": "error",
			"ordering-conventions/hook-declaration-order": "error"
		}
	},

	/** Class-string ordering, kept separate because it only makes sense in a Tailwind project. */
	tailwind: {
		name: "ordering-conventions/tailwind",
		plugins: { "ordering-conventions": plugin },
		rules: {
			"ordering-conventions/tailwind-class-order": "error"
		}
	},

	/** Add `files` and `language: "css/css"` from `@eslint/css` alongside this one. */
	css: {
		name: "ordering-conventions/css",
		plugins: { "ordering-conventions": plugin },
		rules: {
			"ordering-conventions/tailwind-apply-class-order": "error"
		}
	}
}

export default plugin
