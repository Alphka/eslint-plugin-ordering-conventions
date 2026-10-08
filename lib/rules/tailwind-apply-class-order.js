/**
 * @fileoverview Orders the utilities in a CSS `@apply` directive the same way the JSX rule orders
 * a `className`.
 *
 * A separate rule from `tailwind-class-order` because it runs under a CSS language (`@eslint/css`
 * or any language whose AST exposes `Atrule` nodes with a prelude): the visitor keys are CSS node
 * types, `context.report` takes a `loc` carrying byte offsets, and there is no `getAncestors`.
 */

import { asClassList, categoryRankFor, firstMisplaced, isAnalyzableList, isPermutation, reorderWithin, sortEntries } from "../shared/tailwind.js"
import { docsUrl } from "../shared/rule.js"

const DEFAULT_OPTIONS = {
	atRules: ["apply"],
	categoryOrder: [],
	minTokens: 2,
	minKnownRatio: 0.7
}

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
	meta: {
		type: "layout",
		fixable: "code",
		docs: {
			description: "Order Tailwind utilities in an @apply directive by semantic category",
			url: docsUrl("tailwind-apply-class-order")
		},
		schema: [
			{
				type: "object",
				properties: {
					atRules: { type: "array", items: { type: "string" } },
					categoryOrder: { type: "array", items: { type: "string" } },
					minTokens: { type: "integer", minimum: 2 },
					minKnownRatio: { type: "number", minimum: 0, maximum: 1 }
				},
				additionalProperties: false
			}
		],
		messages: {
			applyClassOrder: "`{{token}}` ({{category}}) must come before `{{blockedBy}}` — {{reason}}. Expected: {{expected}}"
		}
	},

	create(context){
		const options = { ...DEFAULT_OPTIONS, ...context.options[0] }
		const atRules = new Set(options.atRules)
		const rank = categoryRankFor(options.categoryOrder)

		return {
			Atrule(node){
				/* `@layer`, `@media` and friends are at-rules too. */
				if(!atRules.has(node.name)) return

				const location = node.prelude?.loc

				if(location === null || location === undefined) return

				const [start, end] = [location.start.offset, location.end.offset]
				const raw = context.sourceCode.text.slice(start, end)

				const tokens = asClassList(raw, options)

				if(tokens === null || !isAnalyzableList(tokens)) return

				const entries = sortEntries(tokens, rank)
				const sorted = entries.map((entry) => entry.token)

				if(sorted.join(" ") === tokens.join(" ")) return

				const misplaced = firstMisplaced(entries)

				if(misplaced === null) return

				context.report({
					loc: location,
					messageId: "applyClassOrder",
					data: {
						token: misplaced.entry.token,
						category: misplaced.entry.category ?? "unknown",
						blockedBy: misplaced.blockedBy.token,
						reason: misplaced.reason,
						expected: sorted.join(" ")
					},
					fix: isPermutation(tokens, sorted)
						? (fixer) => fixer.replaceTextRange([start, end], reorderWithin(raw, sorted))
						: null
				})
			}
		}
	}
}

export default rule
