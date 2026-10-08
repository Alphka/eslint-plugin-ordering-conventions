# ordering-conventions/jsx-attribute-order

Orders JSX attributes: a pinned tail, a precedence chain, and the bare boolean flags.

🔧 Fixable.

## What it enforces

**1. A pinned tail.** `ref` and `key` belong at the end, in that order — they are framework plumbing, not part of the component's API. By default `key` is last and `ref` is second-to-last when `key` is present.

**2. A precedence chain.** `style`/`styles` comes before `className`/`classNames`, because the one that wins on conflict reads better last.

**3. Bare booleans.** Valueless flags (`disabled`, `withArrow`) sort descending by name length among themselves, with no tie-break by default.

## Spreads are a hard barrier

A spread's position decides which value wins, so the attribute list is split into segments at every spread and attributes are only ever permuted *within* a segment. Nothing crosses a spread — not even to satisfy this rule.

That is why this is correct and left alone:

```tsx
<Modal size="35rem" onClose={c} opened {...props} withCloseButton={false} centered />
```

`opened` before the spread stays overridable; `centered` after it always wins. Reordering them would change behavior, not layout.

## Examples

👎 Incorrect:

```tsx
<div key={k} id="a" title="b" />
<div className={c} styles={s} id="a" />
<div id="a" disabled suppressHydrationWarning />
```

👍 Correct:

```tsx
<div id="a" title="b" key={k} />
<div styles={s} className={c} id="a" />
<div id="a" suppressHydrationWarning disabled />
<div id="a" title="b" ref={r} key={k} />
<ActionIcon className={x} size={44} color="white" variant="subtle" onClick={y} suppressHydrationWarning />
```

## Options

```js
"ordering-conventions/jsx-attribute-order": ["error", {
	last: ["ref", "key"],
	precedence: [["style", "styles"], ["className", "classNames"]],
	bareBooleans: "desc",
	bareBooleanTieBreak: "none",
	minAttributes: 3
}]
```

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `last` | `string[]` | `["ref", "key"]` | Attributes pinned to the end, in this relative order. `[]` disables the check. |
| `precedence` | `string[][]` | `[["style", "styles"], ["className", "classNames"]]` | Tiers that must appear in order. Names inside one tier are interchangeable. `[]` disables the check. |
| `bareBooleans` | `"asc" \| "desc" \| "off"` | `"desc"` | Length direction for valueless attributes. |
| `bareBooleanTieBreak` | `"alphabetical" \| "none"` | `"none"` | The default leaves equal-length flags as written. |
| `minAttributes` | `integer` | `3` | Elements with fewer named attributes are skipped. |

## How the fix moves things

Moving an attribute to the end of a run is done by **rotation**, not by swapping: a swap would drag whatever sat last all the way to the front, a change nobody asked for. A rotation touches the same bytes and leaves every other attribute in its relative place.

## When it holds off

- **A spread inside the span** to be rewritten: reported, never fixed.
- **A comment** between the attributes being moved: reported, never fixed.
