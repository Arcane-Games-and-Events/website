/**
 * Runs before every integration test file.
 *
 * - Blocks every request to Authorize.net. A test that needs the gateway
 *   installs the fake from tests/support/fake-authnet.js.
 * - Empties every table before each test, so tests never depend on each
 *   other's data.
 */
import { afterAll, beforeEach } from 'vitest';
import { env } from '$env/dynamic/private';
import { authnet } from '$lib/server/authnet/client.js';
import { assertSafeDatabaseUrl } from './environment.js';
import { resetDatabase, closeDatabase } from '../support/db.js';

// Belt and braces: what the app actually sees must be the test database.
assertSafeDatabaseUrl(env.DATABASE_URL);

authnet.send = async () => {
	throw new Error(
		'A test tried to call Authorize.net. Use installFakeAuthnet() from tests/support/fake-authnet.js.'
	);
};

beforeEach(async () => {
	await resetDatabase();
});

afterAll(async () => {
	await closeDatabase();
});
