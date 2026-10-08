/**
 * @fileoverview Orders the members of a TypeScript interface or type-literal alias by key length.
 *
 * The rule takes a list of targets and uses the first whose `match` accepts the declaration name,
 * so one config can order `*Props` descending — the longest, most descriptive prop first — while
 * ordering payload shapes ascending somewhere else.
 *
 * A heritage clause (`extends`, or a `Pick`/`Omit` intersection) is never reordered: only the
 * members written in the body take part.
 */

import { createCommentIndex, firstMisplacedIn, hasUniformSeparators, locOf, orderFor, planPermutation, regionRangeOf, slotRangeOf, toFix } from "../shared/region.js"
import { memberNameOf, memberSlots, membersOf, nameOf } from "../shared/members.js"
import { comparatorFor, unitSizesOf } from "../shared/comparators.js"

const DEFAULT_TARGET = {
	match: "",
	direction: "desc",
	tieBreak: "alphabetical",
	adjacentSuffixes: [],
	minMembers: 2,
	heritage: "check"
}

const DEFAULT_TARGETS = [DEFAULT_TARGET]

/**
 * Collapses each run of members that belong together — a key plus the members that only add one
 * of `adjacentSuffixes` to it — into a single slot anchored on the base key, so the derived
 * members travel with the key they describe.
 *
 * @param {string} text
 * @param {readonly any[]} members
 * @param {readonly string[]} names
 * @param {readonly string[]} suffixes
 * @returns {import("../shared/region.js").ISlot[]}
 */
function unitSlots(text, members, names, suffixes){
	const slots = []
	let cursor = 0

	for(const size of unitSizesOf(names, suffixes)){
		const first = members[cursor]
		const last = members[cursor + size - 1]

		slots.push({
			range: [first.range?.[0] ?? 0, slotRangeOf(text, last.range ?? [0, 0])[1]],
			sortKey: names[cursor],
			isPinned: false
		})

		cursor += size
	}

	return slots
}

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
	meta: {
		type: "layout",
		fixable: "code",
		docs: {
			description: "Order interface and type-literal members by key length",
			url: "https://github.com/Alphka/eslint-plugin-ordering-conventions/blob/main/docs/rules/interface-member-order.md"
		},
		schema: [
			{
				type: "array",
				items: {
					type: "object",
					properties: {
						match: { type: "string" },
						direction: { enum: ["asc", "desc"] },
						tieBreak: { enum: ["alphabetical", "none"] },
						adjacentSuffixes: { type: "array", items: { type: "string" } },
						minMembers: { type: "integer", minimum: 2 },
						heritage: { enum: ["check", "report-only"] }
					},
					additionalProperties: false
				},
				minItems: 1
			}
		],
		messages: {
			memberOrder: "\"{{key}}\" ({{length}} chars) must come before \"{{previousKey}}\" ({{previousLength}} chars): members of {{name}} are ordered {{direction}} by key length."
		}
	},

	create(context){
		const targets = (context.options[0] ?? DEFAULT_TARGETS).map((target) => ({ ...DEFAULT_TARGET, ...target }))

		const { sourceCode } = context
		const text = sourceCode.getText()
		const hasComment = createCommentIndex(sourceCode)

		const targetFor = (name) => targets.find((target) => target.match === "" || new RegExp(target.match, "u").test(name))

		const check = (node) => {
			const name = nameOf(node.id?.name)

			if(name === null) return

			const target = targetFor(name)

			if(target === undefined) return

			const members = membersOf(node)

			if(members === null || members.length < target.minMembers) return

			const names = members.map((member) => memberNameOf(text, member))
			const hasSuffixes = target.adjacentSuffixes.length > 0

			/* Anything that is not a plain named property makes the unit maths unsound. */
			if(hasSuffixes && names.includes(null)) return

			/*
			 * Without type information a member that narrows an inherited one is invisible, and it
			 * has to be written first whatever its length. So in `report-only` mode a declaration
			 * with a heritage clause is never auto-fixed, and one that also narrows a member to a
			 * literal type is left alone entirely.
			 */
			const heritage = (node.extends ?? []).length > 0
			const narrows = members.some((member) => member.typeAnnotation?.typeAnnotation?.type === "TSLiteralType")

			if(target.heritage === "report-only" && heritage && narrows) return

			const slots = hasSuffixes
				? unitSlots(text, members, /** @type {string[]} */(names), target.adjacentSuffixes)
				: memberSlots(text, members)
			const movable = slots.filter((slot) => !slot.isPinned)

			if(movable.length < target.minMembers) return

			const order = orderFor(slots, comparatorFor(target.direction, target.tieBreak))
			const edits = planPermutation(text, slots, order)

			if(!edits.length) return

			const position = firstMisplacedIn(order)
			const moved = movable[order[position]]
			const written = movable[position]

			const region = regionRangeOf(slots)
			const isFixable = !(target.heritage === "report-only" && heritage) &&
				!hasComment(region) &&
				hasUniformSeparators(text, slots)

			context.report({
				loc: locOf(sourceCode, moved.range),
				messageId: "memberOrder",
				data: {
					name,
					key: moved.sortKey ?? "",
					length: String((moved.sortKey ?? "").length),
					previousKey: written.sortKey ?? "",
					previousLength: String((written.sortKey ?? "").length),
					direction: target.direction === "asc" ? "ascending" : "descending"
				},
				fix: isFixable ? toFix(edits) : null
			})
		}

		return {
			TSInterfaceDeclaration: check,
			TSTypeAliasDeclaration: check
		}
	}
}

export default rule
