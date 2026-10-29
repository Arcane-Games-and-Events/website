import { defineConfig, devices } from '@playwright/test';
import { testEnvironment } from './tests/setup/environment.js';

/**
 * Browser tests run against a production build served by `vite preview`,
 * with the same safe environment as the unit and integration tests and a
 * database of their own (age_test_e2e), seeded by tests/e2e/global-setup.js.
 */
const E2E_DATABASE_URL = (process.env.TEST_DATABASE_URL || testEnvironment().DATABASE_URL).replace(
	/\/age_test[\w-]*(\?|$)/,
	'/age_test_e2e$1'
);
process.env.TEST_DATABASE_URL = E2E_DATABASE_URL;
const env = {
	...testEnvironment(),
	DATABASE_URL: E2E_DATABASE_URL,
	NODE_OPTIONS: '--no-deprecation'
};
const PORT = 4173;

export default defineConfig({
	testDir: 'tests/e2e',
	globalSetup: './tests/e2e/global-setup.js',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
	use: {
		baseURL: `http://localhost:${PORT}`,
		trace: 'retain-on-failure'
	},
	projects: [
		{
			name: 'desktop',
			use: {
				...devices['Desktop Chrome'],
				viewport: { width: 1440, height: 900 },
				...(process.env.CI ? {} : { channel: 'chrome' })
			}
		},
		{
			name: 'phone',
			use: {
				...devices['Pixel 7'],
				viewport: { width: 390, height: 844 },
				...(process.env.CI ? {} : { channel: 'chrome' })
			}
		}
	],
	webServer: {
		command: process.env.E2E_SKIP_BUILD
			? `pnpm preview --port ${PORT} --strictPort`
			: // The build is noisy; keep its output in a file and show it only if it fails.
				`mkdir -p node_modules/.cache && (pnpm build > node_modules/.cache/e2e-build.log 2>&1 || (cat node_modules/.cache/e2e-build.log && exit 1)) && pnpm preview --port ${PORT} --strictPort`,
		port: PORT,
		env,
		timeout: 300_000,
		reuseExistingServer: !process.env.CI
	}
});
