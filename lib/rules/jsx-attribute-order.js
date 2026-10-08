/**
 * @fileoverview Orders JSX attributes: a pinned tail (`ref`, then `key`), a precedence chain
 * (`style` before `className`), and the bare boolean flags ordered among themselves.
 *
 * Spreads are the load-bearing constraint: their position decides which value wins, so the
 * attribute list is split into segments at every spread and a plan may only permute *within* one
 * segment. Nothing is ever moved across a spread.
 */

import { createCommentIndex } from "../shared/region.js"
import { comparatorFor } from "../shared/comparators.js"

const DEFAULT_OPTIONS = {
	last: ["ref", "key"],
	precedence: [["style", "styles"], ["className", "classNames"]],
	bareBooleans: "desc",
	bareBooleanTieBreak: "none",
	minAttributes: 3
}

const NO_LOC = { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } }

/** @type {import("eslint").Rule.RuleModule} */
const rule = {
	meta: {
		type: "layout",
		fixable: "code",
		docs: {
			description: "Order JSX attributes: pinned tail, precedence chain, then bare booleans by name length",
			url: "https://github.com/Alphka/eslint-plugin-ordering-conventions/blob/main/docs/rules/jsx-attribute-order.md"
		},
		schema: [
			{
				type: "object",
				properties: {
					last: { type: "array", items: { type: "string" } },
					precedence: { type: "array", items: { type: "array", items: { type: "string" }, minItems: 1 } },
					bareBooleans: { enum: ["asc", "desc", "off"] },
					bareBooleanTieBreak: { enum: ["alphabetical", "none"] },
					minAttributes: { type: "integer", minimum: 2 }
				},
				additionalProperties: false
			}
		],
		messages: {
			attributeMustBeLast: "`{{attribute}}` must be the last attribute.",
			attributeMustBeNearLast: "`{{attribute}}` must come after every other attribute except {{following}}.",
			attributePrecedence: "`{{attribute}}` must come before `{{other}}`.",
			bareBooleanOrder: "Bare booleans are ordered {{direction}} by name length — `{{attribute}}` ({{length}}) before `{{previousAttribute}}` ({{previousLength}})."
		}
	},

	create(context){
		const options = { ...DEFAULT_OPTIONS, ...context.options[0] }
		const compare = comparatorFor(options.bareBooleans === "off" ? "desc" : options.bareBooleans, options.bareBooleanTieBreak)

		const { sourceCode } = context
		const text = sourceCode.getText()
		const hasComment = createCommentIndex(sourceCode)

		const nameOf = (attribute) => text.slice(...(attribute.name?.range ?? attribute.range ?? [0, 0]))
		const locOf = (attribute) => attribute.loc ?? NO_LOC
		const rangeOf = (attribute) => attribute.range ?? [0, 0]

		const spans = (first, second) => {
			const left = rangeOf(first)
			const right = rangeOf(second)

			return [Math.min(left[0], right[0]), Math.max(left[1], right[1])]
		}

		/** Writes `attributes` into the slots of `run`, position by position. */
		const rewrite = (run, attributes) => (fixer) => run.flatMap((attribute, index) => {
			const target = rangeOf(attribute)
			const source = rangeOf(attributes[index])

			return target[0] === source[0] ? [] : [fixer.replaceTextRange(target, text.slice(...source))]
		})

		/*
		 * Moving one attribute to the far end of a run by swapping would drag whatever sat there
		 * all the way to the front — a change nobody asked for. A rotation touches the same bytes
		 * and leaves every other attribute in its relative place.
		 */
		const rotate = (run, toEnd) => rewrite(run, toEnd ? [...run.slice(1), run[0]] : [run[run.length - 1], ...run.slice(0, -1)])

		const swap = (first, second) => (fixer) => [
			fixer.replaceTextRange(rangeOf(first), text.slice(...rangeOf(second))),
			fixer.replaceTextRange(rangeOf(second), text.slice(...rangeOf(first)))
		]

		/** The run between two positions, or `null` when a spread or a comment sits inside it. */
		const runBetween = (attributes, from, to) => {
			const run = attributes.slice(Math.min(from, to), Math.max(from, to) + 1)

			if(run.length < 2) return null
			if(run.some((attribute) => attribute.type !== "JSXAttribute")) return null

			return hasComment(spans(run[0], run[run.length - 1])) ? null : run
		}

		const checkPinnedTail = (attributes, named) => {
			const present = options.last.filter((name) => named.some((attribute) => nameOf(attribute) === name))

			for(const [index, name] of present.entries()){
				const attribute = named.find((candidate) => nameOf(candidate) === name)
				const actual = attributes.indexOf(attribute)
				const expected = attributes.length - present.length + index

				if(actual === expected) continue

				const run = runBetween(attributes, actual, expected)
				const following = present.slice(index + 1)

				context.report({
					loc: locOf(attribute),
					messageId: following.length === 0 ? "attributeMustBeLast" : "attributeMustBeNearLast",
					data: { attribute: name, following: following.map((other) => `\`${other}\``).join(", ") },
					fix: run === null ? null : rotate(run, actual < expected)
				})
			}
		}

		const checkPrecedence = (segment) => {
			const found = segment
				.map((attribute) => ({ attribute, tier: options.precedence.findIndex((tier) => tier.includes(nameOf(attribute))) }))
				.filter((entry) => entry.tier >= 0)

			for(const [index, earlier] of found.entries()){
				const inverted = found.slice(index + 1).find((later) => later.tier < earlier.tier)

				if(inverted === undefined) continue

				context.report({
					loc: locOf(inverted.attribute),
					messageId: "attributePrecedence",
					data: { attribute: nameOf(inverted.attribute), other: nameOf(earlier.attribute) },
					fix: hasComment(spans(earlier.attribute, inverted.attribute)) ? null : swap(earlier.attribute, inverted.attribute)
				})

				return
			}
		}

		const checkBareBooleans = (segment) => {
			const bare = segment.filter((attribute) => attribute.value === null || attribute.value === undefined)

			if(bare.length < 2) return

			const order = bare
				.map((attribute, index) => ({ name: nameOf(attribute), index }))
				.sort((first, second) => compare(first.name, second.name) || first.index - second.index)
				.map((entry) => entry.index)

			const position = order.findIndex((source, index) => source !== index)

			if(position === -1) return

			const moved = bare[order[position]]
			const written = bare[position]

			context.report({
				loc: locOf(moved),
				messageId: "bareBooleanOrder",
				data: {
					attribute: nameOf(moved),
					length: String(nameOf(moved).length),
					previousAttribute: nameOf(written),
					previousLength: String(nameOf(written).length),
					direction: options.bareBooleans === "asc" ? "ascending" : "descending"
				},
				fix: hasComment(spans(bare[0], bare[bare.length - 1]))
					? null
					: rewrite(bare, order.map((source) => bare[source]))
			})
		}

		return {
			JSXOpeningElement(node){
				const attributes = node.attributes ?? []
				const named = attributes.filter((attribute) => attribute.type === "JSXAttribute")

				if(named.length < options.minAttributes) return

				/* Segments between spreads: nothing may be permuted across one. */
				const segments = [[]]

				for(const attribute of attributes){
					if(attribute.type === "JSXAttribute") segments[segments.length - 1].push(attribute)
					else segments.push([])
				}

				checkPinnedTail(attributes, named)

				for(const segment of segments){
					checkPrecedence(segment)

					if(options.bareBooleans !== "off") checkBareBooleans(segment)
				}
			}
		}
	}
}

export default rule
