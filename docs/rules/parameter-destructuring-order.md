# ordering-conventions/parameter-destructuring-order

Orders the bindings of a destructured function parameter by binding-name length.

🔧 Fixable.

## What it enforces

A destructured parameter reads as a column, and the column sorts descending by binding-name length by default: the longest, most specific binding first, down to the short ones.

The **type annotation is the discriminator**. An unannotated binding pattern is usually a callback over data whose shape is decided elsewhere — a payload, a row, a tuple — and that order carries meaning of its own. So by default only an annotated parameter is ordered, and `match` narrows it further.

Only the key is measured. A quoted key measures with its quotes, so `"aria-label": ariaLabel` is ordered on 12, not 10.

## Examples

👎 Incorrect:

```tsx
function Card({ id, title, description }: ICardProps){}
```

👍 Correct:

```tsx
export default function DashboardCard({
	iconBackgroundColor,
	description,
	classNames,
	iconColor,
	children,
	button,
	title,
	Icon
}: IDashboardCardProps){}
```

A rest element needs no rule — the grammar already forbids it anywhere but last — and it is pinned, so it is never written to:

```tsx
export default function QuickAccessCard({
	"aria-label": ariaLabel,
	description,
	className,
	badges,
	title,
	Icon,
	...props
}: IQuickAccessCardProps){}
```

👍 Out of scope by default — an unannotated pattern over API data:

```ts
const rows = users.map(({ id, email, fullName, isActive, isAnonymous }) => null)
```

## Options

```js
"ordering-conventions/parameter-destructuring-order": ["error", {
	match: "",
	requireTypeAnnotation: true,
	direction: "desc",
	tieBreak: "none",
	minProperties: 3
}]
```

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `match` | `string` (regex source) | `""` | Tested against the source text of the type annotation. `"Props\\b"` restricts the rule to props-shaped parameters. |
| `requireTypeAnnotation` | `boolean` | `true` | With `false` (and an empty `match`), unannotated patterns are ordered too — the right setting for plain JavaScript. |
| `direction` | `"asc" \| "desc"` | `"desc"` | |
| `tieBreak` | `"alphabetical" \| "none"` | `"none"` | The default leaves equal-length bindings exactly as written. |
| `minProperties` | `integer` | `3` | Patterns with fewer bindings are skipped. |

## When it holds off

- **Rest elements and computed keys** are pinned; the plain bindings are permuted around them.
- **Comments** inside the pattern disable the fix.
- **Ragged separators** disable the fix.
