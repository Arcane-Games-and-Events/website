import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { bump } from '$lib/server/cache/index.js';
import { user as userTable } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { isAdmin } from '$lib/server/auth/roles.js';

const VALID_CAPABILITIES = new Set(['writer', 'editor', 'creator']);

/**
 * PATCH /api/desk/users/[id]
 *
 * Admin-only: set someone's Desk roles. Accepts `additionalRoles`, a
 * string[] of 'writer', 'editor' and 'creator' (shown as Teacher).
 * Unknown roles are dropped so a stale page can't inject arbitrary strings
 * into additional_roles. Membership tiers (free, premium, admin) are set
 * in Admin → Members, not here.
 */
export async function PATCH({ params, request, locals }) {
	const actor = locals.user;
	if (!actor) throw error(401, 'Unauthorized');
	if (!isAdmin(actor)) throw error(403, 'Admin only');

	const patch = await request.json().catch(() => ({}));

	if (!Array.isArray(patch.additionalRoles)) throw error(400, 'Send additionalRoles');
	// Known roles only, once each.
	const additionalRoles = Array.from(
		new Set(patch.additionalRoles.filter((r) => typeof r === 'string' && VALID_CAPABILITIES.has(r)))
	);

	const [row] = await db.select().from(userTable).where(eq(userTable.id, params.id)).limit(1);
	if (!row) throw error(404, 'User not found');

	await db.update(userTable).set({ additionalRoles }).where(eq(userTable.id, params.id));
	await bump(`user:${params.id}`, 'users');

	const [updated] = await db
		.select({
			id: userTable.id,
			firstName: userTable.firstName,
			lastName: userTable.lastName,
			email: userTable.email,
			role: userTable.role,
			additionalRoles: userTable.additionalRoles
		})
		.from(userTable)
		.where(eq(userTable.id, params.id))
		.limit(1);

	return json({ user: updated });
}
