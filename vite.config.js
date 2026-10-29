import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';

// Accept.js (card entry) only runs on https pages. To test checkout
// locally, point these at a self-signed certificate, e.g.
//   openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 30 -subj "/CN=localhost"
//   DEV_HTTPS_KEY=key.pem DEV_HTTPS_CERT=cert.pem pnpm dev
const https =
	process.env.DEV_HTTPS_KEY && process.env.DEV_HTTPS_CERT
		? {
				key: readFileSync(process.env.DEV_HTTPS_KEY),
				cert: readFileSync(process.env.DEV_HTTPS_CERT)
			}
		: undefined;

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: https ? { https } : {}
});
