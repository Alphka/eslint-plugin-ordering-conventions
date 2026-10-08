# ordering-conventions/tailwind-class-order

Orders the Tailwind utilities inside one class string by semantic category.

🔧 Fixable.

## What it enforces

Four laws, applied in this order:

1. **Category order.** Utilities are grouped into categories that follow the order a component is read in — what it occupies, then how it paints, then how it lays out its children, then type, then spacing, then borders and effects. Run `import { CATEGORY_NAMES } from "eslint-plugin-ordering-conventions/tailwind"` to print the full sequence.
2. **Sub-order.** Within a category the order is semantic, never by length: `max-w-*` before `w-*`, `px-*` before `py-*`, the structural `border` before its color.
3. **The unprefixed block leads.** Every variant block comes after the bare utilities.
4. **Breakpoint blocks ascend.** `sm:` before `lg:`. Non-breakpoint variants (`hover:`, `focus:`, `group-data-[…]:`) have no order among themselves and keep the position they were written in — breakpoints are permuted only into slots that breakpoint blocks already occupy.

A utility no category recognizes is **pinned** to the index it was written at, and the classified tokens sort around it.

## What counts as a class string

A literal has to be reached through a host *and* look like a class list — at least 2 tokens, at least 70% of them recognized utilities. Hosts are:

- a `className`-style JSX attribute;
- a `className`-style object property (`classNames={{ root: "…" }}`);
- an argument to a class-merging helper (`twMerge`, `twJoin`, `clsx`, `cn`, `classnames`);
- a variable whose name reads as "classes" (`const cardClasses = "…"`).

A template literal with an interpolation is out of scope entirely.

## Examples

👎 Incorrect:

```tsx
<div className="flex gap-4 items-center" />
<div className="text-gray-700 font-medium text-sm" />
<div className="p-4 lg:p-8 sm:p-6" />
```

👍 Correct:

```tsx
<div className="flex items-center gap-4" />
<div className="text-gray-700 text-sm font-medium" />
<div className="p-4 sm:p-6 lg:p-8" />
<div className="size-full bg-white flex flex-col p-4 rounded-md shadow-xs gap-4" />
<div className="max-w-lg w-2/5" />
<div className="outline-solid outline-1 outline-blue-500" />
```

The three traps worth naming: `gap` sorts near the end, long after padding; `size`/`bg` come before `display`; and `color` comes before `font-size`, which comes before `font-weight`.

## Conflict-aware mergers

`twMerge` resolves conflicting utilities by last occurrence, so swapping two tokens whose properties overlap would change the result. When that is the case the rule reports with a different message and offers **no fix** — you reorder by hand:

```ts
twMerge("pr-4 p-3", other)   // reported, not fixed: p-3 would start winning over pr-4
twJoin("pr-4 p-3", other)    // fixed to "p-3 pr-4": twJoin has no conflict to preserve
```

## Options

```js
"ordering-conventions/tailwind-class-order": ["error", {
	hosts: ["class", "className", "classNames", "activeClassName", "wrapperClassName"],
	mergers: ["twMerge", "twJoin", "clsx", "cn", "classnames"],
	conflictAwareMergers: ["twMerge"],
	variablePattern: "[Cc]lass(?:[Nn]ame)?e?s?$",
	categoryOrder: [],
	minTokens: 2,
	minKnownRatio: 0.7
}]
```

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `hosts` | `string[]` | see above | Attribute and property names that hold class strings. |
| `mergers` | `string[]` | see above | Helpers whose string arguments are class lists. |
| `conflictAwareMergers` | `string[]` | `["twMerge"]` | Mergers that resolve conflicts by last occurrence. |
| `variablePattern` | `string` (regex source) | `"[Cc]lass(?:[Nn]ame)?e?s?$"` | Variable names that hold class strings. |
| `categoryOrder` | `string[]` | `[]` | Override the category sequence. Categories you leave out keep their built-in relative order, after everything you list. |
| `minTokens` | `integer` | `2` | Below this, a literal is not a class list. |
| `minKnownRatio` | `number` | `0.7` | Below this share of recognized utilities, a literal is not a class list. |

## When it holds off

- **An unbalanced token.** Splitting on whitespace shreds an arbitrary value that contains a space; valid Tailwind spells those with `_`, so an unbalanced `[` or `(` means the list cannot be reasoned about and is left alone entirely.
- **An escape sequence** in the literal: rewriting cooked text into a raw span would normalize it away, so the rule reports without fixing.
- **Anything that is not a pure permutation** of what was written is never emitted — a fix can never drop, duplicate or invent a utility.
