export const load = async ({ locals }) => {
	// locals.user is set in hooks.server.js by Lucia
	return {
		user: locals.user
	};
};
