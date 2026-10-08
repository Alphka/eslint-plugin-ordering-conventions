import { describe, it } from "node:test"
import assert from "node:assert/strict"
import rule from "../lib/rules/tailwind-apply-class-order.js"

/*
 * The rule is driven directly rather than through a RuleTester, so the suite needs no CSS
 * language plugin. This covers the ordering, the message and the fix text, which is all of the
 * rule's own logic; the language plumbing — that `Atrule` fires and the offsets line up — is
 * covered by running ESLint over a real stylesheet.
 */

/**
 * Runs the rule over one `@apply` prelude and returns what it reported.
 *
 * @param {string} prelude
 * @param {object} [options]
 * @returns {{ messageId: string, data: Record<string, string>, range: [number, number] | null, replacement: string | null }[]}
 */
function run(prelude, options){
	const text = `.x { @apply ${prelude}; }`
	const start = ".x { @apply ".length
	const end = start + prelude.length

	const reports = []
	const context = {
		options: options === undefined ? [] : [options],
		sourceCode: { text },
		report(descriptor){
			let range = null
			let replacement = null

			if(descriptor.fix !== null){
				descriptor.fix({
					replaceTextRange(target, value){
						range = target
						replacement = value

						return null
					}
				})
			}

			reports.push({ messageId: descriptor.messageId, data: descriptor.data, range, replacement })
		}
	}

	const visitor = rule.create(context)

	visitor.Atrule({
		name: "apply",
		prelude: { loc: { start: { offset: start }, end: { offset: end } } }
	})

	return reports
}

describe("tailwind-apply-class-order", () => {
	for(const prelude of [
		"min-h-dvh w-full flex flex-col items-center justify-center text-center py-6 overflow-auto gap-18",
		"bg-gray-100 bg-clip-content border-[.1875rem] border-transparent rounded-full",
		"grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2 lg:px-8",
		"flex items-center gap-4"
	]){
		it(`accepts ${prelude}`, () => {
			assert.deepEqual(run(prelude), [])
		})
	}

	it("leaves an unparsable prelude alone", () => {
		assert.deepEqual(run("bg-[url('x y.png')] p-4!"), [])
	})

	it("ignores at-rules that are not @apply", () => {
		const context = {
			options: [],
			sourceCode: { text: "@media x {}" },
			report(){
				throw new Error("should not report")
			}
		}

		rule.create(context).Atrule({ name: "media", prelude: { loc: { start: { offset: 0 }, end: { offset: 1 } } } })
	})

	it("reports and fixes a category-order violation", () => {
		const [report] = run("gap-4 flex items-center")

		assert.equal(report.messageId, "applyClassOrder")
		assert.equal(report.data.token, "flex")
		assert.equal(report.data.category, "display")
		assert.equal(report.data.blockedBy, "gap-4")
		assert.equal(report.data.reason, "category order")
		assert.equal(report.replacement, "flex items-center gap-4")
	})

	it("preserves the separators it was given", () => {
		const [report] = run("py-2\tpx-4  flex")

		assert.equal(report.replacement, "flex\tpx-4  py-2")
	})

	it("reports a sub-order violation against the category it belongs to", () => {
		const [report] = run("w-2/5 max-w-lg")

		assert.equal(report.data.reason, "order within the size category")
		assert.equal(report.replacement, "max-w-lg w-2/5")
	})

	it("honours a custom at-rule name", () => {
		assert.deepEqual(run("gap-4 flex items-center", { atRules: ["utility"] }), [])
	})
})
