import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Accept.js (card entry) only runs on https pages. To test checkout
// locally, point these at a self-signed certificate, e.g.
//   openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 30 -subj "/CN=localhost"
//   DEV_HTTPS_KEY=key.pem DEV_HTTPS_CERT=cert.pem pnpm dev
// Paths are relative to the project folder. If either file is missing the
// server starts on plain http with a warning rather than failing.
function devHttps() {
	const { DEV_HTTPS_KEY: key, DEV_HTTPS_CERT: cert } = process.env;
	if (!key || !cert) return undefined;
	const root = import.meta.dirname;
	const keyPath = resolve(root, key);
	const certPath = resolve(root, cert);
	if (!existsSync(keyPath) || !existsSync(certPath)) {
		console.warn(
			`[dev] DEV_HTTPS_KEY / DEV_HTTPS_CERT are set but ${!existsSync(keyPath) ? keyPath : certPath} doesn't exist; starting on http instead.`
		);
		return undefined;
	}
	console.log(
		'[dev] Serving over https (DEV_HTTPS_KEY / DEV_HTTPS_CERT are set). Open https://localhost:5173'
	);
	return { key: readFileSync(keyPath), cert: readFileSync(certPath) };
}
const https = devHttps();

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: https ? { https } : {}
});
