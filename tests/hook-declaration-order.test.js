import { createRuleTester } from "./rule-tester.js"
import rule from "../lib/rules/hook-declaration-order.js"

createRuleTester().run("hook-declaration-order", rule, {
	valid: [
		/* destructuring tier first (by length), then plain identifiers (by length) */
		[
			"function Component(){",
			"\tconst { search, setSearch, debouncedSearch, setImmediateSearch } = useDebouncedSearch(filters.search)",
			"\tconst [selectedSubsidiaryData, setSelectedSubsidiaryData] = useState(undefined)",
			"\tconst setSearchParams = useSetSearchParams()",
			"\tconst userPrivileges = useUserPrivileges()",
			"\tconst format = useFormatter()",
			"\tconst stack = useModalsStack([\"details\"])",
			"\tconst t = useTranslations()",
			"}"
		].join("\n"),

		/* two independently-sorted segments, split by the blank line — nothing moves across it */
		[
			"function Component(){",
			"\tconst [isLoggingOut, setIsLoggingOut] = useState(false)",
			"\tconst [shouldOpen, setShouldOpen] = useState(false)",
			"\tconst appShellContainerDisplayRef = useRef(undefined)",
			"\tconst hasAppliedStylesRef = useRef(false)",
			"\tconst router = useRouter()",
			"\tconst theme = useMantineTheme()",
			"\tconst t = useTranslations()",
			"",
			"\tconst [opened, { open, close }] = useDisclosure(shouldOpen)",
			"\tconst isSmallScreenRef = useRef(shouldOpen)",
			"}"
		].join("\n"),

		/* a single hook is nothing to order */
		"function Component(){\n\tconst t = useTranslations()\n}",

		/* a hook needing a callback disqualifies only itself, and nothing follows it here */
		[
			"function Component(){",
			"\tconst t = useTranslations()",
			"\tconst schema = useMemo(() => buildSchema(), [])",
			"}"
		].join("\n"),

		/*
		 * The dependency guard: by length alone `previousRolesRef` (16) should precede `userRoles`
		 * (9), but reordering them would use `userRoles` before its declaration, so the whole
		 * segment is left untouched instead.
		 */
		[
			"function Component(){",
			"\tconst userRoles = useUserRoles()",
			"\tconst previousRolesRef = useRef(userRoles)",
			"}"
		].join("\n"),

		/* the callee pattern is configurable */
		{
			code: "function Component(){\n\tconst timeZone = useTimeZone()\n\tconst pathname = usePathname()\n}",
			options: [{ pattern: "^select[A-Z]" }]
		}
	],

	invalid: [
		{
			/* the longer destructuring comes first */
			code: [
				"function Component(){",
				"\tconst [endDate, setEndDate] = useState(filters.endDate)",
				"\tconst { search, setSearch, debouncedSearch, setImmediateSearch } = useDebouncedSearch(filters.search)",
				"}"
			].join("\n"),
			output: [
				"function Component(){",
				"\tconst { search, setSearch, debouncedSearch, setImmediateSearch } = useDebouncedSearch(filters.search)",
				"\tconst [endDate, setEndDate] = useState(filters.endDate)",
				"}"
			].join("\n"),
			errors: [{ messageId: "hookDeclarationOrder" }]
		},
		{
			/* the equal-length tie-break is ascending alphabetical */
			code: "function Component(){\n\tconst timeZone = useTimeZone()\n\tconst pathname = usePathname()\n}",
			output: "function Component(){\n\tconst pathname = usePathname()\n\tconst timeZone = useTimeZone()\n}",
			errors: [{ messageId: "hookDeclarationOrder", data: { binding: "pathname", length: "8", previousBinding: "timeZone", previousLength: "8", direction: "descending" } }]
		},
		{
			/* two plain bindings with no dependency on each other still sort by length */
			code: [
				"function Component(){",
				"\tconst previousRolesRef = useRef(userRoles)",
				"\tconst previousPrivilegeIdsRef = useRef(userPrivilegeIds)",
				"}"
			].join("\n"),
			output: [
				"function Component(){",
				"\tconst previousPrivilegeIdsRef = useRef(userPrivilegeIds)",
				"\tconst previousRolesRef = useRef(userRoles)",
				"}"
			].join("\n"),
			errors: [{ messageId: "hookDeclarationOrder", data: { binding: "previousPrivilegeIdsRef", length: "23", previousBinding: "previousRolesRef", previousLength: "16", direction: "descending" } }]
		},
		{
			/* the tier beats length: a short destructuring still comes before a long identifier */
			code: [
				"function Component(){",
				"\tconst reallyLongPlainIdentifierName = useSomething()",
				"\tconst { a } = useSmallThing()",
				"}"
			].join("\n"),
			output: [
				"function Component(){",
				"\tconst { a } = useSmallThing()",
				"\tconst reallyLongPlainIdentifierName = useSomething()",
				"}"
			].join("\n"),
			errors: [{ messageId: "hookDeclarationOrder", data: { binding: "{ a }", length: "5", previousBinding: "reallyLongPlainIdentifierName", previousLength: "29", direction: "descending" } }]
		},
		{
			/* a disqualified hook ends the run but does not stop the scan: the two after it are their own */
			code: [
				"function Component(){",
				"\tconst t = useTranslations()",
				"\tconst schema = useMemo(() => buildSchema(), [])",
				"\tconst router = useRouter()",
				"\tconst format = useFormatter()",
				"}"
			].join("\n"),
			output: [
				"function Component(){",
				"\tconst t = useTranslations()",
				"\tconst schema = useMemo(() => buildSchema(), [])",
				"\tconst format = useFormatter()",
				"\tconst router = useRouter()",
				"}"
			].join("\n"),
			errors: [{ messageId: "hookDeclarationOrder", data: { binding: "format", length: "6", previousBinding: "router", previousLength: "6", direction: "descending" } }]
		}
	]
})
