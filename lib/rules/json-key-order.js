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
 */

import { comparatorFor, compareAlphabetical } from "../shared/comparators.js"

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
 * Every index where a key and the one before it are out of order, so one pass can report every
 * offending adjacent pair.
 *
 * @param {readonly string[]} keys
 * @param {(first: string, second: string) => number} comparator
 * @param {number} fromIndex
 * @returns {number[]}
 */
function findViolations(keys, comparator, fromIndex){
	const violations = []

	for(let index = Math.max(fromIndex, 1); index < keys.length; index++){
		if(comparator(keys[index - 1], keys[index]) > 0) violations.push(index)
	}

	return violations
}

/** Declines the swap-fix when a blank line separates the two members — likely a deliberate group. */
function isAdjacentInSource(previousMember, member){
	return member.loc.start.line - previousMember.loc.end.line <= 1
}

const rule = {
	meta: {
		type: "layout",
		fixable: "code",
		docs: {
			description: "Order the keys of specific JSON objects by length or alphabetically",
			url: "https://github.com/Alphka/eslint-plugin-ordering-conventions/blob/main/docs/rules/json-key-order.md"
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
			const keys = object.members.map(keyOf)

			if(!hasExpectedPinnedPrefix(keys, pinnedLeading)) return

			const { comparator, description } = MODES[target.mode]
			/* +1: the pair (last pinned key, first body key) is the deliberate reset, never checked. */
			const violations = findViolations(keys, comparator, pinnedLeading.length + 1)

			for(const index of violations){
				const previousMember = object.members[index - 1]
				const member = object.members[index]

				context.report({
					loc: member.name.loc,
					messageId: "jsonKeyOrder",
					data: {
						thisKey: keys[index],
						previousKey: keys[index - 1],
						path: target.path.join("."),
						modeDescription: description
					},
					fix: isAdjacentInSource(previousMember, member)
						? (fixer) => [
							fixer.replaceText(member, sourceCode.getText(previousMember)),
							fixer.replaceText(previousMember, sourceCode.getText(member))
						]
						: null
				})
			}
		}

		return {
			Document(node){
				for(const target of targets) checkTarget(node, target)
			}
		}
	}
}

export default rule
