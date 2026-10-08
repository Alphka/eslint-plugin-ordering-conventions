import { createRuleTester } from "./rule-tester.js"
import rule from "../lib/rules/parameter-destructuring-order.js"

const PROPS_ONLY = { match: "Props\\b" }

createRuleTester().run("parameter-destructuring-order", rule, {
	valid: [
		/* descending by binding-name length */
		[
			"export default function DashboardCard({",
			"\ticonBackgroundColor,",
			"\tdescription,",
			"\tclassNames,",
			"\ticonColor,",
			"\tchildren,",
			"\tbutton,",
			"\ttitle,",
			"\tIcon",
			"}: IDashboardCardProps){}"
		].join("\n"),

		/* a rest element is last by grammar, and a quoted key measures with its quotes */
		[
			"export default function QuickAccessCard({",
			'\t"aria-label": ariaLabel,',
			"\tdescription,",
			"\tclassName,",
			"\tbadges,",
			"\ttitle,",
			"\tIcon,",
			"\t...props",
			"}: IQuickAccessCardProps){}"
		].join("\n"),

		/* an unannotated pattern is out of scope by default: its order comes from the data */
		"const a = users.map(({ id, email, fullName, isActive, isAnonymous }) => null)",

		/* `match` narrows it further */
		{
			code: "function f({ id, description, title }: ISomethingElse){}",
			options: [PROPS_ONLY]
		},

		/* the default tie-break keeps equal-length bindings as written */
		"function f({ description, zeta, beta }: IAProps){}",

		/* fewer bindings than `minProperties` */
		"function f({ id, description }: IAProps){}"
	],

	invalid: [
		{
			code: "function f({ id, title, description }: IAProps){}",
			output: "function f({ description, title, id }: IAProps){}",
			errors: [{ messageId: "destructuringOrder", data: { binding: "description", length: "11", previousBinding: "id", previousLength: "2", direction: "descending" } }]
		},
		{
			/* a rest element is pinned and never written to */
			code: "function f({ id, title, description, ...rest }: IAProps){}",
			output: "function f({ description, title, id, ...rest }: IAProps){}",
			errors: 1
		},
		{
			/* an arrow function is covered too */
			code: "const f = ({ id, title, description }: IAProps) => null",
			output: "const f = ({ description, title, id }: IAProps) => null",
			errors: 1
		},
		{
			/* ascending, with an alphabetical tie-break */
			code: "function f({ description, title, id }: IAProps){}",
			output: "function f({ id, title, description }: IAProps){}",
			options: [{ direction: "asc", tieBreak: "alphabetical" }],
			errors: 1
		},
		{
			/* unannotated patterns can be opted in */
			code: "const f = ({ id, title, description }) => null",
			output: "const f = ({ description, title, id }) => null",
			options: [{ requireTypeAnnotation: false }],
			errors: 1
		}
	]
})
