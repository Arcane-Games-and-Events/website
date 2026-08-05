const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** @type {import('@sveltejs/kit').ParamMatcher} */
export function match(value) {
	return UUID.test(value);
}
