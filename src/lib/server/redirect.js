/**
 * Where to send someone after signing in or up: a path on this site, or
 * home. `//other.site` and `/\other.site` start with a slash but browsers
 * read them as another site, so they're refused too.
 *
 * @param {string | null | undefined} to
 */
export function safeRedirect(to) {
	if (typeof to !== 'string' || !to.startsWith('/') || to.startsWith('//') || to.startsWith('/\\'))
		return '/';
	return to;
}
