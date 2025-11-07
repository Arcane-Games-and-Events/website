// src/routes/writer/+layout.server.js
import { requireRole } from '$lib/server/guards';

export const load = async ({ locals }) => {
	requireRole(locals, ['writer', 'admin']); // admin can see writer tools too
	return { user: locals.user };
};
