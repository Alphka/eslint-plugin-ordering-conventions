import { createRuleTester } from "./rule-tester.js"
import rule from "../lib/rules/jsx-attribute-order.js"

createRuleTester().run("jsx-attribute-order", rule, {
	valid: [
		'const a = <ActionIcon className={x} size={44} color="white" variant="subtle" onClick={y} suppressHydrationWarning />',

		/* `ref` second-to-last, `key` last */
		'const a = <div id="a" title="b" ref={r} key={k} />',
		'const a = <div id="a" title="b" ref={r} />',

		/* bare booleans descending by name length */
		'const a = <div id="a" suppressHydrationWarning disabled />',

		/* no tie-break, so equal-length flags keep their written order */
		'const a = <div id="a" withArrow multiline />',

		/* the precedence chain: `styles` before `className` */
		'const a = <div styles={s} className={c} id="a" />',

		/*
		 * A spread's position decides override precedence, so nothing may cross it: `opened`
		 * before the spread stays overridable and `centered` after it always wins, which is the
		 * whole point of writing them that way.
		 */
		'const a = <Modal size="35rem" onClose={c} opened {...props} withCloseButton={false} centered />',
		'const a = <Pagination size="md" onChange={c} boundaries={1} withControls {...props} total={t} value={v} />',
		'const a = <Tooltip position="top" offset={4} withArrow multiline {...props} classNames={c} />',

		/* fewer than `minAttributes` is nothing to order */
		'const a = <div key={k} id="a" />',

		/* the pinned tail is configurable */
		{
			code: 'const a = <div key={k} id="a" title="b" />',
			options: [{ last: [] }]
		},

		/* so is the bare-boolean order */
		{
			code: 'const a = <div id="a" disabled suppressHydrationWarning />',
			options: [{ bareBooleans: "asc" }]
		},
		{
			code: 'const a = <div id="a" disabled suppressHydrationWarning />',
			options: [{ bareBooleans: "off" }]
		}
	],

	invalid: [
		{
			/* a spread inside the span blocks the rotation: moving across it changes precedence */
			code: 'const a = <div key={k} id="a" {...props} title="b" />',
			output: null,
			errors: [{ messageId: "attributeMustBeLast", data: { attribute: "key" } }]
		},
		{
			code: 'const a = <div key={k} id="a" title="b" />',
			output: 'const a = <div id="a" title="b" key={k} />',
			errors: [{ messageId: "attributeMustBeLast", data: { attribute: "key" } }]
		},
		{
			code: 'const a = <div ref={r} id="a" title="b" key={k} />',
			output: 'const a = <div id="a" title="b" ref={r} key={k} />',
			errors: [{ messageId: "attributeMustBeNearLast" }]
		},
		{
			code: 'const a = <div className={c} styles={s} id="a" />',
			output: 'const a = <div styles={s} className={c} id="a" />',
			errors: [{ messageId: "attributePrecedence", data: { attribute: "styles", other: "className" } }]
		},
		{
			code: 'const a = <div id="a" disabled suppressHydrationWarning />',
			output: 'const a = <div id="a" suppressHydrationWarning disabled />',
			errors: [{ messageId: "bareBooleanOrder", data: { attribute: "suppressHydrationWarning", length: "24", previousAttribute: "disabled", previousLength: "8", direction: "descending" } }]
		},
		{
			/* a comment between the booleans blocks the fix but not the report */
			code: 'const a = <div id="a" disabled /* keep */ suppressHydrationWarning />',
			output: null,
			errors: 1
		}
	]
})
