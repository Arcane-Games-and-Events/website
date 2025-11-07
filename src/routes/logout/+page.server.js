import { auth } from '$lib/server/lucia';
import { redirect } from '@sveltejs/kit';

export const actions = {
	default: async ({ locals, cookies }) => {
		try {
			if (locals?.session?.id) {
				await auth.invalidateSession(locals.session.id);
			} else {
				const sid = cookies.get(auth.sessionCookieName);
				if (sid) {
					const { session } = await auth.validateSession(sid);
					if (session) await auth.invalidateSession(session.id);
				}
			}
		} finally {
			const blank = auth.createBlankSessionCookie();
			cookies.set(blank.name, blank.value, { ...blank.attributes, path: '/' });
		}
		throw redirect(302, '/login');
	}
};
