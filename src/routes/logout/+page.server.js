import { auth, forgetSession } from '$lib/server/lucia';
import { redirect } from '@sveltejs/kit';

export const actions = {
	default: async ({ locals, cookies }) => {
		try {
			const sid = locals?.session?.id ?? cookies.get(auth.sessionCookieName);
			if (sid) {
				if (locals?.session?.id) {
					await auth.invalidateSession(sid);
				} else {
					const { session } = await auth.validateSession(sid);
					if (session) await auth.invalidateSession(session.id);
				}
				await forgetSession(sid);
			}
		} finally {
			const blank = auth.createBlankSessionCookie();
			cookies.set(blank.name, blank.value, { ...blank.attributes, path: '/' });
		}
		throw redirect(302, '/login');
	}
};
