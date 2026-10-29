/**
 * The environment every test process runs with.
 *
 * SvelteKit's `$env/dynamic/private` is filled from `.env` when the dev or
 * test server starts, and a variable set later (in a setup file) does not
 * reach it. So the values here are written to `process.env` in the Vitest
 * and Playwright configs, before SvelteKit loads, and they override `.env`
 * completely for anything that could touch real data:
 *
 * - the database is the throwaway test database, never Supabase;
 * - Redis, email, storage and video are switched off;
 * - Authorize.net points at the sandbox with dummy credentials, and the
 *   integration setup blocks every request to it (tests use a fake).
 *
 * Throws if the test database address is not a local one.
 */

export const DEFAULT_TEST_DATABASE_URL = 'postgres://postgres:postgres@127.0.0.1:54329/age_test';

export function testDatabaseUrl() {
	const url = process.env.TEST_DATABASE_URL || DEFAULT_TEST_DATABASE_URL;
	assertSafeDatabaseUrl(url);
	return url;
}

/** Only a database on this machine (or the CI service container) is allowed. */
export function assertSafeDatabaseUrl(url) {
	let host;
	try {
		host = new URL(url).hostname;
	} catch {
		throw new Error(`TEST_DATABASE_URL is not a valid URL: ${url}`);
	}
	const local = ['127.0.0.1', 'localhost', '::1', 'postgres'].includes(host);
	if (!local || /supabase|amazonaws|pooler/i.test(url)) {
		throw new Error(
			`Refusing to run tests against ${host}. TEST_DATABASE_URL must point at a local, throwaway database.`
		);
	}
	if (!/\/age_test[\w-]*(\?|$)/.test(url)) {
		throw new Error(
			'TEST_DATABASE_URL must name a database starting with "age_test" (it is dropped and recreated).'
		);
	}
}

/** Every variable the app reads, with safe test values. */
export function testEnvironment() {
	return {
		APP_ENV: 'test',
		DATABASE_URL: testDatabaseUrl(),
		DATABASE_URL_DIRECT: '',
		PUBLIC_BASE_URL: 'http://localhost:4173',
		// Off: the cache falls back to the database, rate limits allow everything.
		UPSTASH_REDIS_REST_URL: '',
		UPSTASH_REDIS_REST_TOKEN: '',
		// Off: emails are logged, not sent.
		RESEND_API_KEY: '',
		EMAIL_FROM: 'AGE <test@example.com>',
		SUPABASE_URL: '',
		SUPABASE_SERVICE_ROLE_KEY: '',
		MUX_TOKEN_ID: '',
		MUX_TOKEN_SECRET: '',
		MUX_SIGNING_KEY_ID: '',
		MUX_SIGNING_KEY_PRIVATE_KEY: '',
		MUX_WEBHOOK_SIGNING_SECRET: '',
		YOUTUBE_API_KEY: '',
		TURNSTILE_SITE_KEY: '',
		TURNSTILE_SECRET_KEY: '',
		// Sandbox with dummy credentials; requests are blocked in tests.
		AUTHNET_ENVIRONMENT: 'sandbox',
		AUTHNET_API_LOGIN_ID: 'test-login',
		AUTHNET_TRANSACTION_KEY: 'test-transaction-key',
		AUTHNET_PUBLIC_CLIENT_KEY: 'test-client-key',
		AUTHNET_SIGNATURE_KEY: '',
		AUTHNET_TIMEOUT_MS: '2000',
		BILLING_ENABLED: 'true',
		BILLING_MAX_CHARGES_PER_RUN: '',
		BILLING_ALERT_EMAIL: 'alerts@example.com',
		CRON_SECRET: 'test-cron-secret'
	};
}

/** Apply the test environment to this process. */
export function applyTestEnvironment() {
	Object.assign(process.env, testEnvironment());
}
