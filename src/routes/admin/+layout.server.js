// src/routes/admin/+layout.server.js
import { requireRole } from '$lib/server/guards';

export const load = async ({ locals }) => {
	// Allow both admin and tournament staff to access admin routes
	// Individual pages will handle specific permission checks (e.g., event assignments for tournament staff)
	requireRole(locals, ['admin', 'tournament_staff']);
	return { user: locals.user };
};
