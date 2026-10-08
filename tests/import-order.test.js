import { createRuleTester } from "./rule-tester.js"
import rule from "../lib/rules/import-order.js"

/* The worked example from the docs, used verbatim as the primary valid case. */
const workedExample = [
	'import type { IUser, IUserProfileResponseData } from "./typings/api"',
	'import type { ModalProps } from "./ui/Modal"',
	'import type { UUID } from "node:crypto"',
	'import type getUsers from "./lib/getUsers"',
	'import { useMemo, useState } from "react"',
	'import { map, omit, pick } from "lodash"',
	'import fetchProfile from "./lib/fetchProfile"',
	'import FormModal from "./ui/FormModal"',
	'import dayjs from "dayjs"',
	'import "dayjs/locale/pt-br"'
].join("\n")

createRuleTester().run("import-order", rule, {
	valid: [
		workedExample,

		/* single-line braces: values alphabetical, inline types last */
		'import { updateRelease, uploadExecutable, type IUpdateReleaseData } from "./actions"',

		/* equal-length clauses break the tie alphabetically */
		'import getFirstAndLastName from "./helpers/getFirstAndLastName"\nimport getNationalityTypes from "./lib/getNationalityTypes"',

		/* a combined default + named clause keeps its braces and counts in full: 33 chars */
		'import FormModal, { type IFormModalRef } from "./ui/FormModal"\nimport fetchProfile from "./lib/fetchProfile"',

		/* the braces count in full whatever they hold, so 24 still outranks 17 */
		'import useSWR, { useSWRConfig } from "swr"\nimport fetchCategory from "./lib/fetchCategory"',

		/* a lone declaration has nothing to compare against */
		'import onlyOne from "m"',

		/* a run is broken by an intervening statement, so these two never compare */
		'import zzz from "b"\nconst x = 1\nimport a from "a"',

		/* the group order is configurable */
		{
			code: 'import { useState } from "react"\nimport type { UUID } from "node:crypto"',
			options: [{ groups: ["value-named", "type-named", "type-default", "value-default", "side-effect"] }]
		},

		/* so is the clause direction */
		{
			code: 'import { map } from "lodash"\nimport { useMemo, useState } from "react"',
			options: [{ direction: "asc" }]
		},

		/* blank lines can be allowed */
		{
			code: 'import type { UUID } from "node:crypto"\n\nimport { pick } from "lodash"',
			options: [{ allowBlankLines: true }]
		},

		/* specifier ordering can be switched off */
		{
			code: 'import { useState, useMemo } from "react"',
			options: [{ sortSpecifiers: false }]
		}
	],

	invalid: [
		{
			/* a value-named import cannot precede a type-named one */
			code: 'import { useState } from "react"\nimport type { UUID } from "node:crypto"',
			output: 'import type { UUID } from "node:crypto"\nimport { useState } from "react"',
			errors: [{ messageId: "importGroupOrder" }]
		},
		{
			/* descending by clause length */
			code: 'import { map } from "lodash"\nimport { useMemo, useState } from "react"',
			output: 'import { useMemo, useState } from "react"\nimport { map } from "lodash"',
			errors: [{ messageId: "importClauseLength" }]
		},
		{
			/* a combined clause's braces count in full and outrank a shorter default-only clause */
			code: 'import getAchievementCategory from "./lib/getAchievementCategory"\nimport useSWR, { useSWRConfig } from "swr"\nimport useRequestHandler from "./hooks/useRequestHandler"',
			output: 'import useSWR, { useSWRConfig } from "swr"\nimport getAchievementCategory from "./lib/getAchievementCategory"\nimport useRequestHandler from "./hooks/useRequestHandler"',
			errors: [{ messageId: "importClauseLength" }]
		},
		{
			/* the alphabetical tie-break on equal-length clauses */
			code: 'import getNationalityTypes from "./lib/getNationalityTypes"\nimport getFirstAndLastName from "./helpers/getFirstAndLastName"',
			output: 'import getFirstAndLastName from "./helpers/getFirstAndLastName"\nimport getNationalityTypes from "./lib/getNationalityTypes"',
			errors: [{ messageId: "importClauseAlphabetical" }]
		},
		{
			/* single-line braces sort alphabetically, even for a lone declaration */
			code: 'import { useState, useMemo } from "react"',
			output: 'import { useMemo, useState } from "react"',
			errors: [{ messageId: "importSpecifierOrder" }]
		},
		{
			/* inline `type` specifiers come last */
			code: 'import { type IFoo, updateThing, uploadThing } from "./actions"\nimport { pick } from "lodash"',
			output: 'import { updateThing, uploadThing, type IFoo } from "./actions"\nimport { pick } from "lodash"',
			errors: [{ messageId: "importSpecifierOrder" }]
		},
		{
			/* a multi-line brace list goes by length instead */
			code: 'import {\n\tuseState,\n\tuseLayoutEffect\n} from "react"',
			output: 'import {\n\tuseLayoutEffect,\n\tuseState\n} from "react"',
			errors: [{ messageId: "importSpecifierOrder" }]
		},
		{
			/* no blank line between declarations */
			code: 'import type { UUID } from "node:crypto"\n\nimport { pick } from "lodash"',
			output: 'import type { UUID } from "node:crypto"\nimport { pick } from "lodash"',
			errors: [{ messageId: "blankLineBetweenImports" }]
		},
		{
			/* a comment inside the block is reported but never auto-fixed */
			code: 'import { map } from "lodash"\n// keep react second\nimport { useMemo, useState } from "react"',
			output: null,
			errors: 1
		}
	]
})
