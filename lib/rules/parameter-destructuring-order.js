/**
 * @fileoverview Orders the bindings of a destructured function parameter by name length.
 *
 * The type annotation is the discriminator. An unannotated binding pattern is usually a callback
 * over data whose shape is decided elsewhere — a payload, a row, a tuple — and that order carries
 * meaning of its own, so by default only an annotated parameter is ordered. Narrow it further
 * with `match` when only some annotated parameters should take part.
 */

import { createCommentIndex, firstMisplacedIn, hasUniformSeparators, locOf, planPermutation, regionRangeOf, slotRangeOf, toFix } from "../shared/region.js"
import { comparatorFor } from "../shared/comparators.js"
import { docsUrl } from "../shared/rule.js"

const DEFAULT_OPTIONS = {
	match: "",
	requireTypeAnnotation: true,
	direction: "desc",
	tieBreak: "none",
	minProperties: 3
}

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
	meta: {
		type: "layout",
		fixable: "code",
		docs: {
			description: "Order a destructured parameter's bindings by binding-name length",
			url: docsUrl("parameter-destructuring-order")
		},
		schema: [
			{
				type: "object",
				properties: {
					match: { type: "string" },
					requireTypeAnnotation: { type: "boolean" },
					direction: { enum: ["asc", "desc"] },
					tieBreak: { enum: ["alphabetical", "none"] },
					minProperties: { type: "integer", minimum: 2 }
				},
				additionalProperties: false
			}
		],
		messages: {
			destructuringOrder: "\"{{binding}}\" ({{length}} chars) must come before \"{{previousBinding}}\" ({{previousLength}} chars): a destructured parameter is ordered {{direction}} by binding-name length."
		}
	},

	create(context){
		const options = { ...DEFAULT_OPTIONS, ...context.options[0] }
		const compare = comparatorFor(options.direction, options.tieBreak)

		const { sourceCode } = context
		const text = sourceCode.getText()
		const hasComment = createCommentIndex(sourceCode)

		/* Compiled once per file: `isInScope` runs on every parameter of every function. */
		const matcher = options.match === "" ? null : new RegExp(options.match, "u")

		const isInScope = (parameter) => {
			const annotation = parameter.typeAnnotation?.typeAnnotation?.range

			if(annotation === undefined) return !options.requireTypeAnnotation && matcher === null
			if(matcher === null) return true

			return matcher.test(text.slice(annotation[0], annotation[1]))
		}

		const checkParameter = (parameter) => {
			if(parameter?.type !== "ObjectPattern" || !isInScope(parameter)) return

			const slots = (parameter.properties ?? []).map((property) => {
				const isPlain = property.type === "Property" && property.computed !== true &&
					(property.key?.type === "Identifier" || property.key?.type === "Literal")
				/*
				 * The key's source text, so a quoted key measures with its quotes: a parameter
				 * holding `"aria-label": ariaLabel` is ordered on 12, not 10.
				 */
				const range = property.key?.range
				const name = isPlain && range !== undefined ? text.slice(range[0], range[1]) : null

				return {
					range: slotRangeOf(text, property.range ?? [0, 0]),
					sortKey: name,
					/* A rest element and any computed key hold their position. */
					isPinned: name === null
				}
			})

			const movable = slots.filter((slot) => !slot.isPinned)

			if(movable.length < options.minProperties) return

			const order = movable
				.map((slot, index) => ({ key: slot.sortKey ?? "", index }))
				.sort((first, second) => compare(first.key, second.key) || first.index - second.index)
				.map((entry) => entry.index)

			const edits = planPermutation(text, slots, order)

			if(!edits.length) return

			const position = firstMisplacedIn(order)
			const moved = movable[order[position]]
			const written = movable[position]

			const region = regionRangeOf(slots)
			const isFixable = !hasComment(region) && hasUniformSeparators(text, slots)

			context.report({
				loc: locOf(sourceCode, moved.range),
				messageId: "destructuringOrder",
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
			for(const parameter of node.params) checkParameter(parameter)
		}

		return {
			FunctionDeclaration: check,
			FunctionExpression: check,
			ArrowFunctionExpression: check
		}
	}
}

export default rule
