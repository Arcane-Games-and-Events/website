import { defineConfig } from 'vitest/config';
import { applyTestEnvironment } from './tests/setup/environment.js';

// Must run before SvelteKit loads `.env`: these values win over it, so no
// test can reach the shared dev database, Redis, email or the live gateway.
applyTestEnvironment();
const { sveltekit } = await import('@sveltejs/kit/vite');

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		// Emails are logged instead of sent in tests; keep the output readable.
		onConsoleLog: (log) => !log.startsWith('[email]'),
		projects: [
			{
				extends: true,
				test: {
					name: 'unit',
					include: ['tests/unit/**/*.test.js'],
					environment: 'node'
				}
			},
			{
				extends: true,
				test: {
					name: 'integration',
					include: ['tests/integration/**/*.test.js'],
					environment: 'node',
					globalSetup: ['tests/setup/database.js'],
					setupFiles: ['tests/setup/integration.js'],
					// One database, so one file at a time, in one process.
					fileParallelism: false,
					pool: 'forks',
					poolOptions: { forks: { singleFork: true } },
					testTimeout: 30000,
					hookTimeout: 60000
				}
			}
		]
	}
});
