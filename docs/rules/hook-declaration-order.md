# ordering-conventions/hook-declaration-order

Orders the leading run of simple hook declarations in a function body.

🔧 Fixable.

## What it enforces

A component or custom hook usually opens with a block of `const … = useSomething()` lines. They sort in two tiers:

1. a destructuring binding (`{ … }` or `[ … ]`) before a plain identifier, regardless of length;
2. inside each tier, descending by the length of the **binding text** — never the call, never its arguments — with an ascending alphabetical tie-break.

## Examples

👍 Correct:

```tsx
function Component(){
	const { search, setSearch, debouncedSearch, setImmediateSearch } = useDebouncedSearch(filters.search)
	const [selectedSubsidiaryData, setSelectedSubsidiaryData] = useState(undefined)
	const setSearchParams = useSetSearchParams()
	const userPrivileges = useUserPrivileges()
	const format = useFormatter()
	const stack = useModalsStack(["details"])
	const t = useTranslations()
}
```

👎 Incorrect:

```tsx
function Component(){
	const timeZone = useTimeZone()
	const pathname = usePathname()
}
```

Both are 8 characters, so the tie breaks alphabetically: `pathname` first.

## Segments

A hook that needs a **callback or an object-literal config** (`useMemo`, `useEffect`, `useForm`, …) is never part of a run. It disqualifies its own statement and ends whichever run was accumulating — but the scan resumes, so simple hook calls after it form their own independently-sorted run:

```tsx
function Component(){
	const t = useTranslations()
	const schema = useMemo(() => buildSchema(), [])

	// a new run starts here
	const format = useFormatter()
	const router = useRouter()
}
```

A **blank line** or a **comment** between two otherwise-adjacent candidates starts a new segment the same way. Nothing ever moves across a segment boundary — which is also the escape hatch when a hook has to stay where it is: put a blank line in front of it.

```tsx
function Component(){
	const [shouldOpen, setShouldOpen] = useState(false)
	const router = useRouter()

	const [opened, { open, close }] = useDisclosure(shouldOpen)
	const isSmallScreenRef = useRef(shouldOpen)
}
```

## The dependency guard

Even within one segment, if any statement's call arguments reference a name bound by another statement in that same segment, the whole segment is left alone — no report, no fix. Reordering it would produce a use-before-declaration bug:

```tsx
function Component(){
	const userRoles = useUserRoles()
	const previousRolesRef = useRef(userRoles) // 16 chars, but it reads `userRoles`
}
```

## Options

```js
"ordering-conventions/hook-declaration-order": ["error", {
	pattern: "^use[A-Z]",
	direction: "desc",
	tieBreak: "alphabetical",
	destructuringFirst: true,
	disqualifyingArguments: ["ArrowFunctionExpression", "FunctionExpression", "ObjectExpression"]
}]
```

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `pattern` | `string` (regex source) | `"^use[A-Z]"` | Which callee names count as a hook. |
| `direction` | `"asc" \| "desc"` | `"desc"` | |
| `tieBreak` | `"alphabetical" \| "none"` | `"alphabetical"` | |
| `destructuringFirst` | `boolean` | `true` | Whether destructuring bindings form a leading tier. |
| `disqualifyingArguments` | `string[]` | callbacks and object literals | AST node types that take a statement out of every run. |

## When it holds off

- **Comments** inside the run disable the fix.
- **Ragged separators** disable the fix.
- A declaration with more than one declarator, or an initializer that is not a plain call, is not a candidate at all.
