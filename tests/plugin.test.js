import { existsSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"
import assert from "node:assert/strict"
import plugin from "../lib/index.js"

const root = fileURLToPath(new URL("..", import.meta.url))
const manifest = JSON.parse(readFileSync(`${root}package.json`, "utf8"))
const readme = readFileSync(`${root}README.md`, "utf8")
const names = Object.keys(plugin.rules)

describe("plugin", () => {
	it("reports the package version", () => {
		assert.equal(plugin.meta.version, manifest.version)
		assert.equal(plugin.meta.name, manifest.name)
	})

	it("only enables rules it defines", () => {
		for(const config of Object.values(plugin.configs)){
			for(const id of Object.keys(config.rules)){
				assert.ok(names.includes(id.replace("ordering-conventions/", "")), `${id} is not a rule of this plugin`)
			}
		}
	})

	for(const name of names){
		describe(name, () => {
			const rule = plugin.rules[name]

			it("is a fixable layout rule with a schema and messages", () => {
				assert.equal(typeof rule.create, "function")
				assert.equal(rule.meta.type, "layout")
				assert.equal(rule.meta.fixable, "code")
				assert.ok(Array.isArray(rule.meta.schema))
				assert.ok(Object.keys(rule.meta.messages).length > 0)
			})

			it("documents itself", () => {
				assert.ok(rule.meta.docs.description)
				assert.ok(rule.meta.docs.url.endsWith(`/docs/rules/${name}.md`))
				assert.ok(existsSync(`${root}docs/rules/${name}.md`), `docs/rules/${name}.md is missing`)
				assert.ok(readme.includes(`ordering-conventions/${name}`), `${name} is missing from the README`)
			})
		})
	}
})
