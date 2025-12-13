import adapter from '@sveltejs/adapter-vercel';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			runtime: 'nodejs22.x'
		}),
		csrf: {
			// Disable built-in CSRF for webhooks - we implement custom checks in hooks
			checkOrigin: false
		}
	}
};

export default config;
