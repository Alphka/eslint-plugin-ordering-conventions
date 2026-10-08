/**
 * @fileoverview The comparators every identifier-ordering rule shares, as pure functions over
 * strings. Deliberately AST-free so a rule, a test and any external tooling can all reach the
 * same verdict from the same code.
 */
/**
 * @typedef {"asc" | "desc"} TDirection
 * @typedef {"alphabetical" | "none"} TTieBreak
 */
/**
 * Ascending, case-insensitive, comparing code units rather than using `localeCompare`. A fixer has
 * to produce the same answer on every machine and ICU version, and for identifier-shaped strings
 * the two orders agree — so this costs nothing and removes the locale dependency.
 *
 * @param {string} first
 * @param {string} second
 * @returns {number}
 */
export function compareAlphabetical(first: string, second: string): number;
/**
 * @param {TDirection} direction
 * @returns {(first: string, second: string) => number}
 */
export function compareByLength(direction: TDirection): (first: string, second: string) => number;
/**
 * @param {TDirection} direction
 * @returns {(first: string, second: string) => number}
 */
export function compareByLengthThenAlphabetical(direction: TDirection): (first: string, second: string) => number;
/**
 * Length in the requested direction, with the tie-break the options ask for. `"none"` leaves
 * equal-length keys in the order they were written, which is what a stable sort then preserves.
 *
 * @param {TDirection} direction
 * @param {TTieBreak} tieBreak
 * @returns {(first: string, second: string) => number}
 */
export function comparatorFor(direction: TDirection, tieBreak: TTieBreak): (first: string, second: string) => number;
/**
 * @typedef {object} IImportShape
 * @property {boolean} isTypeOnly  the declaration is `import type …`
 * @property {boolean} hasBraces   the clause has a `{ … }` list
 * @property {boolean} hasBinding  the clause has a default or namespace binding
 */
/**
 * @param {IImportShape} shape
 * @returns {string}  one of `IMPORT_GROUPS`
 */
export function importGroupOf(shape: IImportShape): string;
/**
 * The sort key of an import declaration: the clause text with whitespace collapsed and a leading
 * `type ` removed. The module path never participates.
 *
 * The outer braces are stripped only for a named-only clause, where `{ … }` is the whole thing. A
 * combined `Default, { … }` clause keeps its braces and counts in full, whatever is inside them —
 * so `FormModal, { type IFormModalRef }` measures 33 and `useSWR, { useSWRConfig }` measures 24:
 * neither drops anything, because a default binding is present in both.
 *
 * @param {string} rawClause  the source text between `import` and `from`
 * @returns {string}
 */
export function normalizeClauseText(rawClause: string): string;
/**
 * @typedef {object} ISpecifierDescriptor
 * @property {string} name        the *imported* name; `X` for `X as Y`, the `type` modifier excluded
 * @property {boolean} isTypeOnly whether the specifier carries an inline `type` modifier
 */
/**
 * Brace specifiers sort in two partitions: value imports first, inline `type` imports last. Inside
 * each partition a single-line list goes alphabetical and a multi-line list goes by length, so a
 * wrapped list reads as a ragged column rather than a wall.
 *
 * @param {"single" | "multi"} layout
 * @param {TDirection} direction  the direction a multi-line list uses
 * @param {boolean} typesLast
 * @returns {(first: ISpecifierDescriptor, second: ISpecifierDescriptor) => number}
 */
export function compareSpecifiers(layout: "single" | "multi", direction: TDirection, typesLast: boolean): (first: ISpecifierDescriptor, second: ISpecifierDescriptor) => number;
/**
 * Groups each name with the names that immediately follow it and differ only by one of `suffixes`
 * — `status` / `statusName` / `statusValue` becomes a single unit. The unit is then positioned by
 * the length of its base name, which keeps the derived keys glued to the key they describe.
 *
 * With no suffixes configured every name is its own unit.
 *
 * @param {readonly string[]} names
 * @param {readonly string[]} suffixes
 * @returns {number[]}  the size of each unit, in order
 */
export function unitSizesOf(names: readonly string[], suffixes: readonly string[]): number[];
/**
 * @typedef {object} IBindingDescriptor
 * @property {string} text            the binding's source text
 * @property {boolean} isDestructured true for an object/array pattern binding
 */
/**
 * A destructured binding sorts ahead of a plain identifier regardless of length, then each tier
 * sorts by the binding text itself — never by the call or its arguments.
 *
 * @param {TDirection} direction
 * @param {TTieBreak} tieBreak
 * @param {boolean} destructuringFirst
 * @returns {(first: IBindingDescriptor, second: IBindingDescriptor) => number}
 */
export function compareBindings(direction: TDirection, tieBreak: TTieBreak, destructuringFirst: boolean): (first: IBindingDescriptor, second: IBindingDescriptor) => number;
/** The import groups, in their fixed order. */
export const IMPORT_GROUPS: string[];
export type TDirection = "asc" | "desc";
export type TTieBreak = "alphabetical" | "none";
export type IImportShape = {
    /**
     * the declaration is `import type …`
     */
    isTypeOnly: boolean;
    /**
     * the clause has a `{ … }` list
     */
    hasBraces: boolean;
    /**
     * the clause has a default or namespace binding
     */
    hasBinding: boolean;
};
export type ISpecifierDescriptor = {
    /**
     * the *imported* name; `X` for `X as Y`, the `type` modifier excluded
     */
    name: string;
    /**
     * whether the specifier carries an inline `type` modifier
     */
    isTypeOnly: boolean;
};
export type IBindingDescriptor = {
    /**
     * the binding's source text
     */
    text: string;
    /**
     * true for an object/array pattern binding
     */
    isDestructured: boolean;
};
