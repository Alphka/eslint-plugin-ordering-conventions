/**
 * Applies a user-supplied category order. Listed categories take the given positions; anything
 * left out keeps its relative place in the built-in table, after everything listed — so a partial
 * override only moves what it names.
 *
 * @param {readonly string[] | undefined} order
 * @returns {Map<string, number>}
 */
export function categoryRankFor(order: readonly string[] | undefined): Map<string, number>;
/**
 * @param {string} base
 * @returns {number}
 */
export function edgeRank(base: string): number;
/**
 * Splits `sm:hover:px-4!` into its variant prefixes and the bare utility they modify.
 * @param {string} token
 * @returns {{ variant: string, base: string }}
 */
export function parseToken(token: string): {
    variant: string;
    base: string;
};
/**
 * @param {string} base
 * @returns {string | null}
 */
export function categoryOf(base: string): string | null;
/**
 * @param {string} category
 * @param {string} base
 * @returns {number}
 */
export function subRank(category: string, base: string): number;
/**
 * @param {string} token
 * @param {number} [index]
 * @param {Map<string, number>} [rank]
 * @returns {IClassEntry}
 */
export function describe(token: string, index?: number, rank?: Map<string, number>): IClassEntry;
/**
 * The properties a token writes, used only to keep merger conflict resolution intact. Two tokens
 * overlap when one's shorthand covers the other's longhand (`p-2` over `pr-4`).
 *
 * @param {string | null} category
 * @param {string} base
 * @returns {string[]}
 */
export function conflictKeys(category: string | null, base: string): string[];
/**
 * Splits a raw class string into tokens with their offsets, so a report can point at the exact
 * utility that has to move rather than at the whole attribute.
 *
 * @param {string} raw
 * @returns {IClassSpan[]}
 */
export function tokenizeClassList(raw: string): IClassSpan[];
/**
 * Whitespace splitting shreds an arbitrary value that contains a space, such as a `url()` holding
 * one. Valid Tailwind spells those with `_`, so an unbalanced token means the list cannot be
 * reasoned about and must be left alone entirely.
 *
 * @param {readonly string[]} tokens
 * @returns {boolean}
 */
export function isAnalyzableList(tokens: readonly string[]): boolean;
/**
 * A literal counts as a class list when it holds enough tokens and enough of them are recognized
 * utilities. Without that gate an ordinary sentence or a translation key would be rewritten.
 *
 * @param {string} raw
 * @param {{ minTokens?: number, minKnownRatio?: number }} [options]
 * @returns {string[] | null}
 */
export function asClassList(raw: string, options?: {
    minTokens?: number;
    minKnownRatio?: number;
}): string[] | null;
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
export function sortEntries(tokens: readonly string[], rank?: Map<string, number>): IClassEntry[];
/**
 * @param {readonly string[]} tokens
 * @param {Map<string, number>} [rank]
 * @returns {string[]}
 */
export function sortTokens(tokens: readonly string[], rank?: Map<string, number>): string[];
/**
 * True when reordering would flip two tokens whose properties overlap, changing what a
 * conflict-resolving merger keeps. Keyed by written index rather than by token text, so a list
 * that repeats a utility is still judged correctly.
 *
 * @param {readonly string[]} tokens
 * @param {readonly IClassEntry[]} sorted
 * @returns {boolean}
 */
export function isMergeSafe(tokens: readonly string[], sorted: readonly IClassEntry[]): boolean;
/**
 * The first token that has to move and why. Used for the report location and message; `null` when
 * the list is already in order.
 *
 * @param {readonly IClassEntry[]} sorted
 * @returns {{ position: number, entry: IClassEntry, blockedBy: IClassEntry, reason: string } | null}
 */
export function firstMisplaced(sorted: readonly IClassEntry[]): {
    position: number;
    entry: IClassEntry;
    blockedBy: IClassEntry;
    reason: string;
} | null;
/**
 * Rebuilds a class string with the tokens permuted but every separator byte left exactly where it
 * was, so a multi-line class string stays multi-line and indentation is never rewritten.
 *
 * @param {string} raw
 * @param {readonly string[]} sorted
 * @returns {string}
 */
export function reorderWithin(raw: string, sorted: readonly string[]): string;
/**
 * A rewrite is only ever allowed to be a pure permutation of what was written: never drop, never
 * duplicate, never invent a utility.
 *
 * @param {readonly string[]} tokens
 * @param {readonly string[]} sorted
 * @returns {boolean}
 */
export function isPermutation(tokens: readonly string[], sorted: readonly string[]): boolean;
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
/** @type {readonly [string, RegExp[]][]} */
export const CATEGORIES: readonly [string, RegExp[]][];
export const CATEGORY_NAMES: string[];
export const DEFAULT_CATEGORY_RANK: Map<string, number>;
/**
 * Within one category the order is semantic, never by length. Each entry is a list of patterns
 * matched in order; the first hit gives the rank. An unlisted token keeps its written position.
 *
 * @type {Record<string, RegExp[] | undefined>}
 */
export const SUB_ORDER: Record<string, RegExp[] | undefined>;
/** `border` / `outline` / `ring` / `divide`: the structural class first, then color, then mode. */
export const EDGE_ROLES: RegExp[];
export const BREAKPOINTS: string[];
/** The attribute and object-property names a class string is normally written under. */
export const DEFAULT_CLASS_HOSTS: string[];
/** Helpers that take class strings as arguments. */
export const DEFAULT_MERGERS: string[];
/** Mergers that resolve conflicting utilities by last occurrence, so a swap can change the result. */
export const DEFAULT_CONFLICT_AWARE_MERGERS: string[];
/** A variable whose name reads as "classes" is treated as a class string. */
export const DEFAULT_VARIABLE_PATTERN: "[Cc]lass(?:[Nn]ame)?e?s?$";
export const SPACING_SIDES: Map<string, string[]>;
export const INSET_SIDES: Map<string, string[]>;
export type IClassEntry = {
    /**
     * the utility as written, variants and `!` included
     */
    token: string;
    /**
     * the full variant prefix, `""` when unprefixed
     */
    variant: string;
    /**
     * the bare utility the variants modify
     */
    base: string;
    /**
     * `null` when no category recognizes it
     */
    category: string | null;
    /**
     * position in the category order, `null` when unclassified
     */
    categoryRank: number | null;
    /**
     * position within the category, `null` when unclassified
     */
    subRank: number | null;
    /**
     * the position the token was written at
     */
    index: number;
};
export type IClassSpan = {
    token: string;
    /**
     * offset of the token within the raw class string
     */
    start: number;
    end: number;
};
