import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';

let tables = null;

/** Empty every table in the public schema. */
export async function resetDatabase() {
	if (!tables) {
		const rows = await db.execute(
			sql`select tablename from pg_tables where schemaname = 'public' order by tablename`
		);
		tables = (rows.rows || rows).map((r) => `"public"."${r.tablename}"`);
	}
	if (tables.length)
		await db.execute(sql.raw(`truncate ${tables.join(', ')} restart identity cascade`));
}

/** Close the pool the app module opened, so the worker can exit. */
export async function closeDatabase() {
	const client = globalThis.__ageDbClient;
	if (client) {
		await client.end({ timeout: 5 });
		globalThis.__ageDbClient = undefined;
		globalThis.__ageDbDrizzle = undefined;
	}
}
