/**
 * The status page (migration 047): recording checks (skipping parts that
 * aren't set up, keeping 90 days), the daily bars and uptime, the overall
 * word, incidents and maintenance with their updates, the site banner, and
 * who can run the checks by hand.
 */
import { describe, expect, test } from 'vitest';
import { db } from '$lib/server/db/index.js';
import { statusCheck } from '$lib/server/db/schema.js';
import {
	addUpdate,
	componentHistory,
	createIncident,
	incidents,
	overall,
	runChecks,
	setBanner,
	siteBanner,
	statusPage
} from '$lib/server/status/index.js';
import { GET as cron } from '../../src/routes/api/cron/status/+server.js';
import { createAdmin, createUser } from '../support/factories.js';

const DAY = 86400000;
const passing = {
	website: async () => 'Answering',
	database: async () => {},
	payments: async () => {
		throw new Error('Authorize.net did not answer in time');
	}
};

describe('the checks', () => {
	test('each part is recorded, failures with why; parts not set up are skipped', async () => {
		const r = await runChecks({ checks: passing });
		expect(r.website).toMatchObject({ ok: true, note: 'Answering' });
		expect(r.database.ok).toBe(true);
		expect(r.payments).toMatchObject({ ok: false, note: 'Authorize.net did not answer in time' });
		expect(r.cache).toBe('skipped');
		const rows = await db.select().from(statusCheck);
		expect(rows.map((x) => x.component).sort()).toEqual(['database', 'payments', 'website']);
	});

	test('a check that hangs fails instead of holding the job up', async () => {
		const r = await runChecks({
			checks: { database: () => new Promise(() => {}) }
		}).catch((e) => e);
		// (the real timeout is 8 s; this only proves it resolves at all)
		expect(r.database.ok).toBe(false);
	}, 15000);

	test('checks older than 90 days are cleared', async () => {
		await db
			.insert(statusCheck)
			.values({ component: 'database', ok: true, at: new Date(Date.now() - 100 * DAY) });
		await runChecks({ checks: { database: async () => {} } });
		const rows = await db.select().from(statusCheck);
		expect(rows).toHaveLength(1);
	});
});

describe('history', () => {
	test('a bar per day with how many passed, uptime, and the last check', async () => {
		const now = new Date();
		const at = (daysAgo, ok) => ({
			component: 'database',
			ok,
			at: new Date(now.getTime() - daysAgo * DAY)
		});
		await db.insert(statusCheck).values([at(2, true), at(2, false), at(1, true), at(0.01, false)]);
		const c = (await componentHistory({ days: 7, now })).find((x) => x.id === 'database');
		expect(c.bars).toHaveLength(7);
		expect(c.bars.reduce((s, b) => s + b.total, 0)).toBe(4);
		expect(c.uptime).toBe(0.5);
		expect(c.current.ok).toBe(false);
		expect(overall([c], [])).toBe('major');
	});
});

describe('incidents', () => {
	test('posting one, updating it, and resolving it', async () => {
		const admin = await createAdmin();
		expect((await createIncident({ title: '', body: 'x' }, admin.id)).error).toMatch(/title/);
		const { id } = await createIncident(
			{
				title: 'Checkout failing',
				body: 'Looking into it.',
				impact: 'major',
				components: ['payments', 'bogus']
			},
			admin.id
		);
		let inc = await incidents();
		expect(inc.active[0]).toMatchObject({
			id,
			impact: 'major',
			status: 'investigating',
			components: ['payments']
		});
		expect(inc.active[0].updates).toHaveLength(1);
		expect(overall([], inc.active)).toBe('major');
		expect(await siteBanner()).toMatchObject({ id, title: 'Checkout failing' });

		await setBanner(id, false);
		expect(await siteBanner()).toBeNull();

		await addUpdate(id, { status: 'resolved', body: 'Fixed.' }, admin.id);
		inc = await incidents();
		expect(inc.active).toHaveLength(0);
		expect(inc.past[0]).toMatchObject({ id, status: 'resolved' });
		expect(inc.past[0].updates.map((u) => u.body)).toEqual(['Fixed.', 'Looking into it.']);
	});

	test('maintenance ahead is “coming up”, and no banner until it starts', async () => {
		const admin = await createAdmin();
		const start = new Date(Date.now() + DAY);
		await createIncident(
			{
				kind: 'maintenance',
				title: 'Database upgrade',
				body: 'A few minutes of slowness.',
				startsAt: start.toISOString(),
				endsAt: new Date(start.getTime() + 3600000).toISOString()
			},
			admin.id
		);
		const inc = await incidents();
		expect(inc.scheduled[0]).toMatchObject({
			title: 'Database upgrade',
			impact: 'maintenance',
			status: 'scheduled'
		});
		expect(inc.active).toHaveLength(0);
		expect(await siteBanner()).toBeNull();
		expect((await statusPage()).overall).toBe('ok');
	});

	test('a window that ends before it starts is refused', async () => {
		const admin = await createAdmin();
		const r = await createIncident(
			{
				kind: 'maintenance',
				title: 'Backwards',
				body: 'x',
				startsAt: new Date(Date.now() + 2 * DAY).toISOString(),
				endsAt: new Date(Date.now() + DAY).toISOString()
			},
			admin.id
		);
		expect(r.error).toMatch(/end after/);
	});
});

describe('running the checks by hand', () => {
	test('only the cron (with its secret) or an admin', async () => {
		const call = (user) =>
			cron({ request: new Request('http://t/api/cron/status'), locals: { user } });
		expect((await call(null)).status).toBe(401);
		expect((await call(await createUser())).status).toBe(401);
	});
});
