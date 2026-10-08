/**
 * @fileoverview Orders a contiguous run of import declarations: fixed groups first, then by
 * clause length inside each group, with the brace specifiers ordered too.
 *
 * Group, clause and specifier order are one rule on purpose. The clause sort key is the
 * *normalized clause text*, which changes when the specifiers inside the braces move, so
 * splitting them would make the result depend on which fixer ran first. Computing the
 * specifier-normalized clause up front makes the whole block converge in a single pass.
 */

import { comparatorFor, compareSpecifiers, IMPORT_GROUPS, importGroupOf, normalizeClauseText } from "../shared/comparators.js"
import { createCommentIndex, hasUniformSeparators, slotRangeOf } from "../shared/region.js"

const DEFAULT_OPTIONS = {
	groups: IMPORT_GROUPS,
	direction: "desc",
	tieBreak: "alphabetical",
	sortSpecifiers: true,
	specifierDirection: "desc",
	typeSpecifiersLast: true,
	allowBlankLines: false
}

const NO_LOC = { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } }

/**
 * @param {unknown} value
 * @returns {string | null}
 */
const nameOf = (value) => typeof value === "string" ? value : null

/**
 * A group the options leave out still needs a rank, or its imports would all compare equal. It
 * lands after every listed group, in the built-in order.
 *
 * @param {readonly string[]} groups
 * @returns {Map<string, number>}
 */
function groupRankFor(groups){
	const rank = new Map(groups.map((group, index) => [group, index]))

	for(const [index, group] of IMPORT_GROUPS.entries()){
		if(!rank.has(group)) rank.set(group, groups.length + index)
	}

	return rank
}

/**
 * Applies disjoint edits inside one span and returns the rewritten slice.
 *
 * @param {string} text
 * @param {readonly [number, number]} span
 * @param {readonly import("../shared/region.js").ITextEdit[]} edits
 * @returns {string}
 */
function applyEditsToSlice(text, span, edits){
	let result = ""
	let cursor = span[0]

	for(const edit of [...edits].sort((first, second) => first.range[0] - second.range[0])){
		result += text.slice(cursor, edit.range[0]) + edit.text
		cursor = edit.range[1]
	}

	return result + text.slice(cursor, span[1])
}

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
	meta: {
		type: "layout",
		fixable: "code",
		docs: {
			description: "Order imports by group, then by clause length",
			url: "https://github.com/Alphka/eslint-plugin-ordering-conventions/blob/main/docs/rules/import-order.md"
		},
		schema: [
			{
				type: "object",
				properties: {
					groups: {
						type: "array",
						items: { enum: IMPORT_GROUPS },
						uniqueItems: true
					},
					direction: { enum: ["asc", "desc"] },
					tieBreak: { enum: ["alphabetical", "none"] },
					sortSpecifiers: { type: "boolean" },
					specifierDirection: { enum: ["asc", "desc"] },
					typeSpecifiersLast: { type: "boolean" },
					allowBlankLines: { type: "boolean" }
				},
				additionalProperties: false
			}
		],
		messages: {
			importGroupOrder: "This is a {{group}} import placed after a {{previousGroup}} one. Expected group order: {{groups}}.",
			importClauseLength: "Import clause \"{{clause}}\" ({{length}} chars) must come before \"{{previousClause}}\" ({{previousLength}} chars): each group is ordered {{direction}} by clause length.",
			importClauseAlphabetical: "\"{{clause}}\" and \"{{previousClause}}\" are both {{length}} chars, so the tie breaks alphabetically: \"{{clause}}\" comes first.",
			importSpecifierOrder: "These braces are not in order. Expected: {{expected}}",
			blankLineBetweenImports: "No blank line is allowed between import declarations."
		}
	},

	create(context){
		const options = { ...DEFAULT_OPTIONS, ...context.options[0] }
		const groupRank = groupRankFor(options.groups)
		const compareClauses = comparatorFor(options.direction, options.tieBreak)

		const { sourceCode } = context
		const text = sourceCode.getText()
		const hasComment = createCommentIndex(sourceCode)

		/* The specifier order for one declaration's braces, as edits inside that declaration. */
		const specifierEditsFor = (node) => {
			if(!options.sortSpecifiers) return []

			const named = node.specifiers.filter((specifier) => specifier.type === "ImportSpecifier")

			if(named.length < 2) return []

			const slots = named.map((specifier) => ({
				range: slotRangeOf(text, specifier.range ?? [0, 0]),
				sortKey: nameOf(specifier.imported?.name) ?? nameOf(specifier.imported?.value) ?? "",
				isTypeOnly: specifier.importKind === "type"
			}))

			if(!hasUniformSeparators(text, slots)) return []

			const declarationText = text.slice(...(node.range ?? [0, 0]))
			const layout = declarationText.includes("\n") ? "multi" : "single"
			const compare = compareSpecifiers(layout, options.specifierDirection, options.typeSpecifiersLast)

			const order = slots
				.map((slot, index) => ({ slot, index }))
				.sort((first, second) => compare(
					{ name: first.slot.sortKey, isTypeOnly: first.slot.isTypeOnly },
					{ name: second.slot.sortKey, isTypeOnly: second.slot.isTypeOnly }
				) || first.index - second.index)
				.map((entry) => entry.index)

			const edits = []

			for(const [position, source] of order.entries()){
				if(position === source) continue

				edits.push({ range: slots[position].range, text: text.slice(...slots[source].range) })
			}

			return edits
		}

		const describe = (node) => {
			const range = slotRangeOf(text, node.range ?? [0, 0])
			const clauseRaw = text.slice(range[0], node.source.range?.[0] ?? range[1])
				.replace(/^import\s+/, "")
				.replace(/\s*from\s*$/, "")
			const withoutType = clauseRaw.replace(/^type\s+/, "").trimStart()

			const edits = hasComment(range) ? [] : specifierEditsFor(node)

			return {
				node,
				range,
				group: importGroupOf({
					isTypeOnly: node.importKind === "type",
					/* Read from the text, so `import {} from "m"` is still a braces group. */
					hasBraces: withoutType.startsWith("{"),
					hasBinding: node.specifiers.some((specifier) => specifier.type === "ImportDefaultSpecifier" || specifier.type === "ImportNamespaceSpecifier")
				}),
				clause: normalizeClauseText(clauseRaw),
				/** The declaration text with its brace specifiers already in order. */
				normalizedText: applyEditsToSlice(text, range, edits),
				writtenText: text.slice(range[0], range[1])
			}
		}

		const compareEntries = (first, second) => (groupRank.get(first.group) ?? 0) - (groupRank.get(second.group) ?? 0) ||
			compareClauses(first.clause, second.clause)

		const reportBlankLines = (entries) => {
			for(const [index, entry] of entries.slice(1).entries()){
				const gap = [entries[index].range[1], entry.range[0]]

				if(!/\n[^\S\n]*\n/.test(text.slice(gap[0], gap[1]))) continue

				context.report({
					loc: entry.node.loc ?? NO_LOC,
					messageId: "blankLineBetweenImports",
					fix: hasComment(gap) ? null : (fixer) => fixer.replaceTextRange(gap, "\n")
				})
			}
		}

		/* A lone declaration is still checked: its braces can be out of order on their own. */
		const checkRun = (run) => {
			if(run.length === 0) return

			const entries = run.map(describe)

			const order = entries
				.map((entry, index) => ({ entry, index }))
				.sort((first, second) => compareEntries(first.entry, second.entry) || first.index - second.index)
				.map((item) => item.index)

			/* Blank lines are their own problem with their own tiny fix. */
			if(!options.allowBlankLines) reportBlankLines(entries)

			const edits = []

			for(const [position, source] of order.entries()){
				const replacement = entries[source].normalizedText

				if(replacement === entries[position].writtenText) continue

				edits.push({ range: entries[position].range, text: replacement })
			}

			if(!edits.length) return

			/* Report where the reader has to act: the first declaration that is out of place. */
			const position = order.findIndex((source, index) => source !== index)
			const isSpecifierOnly = position === -1
			const target = isSpecifierOnly
				? entries[entries.findIndex((entry) => entry.normalizedText !== entry.writtenText)]
				: entries[order[position]]
			const written = isSpecifierOnly ? target : entries[position]

			const region = [entries[0].range[0], entries[entries.length - 1].range[1]]
			const isFixable = !hasComment(region) && hasUniformSeparators(text, entries)

			const messageId = isSpecifierOnly
				? "importSpecifierOrder"
				: target.group === written.group
					? (target.clause.length === written.clause.length ? "importClauseAlphabetical" : "importClauseLength")
					: "importGroupOrder"

			context.report({
				loc: written.node.loc ?? NO_LOC,
				messageId,
				data: {
					clause: target.clause,
					length: String(target.clause.length),
					previousClause: written.clause,
					previousLength: String(written.clause.length),
					group: target.group,
					previousGroup: written.group,
					groups: options.groups.join(", "),
					direction: options.direction === "asc" ? "ascending" : "descending",
					expected: target.normalizedText
				},
				fix: isFixable ? (fixer) => edits.map((edit) => fixer.replaceTextRange(edit.range, edit.text)) : null
			})
		}

		return {
			Program(node){
				/*
				 * Maximal contiguous runs, not every import in the file: hoisting a declaration
				 * across an intervening statement would change module evaluation order.
				 */
				let run = []

				for(const statement of node.body){
					if(statement.type === "ImportDeclaration"){
						run.push(statement)
						continue
					}

					checkRun(run)

					run = []
				}

				checkRun(run)
			}
		}
	}
}

export default rule
