# ordering-conventions/interface-member-order

Orders the members of a TypeScript `interface` or `type X = { … }` alias by key length.

🔧 Fixable.

## What it enforces

The rule takes a list of **targets** and uses the first whose `match` accepts the declaration name. That lets one config order props types descending — the longest, most descriptive prop first — while ordering payload shapes ascending, where the short identity keys lead.

Only the key is measured: never the type annotation, and the optional `?` does not count. A quoted key measures *with* its quotes, because that is how the column actually reads.

`extends` and intersection clauses are never touched; only the members written in the body take part.

## Examples

With the default target (descending, alphabetical tie-break):

👎 Incorrect:

```ts
interface IFormModalProps {
	title: ReactNode
	formModalRef?: RefObject<IFormModalRef | null>
	description?: ReactNode
}
```

👍 Correct:

```ts
interface IFormModalProps extends Modal.Props {
	formModalRef?: RefObject<IFormModalRef | null>
	description?: ReactNode
	backButton?: ReactNode
	classNames?: ClassNames<TFormModalFactory>
	styles?: Styles<TFormModalFactory>
	title: ReactNode
	form?: UseFormReturnType<any>
}
```

With `{ direction: "asc", tieBreak: "none", adjacentSuffixes: ["Name", "Value"] }`:

```ts
export interface ICustomer {
	id: UUID
	name: string
	type: string
	typeName: string
	typeValue: number
	status: string
	statusName: string
	statusValue: number
	tenantId: UUID
	isAnonymous: boolean
	economicClassification: string
	economicClassificationName: string
	economicClassificationValue: number
}
```

`type` / `typeName` / `typeValue` travel together as one unit, positioned by the length of `type`. Without `adjacentSuffixes` those three would be scattered across the interface by their own lengths.

## Options

Options are an **array of targets**, matched in order; the first hit wins.

```js
"ordering-conventions/interface-member-order": ["error", [
	{ match: "Props$", direction: "desc", tieBreak: "alphabetical" },
	{ match: "", direction: "asc", tieBreak: "none", adjacentSuffixes: ["Name", "Value"], heritage: "report-only" }
]]
```

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `match` | `string` (regex source) | `""` | Tested against the declaration name. `""` matches everything, so put it last. |
| `direction` | `"asc" \| "desc"` | `"desc"` | |
| `tieBreak` | `"alphabetical" \| "none"` | `"alphabetical"` | `"none"` leaves equal-length keys in the order they were written. |
| `adjacentSuffixes` | `string[]` | `[]` | Glue `X`, `XName`, `XValue`-style runs into one unit anchored on the base key. |
| `minMembers` | `integer` | `2` | Declarations with fewer members are skipped. |
| `heritage` | `"check" \| "report-only"` | `"check"` | See below. |

With no options at all, the rule behaves as `[{ direction: "desc", tieBreak: "alphabetical" }]` against every declaration.

### `heritage: "report-only"`

Without type information, a member that *narrows* an inherited one is invisible to a syntactic rule — and it has to be written first whatever its length. In `"report-only"` mode:

- a declaration with a heritage clause is reported but never auto-fixed;
- a declaration that both extends something **and** narrows a member to a literal type (`success: false`) is left alone entirely.

Use it for response/payload types that build on a shared base.

## When it holds off

- **Non-property members.** An index signature, a method signature or a computed key is *pinned*: the named members are permuted around it, never over it. With `adjacentSuffixes` configured, any such member makes the unit arithmetic unsound and the declaration is skipped.
- **Comments** inside the member list disable the fix.
- **Ragged separators** — a blank line between two members, say — disable the fix.
