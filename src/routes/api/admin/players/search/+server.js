import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { standing } from '$lib/server/db/schema.js';
import { ilike } from 'drizzle-orm';

export async function GET({ url, locals }) {
	if (!locals.user || locals.user.role !== 'admin') {
		return json({ players: [] }, { status: 403 });
	}

	const q = url.searchParams.get('q')?.trim();
	if (!q || q.length < 2) {
		return json({ players: [] });
	}

	const results = await db
		.selectDistinct({ playerName: standing.playerName })
		.from(standing)
		.where(ilike(standing.playerName, `%${q}%`))
		.limit(10);

	return json({ players: results.map((r) => r.playerName) });
}
