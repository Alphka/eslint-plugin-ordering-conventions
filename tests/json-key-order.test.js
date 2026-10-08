import { describe, it } from "node:test"
import assert from "node:assert/strict"
import rule from "../lib/rules/json-key-order.js"

/*
 * The rule is driven directly against small hand-built momoa-shaped nodes, so the suite needs no
 * JSON language plugin. This covers the ordering, the pinned-prefix gating and the fix text,
 * which is all of the rule's own logic; the language plumbing — that `Document` fires and the
 * real momoa nodes look like this — is covered by running ESLint over a real JSON file.
 */

function fakeMember(key, line){
	return {
		name: { type: "String", value: key, loc: { start: { line, column: 2 }, end: { line, column: 2 + key.length } } },
		value: { type: "String", value: "x" },
		loc: { start: { line, column: 1 }, end: { line, column: 10 } }
	}
}

function fakeDocument(pathKey, keys){
	const target = { type: "Object", members: keys.map(({ key, line }) => fakeMember(key, line)) }
	const root = {
		name: { type: "String", value: pathKey, loc: { start: { line: 0, column: 0 }, end: { line: 0, column: 0 } } },
		value: target,
		loc: { start: { line: 0, column: 0 }, end: { line: 0, column: 0 } }
	}

	return { body: { type: "Object", members: [root] } }
}

/** Runs the rule against one target descriptor and a flat list of keys, one per line. */
function run(target, keys, documentKey = target.path[0]){
	const reports = []
	const context = {
		options: [[target]],
		sourceCode: {
			getText: (node) => `${node.name.value}-text`
		},
		report(descriptor){
			const edits = descriptor.fix === null
				? null
				: descriptor.fix({ replaceText: (node, text) => ({ key: node.name.value, text }) })

			reports.push({ messageId: descriptor.messageId, data: descriptor.data, edits })
		}
	}

	rule.create(context).Document(fakeDocument(documentKey, keys))

	return reports
}

const numbered = (keys) => keys.map((key, index) => ({ key, line: index + 1 }))

describe("json-key-order", () => {
	it("accepts keys already in length-then-alphabetical order", () => {
		assert.deepEqual(run({ path: ["pages"], mode: "length-then-alpha" }, numbered(["id", "name", "type", "status"])), [])
	})

	it("accepts keys already in alphabetical order", () => {
		assert.deepEqual(run({ path: ["components"], mode: "alpha" }, numbered(["calendar", "footer", "select"])), [])
	})

	it("accepts keys already in descending-length order", () => {
		assert.deepEqual(run({ path: ["pages"], mode: "length-desc-then-alpha" }, numbered(["status", "name", "id"])), [])
	})

	it("reports and fixes a length-order violation", () => {
		const [report] = run({ path: ["pages"], mode: "length-then-alpha" }, [{ key: "status", line: 1 }, { key: "id", line: 2 }, { key: "type", line: 3 }])

		assert.equal(report.messageId, "jsonKeyOrder")
		assert.equal(report.data.thisKey, "id")
		assert.equal(report.data.previousKey, "status")
		assert.deepEqual(report.edits, [
			{ key: "id", text: "status-text" },
			{ key: "status", text: "id-text" }
		])
	})

	it("reports an alphabetical-order violation", () => {
		const [report] = run({ path: ["components"], mode: "alpha" }, [{ key: "formModal", line: 1 }, { key: "footer", line: 2 }])

		assert.equal(report.data.thisKey, "footer")
		assert.equal(report.data.previousKey, "formModal")
	})

	it("declines the fix, but still reports, across a blank-line gap", () => {
		const [report] = run({ path: ["pages"], mode: "length-then-alpha" }, [{ key: "status", line: 1 }, { key: "id", line: 5 }])

		assert.equal(report.edits, null)
	})

	it("never compares the pinned prefix with the body, but still checks the body itself", () => {
		const keys = numbered(["error", "notFound", "forbidden", "app", "home", "login", "alerts", "topics"])

		assert.deepEqual(run({ path: ["pages"], mode: "length-then-alpha", pinnedLeading: ["error", "notFound", "forbidden", "app", "home", "login"] }, keys), [])
	})

	it("declines to check anything when the pinned prefix no longer matches", () => {
		const keys = numbered(["app", "error", "alerts"])

		assert.deepEqual(run({ path: ["pages"], mode: "length-then-alpha", pinnedLeading: ["error", "notFound", "forbidden", "app", "home", "login"] }, keys), [])
	})

	it("does nothing when the target path is not found", () => {
		assert.deepEqual(run({ path: ["routes"], mode: "alpha" }, numbered(["status", "id"]), "pages"), [])
	})
})
