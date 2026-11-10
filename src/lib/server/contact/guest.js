/**
 * The conversations a guest started, remembered by their browser: a cookie
 * of private links, so /contact can list them again without an account.
 */
const COOKIE = 'age_contact';
const MAX = 20;

/** The private links this browser remembers. */
export function guestTokens(cookies) {
	return (cookies.get(COOKIE) || '').split('.').filter(Boolean).slice(0, MAX);
}

/** Remember one more (newest first). */
export function rememberToken(cookies, token) {
	const list = [token, ...guestTokens(cookies).filter((x) => x !== token)].slice(0, MAX);
	cookies.set(COOKIE, list.join('.'), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: true,
		maxAge: 60 * 60 * 24 * 365
	});
}
