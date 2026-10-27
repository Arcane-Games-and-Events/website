import { redirect } from '@sveltejs/kit';

/**
 * Payload is turned off — the /library/preview/[slug] route was Payload's
 * draft-preview surface. Custom CMS entries have their own preview flow
 * inside the editor at /desk/entries/[id], so we redirect there.
 */
export async function load() {
	throw redirect(302, '/desk');
}
