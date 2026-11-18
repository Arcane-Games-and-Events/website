/**
 * Comp end dates (migration 046). A comp is Premium without paying; an
 * admin can give it an end date, or leave it open. The hourly billing job
 * calls expireComps(), which puts members whose comp has ended back to
 * free and records 'comp_expired' in their membership history.
 *
 * The date is the last day of the comp, in Pacific time: a comp ending
 * "Dec 31" runs until 11:59 pm on Dec 31 in Los Angeles.
 *
 * `comp_ends_at` isn't in the Drizzle `user` table on purpose: every
 * select of a user would fail until 046 has run. It's read here with
 * to_jsonb(u)->>'comp_ends_at', which is null before then, and written
 * with raw SQL that quietly does nothing before then.
 */
import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { bump } from '$lib/server/cache/index.js';
import { isMissingColumn } from '$lib/server/contentAnalytics/collect.js';
import { logMemberEvent } from '$lib/server/payments/ledger.js';

const ZONE = 'America/Los_Angeles';

const rows = (r) => (Array.isArray(r) ? r : r?.rows || []);

/** How far a time zone's wall clock is ahead of UTC at `date`, in ms. */
function zoneOffset(date, timeZone) {
	const parts = Object.fromEntries(
		new Intl.DateTimeFormat('en-US', {
			timeZone,
			hourCycle: 'h23',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		})
			.formatToParts(date)
			.map((p) => [p.type, p.value])
	);
	const wall = Date.UTC(
		+parts.year,
		+parts.month - 1,
		+parts.day,
		+parts.hour,
		+parts.minute,
		+parts.second
	);
	return wall - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * A form's "Comp ends" date (YYYY-MM-DD) as the moment it ends: 11:59:59 pm
 * that day in Pacific time. Empty means no end date.
 * @returns {{ endsAt: Date | null, error?: string }}
 */
export function parseCompEnd(raw, now = new Date()) {
	const text = String(raw ?? '').trim();
	if (!text) return { endsAt: null };
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
	if (!m) return { endsAt: null, error: 'Pick the comp’s last day from the calendar.' };
	const guess = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 23, 59, 59));
	const endsAt = new Date(guess.getTime() - zoneOffset(guess, ZONE));
	if (Number.isNaN(endsAt.getTime())) return { endsAt: null, error: 'That date isn’t valid.' };
	if (endsAt <= now) return { endsAt: null, error: 'The end date has to be after today.' };
	return { endsAt };
}

/** A comp end as the YYYY-MM-DD its last day is in Pacific time (for date inputs). */
export function compEndDay(endsAt) {
	if (!endsAt) return '';
	return new Intl.DateTimeFormat('en-CA', { timeZone: ZONE }).format(new Date(endsAt));
}

/** When this member's comp ends; null when it has no end date (or before 046). */
export async function getCompEnd(userId) {
	const [r] = rows(
		await db.execute(
			sql`select to_jsonb(u)->>'comp_ends_at' as ends from "user" u where u.id = ${userId}`
		)
	);
	return r?.ends ? new Date(r.ends) : null;
}

/**
 * Set (or clear, with null) when a member's comp ends. False before 046
 * has run, so the caller can say the date wasn't kept.
 */
export async function setCompEnd(userId, endsAt) {
	try {
		await db.execute(
			sql`update "user" set comp_ends_at = ${endsAt ? endsAt.toISOString() : null}::timestamptz where id = ${userId}`
		);
		return true;
	} catch (err) {
		if (isMissingColumn(err)) return false;
		throw err;
	}
}

/** Comps ending within `days` days, soonest first. */
export async function expiringComps({ days = 30, now = new Date() } = {}) {
	const until = new Date(now.getTime() + days * 86400000);
	return rows(
		await db.execute(sql`
			select u.id, u.email, u.first_name, u.last_name, u.comp_reason,
				(to_jsonb(u)->>'comp_ends_at')::timestamptz as ends
			from "user" u
			where u.role = 'premium' and u.subscription_id is null and u.comp_reason is not null
				and (to_jsonb(u)->>'comp_ends_at')::timestamptz <= ${until.toISOString()}::timestamptz
			order by ends
		`)
	).map((r) => ({
		id: r.id,
		email: r.email,
		name: `${r.first_name || ''} ${r.last_name || ''}`.trim() || r.email,
		reason: r.comp_reason,
		endsAt: r.ends ? new Date(r.ends) : null
	}));
}

/**
 * End every comp whose date has passed: back to free, the comp's details
 * cleared, 'comp_expired' recorded. Members who now pay, and admins, are
 * never touched. Returns how many ended.
 */
export async function expireComps(now = new Date()) {
	let ended;
	try {
		ended = rows(
			await db.execute(sql`
				with due as (
					select id, comp_reason from "user"
					where role = 'premium' and subscription_id is null
						and comp_ends_at is not null and comp_ends_at <= ${now.toISOString()}::timestamptz
				), ended as (
					update "user" u
					set role = 'free', comp_reason = null, comped_at = null, comped_by = null,
						comp_ends_at = null
					from due where u.id = due.id
					returning u.id
				)
				select due.id, due.comp_reason from due join ended using (id)
			`)
		);
	} catch (err) {
		if (isMissingColumn(err)) return { ended: 0 };
		throw err;
	}
	for (const r of ended) {
		await logMemberEvent({ userId: r.id, kind: 'comp_expired', reason: r.comp_reason, at: now });
		await bump(`user:${r.id}`);
	}
	if (ended.length) await bump('users');
	return { ended: ended.length };
}
