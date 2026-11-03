import { fail } from '@sveltejs/kit';
import {
	getAuthorProfile,
	isMissingProfileTable,
	parseTeacherProfile,
	saveAuthorProfile
} from '$lib/server/desk/authorProfile.js';

/**
 * Classroom → Profile: how a teacher appears in "Your instructor" on their
 * course pages: photo, title and bio. It's the same profile (and photo) as
 * the Desk's and the account page's, so writers who teach edit it in either.
 */
export async function load({ locals }) {
	const { available, profile } = await getAuthorProfile(locals.user.id);
	return {
		available,
		profile: {
			displayName: profile?.displayName || null,
			title: profile?.title || '',
			bio: profile?.bio || '',
			avatar: profile?.avatar || null
		},
		name: `${locals.user.firstName || ''} ${locals.user.lastName || ''}`.trim()
	};
}

export const actions = {
	save: async ({ locals, request }) => {
		const parsed = parseTeacherProfile(Object.fromEntries(await request.formData()));
		if (!parsed.ok) return fail(400, { error: parsed.error });
		try {
			// Only the title and bio: the photo saves on its own, and the
			// Desk's name and links are left as they are.
			await saveAuthorProfile(locals.user.id, parsed.value);
		} catch (err) {
			if (isMissingProfileTable(err))
				return fail(503, {
					error: 'Profiles aren’t switched on yet. An admin needs to apply migration 020.'
				});
			console.error('classroom profile save failed:', err);
			return fail(500, { error: 'Could not save your profile. Try again.' });
		}
		return { saved: true };
	}
};
