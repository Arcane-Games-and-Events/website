// Database migrations through the Supabase CLI, against the project in
// .env (dev) or the env file given (--env .env.prod, --env .env.staging).
//
//   pnpm db:status                      which migrations the database has, which are new
//   pnpm db:dry-run                     what `db:push` would run, without running it
//   pnpm db:push                        run the new ones, in order (asks first)
//   pnpm db:mark-applied --through 021  record 001–021 as already applied, without
//                                       running them (once per project, when it
//                                       starts being tracked)
//
// Add `--env .env.prod` to any of them for production. Each migration runs
// in a transaction, and Supabase records it in supabase_migrations
// .schema_migrations, so nothing runs twice. Needs DATABASE_URL_DIRECT (the
// session-mode connection, port 5432) in the env file.
//
// In CI (GitHub Actions) the address comes from DATABASE_URL_DIRECT in the
// environment and `push` doesn't ask (see .github/workflows/migrate.yml).
import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const command = args[0];
const flag = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : null);

function readEnv(file) {
	return Object.fromEntries(
		readFileSync(join(ROOT, file), 'utf8')
			.split('\n')
			.filter((l) => /^[A-Z_]+=/.test(l))
			.map((l) => {
				const i = l.indexOf('=');
				return [
					l.slice(0, i),
					l
						.slice(i + 1)
						.trim()
						.replace(/^['"]|['"]$/g, '')
				];
			})
	);
}

const ci = !!process.env.CI;
const envFile = flag('--env') || '.env';
const url = ci ? process.env.DATABASE_URL_DIRECT : readEnv(envFile).DATABASE_URL_DIRECT;
if (!url) {
	console.error(
		ci
			? 'DATABASE_URL_DIRECT is not set.'
			: `Set DATABASE_URL_DIRECT in ${envFile} (Supabase → Connect → Session pooler).`
	);
	process.exit(1);
}

// Name the database plainly before anything touches it.
const where = new URL(url);
const ref = decodeURIComponent(where.username).split('.')[1] || where.hostname;
console.log(`Database: ${ref} (${where.hostname}) — from ${ci ? 'CI' : envFile}\n`);

const supabase = (...cli) => {
	const r = spawnSync('npx', ['supabase', ...cli, '--remote', url], {
		cwd: ROOT,
		stdio: 'inherit'
	});
	process.exit(r.status ?? 1);
};

async function confirm(question) {
	if (ci) return true;
	const rl = createInterface({ input: process.stdin, output: process.stdout });
	const answer = await rl.question(`${question} Type the project (${ref}) to go ahead: `);
	rl.close();
	return answer.trim() === ref;
}

const local = () =>
	readdirSync(join(ROOT, 'supabase/migrations'))
		.map((f) => /^(\d+)_.+\.sql$/.exec(f)?.[1])
		.filter(Boolean)
		.sort();

if (command === 'status') supabase('migration', 'list');
else if (command === 'dry-run') supabase('db', 'push', '--dry-run');
else if (command === 'push') {
	if (await confirm('Run every new migration on this database?')) {
		ci ? supabase('db', 'push', '--yes') : supabase('db', 'push');
	} else console.log('Nothing changed.');
} else if (command === 'mark-applied') {
	const through = flag('--through');
	const versions = local().filter((v) => through && v <= through);
	if (!versions.length) {
		console.error('Usage: pnpm db:mark-applied --through <version> [--env file]');
		process.exit(1);
	}
	console.log(`Record as applied, without running them: ${versions.join(' ')}`);
	if (await confirm('These must already be in this database.'))
		supabase('migration', 'repair', '--status', 'applied', ...versions);
	else console.log('Nothing changed.');
} else {
	console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\nimport')[0]);
	process.exit(command ? 1 : 0);
}
