/**
 * Comp end dates (migration 046): setting one from the admin pages, the
 * billing job ending comps whose date has passed (and nobody else), the
 * Ending soon list, and writers reading their own premium pieces without
 * a comp.
 */
import { describe, expect, test } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { deskEntry, memberEvent, user } from '$lib/server/db/schema.js';
import {
	compEndDay,
	expireComps,
	expiringComps,
	getCompEnd,
	parseCompEnd,
	setCompEnd
} from '$lib/server/admin/comps.js';
import { COMP_REASONS, setMemberRole } from '$lib/server/payments/ledger.js';
import { actions as customerActions } from '../../src/routes/admin/customers/[id]/+page.server.js';
import { actions as analyticsActions } from '../../src/routes/admin/analytics/+page.server.js';
import { load as articleLoad } from '../../src/routes/library/[slug]/+page.server.js';
import { callAction } from '../support/actions.js';
import { createAdmin, createUser, daysFromNow } from '../support/factories.js';

const roleOf = async (id) => (await db.select().from(user).where(eq(user.id, id)))[0];

describe('the end date', () => {
	test('a date is the end of that day in Pacific time; empty means none', () => {
		const now = new Date('2026-11-17T12:00:00Z');
		// Dec 31 11:59:59 pm PST = Jan 1 07:59:59 UTC
		expect(parseCompEnd('2026-12-31', now).endsAt?.toISOString()).toBe('2027-01-01T07:59:59.000Z');
		// in summer it's PDT
		expect(parseCompEnd('2027-07-04', now).endsAt?.toISOString()).toBe('2027-07-05T06:59:59.000Z');
		expect(parseCompEnd('', now)).toEqual({ endsAt: null });
		expect(parseCompEnd('2026-11-01', now).error).toMatch(/after today/);
		expect(parseCompEnd('next week', now).error).toBeTruthy();
		expect(compEndDay(parseCompEnd('2026-12-31', now).endsAt)).toBe('2026-12-31');
	});

	test('an admin comps someone with an end date, then changes and clears it', async () => {
		const admin = await createAdmin();
		const m = await createUser();
		const save = (fields) =>
			callAction(customerActions, 'updateRole', {
				user: admin,
				params: { id: m.id },
				fields: { role: 'premium', compReason: 'friend', ...fields }
			});

		const end = new Date(Date.now() + 40 * 864e5);
		const day = compEndDay(end);
		expect((await save({ compEndsOn: day })).data.success).toBe(true);
		expect(await roleOf(m.id)).toMatchObject({ role: 'premium', compReason: 'friend' });
		expect(compEndDay(await getCompEnd(m.id))).toBe(day);

		await save({ compEndsOn: '' });
		expect(await getCompEnd(m.id)).toBeNull();

		expect((await save({ compEndsOn: '2020-01-01' })).data.error).toMatch(/after today/);

		// Taking the comp away clears the date too.
		await setCompEnd(m.id, end);
		await setMemberRole({ userId: m.id, role: 'free', actorId: admin.id });
		expect(await getCompEnd(m.id)).toBeNull();
	});

	test('writers aren’t a comp reason any more', async () => {
		expect(COMP_REASONS).not.toContain('writer');
		const admin = await createAdmin();
		const m = await createUser();
		const r = await setMemberRole({
			userId: m.id,
			role: 'premium',
			compReason: 'writer',
			actorId: admin.id
		});
		expect(r.ok).toBe(false);
	});
});

describe('ending comps', () => {
	test('the billing job ends comps whose date has passed, and only those', async () => {
		const past = (await createUser({ role: 'premium', compReason: 'trial' })).id;
		const later = (await createUser({ role: 'premium', compReason: 'staff' })).id;
		const open = (await createUser({ role: 'premium', compReason: 'friend' })).id;
		const paying = (
			await createUser({ role: 'premium', compReason: 'trial', subscriptionId: 'sub-1' })
		).id;
		const admin = (await createAdmin({ compReason: 'staff' })).id;
		await setCompEnd(past, daysFromNow(-1));
		await setCompEnd(later, daysFromNow(10));
		await setCompEnd(paying, daysFromNow(-1));
		await setCompEnd(admin, daysFromNow(-1));

		expect(await expireComps()).toEqual({ ended: 1 });
		expect(await roleOf(past)).toMatchObject({ role: 'free', compReason: null, compedAt: null });
		for (const id of [later, open, paying]) expect((await roleOf(id)).role).toBe('premium');
		expect((await roleOf(admin)).role).toBe('admin');

		const [ev] = await db.select().from(memberEvent).where(eq(memberEvent.userId, past));
		expect(ev).toMatchObject({ kind: 'comp_expired', reason: 'trial' });
		expect(await expireComps()).toEqual({ ended: 0 });
	});

	test('Ending soon lists comps ending within the window, soonest first', async () => {
		const a = (await createUser({ role: 'premium', compReason: 'trial', firstName: 'Soon' })).id;
		const b = (await createUser({ role: 'premium', compReason: 'trial', firstName: 'Sooner' })).id;
		const c = (await createUser({ role: 'premium', compReason: 'trial', firstName: 'Later' })).id;
		await setCompEnd(a, daysFromNow(10));
		await setCompEnd(b, daysFromNow(3));
		await setCompEnd(c, daysFromNow(60));
		const soon = await expiringComps({ days: 14 });
		expect(soon.map((s) => s.id)).toEqual([b, a]);
	});

	test('the members list sets an end date only on a comp', async () => {
		const admin = await createAdmin();
		const comp = await createUser({ role: 'premium', compReason: 'friend' });
		const free = await createUser();
		const set = (who) =>
			callAction(analyticsActions, 'compEnd', {
				user: admin,
				fields: { userId: who.id, compEndsOn: compEndDay(daysFromNow(20)) }
			});
		expect((await set(comp)).data.success).toBe(true);
		expect(await getCompEnd(comp.id)).not.toBeNull();
		expect((await set(free)).data.error).toMatch(/Only a comp/);
	});
});

describe('writers and their own premium pieces', () => {
	test('the author reads their premium piece in full; another free reader gets the preview', async () => {
		const writer = await createUser();
		const reader = await createUser();
		const para = (t) => ({
			type: 'paragraph',
			version: 1,
			children: [{ type: 'text', version: 1, text: t, format: 0 }]
		});
		const [entry] = await db
			.insert(deskEntry)
			.values({
				title: 'Members only',
				slug: `members-${randomUUID().slice(0, 8)}`,
				authorId: writer.id,
				status: 'published',
				publishedAt: new Date(),
				accessMode: 'premium',
				body: {
					root: { type: 'root', version: 1, children: [para('One'), para('Two'), para('Three')] }
				}
			})
			.returning();
		const open = (who) =>
			articleLoad({ params: { slug: entry.slug }, locals: { user: who }, setHeaders: () => {} });
		expect((await open(writer)).isPreview).toBe(false);
		expect((await open(reader)).isPreview).toBe(true);
	});
});
