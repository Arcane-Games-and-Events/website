/**
 * Empty Lexical document — used as the initial state for new articles.
 * Shape matches what `editor.toJSON()` would produce so we can round-trip cleanly.
 */
export function emptyLexicalDoc() {
	return {
		root: {
			children: [
				{
					children: [],
					direction: null,
					format: '',
					indent: 0,
					type: 'paragraph',
					version: 1
				}
			],
			direction: null,
			format: '',
			indent: 0,
			type: 'root',
			version: 1
		}
	};
}

/**
 * Coerce any value into a Lexical doc:
 *   null/undefined        → empty doc
 *   { root: ... } object  → as-is
 *   stringified JSON      → parsed
 */
export function coerceLexicalDoc(value) {
	if (!value) return emptyLexicalDoc();
	if (typeof value === 'string') {
		try {
			return JSON.parse(value);
		} catch {
			return emptyLexicalDoc();
		}
	}
	if (typeof value === 'object' && value.root) return value;
	return emptyLexicalDoc();
}
