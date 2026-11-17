/**
 * Store payouts (migration 050): what a store earns from its AGE Open
 * events, and paying it after each event.
 *
 * The owner's rules (2026-11-16):
 *   - A store keeps all of its ticket sales minus the card fee. It earns
 *     what the player paid, so a Premium member's $5 off is the store's.
 *   - The card fee is a fixed rate (AGE's Authorize.net rate, set in the
 *     program settings), charged per card payment and split across the
 *     tickets in it. Free tickets have none.
 *   - A refund takes the ticket back off the store's total in full (what it
 *     earned and the fee it paid); AGE absorbs the fee it doesn't get back.
 *   - Each store event has one payout. It's ready once the event is closed
 *     out, and an admin marks it paid. Money that arrives after a payout was
 *     paid (a late refund, an adjustment) is carried into the store's next
 *     payout, so a paid payout never changes.
 *
 * The ledger is written from the tickets, a sale and at most one refund per
 * ticket (a unique index), so syncing again never counts twice. Pages sync
 * before they read.
 */
import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	event,
	storeActivity,
	storeLedger,
	storePayout,
	storeProgram,
	user
} from '$lib/server/db/schema.js';

export const DEFAULT_FEE = { feePct: '0.0290', feeFixedCents: 30 };

const rowsOf = (res) => res.rows ?? res;
const toCents = (v) => Math.round(Number(v || 0) * 100);
const monthOf = (d) => {
	const x = d ? new Date(d) : new Date();
	return `${x.getUTCFullYear()}-${String(x.getUTCMonth() + 1).padStart(2, '0')}-01`;
};

// ---------------------------------------------------------------- the fee

/** The card fee on one payment of `grossCents`. */
export function paymentFee(grossCents, fee = DEFAULT_FEE) {
	if (!(grossCents > 0)) return 0;
	return Math.round(grossCents * Number(fee.feePct) + Number(fee.feeFixedCents));
}

/** A payment's fee split across its tickets by what each paid; the parts add up to the fee. */
export function splitFee(feeCents, grosses) {
	const total = grosses.reduce((a, b) => a + b, 0);
	if (!total || !feeCents) return grosses.map(() => 0);
	const raw = grosses.map((g) => (feeCents * g) / total);
	const parts = raw.map(Math.floor);
	let left = feeCents - parts.reduce((a, b) => a + b, 0);
	const order = raw.map((r, i) => [r - parts[i], i]).sort((a, b) => b[0] - a[0]);
	for (let k = 0; left > 0; k++, left--) parts[order[k % order.length][1]]++;
	return parts;
}

/** The card fee setting. */
export async function getFee() {
	const [row] = await db
		.select({ feePct: storeProgram.feePct, feeFixedCents: storeProgram.feeFixedCents })
		.from(storeProgram)
		.where(eq(storeProgram.id, 1))
		.limit(1);
	return row ?? DEFAULT_FEE;
}

/**
 * Read the fee form: a percentage ("2.9" or "2.9%") and a fixed amount in
 * dollars ("0.30" or "$0.30").
 * @returns {{ feePct: string, feeFixedCents: number } | { error: string }}
 */
export function parseFee(pctRaw, fixedRaw) {
	const pct = Number(
		String(pctRaw ?? '')
			.trim()
			.replace(/%$/, '')
	);
	const fixed = Number(
		String(fixedRaw ?? '')
			.trim()
			.replace(/^\$/, '') || '0'
	);
	if (!String(pctRaw ?? '').trim() || !Number.isFinite(pct) || pct < 0 || pct >= 100) {
		return { error: 'The card fee percentage is a number from 0 to 100.' };
	}
	if (!Number.isFinite(fixed) || fixed < 0 || fixed > 10) {
		return { error: 'The fixed part of the card fee is a dollar amount, like 0.30.' };
	}
	return {
		feePct: (Math.round(pct * 100) / 10000).toFixed(4),
		feeFixedCents: Math.round(fixed * 100)
	};
}

/** Save the card fee setting. */
export async function saveFee(fee, actorId) {
	await db
		.insert(storeProgram)
		.values({ id: 1, ...fee, updatedBy: actorId, updatedAt: new Date() })
		.onConflictDoUpdate({
			target: storeProgram.id,
			set: { ...fee, updatedBy: actorId, updatedAt: new Date() }
		});
}

// ---------------------------------------------------------------- the ledger

/** The open payout for a store event, made if needed; null once it's paid. */
async function openPayoutId(tx, storeId, eventId) {
	await tx.insert(storePayout).values({ storeId, eventId }).onConflictDoNothing();
	const [p] = await tx
		.select({ id: storePayout.id, status: storePayout.status })
		.from(storePayout)
		.where(and(eq(storePayout.storeId, storeId), eq(storePayout.eventId, eventId)))
		.limit(1);
	return p?.status === 'open' ? p.id : null;
}

/**
 * Write the ledger rows still missing for store events: a sale for every
 * ticket, and a refund for every refunded one. Safe to call often; with
 * nothing new it's one query.
 *
 * @param {{ storeId?: string }} [opts] one store, or every store
 * @returns {Promise<number>} the tickets written
 */
export async function syncLedger({ storeId } = {}) {
	const pending = rowsOf(
		await db.execute(sql`
			SELECT t.id, t.event_id, t.transaction_id, t.amount_paid,
				coalesce(t.refunded, false) AS refunded, e.store_id, e.event_date,
				s.id AS sale_id, s.gross_cents AS sale_gross, s.fee_cents AS sale_fee
			FROM ticket t
			JOIN events e ON e.id = t.event_id
			LEFT JOIN store_ledger s ON s.ticket_id = t.id AND s.entry_type = 'sale'
			WHERE e.store_id IS NOT NULL ${storeId ? sql`AND e.store_id = ${storeId}` : sql``}
				AND t.voided_at IS NULL
				AND (s.id IS NULL OR (coalesce(t.refunded, false) AND NOT EXISTS (
					SELECT 1 FROM store_ledger r WHERE r.ticket_id = t.id AND r.entry_type = 'refund')))`)
	);
	if (!pending.length) return 0;

	// Each new sale's part of its payment's fee: the whole payment, every
	// ticket in it, at today's rate (a row keeps the fee it was written with).
	const fee = await getFee();
	const feeOf = new Map();
	const payments = [
		...new Set(pending.filter((p) => !p.sale_id && p.transaction_id).map((p) => p.transaction_id))
	];
	if (payments.length) {
		const all = rowsOf(
			await db.execute(sql`
				SELECT id, transaction_id, amount_paid FROM ticket
				WHERE voided_at IS NULL AND transaction_id IN (${sql.join(
					payments.map((p) => sql`${p}`),
					sql`, `
				)})
				ORDER BY id`)
		);
		const byPayment = new Map();
		for (const t of all) {
			if (!byPayment.has(t.transaction_id)) byPayment.set(t.transaction_id, []);
			byPayment.get(t.transaction_id).push(t);
		}
		for (const tickets of byPayment.values()) {
			const grosses = tickets.map((t) => toCents(t.amount_paid));
			const parts = splitFee(
				paymentFee(
					grosses.reduce((a, b) => a + b, 0),
					fee
				),
				grosses
			);
			tickets.forEach((t, i) => feeOf.set(t.id, parts[i]));
		}
	}

	await db.transaction(async (tx) => {
		const payoutOf = new Map();
		for (const p of pending) {
			const key = `${p.store_id}:${p.event_id}`;
			if (!payoutOf.has(key)) payoutOf.set(key, await openPayoutId(tx, p.store_id, p.event_id));
			const base = {
				storeId: p.store_id,
				eventId: p.event_id,
				ticketId: p.id,
				statementMonth: monthOf(p.event_date),
				payoutId: payoutOf.get(key)
			};
			let gross = Number(p.sale_gross ?? 0);
			let cut = Number(p.sale_fee ?? 0);
			if (!p.sale_id) {
				gross = toCents(p.amount_paid);
				cut = p.transaction_id ? (feeOf.get(p.id) ?? 0) : 0;
				await tx
					.insert(storeLedger)
					.values({
						...base,
						entryType: 'sale',
						grossCents: gross,
						feeCents: cut,
						storeCents: gross - cut,
						ageCents: 0
					})
					.onConflictDoNothing();
			}
			if (p.refunded) {
				// The store gives back what it earned and the fee it paid; AGE
				// absorbs the fee the card network keeps.
				await tx
					.insert(storeLedger)
					.values({
						...base,
						entryType: 'refund',
						grossCents: -gross,
						feeCents: -cut,
						storeCents: -(gross - cut),
						ageCents: -cut
					})
					.onConflictDoNothing();
			}
		}
	});
	return pending.length;
}

/**
 * SQL for what a store is owed now: open payouts of closed-out events,
 * plus money carried from payouts already paid. `storeIdSql` names the
 * store (a column or a value).
 */
export const owedSql = (storeIdSql) => sql`(SELECT coalesce(sum(l.store_cents), 0)::int
	FROM store_ledger l
	LEFT JOIN store_payout p ON p.id = l.payout_id
	LEFT JOIN events e ON e.id = p.event_id
	WHERE l.store_id = ${storeIdSql}
		AND (l.payout_id IS NULL OR (p.status = 'open' AND e.status = 'completed')))`;

/** What one store is owed now (after syncing it). */
export async function storeOwed(storeId) {
	await syncLedger({ storeId });
	const [r] = rowsOf(await db.execute(sql`SELECT ${owedSql(storeId)} AS cents`));
	return Number(r?.cents || 0);
}

/** How many store payouts are ready to pay, across every store. */
export async function readyPayoutCount() {
	await syncLedger();
	const [r] = rowsOf(
		await db.execute(sql`
			SELECT count(*)::int AS n FROM store_payout p
			JOIN events e ON e.id = p.event_id
			WHERE p.status = 'open' AND e.status = 'completed'
				AND (SELECT coalesce(sum(l.store_cents), 0) FROM store_ledger l WHERE l.payout_id = p.id) <> 0`)
	);
	return Number(r?.n || 0);
}

// ---------------------------------------------------------------- reading

/**
 * A store's payouts, one per event, newest first, each with its players,
 * ticket sales, refunds, card fees, adjustments and what's owed or paid;
 * and the money carried into the next payout.
 *
 * state: 'running' (not closed out yet) · 'ready' · 'paid' · 'cancelled'
 */
export async function storePayouts(storeId) {
	await syncLedger({ storeId });
	const [events, payouts, byPayout, byEvent, carried] = await Promise.all([
		db
			.select({
				id: event.id,
				title: event.title,
				eventDate: event.eventDate,
				status: event.status
			})
			.from(event)
			.where(eq(event.storeId, storeId))
			.orderBy(desc(event.eventDate)),
		db
			.select({
				payout: storePayout,
				paidByFirst: user.firstName,
				paidByLast: user.lastName
			})
			.from(storePayout)
			.leftJoin(user, eq(user.id, storePayout.paidBy))
			.where(eq(storePayout.storeId, storeId)),
		db.execute(sql`
			SELECT payout_id,
				coalesce(sum(gross_cents) FILTER (WHERE entry_type = 'sale'), 0)::int AS gross,
				coalesce(sum(gross_cents) FILTER (WHERE entry_type = 'refund'), 0)::int AS refunds,
				coalesce(sum(fee_cents), 0)::int AS fees,
				coalesce(sum(store_cents) FILTER (WHERE entry_type = 'adjustment'), 0)::int AS adjust,
				coalesce(sum(store_cents), 0)::int AS owed
			FROM store_ledger WHERE store_id = ${storeId} AND payout_id IS NOT NULL
			GROUP BY payout_id`),
		db.execute(sql`
			SELECT event_id,
				(count(*) FILTER (WHERE entry_type = 'sale') - count(*) FILTER (WHERE entry_type = 'refund'))::int AS players
			FROM store_ledger WHERE store_id = ${storeId} AND event_id IS NOT NULL
			GROUP BY event_id`),
		db
			.select({
				cents: sql`coalesce(sum(${storeLedger.storeCents}), 0)::int`,
				n: sql`count(*)::int`
			})
			.from(storeLedger)
			.where(and(eq(storeLedger.storeId, storeId), isNull(storeLedger.payoutId)))
	]);
	const sums = new Map(rowsOf(byPayout).map((r) => [r.payout_id, r]));
	const players = new Map(rowsOf(byEvent).map((r) => [r.event_id, Number(r.players)]));
	const payoutOf = new Map(payouts.map((p) => [p.payout.eventId, p]));

	const list = events.map((e) => {
		const hit = payoutOf.get(e.id);
		const p = hit?.payout;
		const paid = p?.status === 'paid';
		const s = p ? sums.get(p.id) : null;
		const figures = paid
			? {
					gross: p.grossCents ?? 0,
					refunds: p.refundCents ?? 0,
					fees: p.feeCents ?? 0,
					adjust: p.adjustCents ?? 0,
					carried: p.carriedCents ?? 0,
					owed: p.amountCents ?? 0
				}
			: {
					gross: Number(s?.gross ?? 0),
					refunds: Number(s?.refunds ?? 0),
					fees: Number(s?.fees ?? 0),
					adjust: Number(s?.adjust ?? 0),
					carried: 0,
					owed: Number(s?.owed ?? 0)
				};
		const state = paid
			? 'paid'
			: e.status === 'completed'
				? 'ready'
				: e.status === 'cancelled'
					? 'cancelled'
					: 'running';
		return {
			eventId: e.id,
			title: e.title,
			eventDate: e.eventDate,
			eventStatus: e.status || 'upcoming',
			state,
			players: players.get(e.id) ?? 0,
			...figures,
			payoutId: p?.id ?? null,
			paidAt: p?.paidAt ?? null,
			paidBy: hit ? [hit.paidByFirst, hit.paidByLast].filter(Boolean).join(' ') || null : null,
			method: p?.method ?? null,
			reference: p?.reference ?? null,
			note: p?.note ?? null
		};
	});

	const carriedCents = Number(carried[0]?.cents || 0);
	const total = (state) => list.filter((x) => x.state === state).reduce((n, x) => n + x.owed, 0);
	return {
		payouts: list,
		carriedCents,
		owedCents: total('ready') + carriedCents,
		runningCents: total('running'),
		paidCents: total('paid')
	};
}

// ---------------------------------------------------------------- writing

async function storeEvent(storeId, eventId) {
	const [e] = await db
		.select({ id: event.id, title: event.title, eventDate: event.eventDate, status: event.status })
		.from(event)
		.where(and(eq(event.id, String(eventId || '')), eq(event.storeId, storeId)))
		.limit(1);
	return e ?? null;
}

async function log(storeId, actorId, kind, eventId, note, data) {
	try {
		await db
			.insert(storeActivity)
			.values({ storeId, actorId: actorId || null, kind, eventId, note: note || null, data });
	} catch (err) {
		console.error('[stores] activity not recorded:', err?.message || err);
	}
}

/**
 * Mark a closed-out event's payout paid: money carried from earlier payouts
 * joins it, and its amounts are frozen.
 *
 * @param {{ paidAt?: string, method?: string, reference?: string, note?: string }} input
 * @returns {Promise<{ error?: string, amountCents?: number }>}
 */
export async function markPayoutPaid(storeId, eventId, input, actorId) {
	const e = await storeEvent(storeId, eventId);
	if (!e) return { error: 'That event isn’t this store’s.' };
	if (e.status !== 'completed') return { error: 'Close out the event before paying the store.' };
	const method = String(input.method || '')
		.trim()
		.slice(0, 40);
	if (!method) return { error: 'Say how it was paid (check, ACH, PayPal…).' };
	const paidAt = input.paidAt ? new Date(`${input.paidAt}T12:00:00Z`) : new Date();
	if (Number.isNaN(paidAt.getTime())) return { error: 'That payment date isn’t a date.' };

	await syncLedger({ storeId });
	const out = await db.transaction(async (tx) => {
		const payoutId = await openPayoutId(tx, storeId, e.id);
		if (!payoutId) return { error: 'This payout is already marked paid.' };
		const [c] = await tx
			.select({ cents: sql`coalesce(sum(${storeLedger.storeCents}), 0)::int` })
			.from(storeLedger)
			.where(and(eq(storeLedger.storeId, storeId), isNull(storeLedger.payoutId)));
		await tx
			.update(storeLedger)
			.set({ payoutId })
			.where(and(eq(storeLedger.storeId, storeId), isNull(storeLedger.payoutId)));
		const [s] = rowsOf(
			await tx.execute(sql`
				SELECT
					coalesce(sum(gross_cents) FILTER (WHERE entry_type = 'sale'), 0)::int AS gross,
					coalesce(sum(gross_cents) FILTER (WHERE entry_type = 'refund'), 0)::int AS refunds,
					coalesce(sum(fee_cents), 0)::int AS fees,
					coalesce(sum(store_cents) FILTER (WHERE entry_type = 'adjustment'), 0)::int AS adjust,
					coalesce(sum(store_cents), 0)::int AS owed
				FROM store_ledger WHERE payout_id = ${payoutId}`)
		);
		await tx
			.update(storePayout)
			.set({
				status: 'paid',
				grossCents: Number(s.gross),
				refundCents: Number(s.refunds),
				feeCents: Number(s.fees),
				adjustCents: Number(s.adjust),
				carriedCents: Number(c?.cents || 0),
				amountCents: Number(s.owed),
				paidAt,
				paidBy: actorId,
				method,
				reference:
					String(input.reference || '')
						.trim()
						.slice(0, 120) || null,
				note:
					String(input.note || '')
						.trim()
						.slice(0, 500) || null
			})
			.where(eq(storePayout.id, payoutId));
		return { amountCents: Number(s.owed) };
	});
	if (!out.error) {
		await log(
			storeId,
			actorId,
			'payout_paid',
			e.id,
			`${e.title}: $${(out.amountCents / 100).toFixed(2)} by ${method}`,
			{
				amountCents: out.amountCents
			}
		);
	}
	return out;
}

/**
 * Add money to (or take it off) a store's payout for one of its events,
 * with the reason. After that event's payout was paid, it's carried into
 * the next one.
 *
 * @param {{ eventId: string, amount: string, note: string }} input amount in dollars, negative to deduct
 */
export async function addAdjustment(storeId, input, actorId) {
	const e = await storeEvent(storeId, input.eventId);
	if (!e) return { error: 'Choose one of this store’s events.' };
	const amount = Number(
		String(input.amount || '')
			.trim()
			.replace(/^\$/, '')
	);
	if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 100000) {
		return { error: 'Enter an amount in dollars, negative to take money off.' };
	}
	const note = String(input.note || '')
		.trim()
		.slice(0, 300);
	if (!note) return { error: 'Say why, so the store can see the reason.' };
	const cents = Math.round(amount * 100);
	await db.transaction(async (tx) => {
		const payoutId = await openPayoutId(tx, storeId, e.id);
		await tx.insert(storeLedger).values({
			storeId,
			entryType: 'adjustment',
			eventId: e.id,
			grossCents: 0,
			feeCents: 0,
			storeCents: cents,
			ageCents: -cents,
			statementMonth: monthOf(e.eventDate),
			note,
			createdBy: actorId,
			payoutId
		});
	});
	await log(storeId, actorId, 'payout_adjusted', e.id, note, { amountCents: cents });
	return { amountCents: cents };
}

/** Every payout of a store as CSV, for the store's records or AGE's books. */
export async function payoutsCsv(storeId) {
	const { payouts } = await storePayouts(storeId);
	const money = (c) => (c / 100).toFixed(2);
	const cell = (v) => {
		const s = v == null ? '' : String(v);
		return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
	};
	const head = [
		'Event date',
		'Event',
		'State',
		'Players',
		'Ticket sales',
		'Refunds',
		'Card fees',
		'Adjustments',
		'Carried in',
		'Payout',
		'Paid on',
		'Method',
		'Reference'
	];
	const lines = payouts.map((p) =>
		[
			p.eventDate ? new Date(p.eventDate).toISOString().slice(0, 10) : '',
			p.title,
			p.state,
			p.players,
			money(p.gross),
			money(p.refunds),
			money(p.fees),
			money(p.adjust),
			money(p.carried),
			money(p.owed),
			p.paidAt ? new Date(p.paidAt).toISOString().slice(0, 10) : '',
			p.method,
			p.reference
		]
			.map(cell)
			.join(',')
	);
	return [head.join(','), ...lines].join('\n') + '\n';
}
