// src/routes/admin/+layout.server.js
import { requireRole } from '$lib/server/guards';

export const load = async ({ locals }) => {
	requireRole(locals, 'admin');
	return { user: locals.user };
};
