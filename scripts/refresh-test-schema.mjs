/**
 * Refresh tests/db/schema.sql from the dev database (schema only, no data).
 * Run after applying a new migration: `pnpm test:db:schema`.
 *
 * Read-only: pg_dump reads table definitions and writes a local file.
 * Needs pg_dump 17 and DATABASE_URL_DIRECT (the session-mode connection)
 * in .env.
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const env = Object.fromEntries(
	readFileSync(new URL('../.env', import.meta.url), 'utf8')
		.split('\n')
		.filter((l) => /^[A-Z_]+=/.test(l))
		.map((l) => {
			const i = l.indexOf('=');
			return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, '')];
		})
);
const url = process.env.DATABASE_URL_DIRECT || env.DATABASE_URL_DIRECT;
if (!url) {
	console.error('Set DATABASE_URL_DIRECT in .env (Supabase session-mode connection string).');
	process.exit(1);
}
const out = fileURLToPath(new URL('../tests/db/schema.sql', import.meta.url));
try {
	execFileSync(
		'pg_dump',
		[
			url,
			'--schema-only',
			'--schema=public',
			'--no-owner',
			'--no-privileges',
			'--no-comments',
			'-f',
			out
		],
		{ stdio: ['ignore', 'inherit', 'inherit'] }
	);
} catch {
	// The error Node raises repeats the command line, password included; say
	// only that it failed (pg_dump has already printed its own reason).
	console.error('pg_dump failed; see the message above.');
	process.exit(1);
}
console.log(`Wrote ${out}`);
