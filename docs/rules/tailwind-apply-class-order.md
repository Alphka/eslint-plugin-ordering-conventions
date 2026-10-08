# ordering-conventions/tailwind-apply-class-order

Orders the utilities in a CSS `@apply` directive the same way [`tailwind-class-order`](tailwind-class-order.md) orders a `className`.

🔧 Fixable.

## Setup

This rule runs under a CSS language, not the default JavaScript one. With [`@eslint/css`](https://www.npmjs.com/package/@eslint/css):

```js
import css from "@eslint/css"
import ordering from "eslint-plugin-ordering-conventions"

export default [
	{
		files: ["**/*.css"],
		language: "css/css",
		plugins: { css },
		...ordering.configs.css
	}
]
```

`@eslint/css` is not a dependency of this plugin — install it yourself if you want this rule.

## Examples

👎 Incorrect:

```css
.card {
	@apply gap-4 flex items-center;
}
```

👍 Correct:

```css
.card {
	@apply flex items-center gap-4;
}

.panel {
	@apply min-h-dvh w-full flex flex-col items-center justify-center text-center py-6 overflow-auto gap-18;
}

.avatar {
	@apply bg-gray-100 bg-clip-content border-[.1875rem] border-transparent rounded-full;
}
```

## Options

```js
"ordering-conventions/tailwind-apply-class-order": ["error", {
	atRules: ["apply"],
	categoryOrder: [],
	minTokens: 2,
	minKnownRatio: 0.7
}]
```

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `atRules` | `string[]` | `["apply"]` | Which at-rule preludes to order. `@layer`, `@media` and friends are at-rules too, so this list is explicit. |
| `categoryOrder` | `string[]` | `[]` | Override the category sequence, as in `tailwind-class-order`. |
| `minTokens` | `integer` | `2` | |
| `minKnownRatio` | `number` | `0.7` | |

## When it holds off

Exactly as in [`tailwind-class-order`](tailwind-class-order.md): an unbalanced token leaves the list alone, and no fix is emitted unless it is a pure permutation of what was written. Separators are preserved byte for byte, so a prelude written across several lines stays that way.
