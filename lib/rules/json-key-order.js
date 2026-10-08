/**
 * @fileoverview Orders the keys of specific objects in a JSON document.
 *
 * Runs under the `json/json` language from `@eslint/json`. The rule only ever looks at the paths
 * it is configured with — it never infers a target from an object's shape, because a JSON file
 * usually mixes ordered catalogues with objects whose order carries meaning.
 *
 * `pinnedLeading` exists for a catalogue that opens with a small, deliberate cluster of keys
 * before the ordered body begins. When that prefix no longer matches exactly, the rule declines
 * to check the object at all rather than guess where the real body starts.
 *
 * The fix is the whole-region permutation the other rules emit, expressed as node replacements
 * instead of the ranges `shared/region.js` works in: the JSON language hands this rule members,
 * not offsets. Emitting the permutation at once is what makes one `--fix` enough. Swapping
 * adjacent pairs instead costs one pass per swap, so a badly ordered object exhausts ESLint's
 * ten-pass cap and the file is left half-sorted.
 */

import { comparatorFor, compareAlphabetical } from "../shared/comparators.js"
import { firstMisplacedIn, orderFor } from "../shared/region.js"
import { docsUrl } from "../shared/rule.js"

const MODES = {
	"length-then-alpha": { comparator: comparatorFor("asc", "alphabetical"), description: "ascending length (alphabetical tie-break)" },
	"length-desc-then-alpha": { comparator: comparatorFor("desc", "alphabetical"), description: "descending length (alphabetical tie-break)" },
	alpha: { comparator: compareAlphabetical, description: "alphabetical order" }
}

/**
 * @param {any} member
 * @returns {string}
 */
function keyOf(member){
	return member.name.type === "String" ? member.name.value : member.name.name
}

/**
 * @param {any} document
 * @param {readonly string[]} path
 * @returns {any | null}
 */
function resolveTarget(document, path){
	let current = document.body

	for(const segment of path){
		if(current.type !== "Object") return null

		const member = current.members.find((candidate) => keyOf(candidate) === segment)

		if(member === undefined) return null

		current = member.value
	}

	return current.type === "Object" ? current : null
}

/**
 * True when `keys` begins with exactly `pinnedLeading`, in that order.
 *
 * @param {readonly string[]} keys
 * @param {readonly string[]} pinnedLeading
 * @returns {boolean}
 */
function hasExpectedPinnedPrefix(keys, pinnedLeading){
	return pinnedLeading.every((key, index) => keys[index] === key)
}

/**
 * A blank line anywhere in the body marks a deliberate grouping that a permutation would scramble,
 * so the rule reports without offering a fix — the stance `hasUniformSeparators` takes for the
 * rules that can see raw separator text.
 *
 * @param {readonly any[]} members
 * @returns {boolean}
 */
function isContiguous(members){
	return members.every((member, index) => index === 0 || member.loc.start.line - members[index - 1].loc.end.line <= 1)
}

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
	meta: {
		type: "layout",
		fixable: "code",
		docs: {
			description: "Order the keys of specific JSON objects by length or alphabetically",
			url: docsUrl("json-key-order")
		},
		schema: [
			{
				type: "array",
				items: {
					type: "object",
					properties: {
						path: { type: "array", items: { type: "string" }, minItems: 1 },
						mode: { enum: Object.keys(MODES) },
						pinnedLeading: { type: "array", items: { type: "string" } }
					},
					required: ["path", "mode"],
					additionalProperties: false
				}
			}
		],
		messages: {
			jsonKeyOrder: "\"{{thisKey}}\" must come before \"{{previousKey}}\": \"{{path}}\" is ordered by {{modeDescription}}."
		}
	},

	create(context){
		const targets = context.options[0] ?? []
		const { sourceCode } = context

		const checkTarget = (document, target) => {
			const object = resolveTarget(document, target.path)

			if(object === null) return

			const pinnedLeading = target.pinnedLeading ?? []

			if(!hasExpectedPinnedPrefix(object.members.map(keyOf), pinnedLeading)) return

			/* The pinned prefix is the deliberate reset, so the body is ordered entirely on its own. */
			const body = object.members.slice(pinnedLeading.length)

			if(body.length < 2) return

			const { comparator, description } = MODES[target.mode]
			const order = orderFor(body.map((member) => ({ sortKey: keyOf(member), isPinned: false })), comparator)
			const misplaced = firstMisplacedIn(order)

			if(misplaced === -1) return

			const edits = []

			for(const [position, source] of order.entries()){
				if(source === position) continue

				edits.push({ member: body[position], text: sourceCode.getText(body[source]) })
			}

			context.report({
				loc: body[misplaced].name.loc,
				messageId: "jsonKeyOrder",
				data: {
					thisKey: keyOf(body[order[misplaced]]),
					previousKey: keyOf(body[misplaced]),
					path: target.path.join("."),
					modeDescription: description
				},
				fix: isContiguous(body)
					? (fixer) => edits.map((edit) => fixer.replaceText(edit.member, edit.text))
					: null
			})
		}

		return {
			Document(node){
				for(const target of targets) checkTarget(node, target)
			}
		}
	}
}

export default rule
