/**
 * Launch hardening: charged checkouts keep their seats until their tickets
 * are issued, the read-only switch turns changes away (but not sign-in,
 * webhooks, jobs or admins), the polling switch, and safe redirects after
 * sign-in.
 */
import { afterEach, describe, expect, test } from 'vitest';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db/index.js';
import { checkout } from '$lib/server/db/schema.js';
import { seatsTaken } from '$lib/server/payments/checkout.js';
import { blockedWrite, discussionPolling } from '$lib/server/switches.js';
import { safeRedirect } from '$lib/server/redirect.js';
import { overLimit, ACCOUNT_LIMITS } from '$lib/server/ratelimit.js';
import { createEvent, createUser } from '../support/factories.js';

const hoursAgo = (h) => new Date(Date.now() - h * 3600000);

async function hold(user, event, status, createdAt) {
	await db.insert(checkout).values({
		userId: user.id,
		eventId: event.id,
		idempotencyKey: crypto.randomUUID(),
		invoiceNumber: `T-${crypto.randomUUID().slice(0, 8)}`,
		status,
		quantity: 1,
		listCents: 4000,
		amountCents: 4000,
		payload: { players: [] },
		createdAt
	});
}

describe('seat holds', () => {
	test('a charged checkout keeps its seat past the 15-minute hold, for up to a day', async () => {
		const event = await createEvent({ playerCap: 10 });
		const user = await createUser();
		await hold(user, event, 'pending', hoursAgo(2)); // unpaid and stale: released
		await hold(user, event, 'paid', hoursAgo(2)); // paid, tickets not out yet: held
		await hold(user, event, 'unknown', hoursAgo(5)); // charge result unknown: held
		await hold(user, event, 'charging', hoursAgo(30)); // stuck for over a day: released
		await hold(user, event, 'pending', new Date()); // fresh: held
		expect(await seatsTaken(event.id)).toBe(3);
	});
});

describe('switches', () => {
	afterEach(() => {
		delete env.READ_ONLY;
		delete env.DISCUSSION_POLLING;
	});

	test('read-only turns changes away, but not reading, sign-in, webhooks, jobs or admins', () => {
		const member = { id: 'u1', role: 'premium' };
		expect(blockedWrite('POST', '/api/academy/x/discussion', member)).toBe(false);
		env.READ_ONLY = '1';
		expect(blockedWrite('POST', '/api/academy/x/discussion', member)).toBe(true);
		expect(blockedWrite('POST', '/contact', null)).toBe(true);
		expect(blockedWrite('GET', '/library', member)).toBe(false);
		expect(blockedWrite('POST', '/login', null)).toBe(false);
		expect(blockedWrite('POST', '/logout', member)).toBe(false);
		expect(blockedWrite('POST', '/api/webhooks/authnet', null)).toBe(false);
		expect(blockedWrite('POST', '/api/cron/billing', null)).toBe(false);
		expect(blockedWrite('POST', '/admin/status', { id: 'a', role: 'admin' })).toBe(false);
	});

	test('discussion polling is normal unless switched to slow or off', () => {
		expect(discussionPolling()).toBe('normal');
		env.DISCUSSION_POLLING = 'slow';
		expect(discussionPolling()).toBe('slow');
		env.DISCUSSION_POLLING = 'OFF';
		expect(discussionPolling()).toBe('off');
		env.DISCUSSION_POLLING = 'fast';
		expect(discussionPolling()).toBe('normal');
	});
});

describe('sign-in', () => {
	test('only paths on this site are followed after signing in', () => {
		expect(safeRedirect('/library/x?y=1')).toBe('/library/x?y=1');
		expect(safeRedirect('//evil.example')).toBe('/');
		expect(safeRedirect('/\\evil.example')).toBe('/');
		expect(safeRedirect('https://evil.example')).toBe('/');
		expect(safeRedirect(null)).toBe('/');
	});

	test('rate limits stay open when Redis is off (local and tests)', async () => {
		expect(await overLimit(['login:ip', '1.2.3.4', ACCOUNT_LIMITS.loginPerIp])).toBe(0);
	});
});
