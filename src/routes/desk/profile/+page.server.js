import { fail } from '@sveltejs/kit';
import {
	getAuthorProfile,
	parseProfileInput,
	saveAuthorProfile,
	isMissingProfileTable
} from '$lib/server/desk/authorProfile.js';
import { authorStats, parseRange } from '$lib/server/contentAnalytics/query.js';
import { canManage, getMediaRow } from '$lib/server/media/library.js';

/**
 * /desk/profile — every Desk user edits how they appear on their pieces, and
 * sees reader numbers for their OWN published work only (scoped by author
 * id, whatever their role).
 */
export async function load({ locals, url }) {
	const range = parseRange(url.searchParams.get('range'));
	const { available, profile } = await getAuthorProfile(locals.user.id);

	let stats = null;
	try {
		stats = await authorStats(locals.user.id, range);
	} catch (err) {
		console.error('profile stats failed:', err);
	}

	return {
		available,
		profile,
		range,
		stats,
		account: {
			name: `${locals.user.firstName || ''} ${locals.user.lastName || ''}`.trim(),
			email: locals.user.email
		}
	};
}

export const actions = {
	save: async ({ locals, request }) => {
		const form = Object.fromEntries(await request.formData());
		const parsed = parseProfileInput(form);
		if (!parsed.ok) return fail(400, { error: parsed.error });
		// The photo must be one of the user's own library images (editors and
		// admins can use anyone's), unless it's the photo already set.
		const photoId = parsed.value.avatarMediaId;
		if (photoId) {
			const current = (await getAuthorProfile(locals.user.id).catch(() => null))?.profile?.avatar
				?.id;
			if (photoId !== current) {
				const media = await getMediaRow(photoId);
				if (!media || !canManage(locals.user, media)) {
					return fail(400, { error: 'That photo could not be used. Choose one of your images.' });
				}
			}
		}
		try {
			await saveAuthorProfile(locals.user.id, parsed.value);
		} catch (err) {
			if (isMissingProfileTable(err)) {
				return fail(503, {
					error: 'Profiles aren’t switched on yet. An admin needs to apply migration 020.'
				});
			}
			const code = err?.code || err?.cause?.code;
			if (code === '23503')
				return fail(400, { error: 'That photo could not be found. Upload it again.' });
			console.error('profile save failed:', err);
			return fail(500, { error: 'Could not save your profile. Try again.' });
		}
		return { saved: true };
	}
};
