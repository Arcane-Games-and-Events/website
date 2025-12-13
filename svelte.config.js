import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			runtime: 'nodejs22.x'
		}),
		csrf: {
			// Allow webhooks from Authorize.net (they don't send Origin header)
			checkOrigin: (event) => {
				const path = event.url.pathname;
				// Exempt webhook endpoints from CSRF protection
				if (path.startsWith('/api/webhooks/')) {
					return false;
				}
				return true;
			}
		}
	}
};

export default config;
