import { storePlayers } from '$lib/server/stores/players.js';

/** /store/[slug]/players — everyone who bought a ticket to the store's events. */
export async function load({ parent }) {
	const { where } = await parent();
	return { players: await storePlayers(where.store.id) };
}
