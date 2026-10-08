import { describe, it } from "node:test"
import { RuleTester } from "eslint"
import parser from "@typescript-eslint/parser"

RuleTester.describe = describe
RuleTester.it = it

/**
 * A RuleTester wired to the TypeScript parser with JSX enabled. No type information: every rule
 * here is purely syntactic, so the suite stays fast and needs no tsconfig.
 *
 * @returns {RuleTester}
 */
export function createRuleTester(){
	return new RuleTester({
		languageOptions: {
			ecmaVersion: 2023,
			sourceType: "module",
			parser,
			parserOptions: {
				ecmaFeatures: { jsx: true }
			}
		}
	})
}
