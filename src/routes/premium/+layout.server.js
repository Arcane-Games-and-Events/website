// src/routes/premium/+layout.server.js
export const load = async ({ locals }) => {
	// Allow all users - we'll show different content based on their role
	return { user: locals.user };
};
