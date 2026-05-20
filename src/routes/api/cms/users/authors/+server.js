import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { user as userTable } from '$lib/server/db/schema.js';
import { sql, asc } from 'drizzle-orm';
import { userHasAnyRole } from '$lib/server/guards.js';

/**
 * GET /api/cms/users/authors
 * Returns users who can author articles — primary or stacked role of
 * 'admin' or 'writer'. Admin-only endpoint, used by the editor's author
 * picker dropdown.
 */
export async function GET({ locals }) {
	if (!userHasAnyRole(locals.user, 'admin')) throw error(403, 'Forbidden');

	const rows = await db
		.select({
			id: userTable.id,
			email: userTable.email,
			firstName: userTable.firstName,
			lastName: userTable.lastName,
			role: userTable.role,
			additionalRoles: userTable.additionalRoles
		})
		.from(userTable)
		.where(
			sql`${userTable.role} IN ('admin', 'writer')
			    OR 'admin' = ANY(${userTable.additionalRoles})
			    OR 'writer' = ANY(${userTable.additionalRoles})`
		)
		.orderBy(asc(userTable.firstName), asc(userTable.lastName));

	return json({ authors: rows });
}
