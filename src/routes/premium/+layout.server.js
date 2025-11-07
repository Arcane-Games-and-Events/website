// src/routes/premium/+layout.server.js
import { requireRole } from '$lib/server/guards';

export const load = async ({ locals }) => {
	// allow 'premium' and (optionally) 'admin'
	requireRole(locals, ['premium', 'admin']);
	return { user: locals.user };
};
