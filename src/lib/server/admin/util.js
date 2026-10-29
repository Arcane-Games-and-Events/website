import { sql } from 'drizzle-orm';
import { cached, CACHE_TTL } from '$lib/server/cache/index.js';
import { isMissingTable, isMissingColumn } from '$lib/server/contentAnalytics/collect.js';

/** Shared helpers for the admin analytics modules. */

export const n = (v) => Number(v) || 0;
export const money = (v) => Math.round(n(v) * 100) / 100;

/** First row of a `db.execute` result. */
export const first = (result) => (result.rows || result)[0] || {};
/** All rows of a `db.execute` result. */
export const rows = (result) => result.rows || result || [];

/** A text[] column from `db.execute` arrives as a Postgres literal: '{a,b}'. */
export const pgArray = (v) =>
	Array.isArray(v)
		? v
		: typeof v === 'string' && v.startsWith('{')
			? v
					.slice(1, -1)
					.split(',')
					.map((x) => x.replace(/^"|"$/g, ''))
					.filter(Boolean)
			: [];

/**
 * Cache a report, and answer `{ available: false }` instead of throwing
 * when the tables it needs (migration 022) don't exist yet.
 */
export async function guarded(key, fn, { tags = [], ttl = CACHE_TTL.FIVE_MINUTES } = {}) {
	try {
		return { available: true, ...(await cached(key, fn, { tags, ttl })) };
	} catch (err) {
		if (isMissingTable(err) || isMissingColumn(err)) {
			console.warn(`[admin] ${key} needs migration 022:`, err.message);
			return { available: false };
		}
		throw err;
	}
}

/** 'YYYY-MM' for a date. */
export const monthKey = (d) => {
	const x = new Date(d);
	return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}`;
};

/** 'Oct 2026' for a 'YYYY-MM' key. */
export const monthLabel = (key) => {
	const [y, m] = key.split('-').map(Number);
	return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
		month: 'short',
		year: 'numeric',
		timeZone: 'UTC'
	});
};

/** The last `count` month keys ending this month, oldest first. */
export function lastMonths(count) {
	const out = [];
	const now = new Date();
	for (let i = count - 1; i >= 0; i--) {
		out.push(monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))));
	}
	return out;
}

/** The next `count` month keys starting next month. */
export function nextMonths(count) {
	const out = [];
	const now = new Date();
	for (let i = 1; i <= count; i++) {
		out.push(monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1))));
	}
	return out;
}

/**
 * SQL predicate for a paying member on the user table, with every column
 * qualified by `alias` so it is safe inside joins. Paying = premium with a
 * live subscription; the test plan is excluded.
 */
export const payingWhere = (alias = '"user"') =>
	sql.raw(
		`${alias}.role = 'premium' and ${alias}.subscription_id is not null ` +
			`and ${alias}.subscription_status in ('active', 'payment_failed') ` +
			`and coalesce(${alias}.subscription_type, '') <> 'weekly_test'`
	);

/** Premium prices, in dollars. */
export const PRICE = { monthly: 10, yearly: 110 };
