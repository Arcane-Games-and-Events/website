import { error } from '@sveltejs/kit';

/**
 * Payload is turned off — tag pages are Payload-only surfaces today.
 * The CMS entry schema supports tags via the `cms_entry_tag` join table
 * but there's no authoring UI for them yet, so tag pages have nothing
 * to list. Any hit here 404s until first-class CMS tag pages ship.
 */
export async function load() {
	throw error(404, 'Tag not found');
}
