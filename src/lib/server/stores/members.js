/**
 * Which stores an account belongs to (migration 045). Read by the root
 * layout for the account menu's Store link, and by /store. Adding or
 * removing a member bumps `user:{id}`, so the cached answer follows.
 */
import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { circuit, store, storeMember } from '$lib/server/db/schema.js';
import { cached } from '$lib/server/cache/index.js';
import { missingStores } from './admin.js';

/** The stores this account manages, with its role in each. */
export async function storesForUser(userId) {
	if (!userId) return [];
	try {
		return await db
			.select({
				id: store.id,
				name: store.name,
				slug: store.slug,
				city: store.city,
				state: store.state,
				active: store.active,
				role: storeMember.role,
				circuitName: circuit.name,
				circuitColor: circuit.color
			})
			.from(storeMember)
			.innerJoin(store, eq(store.id, storeMember.storeId))
			.innerJoin(circuit, eq(circuit.id, store.circuitId))
			.where(eq(storeMember.userId, userId))
			.orderBy(asc(store.name));
	} catch (err) {
		if (missingStores(err)) return [];
		throw err;
	}
}

/** How many stores this account belongs to, cached for the layout. */
export async function cachedStoreCount(userId) {
	if (!userId) return 0;
	try {
		return await cached(
			`layout:user:${userId}:stores`,
			async () => (await storesForUser(userId)).length,
			{ tags: [`user:${userId}`] }
		);
	} catch {
		return 0;
	}
}
