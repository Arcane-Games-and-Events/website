/**
 * The guides cart, kept in a cookie as a list of guide ids: it works
 * signed out, and the server prices it fresh on every page so the total is
 * always the one that will be charged.
 */
import { MAX_CART_ITEMS } from './checkout.js';

export const CART_COOKIE = 'age_cart';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The guide ids in the cart, oldest first. */
export function readCart(cookies) {
	try {
		const ids = JSON.parse(cookies.get(CART_COOKIE) || '[]');
		return Array.isArray(ids)
			? [...new Set(ids.filter((id) => UUID.test(String(id))))].slice(0, MAX_CART_ITEMS)
			: [];
	} catch {
		return [];
	}
}

export function writeCart(cookies, ids) {
	const clean = [...new Set(ids.filter((id) => UUID.test(String(id))))].slice(0, MAX_CART_ITEMS);
	if (!clean.length) {
		cookies.delete(CART_COOKIE, { path: '/' });
		return [];
	}
	cookies.set(CART_COOKIE, JSON.stringify(clean), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: true,
		maxAge: 60 * 60 * 24 * 30
	});
	return clean;
}
