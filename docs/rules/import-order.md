# ordering-conventions/import-order

Groups a contiguous run of import declarations, orders each group by clause length, and orders the specifiers inside the braces.

🔧 Fixable.

## What it enforces

**1. Groups.** Every declaration falls into exactly one of five groups, in this order by default:

| Group | Example |
| --- | --- |
| `type-named` | `import type { UUID } from "node:crypto"` |
| `type-default` | `import type getUsers from "./lib/getUsers"` |
| `value-named` | `import { useMemo, useState } from "react"` |
| `value-default` | `import dayjs from "dayjs"` |
| `side-effect` | `import "dayjs/locale/pt-br"` |

A clause holding both a default binding and braces (`import FormModal, { type IFormModalRef } from …`) is a *default* group, not a named one.

**2. Clause length.** Inside a group, declarations sort descending by the length of the clause text, with a case-insensitive alphabetical tie-break. The module path never participates.

The sort key is the clause with whitespace collapsed and a leading `type ` removed. The outer braces are stripped only for a named-only clause, where `{ … }` is the whole thing. A combined clause keeps its braces and counts in full, whatever is inside them — so `FormModal, { type IFormModalRef }` measures 33 and `useSWR, { useSWRConfig }` measures 24.

**3. Specifiers.** Brace specifiers sort in two partitions, values first and inline `type` imports last. Inside each partition a single-line list goes alphabetical and a multi-line list goes by length, so a wrapped list reads as a ragged column.

**4. No blank lines** between declarations of one run.

Group, clause and specifier order are one rule on purpose: the clause sort key changes when the specifiers inside the braces move, so splitting them would make the result depend on which fixer ran first.

## Examples

👎 Incorrect:

```ts
import { map } from "lodash"
import { useState, useMemo } from "react"

import type { UUID } from "node:crypto"
```

👍 Correct:

```ts
import type { UUID } from "node:crypto"
import { useMemo, useState } from "react"
import { map } from "lodash"
```

A full worked example:

```ts
import type { IUser, IUserProfileResponseData } from "./typings/api"
import type { ModalProps } from "./ui/Modal"
import type { UUID } from "node:crypto"
import type getUsers from "./lib/getUsers"
import { useMemo, useState } from "react"
import { map, omit, pick } from "lodash"
import fetchProfile from "./lib/fetchProfile"
import FormModal from "./ui/FormModal"
import dayjs from "dayjs"
import "dayjs/locale/pt-br"
```

## Options

```js
"ordering-conventions/import-order": ["error", {
	groups: ["type-named", "type-default", "value-named", "value-default", "side-effect"],
	direction: "desc",
	tieBreak: "alphabetical",
	sortSpecifiers: true,
	specifierDirection: "desc",
	typeSpecifiersLast: true,
	allowBlankLines: false
}]
```

| Option | Type | Default | Meaning |
| --- | --- | --- | --- |
| `groups` | `string[]` | all five, as listed above | The group order. A group you leave out still ranks, after every group you list. |
| `direction` | `"asc" \| "desc"` | `"desc"` | Clause-length direction inside a group. |
| `tieBreak` | `"alphabetical" \| "none"` | `"alphabetical"` | `"none"` leaves equal-length clauses as written. |
| `sortSpecifiers` | `boolean` | `true` | Whether to order the names inside `{ … }`. |
| `specifierDirection` | `"asc" \| "desc"` | `"desc"` | Length direction for a *multi-line* brace list. Single-line lists are always alphabetical. |
| `typeSpecifiersLast` | `boolean` | `true` | Put inline `type` specifiers after the value ones. |
| `allowBlankLines` | `boolean` | `false` | Allow blank lines between declarations. |

## When it holds off

- **Runs, not files.** Only maximal contiguous runs of imports are ordered. Hoisting a declaration across an intervening statement would change module evaluation order, so a statement between two imports splits them into separate runs that never compare.
- **Comments.** A comment anywhere in the run disables the fix — the report still fires.
- **Ragged separators.** If the gaps between declarations are not byte-identical, no fix is offered.
