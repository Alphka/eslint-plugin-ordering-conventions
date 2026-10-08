/**
 * @fileoverview A semantic ordering for Tailwind utilities, as pure data and comparators.
 *
 * Utilities are grouped into categories that follow the order a component is read in — what it
 * occupies, then how it paints, then how it lays out its children, then type, then spacing, then
 * borders and effects — and inside a category the order is semantic rather than alphabetical.
 *
 * The module is deliberately AST-free so the JSX rule, the CSS `@apply` rule and any external
 * tooling can all reach the same verdict from the same table.
 */

/**
 * @typedef {object} IClassEntry
 * @property {string} token                the utility as written, variants and `!` included
 * @property {string} variant              the full variant prefix, `""` when unprefixed
 * @property {string} base                 the bare utility the variants modify
 * @property {string | null} category      `null` when no category recognizes it
 * @property {number | null} categoryRank  position in the category order, `null` when unclassified
 * @property {number | null} subRank       position within the category, `null` when unclassified
 * @property {number} index                the position the token was written at
 */

/**
 * @typedef {object} IClassSpan
 * @property {string} token
 * @property {number} start  offset of the token within the raw class string
 * @property {number} end
 */

/* ------------------------------------------------------------- category table */

/** @type {readonly [string, RegExp[]][]} */
export const CATEGORIES = [
	["flex-child", [/^(flex-1|flex-auto|flex-initial|flex-none|grow|shrink|basis-|order-|col-span-|col-start-|col-end-|row-span-|row-start-|row-end-|self-|justify-self-)/]],
	["position", [/^(static|fixed|absolute|relative|sticky)$/]],
	["inset", [/^(inset|top|right|bottom|left|start|end)(-|$)/]],
	["size", [/^(size|aspect|w|h|min-w|min-h|max-w|max-h)-/]],
	["background", [/^bg-/]],
	["gradient-stop", [/^(from|via|to)-/]],
	["blend-mode", [/^mix-blend-/]],
	["display", [/^(block|inline-block|inline-flex|inline-grid|inline-table|inline|flex|grid|table|contents|hidden|list-item|flow-root)$/]],
	["flex-direction", [/^(flex-row|flex-col|flex-wrap|flex-nowrap|grid-cols-|grid-rows-|grid-flow-|auto-cols-|auto-rows-)/]],
	["place", [/^(content-|place-content-|place-items-|place-self-)/]],
	["align-items", [/^items-/]],
	["justify-content", [/^justify-(?!self)/]],
	["list", [/^list-/]],
	["svg-paint", [/^(fill-|stroke-)/]],
	["color", [/^(text-(?!xs$|sm$|md$|lg$|xl$|\dxl$|xxs$|base$|center$|left$|right$|start$|end$|justify$|wrap|nowrap$|balance$|pretty$|ellipsis$|clip$|\[)|decoration-(?!\d)|caret-|accent-|placeholder-)/]],
	["font-size", [/^text-(xxs|xs|sm|md|base|lg|xl|\dxl|\[)/]],
	["line-height", [/^leading-/]],
	["font-family", [/^font-(sans|serif|mono)$/]],
	["font-weight", [/^font-(thin|extra(?:light|bold)|light|normal|medium|semibold|bold|black|\[)/]],
	["font-style", [/^(italic|not-italic|uppercase|lowercase|capitalize|normal-case|tabular-nums|slashed-zero|ordinal|tracking-)/]],
	["text-align", [/^text-(center|left|right|start|end|justify)$/, /^align-/]],
	["text-decoration", [/^(underline|overline|line-through|no-underline|decoration-\d)/]],
	["text-overflow", [/^(truncate$|text-ellipsis|text-clip|line-clamp-|whitespace-|text-wrap|text-nowrap|text-balance|text-pretty|wrap-|break-|hyphens-)/]],
	["object", [/^object-/]],
	["padding", [/^p[xytrbleos]?-/]],
	["margin", [/^-?m[xytrbleos]?-/]],
	["space", [/^-?space-[xy]-/]],
	["border", [/^border($|-)/]],
	["border-radius", [/^rounded/]],
	["outline-ring", [/^(outline|ring|divide)($|-)/]],
	["shadow", [/^(shadow|inset-shadow|drop-shadow)($|-)/]],
	["filter", [/^(blur|grayscale|brightness|contrast|saturate|sepia|invert|hue-rotate|backdrop-)/]],
	["opacity", [/^opacity-/]],
	["overflow", [/^(overflow|overscroll)-/]],
	["gap", [/^gap($|-)/]],
	["z-index", [/^z-/]],
	["transition", [/^(transition|duration-|ease-|delay-|animate-)/]],
	["transform", [/^-?(scale|rotate|translate|skew|origin|transform|perspective)/]],
	["cursor", [/^cursor-/]],
	["pointer-events", [/^pointer-events-/]],
	["user-select", [/^select-/]],
	["interactivity", [/^(resize|touch-|will-change-|scroll-|snap-|appearance-|field-sizing-)/]],
	["visibility", [/^(visible|invisible|collapse|sr-only|not-sr-only|isolate|isolation-)$/]],
	["table-layout", [/^(table-|border-collapse|border-separate|caption-)/]],
	["misc", [/^(antialiased|subpixel-antialiased|forced-color-adjust-|contain-|@container)/]]
]

export const CATEGORY_NAMES = CATEGORIES.map(([name]) => name)

export const DEFAULT_CATEGORY_RANK = new Map(CATEGORY_NAMES.map((name, index) => [name, index]))

/**
 * Applies a user-supplied category order. Listed categories take the given positions; anything
 * left out keeps its relative place in the built-in table, after everything listed — so a partial
 * override only moves what it names.
 *
 * @param {readonly string[] | undefined} order
 * @returns {Map<string, number>}
 */
export function categoryRankFor(order){
	if(order === undefined || order.length === 0) return DEFAULT_CATEGORY_RANK

	const rank = new Map(order.map((name, index) => [name, index]))

	for(const [name, index] of DEFAULT_CATEGORY_RANK){
		if(!rank.has(name)) rank.set(name, order.length + index)
	}

	return rank
}

/**
 * Within one category the order is semantic, never by length. Each entry is a list of patterns
 * matched in order; the first hit gives the rank. An unlisted token keeps its written position.
 *
 * @type {Record<string, RegExp[] | undefined>}
 */
export const SUB_ORDER = {
	size: [/^aspect-/, /^min-w-/, /^min-h-/, /^max-w-/, /^max-h-/, /^size-/, /^w-/, /^h-/],
	inset: [/^inset-x-/, /^inset-y-/, /^inset(-|$)/, /^top-/, /^(right|end)-/, /^bottom-/, /^(left|start)-/],
	padding: [/^p-/, /^px-/, /^p[ls]-/, /^p[re]-/, /^py-/, /^pt-/, /^pb-/],
	margin: [/^m-/, /^mx-/, /^m[ls]-/, /^m[re]-/, /^my-/, /^mt-/, /^mb-/],
	space: [/^space-x-/, /^space-y-/],
	gap: [/^gap-/, /^gap-x-/, /^gap-y-/],
	"gradient-stop": [/^from-/, /^via-/, /^to-/],
	background: [
		/^bg-(?!auto$|cover$|contain$|top|bottom|left|right|center|repeat|no-repeat|clip-|origin-|fixed$|local$|scroll$|blend-)/,
		/^bg-(auto|cover|contain|\[length)/,
		/^bg-(top|bottom|left|right|center)/,
		/^bg-(repeat|no-repeat)/,
		/^bg-(clip|origin)-/,
		/^bg-(fixed|local|scroll)$/,
		/^bg-blend-/
	],
	object: [/^object-(contain|cover|fill|none|scale-down)$/, /^object-/],
	"text-overflow": [/^(truncate|text-ellipsis|text-clip)$/, /^line-clamp-/, /^whitespace-/, /^text-(wrap|nowrap|balance|pretty)$/, /^(wrap|break)-/, /^hyphens-/],
	transition: [/^transition/, /^duration-/, /^ease-/, /^delay-/, /^animate-/],
	transform: [/^transform/, /^-?scale/, /^-?rotate/, /^-?translate/, /^-?skew/, /^origin-/],
	list: [/^list-(disc|decimal|none|\[)/, /^list-(inside|outside)$/, /^list-image-/],
	"flex-child": [/^(flex-1|flex-auto|flex-initial|flex-none)$/, /^grow/, /^shrink/, /^basis-/, /^order-/, /^col-/, /^row-/, /^self-/, /^justify-self-/]
}

/** `border` / `outline` / `ring` / `divide`: the structural class first, then color, then mode. */
export const EDGE_ROLES = [
	/^(border|outline|ring|divide)$/,
	/^(border|divide)-[xytrbles](?:-|$)/,
	/^(border|outline|divide)-(solid|dashed|dotted|double|hidden|none)$/,
	/^(border|outline|ring|divide)-(\d|\[)/,
	/^(border|outline|ring|divide)-/,
	/^(ring|outline)-(inset|offset)/,
	/^-?(ring|outline)-offset-/
]

export const BREAKPOINTS = ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"]

/** The attribute and object-property names a class string is normally written under. */
export const DEFAULT_CLASS_HOSTS = ["class", "className", "classNames", "activeClassName", "wrapperClassName"]

/** Helpers that take class strings as arguments. */
export const DEFAULT_MERGERS = ["twMerge", "twJoin", "clsx", "cn", "classnames"]

/** Mergers that resolve conflicting utilities by last occurrence, so a swap can change the result. */
export const DEFAULT_CONFLICT_AWARE_MERGERS = ["twMerge"]

/** A variable whose name reads as "classes" is treated as a class string. */
export const DEFAULT_VARIABLE_PATTERN = "[Cc]lass(?:[Nn]ame)?e?s?$"

/**
 * @param {string} base
 * @returns {number}
 */
export function edgeRank(base){
	for(const [index, pattern] of EDGE_ROLES.entries()){
		if(pattern.test(base)) return index
	}

	return EDGE_ROLES.length
}

/* ------------------------------------------------------------------- tokens */

/**
 * Splits `sm:hover:px-4!` into its variant prefixes and the bare utility they modify.
 * @param {string} token
 * @returns {{ variant: string, base: string }}
 */
export function parseToken(token){
	let base = token

	if(base.startsWith("!")) base = base.substring(1)
	if(base.endsWith("!")) base = base.slice(0, -1)

	/** @type {string[]} */
	const parts = []

	let depth = 0
	let current = ""

	for(const character of base){
		if(character === "[" || character === "(") depth++
		else if(character === "]" || character === ")") depth--

		if(character === ":" && depth === 0){
			parts.push(current)
			current = ""
		}else current += character
	}

	parts.push(current)

	return {
		variant: parts.slice(0, -1).join(":"),
		base: parts[parts.length - 1]
	}
}

/**
 * @param {string} base
 * @returns {string | null}
 */
export function categoryOf(base){
	const probe = base.startsWith("-") ? base.substring(1) : base

	for(const [name, patterns] of CATEGORIES){
		if(patterns.some((pattern) => pattern.test(probe))) return name
	}

	return null
}

/**
 * @param {string} category
 * @param {string} base
 * @returns {number}
 */
export function subRank(category, base){
	if(category === "border" || category === "outline-ring") return edgeRank(base)

	const patterns = SUB_ORDER[category]

	if(!patterns) return 0

	for(const [index, pattern] of patterns.entries()){
		if(pattern.test(base)) return index
	}

	return patterns.length
}

/**
 * @param {string} token
 * @param {number} [index]
 * @param {Map<string, number>} [rank]
 * @returns {IClassEntry}
 */
export function describe(token, index = 0, rank = DEFAULT_CATEGORY_RANK){
	const { variant, base } = parseToken(token)
	const category = categoryOf(base)

	return {
		token,
		variant,
		base,
		category,
		index,
		categoryRank: category === null ? null : (rank.get(category) ?? null),
		subRank: category === null ? null : subRank(category, base)
	}
}

/* Kept as `Map`s rather than object literals so the side keys stay one letter. */
export const SPACING_SIDES = new Map([
	["", ["t", "r", "b", "l"]],
	["x", ["r", "l"]],
	["y", ["t", "b"]],
	["t", ["t"]],
	["r", ["r"]],
	["b", ["b"]],
	["l", ["l"]],
	["s", ["l"]],
	["e", ["r"]]
])

export const INSET_SIDES = new Map([
	["inset", ["t", "r", "b", "l"]],
	["inset-x", ["r", "l"]],
	["inset-y", ["t", "b"]],
	["top", ["t"]],
	["right", ["r"]],
	["bottom", ["b"]],
	["left", ["l"]],
	["start", ["l"]],
	["end", ["r"]]
])

/**
 * The properties a token writes, used only to keep merger conflict resolution intact. Two tokens
 * overlap when one's shorthand covers the other's longhand (`p-2` over `pr-4`).
 *
 * @param {string | null} category
 * @param {string} base
 * @returns {string[]}
 */
export function conflictKeys(category, base){
	const probe = base.startsWith("-") ? base.substring(1) : base

	if(category === "padding" || category === "margin"){
		const match = /^([pm])([xytrbleos]?)-/.exec(probe)

		if(!match) return []

		const [, family, axis] = match

		return (SPACING_SIDES.get(axis ?? "") ?? []).map((side) => `${family}${side}`)
	}

	if(category === "gap"){
		if(probe.startsWith("gap-x-")) return ["gap-x"]
		if(probe.startsWith("gap-y-")) return ["gap-y"]

		return ["gap-x", "gap-y"]
	}

	if(category === "size"){
		if(probe.startsWith("size-")) return ["w", "h"]

		const match = /^((?:min-|max-)?[wh])-/.exec(probe)

		return match ? [match[1]] : []
	}

	if(category === "inset"){
		const match = /^(inset-x|inset-y|inset|top|right|bottom|left|start|end)(?:-|$)/.exec(probe)

		return match ? (INSET_SIDES.get(match[1]) ?? []) : []
	}

	return []
}

/* ---------------------------------------------------------------- class lists */

/**
 * Splits a raw class string into tokens with their offsets, so a report can point at the exact
 * utility that has to move rather than at the whole attribute.
 *
 * @param {string} raw
 * @returns {IClassSpan[]}
 */
export function tokenizeClassList(raw){
	/** @type {IClassSpan[]} */
	const spans = []
	const pattern = /\S+/g

	let match = pattern.exec(raw)

	while(match !== null){
		spans.push({ token: match[0], start: match.index, end: match.index + match[0].length })
		match = pattern.exec(raw)
	}

	return spans
}

/**
 * Whitespace splitting shreds an arbitrary value that contains a space, such as a `url()` holding
 * one. Valid Tailwind spells those with `_`, so an unbalanced token means the list cannot be
 * reasoned about and must be left alone entirely.
 *
 * @param {readonly string[]} tokens
 * @returns {boolean}
 */
export function isAnalyzableList(tokens){
	return tokens.every((token) => {
		let depth = 0

		for(const character of token){
			if(character === "[" || character === "(") depth++
			else if(character === "]" || character === ")") depth--

			if(depth < 0) return false
		}

		return depth === 0
	})
}

/**
 * A literal counts as a class list when it holds enough tokens and enough of them are recognized
 * utilities. Without that gate an ordinary sentence or a translation key would be rewritten.
 *
 * @param {string} raw
 * @param {{ minTokens?: number, minKnownRatio?: number }} [options]
 * @returns {string[] | null}
 */
export function asClassList(raw, options = {}){
	const minTokens = options.minTokens ?? 2
	const minKnownRatio = options.minKnownRatio ?? 0.7
	const tokens = raw.trim().split(/\s+/).filter(Boolean)

	if(tokens.length < minTokens) return null

	const known = tokens.filter((token) => categoryOf(parseToken(token).base) !== null).length

	if(known / tokens.length < minKnownRatio) return null

	return tokens
}

/* ------------------------------------------------------------- sorting a list */

/**
 * Ranks the variant blocks. Breakpoint blocks ascend; every other block keeps the position it was
 * written in, because `hover:`, `before:` and `group-data-[…]:` have no order among themselves.
 * Breakpoints are permuted only into slots that breakpoint blocks already occupy, so a
 * non-breakpoint block is never displaced.
 *
 * @param {readonly string[]} variants  distinct variant prefixes in written order
 * @returns {Map<string, number>}
 */
function rankBlocks(variants){
	/** @type {number[]} */
	const slots = []

	for(const [index, variant] of variants.entries()){
		if(BREAKPOINTS.includes(variant)) slots.push(index)
	}

	const ascending = slots
		.map((slot) => variants[slot])
		.sort((first, second) => BREAKPOINTS.indexOf(first) - BREAKPOINTS.indexOf(second))

	const placed = [...variants]

	for(const [position, slot] of slots.entries()){
		placed[slot] = ascending[position]
	}

	return new Map(placed.map((variant, index) => [variant, variant === "" ? -1 : index]))
}

/**
 * Blocks by variant, then category, then the semantic sub-rank. Equal ranks keep their written
 * order, so nothing ever sorts by length.
 *
 * A token no category recognizes is *pinned* to the index it was written at, and the classified
 * tokens are permuted among the remaining slots.
 *
 * @param {readonly string[]} tokens
 * @param {Map<string, number>} [rank]
 * @returns {IClassEntry[]}
 */
export function sortEntries(tokens, rank = DEFAULT_CATEGORY_RANK){
	const entries = tokens.map((token, index) => describe(token, index, rank))

	/** @type {string[]} */
	const variants = []

	for(const entry of entries){
		if(!variants.includes(entry.variant)) variants.push(entry.variant)
	}

	const blockRank = rankBlocks(variants)

	const slots = entries
		.filter((entry) => entry.category !== null)
		.map((entry) => entry.index)

	const movable = slots
		.map((slot) => entries[slot])
		.sort((first, second) => (blockRank.get(first.variant) ?? 0) - (blockRank.get(second.variant) ?? 0) ||
			(first.categoryRank ?? 0) - (second.categoryRank ?? 0) ||
			(first.subRank ?? 0) - (second.subRank ?? 0) ||
			first.index - second.index)

	const placed = [...entries]

	for(const [position, slot] of slots.entries()){
		placed[slot] = movable[position]
	}

	return placed
}

/**
 * @param {readonly string[]} tokens
 * @param {Map<string, number>} [rank]
 * @returns {string[]}
 */
export function sortTokens(tokens, rank){
	return sortEntries(tokens, rank).map((entry) => entry.token)
}

/**
 * True when reordering would flip two tokens whose properties overlap, changing what a
 * conflict-resolving merger keeps. Keyed by written index rather than by token text, so a list
 * that repeats a utility is still judged correctly.
 *
 * @param {readonly string[]} tokens
 * @param {readonly IClassEntry[]} sorted
 * @returns {boolean}
 */
export function isMergeSafe(tokens, sorted){
	const positionOf = new Map(sorted.map((entry, position) => [entry.index, position]))

	const keys = tokens.map((token) => {
		const { variant, base } = parseToken(token)

		return { variant, keys: new Set(conflictKeys(categoryOf(base), base)) }
	})

	for(let first = 0; first < tokens.length; first++){
		for(let second = first + 1; second < tokens.length; second++){
			if(keys[first].variant !== keys[second].variant) continue
			if([...keys[first].keys].every((key) => !keys[second].keys.has(key))) continue
			/* Written order is first < second, so the sorted order has to agree. */
			if((positionOf.get(first) ?? 0) > (positionOf.get(second) ?? 0)) return false
		}
	}

	return true
}

/**
 * @param {IClassEntry} entry
 * @param {IClassEntry} other
 * @returns {string}
 */
function reasonFor(entry, other){
	if(entry.variant !== other.variant){
		return entry.variant === "" || other.variant === ""
			? "unprefixed utilities come before every variant block"
			: "breakpoint variant blocks ascend"
	}

	if(entry.category !== other.category) return "category order"

	return `order within the ${entry.category ?? "unknown"} category`
}

/**
 * The first token that has to move and why. Used for the report location and message; `null` when
 * the list is already in order.
 *
 * @param {readonly IClassEntry[]} sorted
 * @returns {{ position: number, entry: IClassEntry, blockedBy: IClassEntry, reason: string } | null}
 */
export function firstMisplaced(sorted){
	for(const [position, entry] of sorted.entries()){
		if(entry.index === position) continue

		/* The token written at this position is the one `entry` has to overtake. */
		const blockedBy = sorted.find((candidate) => candidate.index === position) ?? entry

		return { position, entry, blockedBy, reason: reasonFor(entry, blockedBy) }
	}

	return null
}

/**
 * Rebuilds a class string with the tokens permuted but every separator byte left exactly where it
 * was, so a multi-line class string stays multi-line and indentation is never rewritten.
 *
 * @param {string} raw
 * @param {readonly string[]} sorted
 * @returns {string}
 */
export function reorderWithin(raw, sorted){
	const spans = tokenizeClassList(raw)

	if(spans.length !== sorted.length) return raw

	let result = raw.slice(0, spans[0].start)

	for(const [index, span] of spans.entries()){
		result += sorted[index]
		result += raw.slice(span.end, spans[index + 1]?.start ?? raw.length)
	}

	return result
}

/**
 * A rewrite is only ever allowed to be a pure permutation of what was written: never drop, never
 * duplicate, never invent a utility.
 *
 * @param {readonly string[]} tokens
 * @param {readonly string[]} sorted
 * @returns {boolean}
 */
export function isPermutation(tokens, sorted){
	const compare = (first, second) => first < second ? -1 : (first > second ? 1 : 0)

	return [...sorted].sort(compare).join(" ") === [...tokens].sort(compare).join(" ")
}
