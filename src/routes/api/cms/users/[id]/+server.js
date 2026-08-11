import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { user as userTable } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { isAdmin } from '$lib/server/auth/roles.js';

const VALID_BILLING_ROLES = new Set(['free', 'premium', 'admin']);
const VALID_CAPABILITIES = new Set(['writer', 'creator', 'tournament staff']);

/**
 * PATCH /api/cms/users/[id]
 *
 * Admin-only user role management. Accepts:
 *   - `role`: 'free' | 'premium' | 'admin' (billing tier)
 *   - `additionalRoles`: string[] of capability roles
 *
 * Both fields are optional — anything not sent is unchanged. Unknown
 * capability roles are silently dropped so a stale UI can't inject
 * arbitrary strings into the additional_roles array.
 *
 * A user can't demote themselves — swapping your own billing role from
 * 'admin' to something else would lock you out of this very endpoint mid-
 * request. Use another admin account for that if needed.
 */
export async function PATCH({ params, request, locals }) {
	const actor = locals.user;
	if (!actor) throw error(401, 'Unauthorized');
	if (!isAdmin(actor)) throw error(403, 'Admin only');

	const patch = await request.json().catch(() => ({}));

	const updates = { updatedAt: new Date() };

	if (typeof patch.role === 'string') {
		if (!VALID_BILLING_ROLES.has(patch.role)) {
			throw error(400, `role must be one of: ${Array.from(VALID_BILLING_ROLES).join(', ')}`);
		}
		if (params.id === actor.id && actor.role === 'admin' && patch.role !== 'admin') {
			throw error(400, "You can't remove your own admin billing role — use another admin account.");
		}
		updates.role = patch.role;
	}

	if (Array.isArray(patch.additionalRoles)) {
		const clean = patch.additionalRoles
			.filter((r) => typeof r === 'string')
			.filter((r) => VALID_CAPABILITIES.has(r));
		// Dedup to avoid the array carrying duplicates.
		updates.additionalRoles = Array.from(new Set(clean));
	}

	const [row] = await db.select().from(userTable).where(eq(userTable.id, params.id)).limit(1);
	if (!row) throw error(404, 'User not found');

	await db.update(userTable).set(updates).where(eq(userTable.id, params.id));

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
