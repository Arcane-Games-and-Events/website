import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { user as userTable } from '$lib/server/db/schema.js';
import { asc } from 'drizzle-orm';
import { isAdmin } from '$lib/server/auth/roles.js';

/**
 * /desk/users — admin-only user management.
 *
 * Loads every user with the columns the page needs to render + edit
 * (name, email, billing role, capability roles). No writes here — the
 * page fires PATCH /api/desk/users/[id] for updates so the row updates
 * without a full page reload.
 */
export async function load({ locals }) {
	if (!isAdmin(locals.user)) throw redirect(302, '/desk');

	const users = await db
		.select({
			id: userTable.id,
			firstName: userTable.firstName,
			lastName: userTable.lastName,
			email: userTable.email,
			role: userTable.role,
			additionalRoles: userTable.additionalRoles,
			createdAt: userTable.createdAt
		})
		.from(userTable)
		.orderBy(asc(userTable.firstName), asc(userTable.lastName));

	return { users };
}
