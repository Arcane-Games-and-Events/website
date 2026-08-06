import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { partner, user } from '$lib/server/db/schema.js';
import { eq, sql, ilike, or } from 'drizzle-orm';
import { normalizePartnerCode } from '$lib/server/partner-code.js';
import { invalidateCache } from '$lib/server/redis/index.js';

export async function load({ locals, url }) {
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/login?redirect=/admin/partners/new');
	}

	// Optional user search
	const q = url.searchParams.get('q')?.trim() || '';
	let searchResults = [];
	if (q.length >= 2) {
		searchResults = await db
			.select({
				id: user.id,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				role: user.role
			})
			.from(user)
			.where(
				or(
					ilike(user.email, `%${q}%`),
					ilike(user.firstName, `%${q}%`),
					ilike(user.lastName, `%${q}%`)
				)
			)
			.limit(20);
	}

	return { searchQuery: q, searchResults };
}

export const actions = {
	create: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Forbidden' });
		}

		const form = await request.formData();
		const userId = form.get('userId')?.toString();
		const rawCode = form.get('code')?.toString();
		const displayName = form.get('displayName')?.toString().trim() || null;
		const payoutNotes = form.get('payoutNotes')?.toString() || null;

		if (!userId) {
			return fail(400, { error: 'Please select a user' });
		}

		const code = normalizePartnerCode(rawCode);
		if (!code || code.length < 3) {
			return fail(400, { error: 'Code must be at least 3 characters' });
		}
		if (!/^[A-Z0-9_-]+$/.test(code)) {
			return fail(400, {
				error: 'Code can only contain letters, numbers, underscores, and hyphens'
			});
		}

		// Confirm user exists
		const [targetUser] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
		if (!targetUser) {
			return fail(400, { error: 'User not found' });
		}

		// Confirm user isn't already a partner
		const [existingPartner] = await db
			.select()
			.from(partner)
			.where(eq(partner.userId, userId))
			.limit(1);
		if (existingPartner) {
			return fail(400, { error: 'This user is already a partner' });
		}

		// Confirm code is unique (case-insensitive)
		const [codeInUse] = await db
			.select()
			.from(partner)
			.where(sql`upper(${partner.code}) = ${code}`)
			.limit(1);
		if (codeInUse) {
			return fail(400, { error: `Code "${code}" is already taken` });
		}

		const [created] = await db
			.insert(partner)
			.values({
				userId,
				code,
				displayName,
				isActive: true,
				payoutNotes,
				createdBy: locals.user.id
			})
			.returning({ id: partner.id });

		// Bust this user's layout is_partner cache so the partner-only
		// nav link shows up on their next navigation instead of after
		// the 1h TTL.
		await invalidateCache(`layout:user:${userId}:is_partner`);

		throw redirect(303, `/admin/partners/${created.id}`);
	}
};
