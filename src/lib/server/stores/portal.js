/**
 * The store side of the franchise model: what the people who run a local
 * game store see and do at /store/[slug]. Who can get in, the store's
 * home figures, creating and editing its events (live as soon as they're
 * saved), event staff, and its members.
 *
 * Admins can open any store and act as an owner.
 */
import { and, asc, desc, eq, gte, isNull, lt, ne, or, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '$lib/server/db/index.js';
import {
	circuit,
	event,
	eventStaff,
	standing,
	store,
	storeMember,
	ticket,
	user
} from '$lib/server/db/schema.js';
import { isAdmin } from '$lib/server/auth/roles.js';
import { bump } from '$lib/server/cache/index.js';
import { parseDatetimeLocal, wallClockNow } from '$lib/server/dates.js';
import { publish, staffTopic } from '$lib/server/realtime.js';
import { eventPeriod } from '$lib/server/standings/rebuild.js';
import { accountFor, addMember, logStoreActivity, removeMember, setMemberRole } from './admin.js';

export const FORMATS = [
	'Classic Constructed',
	'Draft',
	'Silver Age',
	'Blitz',
	'Living Legend',
	'Sealed'
];

const nameOf = (u) => `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;

// ---------------------------------------------------------------- access

/**
 * The store at this slug, if this account may run it: its members, and
 * admins (who act as owners). Null otherwise.
 * @returns {Promise<null | { store: any, circuit: any, role: 'owner' | 'manager', viaAdmin: boolean }>}
 */
export async function storeAccess(account, slug) {
	if (!account) return null;
	const [row] = await db
		.select({ store, circuit, role: storeMember.role })
		.from(store)
		.innerJoin(circuit, eq(circuit.id, store.circuitId))
		.leftJoin(
			storeMember,
			and(eq(storeMember.storeId, store.id), eq(storeMember.userId, account.id))
		)
		.where(eq(store.slug, slug))
		.limit(1);
	if (!row) return null;
	if (row.role) return { store: row.store, circuit: row.circuit, role: row.role, viaAdmin: false };
	if (isAdmin(account))
		return { store: row.store, circuit: row.circuit, role: 'owner', viaAdmin: true };
	return null;
}

/** True if this account runs the store that runs this event. */
export async function runsEventStore(account, eventId) {
	if (!account) return false;
	const [row] = await db
		.select({ one: sql`1` })
		.from(event)
		.innerJoin(storeMember, eq(storeMember.storeId, event.storeId))
		.where(and(eq(event.id, eventId), eq(storeMember.userId, account.id)))
		.limit(1);
	return !!row;
}

/**
 * True if this account can work event day for this event: assigned as
 * staff, or a member of the store that runs it.
 */
export async function canWorkEvent(account, eventId) {
	if (!account) return false;
	const [assigned] = await db
		.select({ one: sql`1` })
		.from(eventStaff)
		.where(and(eq(eventStaff.userId, account.id), eq(eventStaff.eventId, eventId)))
		.limit(1);
	if (assigned) return true;
	try {
		return await runsEventStore(account, eventId);
	} catch {
		return false; // before migration 045
	}
}

// ---------------------------------------------------------------- reading

const PLAYERS = sql`(SELECT coalesce(sum(coalesce(t.quantity, 1)), 0)::int FROM ticket t
	WHERE t.event_id = events.id AND coalesce(t.refunded, false) = false AND t.voided_at IS NULL)`;
const SALES = sql`(SELECT coalesce(sum(t.amount_paid), 0)::float FROM ticket t
	WHERE t.event_id = events.id AND coalesce(t.refunded, false) = false AND t.voided_at IS NULL)`;

/** The store's events, newest first, with players and ticket sales. */
export async function storeEvents(storeId) {
	return db
		.select({
			id: event.id,
			title: event.title,
			location: event.location,
			eventDate: event.eventDate,
			status: event.status,
			price: event.price,
			format: event.format,
			playerCap: event.playerCap,
			players: PLAYERS,
			sales: SALES
		})
		.from(event)
		.where(eq(event.storeId, storeId))
		.orderBy(desc(event.eventDate));
}

/** One of the store's events, with its staff. Null if it isn't the store's. */
export async function storeEvent(storeId, eventId) {
	const [row] = await db
		.select({ event, players: PLAYERS, sales: SALES })
		.from(event)
		.where(and(eq(event.id, eventId), eq(event.storeId, storeId)))
		.limit(1);
	if (!row) return null;
	const staff = await db
		.select({
			userId: eventStaff.userId,
			firstName: user.firstName,
			lastName: user.lastName,
			email: user.email
		})
		.from(eventStaff)
		.innerJoin(user, eq(user.id, eventStaff.userId))
		.where(eq(eventStaff.eventId, eventId))
		.orderBy(asc(eventStaff.createdAt));
	return { ...row.event, players: row.players, sales: row.sales, staff };
}

/** What the store is owed now: closed-out events not paid yet, and money carried. */
export { storeOwed as storeOwedCents } from './payouts.js';

export async function storeMembers(storeId) {
	return db
		.select({
			userId: storeMember.userId,
			role: storeMember.role,
			createdAt: storeMember.createdAt,
			firstName: user.firstName,
			lastName: user.lastName,
			email: user.email
		})
		.from(storeMember)
		.innerJoin(user, eq(user.id, storeMember.userId))
		.where(eq(storeMember.storeId, storeId))
		.orderBy(sql`${storeMember.role} = 'owner' DESC`, asc(storeMember.createdAt));
}

// ---------------------------------------------------------------- events

/**
 * Read and check the event form. The circuit is the store's, and the
 * month follows the date (standings file under it).
 * @param {FormData} form
 * @param {{ store: any, circuit: any }} where
 * @returns {{ values?: any, error?: string }}
 */
export function eventForm(form, { store: s, circuit: c }) {
	const text = (k) => String(form.get(k) ?? '').trim();
	const title = text('title');
	const location = text('location');
	const format = text('format');
	const when = text('eventDate');
	if (!title) return { error: 'Give the event a title.' };
	if (!location) return { error: 'Say where it’s played.' };
	if (!FORMATS.includes(format)) return { error: 'Pick a format.' };
	const eventDate = when ? parseDatetimeLocal(when) : null;
	if (!eventDate || Number.isNaN(eventDate.getTime()))
		return { error: 'Pick the date and start time.' };

	const priceRaw = text('price');
	const price = Number(priceRaw);
	if (priceRaw === '' || !Number.isFinite(price) || price < 0 || price > 10000) {
		return { error: 'The entry fee is a dollar amount, 0 or more.' };
	}
	const capRaw = text('playerCap');
	const playerCap = capRaw ? Number(capRaw) : null;
	if (playerCap != null && (!Number.isInteger(playerCap) || playerCap < 1 || playerCap > 2000)) {
		return { error: 'The player cap is a whole number, or leave it blank for no cap.' };
	}

	return {
		values: {
			title: title.slice(0, 140),
			location: location.slice(0, 140),
			address: text('address').slice(0, 240) || null,
			format,
			eventDate,
			month: eventPeriod(eventDate).monthName,
			circuit: c.name,
			price: price.toFixed(2),
			playerCap,
			description: text('description').slice(0, 5000) || null,
			gemIdRequired: form.get('gemIdRequired') === 'on',
			premiumDiscount: form.get('premiumDiscount') === 'on',
			storeId: s.id
		}
	};
}

/** Create an event for the store. Live straight away. */
export async function createStoreEvent(where, values, actorId) {
	if (!where.store.active) return { error: 'This store is inactive, so it can’t add events.' };
	const id = nanoid(10);
	await db.insert(event).values({ ...values, id, status: 'upcoming', createdBy: actorId });
	await logStoreActivity(where.store.id, actorId, 'event_created', {
		eventId: id,
		note: values.title
	});
	await bump('events');
	return { id };
}

/**
 * Save changes to one of the store's events. Once tickets are sold the
 * entry fee stays as it was (players paid it).
 */
export async function updateStoreEvent(where, eventId, values, actorId) {
	const current = await storeEvent(where.store.id, eventId);
	if (!current) return { error: 'That event isn’t this store’s.' };
	if (['completed', 'cancelled'].includes(current.status || '')) {
		return { error: `This event is ${current.status}, so it can’t be changed.` };
	}
	const set = { ...values };
	delete set.storeId;
	let priceKept = false;
	if (current.players > 0 && Number(set.price) !== Number(current.price)) {
		set.price = current.price;
		priceKept = true;
	}
	if (set.playerCap != null && set.playerCap < current.players) {
		return {
			error: `${current.players} players already have tickets, so the cap can’t be lower than that.`
		};
	}
	await db.update(event).set(set).where(eq(event.id, eventId));
	const changed = Object.keys(set).filter(
		(k) => String(set[k] ?? '') !== String(current[k] ?? '') && k !== 'month'
	);
	await logStoreActivity(where.store.id, actorId, 'event_updated', {
		eventId,
		note: set.title,
		data: { changed }
	});
	await bump('events');
	return { ok: true, priceKept };
}

/** Cancel one of the store's events, only while nobody holds a ticket. */
export async function cancelStoreEvent(where, eventId, actorId) {
	const current = await storeEvent(where.store.id, eventId);
	if (!current) return { error: 'That event isn’t this store’s.' };
	if (current.status === 'cancelled') return { error: 'It’s already cancelled.' };
	if (current.status === 'completed') return { error: 'It has already happened.' };
	if (current.players > 0) {
		return {
			error: `${current.players} ${current.players === 1 ? 'player has' : 'players have'} tickets, and they need refunds. Write to AGE to cancel it.`
		};
	}
	await db.update(event).set({ status: 'cancelled' }).where(eq(event.id, eventId));
	const staff = await db
		.delete(eventStaff)
		.where(eq(eventStaff.eventId, eventId))
		.returning({ userId: eventStaff.userId });
	await logStoreActivity(where.store.id, actorId, 'event_cancelled', {
		eventId,
		note: current.title
	});
	await bump('events', ...staff.map((s) => `user:${s.userId}`));
	return { ok: true };
}

/** Add an AGE account as staff for one of the store's events. */
export async function addEventStaff(where, eventId, who, actorId) {
	const current = await storeEvent(where.store.id, eventId);
	if (!current) return { error: 'That event isn’t this store’s.' };
	if (['completed', 'cancelled'].includes(current.status || '')) {
		return { error: `This event is ${current.status}.` };
	}
	if (!who || (typeof who === 'string' && !who.trim())) return { error: 'Find the person to add.' };
	const account = await accountFor(who);
	if (!account) {
		return {
			error:
				typeof who === 'object'
					? 'That account no longer exists.'
					: `No AGE account uses ${who.trim()}. They need to sign up first.`
		};
	}
	if (current.staff.some((s) => s.userId === account.id)) {
		return { error: `${nameOf(account)} is already on staff.` };
	}
	await db.insert(eventStaff).values({ userId: account.id, eventId, assignedBy: actorId });
	await logStoreActivity(where.store.id, actorId, 'staff_added', {
		eventId,
		note: `${nameOf(account)} · ${current.title}`
	});
	await bump(`user:${account.id}`);
	return { ok: true, name: nameOf(account) };
}

export async function removeEventStaff(where, eventId, userId, actorId) {
	const current = await storeEvent(where.store.id, eventId);
	if (!current) return { error: 'That event isn’t this store’s.' };
	const gone = current.staff.find((s) => s.userId === userId);
	if (!gone) return { error: 'They aren’t on staff.' };
	await db
		.delete(eventStaff)
		.where(and(eq(eventStaff.eventId, eventId), eq(eventStaff.userId, userId)));
	await logStoreActivity(where.store.id, actorId, 'staff_removed', {
		eventId,
		note: `${nameOf(gone)} · ${current.title}`
	});
	await bump(`user:${userId}`);
	return { ok: true };
}

// ---------------------------------------------------------------- members

const owners = async (storeId) =>
	(await storeMembers(storeId)).filter((m) => m.role === 'owner').map((m) => m.userId);

/** Owners add people (or change an existing member's role). */
export async function ownerAddMember(where, who, role, actorId) {
	if (where.role !== 'owner') return { error: 'Only owners can add people.' };
	const account = await accountFor(who);
	if (account) {
		const own = await owners(where.store.id);
		if (role === 'manager' && own.length === 1 && own[0] === account.id) {
			return { error: 'The store needs at least one owner.' };
		}
	}
	return addMember(where.store.id, who, role, actorId);
}

export async function ownerSetRole(where, userId, role, actorId) {
	if (where.role !== 'owner') return { error: 'Only owners can change roles.' };
	const own = await owners(where.store.id);
	if (role === 'manager' && own.length === 1 && own[0] === userId) {
		return { error: 'The store needs at least one owner. Make someone else an owner first.' };
	}
	return setMemberRole(where.store.id, userId, role, actorId);
}

export async function ownerRemove(where, userId, actorId) {
	if (where.role !== 'owner') return { error: 'Only owners can remove people.' };
	const own = await owners(where.store.id);
	if (own.length === 1 && own[0] === userId) {
		return { error: 'The store needs at least one owner. Make someone else an owner first.' };
	}
	return removeMember(where.store.id, userId, actorId);
}

// ---------------------------------------------------------------- event day

/**
 * Who's signed up for one of the store's events: name, GEM ID, when they
 * signed up and what they paid, whether they're Premium, whether this is
 * their first AGE Open, and whether staff have entered them into GEM.
 * Refunded and voided tickets come last. No emails (stores don't see them).
 */
export async function eventRoster(eventId) {
	const rows = await db
		.select({
			ticketId: ticket.id,
			code: ticket.code,
			firstName: ticket.firstName,
			lastName: ticket.lastName,
			gemId: ticket.gemId,
			quantity: ticket.quantity,
			amountPaid: ticket.amountPaid,
			refunded: ticket.refunded,
			voidedAt: ticket.voidedAt,
			enteredIntoGem: ticket.enteredIntoGem,
			createdAt: ticket.createdAt,
			userId: ticket.userId,
			accountFirst: user.firstName,
			accountLast: user.lastName,
			role: user.role,
			// Tickets to any earlier AGE Open, by account or GEM ID.
			earlier: sql`(SELECT count(*)::int FROM ticket t2 JOIN events e2 ON e2.id = t2.event_id
				WHERE t2.id <> ticket.id AND coalesce(t2.refunded, false) = false
				AND e2.event_date < (SELECT e3.event_date FROM events e3 WHERE e3.id = ticket.event_id)
				AND ((ticket.user_id IS NOT NULL AND t2.user_id = ticket.user_id)
					OR (coalesce(ticket.gem_id, '') <> '' AND t2.gem_id = ticket.gem_id)))`
		})
		.from(ticket)
		.leftJoin(user, eq(user.id, ticket.userId))
		.where(eq(ticket.eventId, eventId))
		.orderBy(asc(ticket.createdAt));
	return rows
		.map((r) => {
			const first = r.firstName || r.accountFirst || '';
			const last = r.lastName || r.accountLast || '';
			return {
				ticketId: r.ticketId,
				code: r.code,
				name: `${first} ${last}`.trim() || 'Player',
				initials: `${first[0] || ''}${last[0] || ''}`.toUpperCase() || '?',
				gemId: r.gemId || null,
				seats: r.quantity || 1,
				paid: Number(r.amountPaid || 0),
				premium: r.role === 'premium' || r.role === 'admin',
				firstOpen: r.earlier === 0,
				entered: !!r.enteredIntoGem,
				out: !!r.refunded || !!r.voidedAt,
				outReason: r.refunded ? 'Refunded' : r.voidedAt ? 'Voided' : null,
				signedUpAt: r.createdAt
			};
		})
		.sort((a, b) => Number(a.out) - Number(b.out));
}

/** Mark a player entered into GEM (or not), live on every staff device. */
export async function setGemEntry(where, eventId, ticketId, entered) {
	const ev = await storeEvent(where.store.id, eventId);
	if (!ev) return { error: 'That event isn’t this store’s.' };
	const rows = await db
		.update(ticket)
		.set({ enteredIntoGem: entered })
		.where(and(eq(ticket.id, ticketId), eq(ticket.eventId, eventId)))
		.returning({ id: ticket.id });
	if (!rows.length) return { error: 'That ticket isn’t for this event.' };
	await bump('tickets');
	await publish(staffTopic(eventId), 'gem', { ticketId: rows[0].id, entered });
	return { ok: true };
}

// ---------------------------------------------------------------- the season

export const SEASON_EVENTS = 8;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Played once it's completed or its day is over (as the public tracker counts). */
const played = (e, now) =>
	e.status === 'completed' ||
	e.status === 'in_progress' ||
	(e.eventDate && new Date(e.eventDate).getTime() + 86400000 <= now.getTime());

/** The store's season in three numbers, for the header's meter. */
export async function seasonCounts(where, at = new Date()) {
	const now = wallClockNow(where.circuit.timezone, at);
	const year = now.getUTCFullYear();
	const rows = await db
		.select({ eventDate: event.eventDate, status: event.status })
		.from(event)
		.where(
			and(
				eq(event.storeId, where.store.id),
				gte(event.eventDate, new Date(Date.UTC(year, 0, 1))),
				lt(event.eventDate, new Date(Date.UTC(year + 1, 0, 1))),
				or(isNull(event.status), ne(event.status, 'cancelled'))
			)
		);
	const done = rows.filter((e) => played(e, now)).length;
	return { year, played: done, scheduled: rows.length - done, target: SEASON_EVENTS };
}

/**
 * The store's season at a glance, and the AGE season around it: its eight
 * slots, which months have an event, the next event, every circuit's
 * progress, the season's totals and the circuit's leaders.
 */
export async function seasonDashboard(where, at = new Date()) {
	const now = wallClockNow(where.circuit.timezone, at);
	const year = now.getUTCFullYear();
	const from = new Date(Date.UTC(year, 0, 1));
	const to = new Date(Date.UTC(year + 1, 0, 1));
	const inSeason = and(
		gte(event.eventDate, from),
		lt(event.eventDate, to),
		or(isNull(event.status), ne(event.status, 'cancelled'))
	);

	const [mine, all, totals, leaders] = await Promise.all([
		db
			.select({
				id: event.id,
				title: event.title,
				eventDate: event.eventDate,
				status: event.status,
				playerCap: event.playerCap,
				players: PLAYERS,
				sales: SALES
			})
			.from(event)
			.where(and(eq(event.storeId, where.store.id), inSeason))
			.orderBy(asc(event.eventDate)),
		db
			.select({ circuit: event.circuit, eventDate: event.eventDate, status: event.status })
			.from(event)
			.where(inSeason),
		db.execute(sql`SELECT count(DISTINCT e.id)::int AS events,
				coalesce(sum(coalesce(t.quantity, 1)) FILTER (WHERE t.id IS NOT NULL), 0)::int AS players
			FROM events e LEFT JOIN ticket t ON t.event_id = e.id
				AND coalesce(t.refunded, false) = false AND t.voided_at IS NULL
			WHERE e.event_date >= ${from.toISOString()}::timestamptz
				AND e.event_date < ${to.toISOString()}::timestamptz
				AND coalesce(e.status, 'upcoming') <> 'cancelled'`),
		db
			.select({
				name: standing.playerName,
				gemId: standing.gemId,
				points: standing.totalPoints
			})
			.from(standing)
			.where(and(eq(standing.season, String(year)), eq(standing.circuit, where.circuit.name)))
			.orderBy(desc(standing.totalPoints))
			.limit(5)
	]);

	const slots = Array.from({ length: SEASON_EVENTS }, (_, i) => {
		const e = mine[i];
		if (!e) return null;
		return { ...e, played: played(e, now) };
	});
	const months = MONTHS.map((label, m) => {
		const evs = mine.filter((e) => new Date(e.eventDate).getUTCMonth() === m);
		return {
			label,
			month: m,
			past: m < now.getUTCMonth(),
			current: m === now.getUTCMonth(),
			events: evs.map((e) => ({
				id: e.id,
				day: new Date(e.eventDate).getUTCDate(),
				played: played(e, now)
			}))
		};
	});
	const done = mine.filter((e) => played(e, now)).length;
	const next = mine.find((e) => !played(e, now)) || null;
	// The first month from now on without an event: the one to schedule next.
	const gap = months.find((m) => !m.past && !m.events.length) || null;

	const circuits = (
		await db
			.select()
			.from(circuit)
			.where(eq(circuit.active, true))
			.orderBy(asc(circuit.sort), asc(circuit.name))
	).map((c) => {
		const evs = all.filter((e) => (e.circuit || '').trim().toLowerCase() === c.name.toLowerCase());
		const p = evs.filter((e) => played(e, now)).length;
		return {
			name: c.name,
			short: c.short,
			color: c.color,
			mine: c.id === where.circuit.id,
			played: p,
			scheduled: evs.length - p,
			open: Math.max(0, SEASON_EVENTS - evs.length)
		};
	});

	const t = (totals.rows || totals)[0] || {};
	return {
		year,
		now: now.getTime(),
		target: SEASON_EVENTS,
		slots,
		months,
		done,
		scheduled: mine.length - done,
		toSchedule: Math.max(0, SEASON_EVENTS - mine.length),
		next,
		gap,
		players: mine.reduce((n, e) => n + e.players, 0),
		sales: mine.reduce((n, e) => n + e.sales, 0),
		circuits,
		age: { events: Number(t.events || 0), players: Number(t.players || 0) },
		leaders
	};
}

/**
 * Every scheduled AGE Open between two dates, across all circuits, for the
 * store calendar: so a store can see what's on before picking a date.
 */
export async function ageCalendar(from, to) {
	return db
		.select({
			id: event.id,
			title: event.title,
			eventDate: event.eventDate,
			status: event.status,
			circuit: event.circuit,
			location: event.location,
			storeId: event.storeId,
			storeName: store.name,
			players: PLAYERS
		})
		.from(event)
		.leftJoin(store, eq(store.id, event.storeId))
		.where(
			and(
				gte(event.eventDate, from),
				lt(event.eventDate, to),
				or(isNull(event.status), ne(event.status, 'cancelled'))
			)
		)
		.orderBy(asc(event.eventDate));
}
