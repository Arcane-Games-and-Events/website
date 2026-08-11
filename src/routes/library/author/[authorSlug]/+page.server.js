import { error } from '@sveltejs/kit';

/**
 * Payload is turned off — author pages are Payload-only surfaces today,
 * and the CMS doesn't yet expose a public author slug URL for its own
 * authors. Any hit here 404s until we add first-class CMS author pages.
 */
export async function load() {
	throw error(404, 'Author not found');
}
