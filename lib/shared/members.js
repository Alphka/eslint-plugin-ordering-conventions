/**
 * @fileoverview Shape-reading for TypeScript interface and type-literal members.
 */

import { slotRangeOf } from "./region.js"

/**
 * The measured name of a member, or `null` when it is not a plain named property.
 *
 * This is the key's *source text*, so a quoted key measures with its quotes — `"aria-label"` is
 * 12, not 10. Measuring the cooked value instead would sort a quoted key as if the quotes were
 * invisible, which is not how the column actually reads.
 *
 * @param {string} text
 * @param {{ type: string, computed?: boolean, key?: { type: string, range?: [number, number] } }} member
 * @returns {string | null}
 */
export function memberNameOf(text, member){
	if(member.type !== "TSPropertySignature" || member.computed === true) return null
	if(member.key?.type !== "Identifier" && member.key?.type !== "Literal") return null

	const range = member.key.range

	return range === undefined ? null : text.slice(range[0], range[1])
}

/**
 * The member list of an interface or of a `type X = { … }` alias, else `null`.
 *
 * @param {any} node
 * @returns {readonly any[] | null}
 */
export function membersOf(node){
	if(node.type === "TSInterfaceDeclaration") return node.body?.body ?? null
	if(node.type === "TSTypeAliasDeclaration" && node.typeAnnotation?.type === "TSTypeLiteral"){
		return node.typeAnnotation.members ?? null
	}

	return null
}

/**
 * One slot per member. A member that is not a plain named property — an index signature, a method
 * signature, a computed key — is pinned, so the named members are permuted around it rather than
 * over it.
 *
 * @param {string} text
 * @param {readonly any[]} members
 * @returns {import("./region.js").ISlot[]}
 */
export function memberSlots(text, members){
	return members.map((member) => {
		const name = memberNameOf(text, member)

		return {
			range: slotRangeOf(text, member.range ?? [0, 0]),
			sortKey: name,
			isPinned: name === null
		}
	})
}
