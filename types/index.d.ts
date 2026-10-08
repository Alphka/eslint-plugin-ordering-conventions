import type { ESLint, Linter } from "eslint"

declare const plugin: ESLint.Plugin & {
	meta: {
		name: string
		version: string
	}
	configs: {
		css: Linter.Config
		tailwind: Linter.Config
		recommended: Linter.Config
	}
}

export default plugin
