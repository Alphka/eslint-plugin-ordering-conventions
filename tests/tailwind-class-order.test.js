import { createRuleTester } from "./rule-tester.js"
import rule from "../lib/rules/tailwind-class-order.js"

createRuleTester().run("tailwind-class-order", rule, {
	valid: [
		/* the canonical card, and the three documented traps read the right way round */
		'const a = <div className="size-full bg-white flex flex-col p-4 rounded-md shadow-xs gap-4" />',
		'const a = <div className="flex items-center gap-4" />',
		'const a = <div className="min-h-dvh w-full flex flex-col" />',
		'const a = <div className="text-gray-700 text-sm font-medium" />',

		/* sub-orders */
		'const a = <div className="max-w-lg w-2/5" />',
		'const a = <div className="px-8 pt-24 pb-8" />',
		'const a = <div className="top-1.75 right-16.5 bottom-1" />',
		'const a = <div className="border border-gray-200" />',
		'const a = <div className="outline-solid outline-1 outline-blue-500" />',
		'const a = <div className="bg-gray-100 bg-clip-content" />',

		/* the unprefixed block leads, breakpoints ascend */
		'const a = <div className="text-gray-700 hover:bg-gray-100" />',
		'const a = <div className="text-sm sm:w-3/4 lg:w-auto" />',
		'const a = <div className="px-4 gap-4 lg:px-8 lg:gap-1" />',

		/* non-breakpoint variants have no order among themselves */
		'const a = <div className="p-4 hover:bg-blue-50 focus:bg-blue-100" />',
		'const a = <div className="p-4 focus:bg-blue-100 hover:bg-blue-50" />',

		/* each literal in a merger is its own list, and argument order is never touched */
		'const a = twJoin("flex items-center gap-2", isActive && "bg-blue-50 text-white")',
		'const a = twMerge("rounded-lg shadow-sm", other)',
		'const cardClasses = "flex flex-col gap-4"',
		'const a = <Box classNames={{ root: "flex gap-2" }} />',

		/* arbitrary values holding a colon or brackets must still parse */
		'const a = <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-2 lg:px-8" />',
		'const a = <div className="flex supports-[display:grid]:grid" />',

		/* `!important` in either position ranks as the bare utility */
		'const a = <div className="flex p-4!" />',
		'const a = <div className="flex !p-4" />',

		/* not a class string: too few tokens, too few known utilities, or no class host */
		'const a = <div className="flex" />',
		'const a = t("some.translation.key with words")',
		'const a = <div title="flex items-center gap-4" />',
		'const label = "flex items-center gap-4"',

		/* a template literal with an expression is out of scope entirely */
		// eslint-disable-next-line no-template-curly-in-string -- fixture text, not a forgotten template literal
		"const a = <div className={`flex ${extra} items-center`} />",

		/* an unclassified utility keeps its written position and drags nothing with it */
		'const a = <div className="group flex items-center p-4" />',

		/* the hosts are configurable */
		{
			code: 'const a = <div data-classes="gap-4 flex items-center" />',
			options: [{ hosts: ["className"] }]
		}
	],

	invalid: [
		{
			/* gap sorts near the end, long after padding */
			code: 'const a = <div className="flex gap-4 items-center" />',
			output: 'const a = <div className="flex items-center gap-4" />',
			errors: [{ messageId: "classOrder", data: { token: "items-center", category: "align-items", blockedBy: "gap-4", reason: "category order", expected: "flex items-center gap-4" } }]
		},
		{
			/* size before background before display */
			code: 'const a = <div className="flex bg-white size-full" />',
			output: 'const a = <div className="size-full bg-white flex" />',
			errors: 1
		},
		{
			/* color before font-size before font-weight */
			code: 'const a = <div className="text-gray-700 font-medium text-sm" />',
			output: 'const a = <div className="text-gray-700 text-sm font-medium" />',
			errors: 1
		},
		{
			/* both maximums before the actual values */
			code: 'const a = <div className="w-2/5 max-w-lg" />',
			output: 'const a = <div className="max-w-lg w-2/5" />',
			errors: [{ messageId: "classOrder", data: { token: "max-w-lg", category: "size", blockedBy: "w-2/5", reason: "order within the size category", expected: "max-w-lg w-2/5" } }]
		},
		{
			/* horizontal before vertical */
			code: 'const a = <div className="py-2 px-4 flex" />',
			output: 'const a = <div className="flex px-4 py-2" />',
			errors: 1
		},
		{
			/* the unprefixed block leads */
			code: 'const a = <div className="hover:bg-gray-100 text-gray-700" />',
			output: 'const a = <div className="text-gray-700 hover:bg-gray-100" />',
			errors: [{ messageId: "classOrder", data: { token: "text-gray-700", category: "color", blockedBy: "hover:bg-gray-100", reason: "unprefixed utilities come before every variant block", expected: "text-gray-700 hover:bg-gray-100" } }]
		},
		{
			/* breakpoint blocks ascend, and non-breakpoint blocks stay put */
			code: 'const a = <div className="p-4 lg:p-8 sm:p-6" />',
			output: 'const a = <div className="p-4 sm:p-6 lg:p-8" />',
			errors: [{ messageId: "classOrder", data: { token: "sm:p-6", category: "padding", blockedBy: "lg:p-8", reason: "breakpoint variant blocks ascend", expected: "p-4 sm:p-6 lg:p-8" } }]
		},
		{
			/* separators are preserved byte for byte, so a multi-line string stays multi-line */
			code: 'const a = <div className="flex\n\tgap-4\n\titems-center" />',
			output: 'const a = <div className="flex\n\titems-center\n\tgap-4" />',
			errors: 1
		},
		{
			/* a merger literal is sorted in place; the argument order is left alone */
			code: 'const a = twJoin("flex gap-2 items-center", other)',
			output: 'const a = twJoin("flex items-center gap-2", other)',
			errors: 1
		},
		{
			/* twMerge resolves by last occurrence, so a shorthand must not cross its longhand */
			code: 'const a = twMerge("pr-4 p-3", other)',
			output: null,
			errors: [{ messageId: "classOrderUnsafeMerge" }]
		},
		{
			/* the same list outside a conflict-aware merger has nothing to preserve, so it is fixed */
			code: 'const a = twJoin("pr-4 p-3", other)',
			output: 'const a = twJoin("p-3 pr-4", other)',
			errors: [{ messageId: "classOrder" }]
		},
		{
			/* an escape would be normalized by writing cooked text into a raw span */
			code: String.raw`const a = <div className="gap-4 flex items-center\n" />`,
			output: null,
			errors: 1
		},
		{
			/* an unclassified utility is pinned, so the classified ones sort around it */
			code: 'const a = <div className="gap-4 group flex items-center" />',
			output: 'const a = <div className="flex group items-center gap-4" />',
			errors: 1
		},
		{
			/* a `classNames` object value is its own list */
			code: 'const a = <Box classNames={{ root: "gap-2 flex" }} />',
			output: 'const a = <Box classNames={{ root: "flex gap-2" }} />',
			errors: 1
		},
		{
			/* a variable whose name ends in `classes` counts as a host */
			code: 'const cardClasses = "gap-4 flex flex-col"',
			output: 'const cardClasses = "flex flex-col gap-4"',
			errors: 1
		},
		{
			/* an expressionless template literal is in scope */
			code: "const a = <div className={`flex gap-4 items-center`} />",
			output: "const a = <div className={`flex items-center gap-4`} />",
			errors: 1
		}
	]
})
