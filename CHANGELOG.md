# Changelog

This project is installed from a git tag, so this file is how you tell whether moving from one
tag to the next changes a rule's behavior. It follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

Rules and defaults change to fit my own projects, with no backwards-compatibility promise — but
anything that changes what a rule reports or fixes is listed here under **Changed** or **Removed**.

## [1.0.0] — 2026-10-13

Initial release: eight auto-fixable ordering rules — `import-order`,
`interface-member-order`, `parameter-destructuring-order`, `jsx-attribute-order`,
`hook-declaration-order`, `tailwind-class-order`, `tailwind-apply-class-order` and
`json-key-order` — with the `recommended`, `tailwind` and `css` shared configs, and the
comparators and Tailwind category table exposed as importable subpath exports.

Requires Node.js 22.18 or newer (`engines: ^22.18.0 || >=24`) and ESLint 9 or 10.

[1.0.0]: https://github.com/Alphka/eslint-plugin-ordering-conventions/releases/tag/v1.0.0
