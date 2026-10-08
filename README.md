# eslint-plugin-ordering-conventions

Auto-fixable ESLint rules for the ordering conventions a codebase keeps in its head: imports grouped and ragged by clause length, interface members sorted by key length, JSX attributes banded by role, Tailwind utilities in semantic order, JSON catalogues sorted by key.

Every rule is **formatting-neutral**. A fix permutes the *contents* of slots and never touches a separator byte, so your indentation, line breaks, `;`/`,` delimiters and multi-line layout survive exactly as written — there is nothing for a formatter to undo afterwards.

## Install

```sh
npm install --save-dev eslint-plugin-ordering-conventions
```

Requires ESLint 9 or newer and flat config.

## Usage

```js
// eslint.config.js
import ordering from "eslint-plugin-ordering-conventions"

export default [
	{
		files: ["**/*.{js,jsx,ts,tsx}"],
		...ordering.configs.recommended
	}
]
```

Or wire the rules up yourself:

```js
import ordering from "eslint-plugin-ordering-conventions"

export default [
	{
		files: ["**/*.{ts,tsx}"],
		plugins: { "ordering-conventions": ordering },
		rules: {
			"ordering-conventions/import-order": "error",
			"ordering-conventions/interface-member-order": ["error", [
				{ match: "Props$", direction: "desc" },
				{ match: "", direction: "asc", tieBreak: "none" }
			]],
			"ordering-conventions/jsx-attribute-order": "error"
		}
	}
]
```

## Rules

| Rule | Description | Fixable |
| --- | --- | :-: |
| [`ordering-conventions/import-order`](docs/rules/import-order.md) | Group imports, then order each group by clause length, then order the brace specifiers. | ✅ |
| [`ordering-conventions/interface-member-order`](docs/rules/interface-member-order.md) | Order interface and type-literal members by key length, in either direction, per name pattern. | ✅ |
| [`ordering-conventions/parameter-destructuring-order`](docs/rules/parameter-destructuring-order.md) | Order the bindings of a destructured function parameter by name length. | ✅ |
| [`ordering-conventions/jsx-attribute-order`](docs/rules/jsx-attribute-order.md) | Pin `ref`/`key` to the end, keep `style` before `className`, order bare booleans by name length. | ✅ |
| [`ordering-conventions/hook-declaration-order`](docs/rules/hook-declaration-order.md) | Order a function's leading `use*` declarations: destructuring first, then by binding length. | ✅ |
| [`ordering-conventions/tailwind-class-order`](docs/rules/tailwind-class-order.md) | Order the utilities inside one class string by semantic category. | ✅ |
| [`ordering-conventions/tailwind-apply-class-order`](docs/rules/tailwind-apply-class-order.md) | The same order inside a CSS `@apply` directive. | ✅ |
| [`ordering-conventions/json-key-order`](docs/rules/json-key-order.md) | Order the keys of specific JSON objects by length or alphabetically. | ✅ |

## Shared configs

| Config | Contains |
| --- | --- |
| `ordering.configs.recommended` | `import-order`, `interface-member-order`, `parameter-destructuring-order`, `jsx-attribute-order`, `hook-declaration-order` |
| `ordering.configs.tailwind` | `tailwind-class-order` |
| `ordering.configs.css` | `tailwind-apply-class-order` |

Each config is a flat-config fragment carrying `plugins` and `rules` but no `files` of its own, because only you know which files a language applies to. Spread it into a config object that scopes it:

```js
import css from "@eslint/css"
import ordering from "eslint-plugin-ordering-conventions"

export default [
	{ files: ["src/**/*.tsx"], ...ordering.configs.recommended },
	{ files: ["src/**/*.tsx"], ...ordering.configs.tailwind },
	{ files: ["**/*.css"], language: "css/css", plugins: { css }, ...ordering.configs.css }
]
```

`json-key-order` has no shared config because it only ever acts on the paths you give it:

```js
import json from "@eslint/json"
import ordering from "eslint-plugin-ordering-conventions"

export default [
	{
		files: ["messages/*.json"],
		language: "json/json",
		plugins: { json, "ordering-conventions": ordering },
		rules: {
			"ordering-conventions/json-key-order": ["error", [
				{ path: ["pages"], mode: "length-then-alpha", pinnedLeading: ["error", "notFound"] },
				{ path: ["components"], mode: "alpha" }
			]]
		}
	}
]
```

`@eslint/json` and `@eslint/css` are only needed for those two languages; neither is a dependency of this plugin.

## How the fixes stay safe

A rule builds a **region**: a list of slots plus the literal text between them. It then permutes slot contents and leaves every separator byte in place. Four guards keep that honest:

- **Delimiter trimming.** A node's range usually swallows its trailing `;` or `,`, while the last one in a list does not. Slot ranges are trimmed back onto the separator, so permuting can never migrate a delimiter.
- **Uniform separators.** If the gaps between slots are not byte-identical — a blank line, a comment, a mixed one-per-line layout — the rule reports without offering a fix.
- **Comments.** A comment anywhere inside a region disables the fix for that region. The report still fires; you decide.
- **Hard barriers.** A JSX spread, an intervening statement between imports, a blank line between hook declarations, an intra-segment dependency: nothing is ever moved across one of these, because doing so would change behavior rather than layout.

## Why order by length

Alphabetical order tells you where a name is. Length order tells you what it *is*: the longest, most specific member first (or the shortest, most fundamental first) gives a declaration a ragged edge your eye can scan, and a new entry has one obvious home. Every rule here lets you pick the direction and the tie-break, so the convention is yours — the plugin only enforces it consistently and fixes it mechanically.

## Programmatic exports

The comparators and the Tailwind category table are AST-free and importable, so an audit script, a codemod or a test can reach the same verdict as the linter:

```js
import { compareByLengthThenAlphabetical, importGroupOf } from "eslint-plugin-ordering-conventions/comparators"
import { CATEGORY_NAMES, sortTokens } from "eslint-plugin-ordering-conventions/tailwind"

sortTokens(["gap-4", "flex", "items-center"]) // → ["flex", "items-center", "gap-4"]
```

## License

ISC © Kayo Souza
