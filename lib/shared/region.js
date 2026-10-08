/**
 * @fileoverview The fixer primitive every ordering rule is built on.
 *
 * A region is a list of slots plus the literal text between them. A fix permutes slot *contents*
 * and never touches a separator byte, so indentation, line breaks and `;`/`,` delimiters survive
 * exactly as written — no re-printing, and nothing for a formatter to undo afterwards.
 */

/**
 * @typedef {object} ISlot
 * @property {[number, number]} range   delimiter-stripped, so a trailing `;` or `,` stays on the separator side
 * @property {string | null} sortKey    the string the comparator sees; `null` for a slot that must not move
 * @property {boolean} isPinned
 */

/**
 * @typedef {object} ITextEdit
 * @property {[number, number]} range
 * @property {string} text
 */

/**
 * A node's range usually includes its trailing `;`/`,` while the last one in a list does not, so
 * permuting raw node ranges would migrate the delimiter and produce `{ b: 2; a: 1; }`. Trimming
 * it back onto the separator is what keeps a fix formatting-neutral.
 *
 * @param {string} text
 * @param {readonly [number, number]} range
 * @returns {[number, number]}
 */
export function slotRangeOf(text, range){
	const [start] = range
	let cursor = range[1]

	while(cursor > start && /[\s;,]/.test(text.charAt(cursor - 1))) cursor--

	return [start, cursor]
}

/**
 * Every gap between consecutive slots has to be byte-identical. A varying separator means a blank
 * line, a comment, or a mixed one-per-line layout — in all of which a positional permutation
 * would garble the file, so the rule reports without offering a fix.
 *
 * @param {string} text
 * @param {readonly { range: readonly [number, number] }[]} slots
 * @returns {boolean}
 */
export function hasUniformSeparators(text, slots){
	const separators = slots.slice(1).map((slot, index) => text.slice(slots[index].range[1], slot.range[0]))

	return new Set(separators).size <= 1
}

/**
 * Emits one replacement per slot whose contents change. ESLint merges an array of fixes into the
 * span from the first to the last, refilling the gaps from the original text — so emitting only
 * the changed slots keeps the rewritten range minimal and the diff tight.
 *
 * @param {string} text
 * @param {readonly ISlot[]} slots
 * @param {readonly number[]} order  indices into the movable slots, in their target order
 * @returns {ITextEdit[]}
 */
export function planPermutation(text, slots, order){
	const movable = slots.filter((slot) => !slot.isPinned)
	/** @type {ITextEdit[]} */
	const edits = []

	for(const [position, source] of order.entries()){
		const target = movable[position]
		const from = movable[source]

		if(target.range[0] === from.range[0]) continue

		const replacement = text.slice(from.range[0], from.range[1])

		if(replacement === text.slice(target.range[0], target.range[1])) continue

		edits.push({ range: target.range, text: replacement })
	}

	return edits
}

/**
 * The order the movable slots should appear in, as indices into the movable list. A stable sort,
 * so slots the comparator calls equal keep the order they were written in.
 *
 * @param {readonly ISlot[]} slots
 * @param {(first: string, second: string) => number} compare
 * @returns {number[]}
 */
export function orderFor(slots, compare){
	const movable = slots.filter((slot) => !slot.isPinned)

	return movable
		.map((slot, index) => ({ key: slot.sortKey ?? "", index }))
		.sort((first, second) => compare(first.key, second.key) || first.index - second.index)
		.map((entry) => entry.index)
}

/**
 * The first position whose contents have to change, or `-1` when the order already holds. This is
 * where the reader has to act, so it is where the report is anchored.
 *
 * @param {readonly number[]} order
 * @returns {number}
 */
export function firstMisplacedIn(order){
	return order.findIndex((source, index) => source !== index)
}

/**
 * Builds the comment index once per file; the returned predicate answers whether a range overlaps
 * a comment. Strict overlap, so a header comment ending exactly where the region starts does not
 * disable the rule for the whole file.
 *
 * @param {import("eslint").SourceCode} sourceCode
 * @returns {(range: readonly [number, number]) => boolean}
 */
export function createCommentIndex(sourceCode){
	const ranges = sourceCode.getAllComments()
		.map((comment) => comment.range)
		.filter((range) => range !== undefined)

	return (range) => ranges.some(([start, end]) => start < range[1] && end > range[0])
}

/**
 * The span a fix could rewrite: the first slot's start to the last slot's end.
 * @param {readonly ISlot[]} slots
 * @returns {[number, number]}
 */
export function regionRangeOf(slots){
	return [slots[0].range[0], slots[slots.length - 1].range[1]]
}

/**
 * @param {readonly ITextEdit[]} edits
 * @returns {(fixer: import("eslint").Rule.RuleFixer) => import("eslint").Rule.Fix[]}
 */
export function toFix(edits){
	return (fixer) => edits.map((edit) => fixer.replaceTextRange(edit.range, edit.text))
}

/**
 * @param {import("eslint").SourceCode} sourceCode
 * @param {readonly [number, number]} range
 * @returns {import("eslint").AST.SourceLocation}
 */
export function locOf(sourceCode, range){
	return {
		start: sourceCode.getLocFromIndex(range[0]),
		end: sourceCode.getLocFromIndex(range[1])
	}
}
