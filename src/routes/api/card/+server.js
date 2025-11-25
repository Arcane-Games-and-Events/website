import { json } from '@sveltejs/kit';
import { getCardData } from '$lib/utils/card-lookup.js';

/**
 * GET /api/card?name=CardName&color=red
 * Returns card data including image URL
 */
export async function GET({ url }) {
	const cardName = url.searchParams.get('name');
	const color = url.searchParams.get('color') || null;

	if (!cardName) {
		return json({ error: 'Card name required' }, { status: 400 });
	}

	const data = getCardData(cardName, color);
	return json(data);
}
