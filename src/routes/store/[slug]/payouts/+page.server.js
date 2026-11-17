import { storePayouts } from '$lib/server/stores/payouts.js';
import { getFee } from '$lib/server/stores/payouts.js';

/** /store/[slug]/payouts — what the store has earned and been paid, per event. */
export async function load({ parent }) {
	const { where } = await parent();
	const [payouts, fee] = await Promise.all([storePayouts(where.store.id), getFee()]);
	return { payouts, fee };
}
