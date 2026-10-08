import { createRuleTester } from "./rule-tester.js"
import rule from "../lib/rules/interface-member-order.js"

const PAYLOAD = [{ match: "^ICustomer|^IThing|^IPaginated", direction: "asc", tieBreak: "none", adjacentSuffixes: ["Name", "Value"], minMembers: 3, heritage: "report-only" }]

createRuleTester().run("interface-member-order", rule, {
	valid: [
		/* the default: descending by name length, with an alphabetical tie-break */
		[
			"interface IFormModalProps extends Modal.Props {",
			"\tformModalRef?: RefObject<IFormModalRef | null>",
			"\tdescription?: ReactNode",
			"\tbackButton?: ReactNode",
			"\tclassNames?: ClassNames<TFormModalFactory>",
			"\tstyles?: Styles<TFormModalFactory>",
			"\ttitle: ReactNode",
			"\tform?: UseFormReturnType<any>",
			"}"
		].join("\n"),

		/* a type-literal alias follows the same rule */
		"type TCardProps = {\n\tdescription: string\n\ttitle: string\n\tid: string\n}",

		/* a single member is nothing to order */
		"interface ISmallProps {\n\tid: string\n}",

		/* the annotation is never measured, only the property name */
		"interface IAProps {\n\tlongName: X\n\tmid: SomeExtremelyLongTypeAnnotation\n\tid: Y\n}",

		/* a declaration no target matches is out of scope */
		{
			code: "interface IUnrelated {\n\tid: string\n\tdescription: string\n\ttitle: string\n}",
			options: [[{ match: "Props$" }]]
		},

		/* ascending, with each X/XName/XValue unit anchored on its base key */
		{
			code: [
				"export interface ICustomer {",
				"\tid: UUID",
				"\tname: string",
				"\ttype: string",
				"\ttypeName: string",
				"\ttypeValue: number",
				"\tstatus: string",
				"\tstatusName: string",
				"\tstatusValue: number",
				"\ttenantId: UUID",
				"\tisAnonymous: boolean",
				"\thasAnySubsidiary: boolean",
				"\teconomicClassification: string",
				"\teconomicClassificationName: string",
				"\teconomicClassificationValue: number",
				"}"
			].join("\n"),
			options: [PAYLOAD]
		},

		/* ascending by key length, the opposite of the default */
		{
			code: "interface IPaginatedData<TData> {\n\titems: TData[]\n\tpageSize: number\n\tpageNumber: number\n\ttotalPages: number\n}",
			options: [PAYLOAD]
		},

		/* `tieBreak: "none"` leaves equal-length keys in the order they were written */
		{
			code: "interface IThing {\n\tid: string\n\tzeta: string\n\tbeta: string\n\tlongerKey: string\n}",
			options: [PAYLOAD]
		},

		/* a declaration that both extends and narrows a member is skipped outright */
		{
			code: "interface IThingResponse extends IAPIResponse {\n\tsuccess: false\n\tstatus: number\n\tid: string\n}",
			options: [[{ match: "", direction: "asc", heritage: "report-only" }]]
		}
	],

	invalid: [
		{
			code: "interface IAProps {\n\tid: string\n\ttitle: string\n\tdescription: string\n}",
			output: "interface IAProps {\n\tdescription: string\n\ttitle: string\n\tid: string\n}",
			errors: [{ messageId: "memberOrder", data: { name: "IAProps", key: "description", length: "11", previousKey: "id", previousLength: "2", direction: "descending" } }]
		},
		{
			/* the alphabetical tie-break on equal-length names */
			code: "interface ICProps {\n\tclassNames?: X\n\tbackButton?: Y\n\tid: Z\n}",
			output: "interface ICProps {\n\tbackButton?: Y\n\tclassNames?: X\n\tid: Z\n}",
			errors: 1
		},
		{
			/* an index signature is pinned; the named members sort around it */
			code: "interface IDProps {\n\tid: string\n\t[key: string]: unknown\n\ttitle: string\n\tdescription: string\n}",
			output: "interface IDProps {\n\tdescription: string\n\t[key: string]: unknown\n\ttitle: string\n\tid: string\n}",
			errors: 1
		},
		{
			/* a comment in the region disables the fix but not the report */
			code: "interface IEProps {\n\tid: string\n\t// keep\n\ttitle: string\n\tdescription: string\n}",
			output: null,
			errors: 1
		},
		{
			code: "interface IThing {\n\thasPreviousPage: boolean\n\tpageSize: number\n\titems: string[]\n}",
			output: "interface IThing {\n\titems: string[]\n\tpageSize: number\n\thasPreviousPage: boolean\n}",
			options: [PAYLOAD],
			errors: [{ messageId: "memberOrder", data: { name: "IThing", key: "items", length: "5", previousKey: "hasPreviousPage", previousLength: "15", direction: "ascending" } }]
		},
		{
			/* a whole unit moves together, positioned by its base key */
			code: [
				"interface IThing {",
				"\teconomicClassification: string",
				"\teconomicClassificationName: string",
				"\teconomicClassificationValue: number",
				"\tid: UUID",
				"\tname: string",
				"}"
			].join("\n"),
			output: [
				"interface IThing {",
				"\tid: UUID",
				"\tname: string",
				"\teconomicClassification: string",
				"\teconomicClassificationName: string",
				"\teconomicClassificationValue: number",
				"}"
			].join("\n"),
			options: [PAYLOAD],
			errors: 1
		},
		{
			/* `heritage: "report-only"` reports but never rewrites a declaration that extends */
			code: "interface IThing extends IBase {\n\thasPreviousPage: boolean\n\tpageSize: number\n\titems: string[]\n}",
			output: null,
			options: [PAYLOAD],
			errors: 1
		}
	]
})
