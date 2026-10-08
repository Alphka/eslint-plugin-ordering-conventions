/**
 * @fileoverview Orders the leading run of simple hook declarations in a function body: a
 * destructuring binding before a plain identifier, then by the length of the binding text. Only
 * the binding is measured, never the call or its arguments.
 *
 * A hook that needs a callback or an object-literal config is never part of a run — it
 * disqualifies its own statement and ends whichever run was accumulating, though scanning resumes
 * if more simple hook calls follow later in the same body, as an independent run. A blank line or
 * a comment between two otherwise-adjacent candidates starts a new, independently-sorted segment
 * the same way; nothing ever moves across a segment boundary. That blank line is also the escape
 * hatch for a hook that has to stay where it is.
 *
 * Belt and braces: even within one segment, a statement whose call arguments reference a name
 * bound by another statement in that same segment makes the whole segment hands-off, so a
 * dependency can never be reordered into a use-before-declaration bug.
 */

import { createCommentIndex, firstMisplacedIn, hasUniformSeparators, locOf, planPermutation, regionRangeOf, slotRangeOf, toFix } from "../shared/region.js"
import { compareBindings } from "../shared/comparators.js"
import { docsUrl } from "../shared/rule.js"

const DEFAULT_OPTIONS = {
	pattern: "^use[A-Z]",
	direction: "desc",
	tieBreak: "alphabetical",
	destructuringFirst: true,
	disqualifyingArguments: ["ArrowFunctionExpression", "FunctionExpression", "ObjectExpression"]
}

/**
 * Every name a pattern binds — the local identifiers a destructuring or plain binding introduces.
 *
 * @param {any} pattern
 * @returns {string[]}
 */
function boundNamesOf(pattern){
	if(pattern === null || pattern === undefined) return []

	if(pattern.type === "Identifier") return pattern.name === undefined ? [] : [pattern.name]
	if(pattern.type === "AssignmentPattern") return boundNamesOf(pattern.left)
	if(pattern.type === "RestElement") return boundNamesOf(pattern.argument)
	if(pattern.type === "ArrayPattern") return (pattern.elements ?? []).flatMap((element) => boundNamesOf(element))
	if(pattern.type === "Property" || pattern.type === "ObjectProperty") return boundNamesOf(pattern.value)
	if(pattern.type === "ObjectPattern") return (pattern.properties ?? []).flatMap((property) => boundNamesOf(property))

	return []
}

/**
 * Every identifier referenced anywhere inside a call's arguments, member-property names excluded.
 *
 * @param {unknown} node
 * @param {string[]} into
 */
function referencedNamesOf(node, into){
	if(node === null || typeof node !== "object") return

	if(node.type === "Identifier"){
		if(typeof node.name === "string") into.push(node.name)

		return
	}

	if(node.type === "MemberExpression"){
		referencedNamesOf(node.object, into)

		if(node.computed === true) referencedNamesOf(node.property, into)

		return
	}

	for(const [key, value] of Object.entries(node)){
		if(key === "type" || key === "range" || key === "loc" || key === "parent") continue

		if(Array.isArray(value)){
			for(const entry of value) referencedNamesOf(entry, into)
		}else if(value !== null && typeof value === "object"){
			referencedNamesOf(value, into)
		}
	}
}

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
	meta: {
		type: "layout",
		fixable: "code",
		docs: {
			description: "Order a function's leading simple hook declarations: destructuring first, then by binding length",
			url: docsUrl("hook-declaration-order")
		},
		schema: [
			{
				type: "object",
				properties: {
					pattern: { type: "string" },
					direction: { enum: ["asc", "desc"] },
					tieBreak: { enum: ["alphabetical", "none"] },
					destructuringFirst: { type: "boolean" },
					disqualifyingArguments: { type: "array", items: { type: "string" } }
				},
				additionalProperties: false
			}
		],
		messages: {
			hookDeclarationOrder: "\"{{binding}}\" ({{length}} chars) must come before \"{{previousBinding}}\" ({{previousLength}} chars): leading hook declarations are ordered {{direction}} by binding length."
		}
	},

	create(context){
		const options = { ...DEFAULT_OPTIONS, ...context.options[0] }
		const compare = compareBindings(options.direction, options.tieBreak, options.destructuringFirst)
		const callee = new RegExp(options.pattern, "u")
		const disqualifying = new Set(options.disqualifyingArguments)

		const { sourceCode } = context
		const text = sourceCode.getText()
		const hasComment = createCommentIndex(sourceCode)

		const asCandidate = (statement) => {
			if(statement.type !== "VariableDeclaration") return null
			if(statement.declarations?.length !== 1) return null

			const [declarator] = statement.declarations
			const { init } = declarator

			if(init === null || init === undefined || init.type !== "CallExpression") return null
			if(init.callee.type !== "Identifier" || !callee.test(init.callee.name ?? "")) return null
			if(init.arguments.some((argument) => disqualifying.has(argument.type))) return null

			return { statement, id: declarator.id, callArguments: init.arguments }
		}

		/*
		 * A disqualifying statement only ends the *current* run — it does not stop the scan for the
		 * rest of the body. Each candidate keeps its position among ALL statements, so the
		 * segmentation pass can tell "nothing sat between these two" apart from "these two just
		 * happen to both be hook calls".
		 */
		const segmentsOf = (statements) => {
			const candidates = []

			for(const [statementIndex, statement] of statements.entries()){
				const candidate = asCandidate(statement)

				if(candidate !== null) candidates.push({ candidate, statementIndex })
			}

			if(candidates.length < 2) return []

			const segments = [[]]

			for(const [index, entry] of candidates.entries()){
				if(index > 0){
					const previous = candidates[index - 1]
					const isAdjacent = entry.statementIndex - previous.statementIndex === 1
					const hasBlankLine = entry.candidate.statement.loc !== undefined && previous.candidate.statement.loc !== undefined &&
						entry.candidate.statement.loc.start.line - previous.candidate.statement.loc.end.line >= 2
					const gap = [previous.candidate.statement.range?.[1] ?? 0, entry.candidate.statement.range?.[0] ?? 0]

					if(!isAdjacent || hasBlankLine || hasComment(gap)) segments.push([])
				}

				segments[segments.length - 1].push(entry.candidate)
			}

			return segments
		}

		const checkSegment = (segment) => {
			if(segment.length < 2) return

			const slots = segment.map(({ statement, id, callArguments }) => {
				const argumentNames = []

				for(const argument of callArguments) referencedNamesOf(argument, argumentNames)

				return {
					range: slotRangeOf(text, statement.range ?? [0, 0]),
					sortKey: id.range === undefined ? null : text.slice(...id.range),
					isPinned: false,
					isDestructured: id.type === "ObjectPattern" || id.type === "ArrayPattern",
					boundNames: boundNamesOf(id),
					argumentNames
				}
			})

			const bound = new Set(slots.flatMap((slot) => slot.boundNames))

			if(slots.some((slot) => slot.argumentNames.some((name) => bound.has(name)))) return

			const order = slots
				.map((slot, index) => ({ descriptor: { text: slot.sortKey ?? "", isDestructured: slot.isDestructured }, index }))
				.sort((first, second) => compare(first.descriptor, second.descriptor) || first.index - second.index)
				.map((entry) => entry.index)

			const edits = planPermutation(text, slots, order)

			if(!edits.length) return

			const position = firstMisplacedIn(order)
			const moved = slots[order[position]]
			const written = slots[position]

			const region = regionRangeOf(slots)
			const isFixable = !hasComment(region) && hasUniformSeparators(text, slots)

			context.report({
				loc: locOf(sourceCode, moved.range),
				messageId: "hookDeclarationOrder",
				data: {
					binding: moved.sortKey ?? "",
					length: String((moved.sortKey ?? "").length),
					previousBinding: written.sortKey ?? "",
					previousLength: String((written.sortKey ?? "").length),
					direction: options.direction === "asc" ? "ascending" : "descending"
				},
				fix: isFixable ? toFix(edits) : null
			})
		}

		const check = (node) => {
			if(node.body?.type !== "BlockStatement" || node.body.body === undefined) return

			for(const segment of segmentsOf(node.body.body)) checkSegment(segment)
		}

		return {
			FunctionDeclaration: check,
			FunctionExpression: check,
			ArrowFunctionExpression: check
		}
	}
}

export default rule
