# ordering-conventions/json-key-order

Orders the keys of specific objects in a JSON document.

🔧 Fixable.

## Setup

This rule runs under the `json/json` language from [`@eslint/json`](https://www.npmjs.com/package/@eslint/json), which is not a dependency of this plugin — install it yourself.

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
				{ path: ["pages"], mode: "length-then-alpha", pinnedLeading: ["error", "notFound", "forbidden"] },
				{ path: ["components"], mode: "alpha" }
			]]
		}
	}
]
```

## What it enforces

Only the paths you configure. The rule never infers a target from an object's shape, because a JSON file usually mixes ordered catalogues with objects whose order carries meaning — an enum, a tuple-like record, a translation file whose sections mirror the UI.

`path` walks the document from the root: `["a", "b"]` targets the object at `a.b`. A path that does not resolve to an object is silently skipped, so one config can cover several files.

## `pinnedLeading`

A catalogue often opens with a small, deliberate cluster of keys before the ordered body begins — error pages, a home route, a login route. `pinnedLeading` names them:

```json
{
	"pages": {
		"error": "…",
		"notFound": "…",
		"forbidden": "…",
		"app": "…",
		"home": "…",
		"login": "…",

		"alerts": "…",
		"reports": "…"
	}
}
```

The prefix is never checked against itself, and the pair (last pinned key, first body key) is the deliberate reset and is never compared. The body after it is.

If the prefix no longer matches exactly — someone renamed or reordered it — the rule declines to check that object at all rather than guess where the real body starts.

## Options

Options are an **array of targets**.

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `path` | `string[]` | *required* | The path from the document root to the object to order. |
| `mode` | `"length-then-alpha" \| "length-desc-then-alpha" \| "alpha"` | *required* | |
| `pinnedLeading` | `string[]` | `[]` | Keys that open the object in a fixed order. |

`alpha` is case-insensitive and compares code units rather than using `localeCompare`, so the result is identical on every machine and ICU version.

## How the fix is applied

One report per object, anchored at the first key that has to move, carrying the **whole reordering** as its fix. A single `--fix` is therefore always enough, however badly the object is ordered: fixing one adjacent pair at a time would need one ESLint pass per swap, and ESLint stops after ten — which leaves a reversed object half-sorted.

## When it holds off

- **A blank line anywhere in the body.** A gap marks a deliberate group that reordering would scramble, so the fix is declined for that object — the report still fires.
- **A `pinnedLeading` prefix that no longer matches.** The object is not checked at all.
- **A path that does not resolve to an object.** Silently skipped.
