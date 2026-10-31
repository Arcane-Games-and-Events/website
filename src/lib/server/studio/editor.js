/** What the Studio's item editor needs besides the item: events, heroes and shows. */
import { desc } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { event } from '$lib/server/db/schema.js';
import { listHeroNames } from '$lib/server/cards/heroes.js';
import { listShows } from './shows.js';

export async function editorOptions() {
	const [events, shows] = await Promise.all([
		db
			.select({
				id: event.id,
				title: event.title,
				circuit: event.circuit,
				eventDate: event.eventDate
			})
			.from(event)
			.orderBy(desc(event.eventDate)),
		listShows()
	]);
	return {
		events,
		heroes: listHeroNames(),
		shows: shows.map((s) => ({ id: s.id, name: s.name, kind: s.kind, isActive: s.isActive }))
	};
}
