/**
 * @fileoverview Orders the Tailwind utilities inside one class string by the semantic category
 * order in `lib/shared/tailwind.js`.
 *
 * A literal is only treated as a class list when a host recognizes it — a `className`-style
 * attribute or property, an argument to a class-merging helper, or a variable whose name reads as
 * "classes" — and when enough of its tokens are known utilities. Everything else is left alone.
 */

import {
	DEFAULT_CONFLICT_AWARE_MERGERS,
	DEFAULT_VARIABLE_PATTERN,
	DEFAULT_CLASS_HOSTS,
	tokenizeClassList,
	isAnalyzableList,
	categoryRankFor,
	DEFAULT_MERGERS,
	firstMisplaced,
	isPermutation,
	reorderWithin,
	asClassList,
	isMergeSafe,
	sortEntries
} from "../shared/tailwind.js"

const DEFAULT_OPTIONS = {
	hosts: DEFAULT_CLASS_HOSTS,
	mergers: DEFAULT_MERGERS,
	conflictAwareMergers: DEFAULT_CONFLICT_AWARE_MERGERS,
	variablePattern: DEFAULT_VARIABLE_PATTERN,
	categoryOrder: [],
	minTokens: 2,
	minKnownRatio: 0.7
}

/**
 * @param {unknown} value
 * @returns {string | null}
 */
const nameOf = (value) => typeof value === "string" ? value : null

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
	meta: {
		type: "layout",
		fixable: "code",
		docs: {
			description: "Order Tailwind utilities inside one class string by semantic category",
			url: "https://github.com/Alphka/eslint-plugin-ordering-conventions/blob/main/docs/rules/tailwind-class-order.md"
		},
		schema: [
			{
				type: "object",
				properties: {
					hosts: { type: "array", items: { type: "string" } },
					mergers: { type: "array", items: { type: "string" } },
					conflictAwareMergers: { type: "array", items: { type: "string" } },
					variablePattern: { type: "string" },
					categoryOrder: { type: "array", items: { type: "string" } },
					minTokens: { type: "integer", minimum: 2 },
					minKnownRatio: { type: "number", minimum: 0, maximum: 1 }
				},
				additionalProperties: false
			}
		],
		messages: {
			classOrder: "`{{token}}` ({{category}}) must come before `{{blockedBy}}` — {{reason}}. Expected: {{expected}}",
			classOrderUnsafeMerge: "`{{token}}` ({{category}}) must come before `{{blockedBy}}` — {{reason}} — but swapping them would change which class `{{merger}}` keeps, so reorder by hand. Expected: {{expected}}"
		}
	},

	create(context){
		const options = { ...DEFAULT_OPTIONS, ...context.options[0] }
		const hosts = new Set(options.hosts)
		const mergers = new Set(options.mergers)
		const conflictAware = new Set(options.conflictAwareMergers)
		const variablePattern = new RegExp(options.variablePattern, "u")
		const rank = categoryRankFor(options.categoryOrder)

		const { sourceCode } = context

		/*
		 * Walks the ancestor chain outwards until a host recognizes the literal. A non-matching
		 * ancestor is stepped over rather than treated as a rejection: the literal in
		 * `classNames={{ root: "…" }}` is reached through a `Property` whose key is `root`, and it
		 * is the enclosing `classNames` attribute that makes it a class list.
		 */
		const hostOf = (ancestors) => {
			for(let index = ancestors.length - 1; index >= 0; index--){
				const node = ancestors[index]

				switch(node.type){
					case "JSXAttribute": {
						const name = typeof node.name === "string" ? node.name : nameOf(node.name?.name)

						if(name !== null && hosts.has(name)) return { merger: null }

						break
					}
					case "CallExpression": {
						const merger = nameOf(node.callee?.name)

						if(merger !== null && mergers.has(merger)) return { merger }

						break
					}
					case "Property": {
						const key = node.key?.type === "Identifier" ? nameOf(node.key.name) : nameOf(node.key?.value)

						if(key !== null && hosts.has(key)) return { merger: null }

						break
					}
					case "VariableDeclarator": {
						const id = nameOf(node.id?.name)

						if(id !== null && variablePattern.test(id)) return { merger: null }

						break
					}
				}
			}

			return null
		}

		const check = (node, raw) => {
			const tokens = asClassList(raw, options)

			if(tokens === null || !isAnalyzableList(tokens)) return

			const host = hostOf(sourceCode.getAncestors(node))

			if(host === null) return

			const entries = sortEntries(tokens, rank)
			const sorted = entries.map((entry) => entry.token)

			if(sorted.join(" ") === tokens.join(" ")) return

			const misplaced = firstMisplaced(entries)

			if(misplaced === null) return

			const isSafe = host.merger === null || !conflictAware.has(host.merger) || isMergeSafe(tokens, entries)
			/* Rewriting cooked text into a raw span would normalize the escape away. */
			const hasEscape = raw.includes("\\")

			const [start, end] = node.range ?? [0, 0]
			const span = tokenizeClassList(raw)[misplaced.position]

			context.report({
				loc: {
					start: sourceCode.getLocFromIndex(start + 1 + span.start),
					end: sourceCode.getLocFromIndex(start + 1 + span.end)
				},
				messageId: isSafe ? "classOrder" : "classOrderUnsafeMerge",
				data: {
					token: misplaced.entry.token,
					category: misplaced.entry.category ?? "unknown",
					blockedBy: misplaced.blockedBy.token,
					reason: misplaced.reason,
					merger: host.merger ?? "",
					expected: sorted.join(" ")
				},
				fix: isSafe && !hasEscape && isPermutation(tokens, sorted)
					? (fixer) => fixer.replaceTextRange([start + 1, end - 1], reorderWithin(raw, sorted))
					: null
			})
		}

		return {
			Literal(node){
				if(typeof node.value !== "string") return

				const [start, end] = node.range ?? [0, 0]

				check(node, sourceCode.getText().slice(start + 1, end - 1))
			},

			TemplateLiteral(node){
				if(node.expressions.length > 0) return

				check(node, node.quasis[0].value.raw)
			}
		}
	}
}

export default rule
