import { error } from '@sveltejs/kit';
import { getPersonPage } from '$lib/server/profile/people.js';
import { linkLabel } from '$lib/desk/authorLinks.js';

/**
 * A writer's or teacher's public page: everything they've made for AGE.
 * Public and the same for everyone, so it shares a short edge cache.
 */
export async function load({ params, setHeaders }) {
	const person = await getPersonPage(params.handle).catch((err) => {
		console.error('[people] page failed:', err);
		return null;
	});
	if (!person) throw error(404, 'Person not found');

	setHeaders({
		'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=60',
		vary: 'Cookie'
	});

	return {
		person: {
			...person,
			links: person.links
				.filter((l) => l?.url)
				.map((l) => ({ href: l.url, label: linkLabel(l), platform: l.platform }))
		}
	};
}
