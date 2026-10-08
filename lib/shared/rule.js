/**
 * @fileoverview The small pieces every rule module needs, kept in one place so they do not drift.
 *
 * `docsUrl` matters most: the documentation link is part of each rule's `meta`, and eight copies of
 * the repository URL is eight places to miss when the repository moves.
 */

const DOCS_BASE = "https://github.com/Alphka/eslint-plugin-ordering-conventions/blob/main/docs/rules"

/**
 * The published documentation page for a rule, by its name in the plugin.
 *
 * @param {string} name
 * @returns {string}
 */
export const docsUrl = (name) => `${DOCS_BASE}/${name}.md`

/**
 * An AST field that should hold a name, read back as a string — or `null` when it holds anything
 * else, which is how a rule tells "no usable name" apart from an empty one.
 *
 * @param {unknown} value
 * @returns {string | null}
 */
export const nameOf = (value) => typeof value === "string" ? value : null

/** The location a report falls back to when a node carries none, so reporting never throws. */
export const NO_LOC = { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } }
