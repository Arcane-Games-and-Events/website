import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			runtime: 'nodejs22.x',
			// Oregon, next to the Supabase database (aws us-west-2)
			regions: ['pdx1']
		}),
		csrf: {
			// Built-in origin check off ('*' trusts every origin) so external
			// webhooks, which send no Origin header, aren't rejected. The real
			// CSRF check lives in src/hooks.server.js and exempts only
			// /api/webhooks/.
			trustedOrigins: ['*']
		}
	}
};

export default config;
