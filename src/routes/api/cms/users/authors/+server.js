import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { user as userTable } from '$lib/server/db/schema.js';
import { asc, or, eq, sql } from 'drizzle-orm';
import { isAdmin } from '$lib/server/auth/roles.js';

/**
 * GET /api/cms/users/authors
 *
 * Admin-only. Returns every user eligible to be the author of a CMS entry:
 * anyone whose billing role is 'admin' OR whose `additional_roles` array
 * contains 'writer'. The entry editor's author-reassignment picker consumes
 * this to build its dropdown.
 *
 * Response shape: { authors: [{ id, firstName, lastName, email }, ...] }
 */
export async function GET({ locals }) {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');
	if (!isAdmin(user)) throw error(403, 'Admin only');

	const rows = await db
		.select({
			id: userTable.id,
			firstName: userTable.firstName,
			lastName: userTable.lastName,
			email: userTable.email,
			role: userTable.role,
			additionalRoles: userTable.additionalRoles
		})
		.from(userTable)
		.where(
			or(
				eq(userTable.role, 'admin'),
				// Postgres array-contains — writer capability grants entry authorship.
				sql`'writer' = ANY(${userTable.additionalRoles})`
			)
		)
		.orderBy(asc(userTable.firstName), asc(userTable.lastName));

	return json({ authors: rows });
}
