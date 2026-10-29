/**
 * Vitest global setup for integration tests: drop and recreate the test
 * database from `tests/db/schema.sql`, once per run.
 */
import { readFileSync } from 'node:fs';
import postgres from 'postgres';
import { testDatabaseUrl } from './environment.js';

export async function createTestDatabase(url = testDatabaseUrl()) {
	const target = new URL(url);
	const name = target.pathname.slice(1);
	const admin = new URL(url);
	admin.pathname = '/postgres';

	const server = postgres(admin.toString(), { max: 1, onnotice: () => {} });
	try {
		await server.unsafe(`drop database if exists "${name}" with (force)`);
		await server.unsafe(`create database "${name}"`);
	} catch (err) {
		throw new Error(
			`Could not create the test database at ${target.host}. Is the test Postgres running? ` +
				`Start it with "pnpm test:db:up". (${err.message})`
		);
	} finally {
		await server.end();
	}

	// pg_dump 17.6+ wraps the dump in psql-only \restrict lines; drop them.
	const schema = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8')
		.split('\n')
		.filter((line) => !line.startsWith('\\'))
		.join('\n')
		// A new database already has the public schema.
		.replace(/^CREATE SCHEMA public;$/m, '');
	const db = postgres(url, { max: 1, onnotice: () => {} });
	try {
		await db.unsafe(schema);
		// The dump empties search_path for the session; nothing else to undo.
	} finally {
		await db.end();
	}
}

export default async function setup() {
	await createTestDatabase();
}
