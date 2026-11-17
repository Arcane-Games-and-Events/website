/**
 * The admin side of circuits and stores (migration 045): the overview,
 * creating and editing circuits and stores, a store's members, linking
 * events to a store, and the program row. Payouts and the card fee are in
 * payouts.js.
 *
 * Every write here is admin-only; the route checks that before calling.
 */
import { and, asc, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import {
	circuit,
	event,
	store,
	storeActivity,
	storeMember,
	storeProgram,
	user
} from '$lib/server/db/schema.js';
import sharp from 'sharp';
import { bump } from '$lib/server/cache/index.js';
import { getSupabase, DESK_MEDIA_BUCKET } from '$lib/server/supabase.js';
import { CIRCUITS_TAG } from './circuits.js';
import { owedSql, storePayouts, syncLedger } from './payouts.js';

// A missing table (045) or column (050) means a migration still needs applying.
export const missingStores = (err) =>
	['42P01', '42703'].includes(err?.code) || ['42P01', '42703'].includes(err?.cause?.code);

/** "Bay Area Games" → "bay-area-games". */
export function slugify(text) {
	return String(text || '')
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60);
}

/** Record what happened in a store. Never fails the action it describes. */
export async function logStoreActivity(storeId, actorId, kind, { eventId, note, data } = {}) {
	try {
		await db.insert(storeActivity).values({
			storeId,
			actorId: actorId || null,
			kind,
			eventId: eventId || null,
			note: note || null,
			data: data || null
		});
	} catch (err) {
		console.error('[stores] activity not recorded:', err?.message || err);
	}
}

// ---------------------------------------------------------------- reading

/** The program row: the card fee taken from stores' ticket sales. */
export async function getProgram() {
	const [row] = await db.select().from(storeProgram).where(eq(storeProgram.id, 1)).limit(1);
	return row || { id: 1, feePct: '0.0290', feeFixedCents: 30 };
}

/**
 * Every circuit with its stores, and per store: members, events this
 * month and upcoming, players and ticket revenue this month, and what's
 * owed (ledger rows in statements not yet paid).
 */
export async function storesOverview(now = new Date()) {
	// As text: raw SQL parameters don't take Date objects.
	const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
	const nextMonth = new Date(
		Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
	).toISOString();

	// Write any new ticket sales and refunds into the ledger first.
	await syncLedger();
	const [circuits, stores, program] = await Promise.all([
		db.select().from(circuit).orderBy(asc(circuit.sort), asc(circuit.name)),
		db
			.select({
				id: store.id,
				circuitId: store.circuitId,
				name: store.name,
				slug: store.slug,
				city: store.city,
				state: store.state,
				active: store.active,
				createdAt: store.createdAt,
				members: sql`(SELECT count(*)::int FROM store_member m WHERE m.store_id = store.id)`,
				owners: sql`(SELECT coalesce(string_agg(trim(coalesce(u.first_name, '') || ' ' || coalesce(u.last_name, '')), ', ' ORDER BY m.created_at), '')
					FROM store_member m JOIN "user" u ON u.id = m.user_id
					WHERE m.store_id = store.id AND m.role = 'owner')`,
				eventsMonth: sql`(SELECT count(*)::int FROM events e WHERE e.store_id = store.id
					AND e.event_date >= ${monthStart}::timestamptz AND e.event_date < ${nextMonth}::timestamptz
					AND coalesce(e.status, 'upcoming') <> 'cancelled')`,
				upcoming: sql`(SELECT count(*)::int FROM events e WHERE e.store_id = store.id
					AND e.event_date >= now() AND coalesce(e.status, 'upcoming') <> 'cancelled')`,
				playersMonth: sql`(SELECT coalesce(sum(coalesce(t.quantity, 1)), 0)::int
					FROM ticket t JOIN events e ON e.id = t.event_id
					WHERE e.store_id = store.id AND e.event_date >= ${monthStart}::timestamptz AND e.event_date < ${nextMonth}::timestamptz
					AND coalesce(t.refunded, false) = false AND t.voided_at IS NULL)`,
				revenueMonth: sql`(SELECT coalesce(sum(t.amount_paid), 0)::float
					FROM ticket t JOIN events e ON e.id = t.event_id
					WHERE e.store_id = store.id AND e.event_date >= ${monthStart}::timestamptz AND e.event_date < ${nextMonth}::timestamptz
					AND coalesce(t.refunded, false) = false AND t.voided_at IS NULL)`,
				// Open payouts of closed-out events, plus money carried (payouts.js).
				owedCents: owedSql(sql`store.id`)
			})
			.from(store)
			.orderBy(asc(store.name)),
		getProgram()
	]);

	const byCircuit = circuits.map((c) => ({
		...c,
		stores: stores.filter((s) => s.circuitId === c.id)
	}));
	const sum = (k) => stores.reduce((n, s) => n + Number(s[k] || 0), 0);
	return {
		circuits: byCircuit,
		program,
		totals: {
			circuits: circuits.filter((c) => c.active).length,
			stores: stores.filter((s) => s.active).length,
			members: sum('members'),
			eventsMonth: sum('eventsMonth'),
			playersMonth: sum('playersMonth'),
			revenueMonth: sum('revenueMonth'),
			owedCents: sum('owedCents')
		}
	};
}

/** One circuit by slug, with its stores. */
export async function circuitDetail(slug) {
	const [c] = await db.select().from(circuit).where(eq(circuit.slug, slug)).limit(1);
	if (!c) return null;
	const stores = await db
		.select({ id: store.id, name: store.name, slug: store.slug, active: store.active })
		.from(store)
		.where(eq(store.circuitId, c.id))
		.orderBy(asc(store.name));
	const { events, history } = await circuitHistory(c.name);
	return { circuit: c, stores, events, history };
}

/**
 * What still refers to a circuit by name: events, standings, heroes and
 * matches. A circuit with any of these can be made inactive, not deleted.
 */
async function circuitHistory(name) {
	const res = await db.execute(sql`SELECT
		(SELECT count(*)::int FROM events WHERE lower(trim(circuit)) = lower(${name})) AS events,
		(SELECT count(*)::int FROM standings WHERE lower(trim(circuit)) = lower(${name})) AS standings,
		(SELECT count(*)::int FROM event_player_heroes WHERE lower(trim(circuit)) = lower(${name})) AS heroes,
		(SELECT count(*)::int FROM matches WHERE lower(trim(circuit)) = lower(${name})) AS matches`);
	const r = (res.rows || res)[0] || {};
	const history = {
		events: Number(r.events || 0),
		standings: Number(r.standings || 0),
		heroes: Number(r.heroes || 0),
		matches: Number(r.matches || 0)
	};
	return { events: history.events, history };
}

/** One store by slug: its circuit, members, events, statements and activity. */
export async function storeDetail(slug) {
	const [row] = await db
		.select({ store, circuit })
		.from(store)
		.innerJoin(circuit, eq(circuit.id, store.circuitId))
		.where(eq(store.slug, slug))
		.limit(1);
	if (!row) return null;
	const s = row.store;

	const [members, events, unlinked, payouts, activity, program] = await Promise.all([
		db
			.select({
				userId: storeMember.userId,
				role: storeMember.role,
				createdAt: storeMember.createdAt,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				gemId: user.gemId
			})
			.from(storeMember)
			.innerJoin(user, eq(user.id, storeMember.userId))
			.where(eq(storeMember.storeId, s.id))
			.orderBy(sql`${storeMember.role} = 'owner' DESC`, asc(storeMember.createdAt)),
		db
			.select({
				id: event.id,
				title: event.title,
				eventDate: event.eventDate,
				status: event.status,
				price: event.price,
				playerCap: event.playerCap,
				players: sql`(SELECT coalesce(sum(coalesce(t.quantity, 1)), 0)::int FROM ticket t
					WHERE t.event_id = events.id AND coalesce(t.refunded, false) = false AND t.voided_at IS NULL)`,
				revenue: sql`(SELECT coalesce(sum(t.amount_paid), 0)::float FROM ticket t
					WHERE t.event_id = events.id AND coalesce(t.refunded, false) = false AND t.voided_at IS NULL)`
			})
			.from(event)
			.where(eq(event.storeId, s.id))
			.orderBy(desc(event.eventDate)),
		// Events in this circuit that no store runs yet, to link here.
		db
			.select({ id: event.id, title: event.title, eventDate: event.eventDate })
			.from(event)
			.where(
				and(isNull(event.storeId), sql`lower(trim(${event.circuit})) = lower(${row.circuit.name})`)
			)
			.orderBy(desc(event.eventDate))
			.limit(50),
		storePayouts(s.id),
		db
			.select({
				id: storeActivity.id,
				kind: storeActivity.kind,
				note: storeActivity.note,
				eventId: storeActivity.eventId,
				data: storeActivity.data,
				createdAt: storeActivity.createdAt,
				actorFirst: user.firstName,
				actorLast: user.lastName
			})
			.from(storeActivity)
			.leftJoin(user, eq(user.id, storeActivity.actorId))
			.where(eq(storeActivity.storeId, s.id))
			.orderBy(desc(storeActivity.createdAt))
			.limit(40),
		getProgram()
	]);

	return {
		store: s,
		circuit: row.circuit,
		members,
		events,
		unlinked,
		payouts,
		activity,
		program,
		owedCents: payouts.owedCents
	};
}

// ---------------------------------------------------------------- writing

const CIRCUIT_FIELDS = ['name', 'short', 'region', 'timezone', 'color', 'blurb'];

/**
 * Read and check a circuit form. Returns { values } or { error }.
 * @param {FormData} form
 */
export function circuitForm(form) {
	const v = Object.fromEntries(CIRCUIT_FIELDS.map((f) => [f, String(form.get(f) ?? '').trim()]));
	if (!v.name) return { error: 'Give the circuit a name.' };
	if (!v.short) return { error: 'Give the circuit a short name, like “LA”.' };
	if (!/^#[0-9a-fA-F]{6}$/.test(v.color)) return { error: 'Pick a colour.' };
	try {
		new Intl.DateTimeFormat('en-US', { timeZone: v.timezone });
	} catch {
		return { error: 'Pick a time zone.' };
	}
	return {
		values: {
			name: v.name,
			short: v.short.toUpperCase().slice(0, 6),
			region: v.region || null,
			timezone: v.timezone,
			color: v.color.toLowerCase(),
			blurb: v.blurb || null,
			sort: Number(form.get('sort')) || 0
		}
	};
}

/**
 * Make a circuit active or inactive. Inactive circuits drop out of the
 * AGE Open's circuit lists, filters and the homepage; their events,
 * standings and stores stay. Only from the danger zone, after two
 * confirmations (the page asks, then the browser does); `confirmed` is the
 * page's "yes" and is checked here too.
 * @param {string} circuitId
 * @param {boolean} active
 * @param {{ confirmed: boolean }} opts
 */
export async function setCircuitActive(circuitId, active, { confirmed }) {
	if (!confirmed) return { error: 'Confirm the change first.' };
	const [c] = await db.select().from(circuit).where(eq(circuit.id, circuitId)).limit(1);
	if (!c) return { error: 'That circuit no longer exists.' };
	if (c.active === active)
		return { error: `${c.name} is already ${active ? 'active' : 'inactive'}.` };
	await db.update(circuit).set({ active, updatedAt: new Date() }).where(eq(circuit.id, c.id));
	await bump(CIRCUITS_TAG);
	return { ok: true, name: c.name, active };
}

export async function createCircuit(values) {
	const slug = slugify(values.name);
	if (!slug) return { error: 'That name needs at least one letter or number.' };
	const clash = await db
		.select({ id: circuit.id })
		.from(circuit)
		.where(sql`lower(${circuit.name}) = lower(${values.name}) OR ${circuit.slug} = ${slug}`)
		.limit(1);
	if (clash.length) return { error: 'There is already a circuit with that name.' };
	const [row] = await db
		.insert(circuit)
		.values({ ...values, slug })
		.returning();
	await bump(CIRCUITS_TAG);
	return { circuit: row };
}

/**
 * Update a circuit. Renaming also renames it on every event, standing,
 * hero and match that holds the old name, in one transaction, so nothing
 * loses its circuit.
 */
export async function updateCircuit(id, values) {
	const [old] = await db.select().from(circuit).where(eq(circuit.id, id)).limit(1);
	if (!old) return { error: 'That circuit no longer exists.' };
	const renamed = old.name !== values.name;
	if (renamed) {
		const clash = await db
			.select({ id: circuit.id })
			.from(circuit)
			.where(sql`lower(${circuit.name}) = lower(${values.name}) AND ${circuit.id} <> ${id}`)
			.limit(1);
		if (clash.length) return { error: 'There is already a circuit with that name.' };
	}
	await db.transaction(async (tx) => {
		await tx
			.update(circuit)
			.set({ ...values, updatedAt: new Date() })
			.where(eq(circuit.id, id));
		if (renamed) {
			for (const table of ['events', 'standings', 'event_player_heroes', 'matches']) {
				await tx.execute(
					sql`UPDATE ${sql.identifier(table)} SET circuit = ${values.name} WHERE circuit = ${old.name}`
				);
			}
		}
	});
	await bump(CIRCUITS_TAG, ...(renamed ? ['events', 'standings', 'vods'] : []));
	return { ok: true, renamed };
}

const STORE_FIELDS = ['name', 'address', 'city', 'state', 'website', 'phone', 'contactEmail'];

/**
 * Read and check a store form. Returns { values } or { error }.
 * @param {FormData} form
 */
export function storeForm(form) {
	const v = Object.fromEntries(STORE_FIELDS.map((f) => [f, String(form.get(f) ?? '').trim()]));
	if (!v.name) return { error: 'Give the store a name.' };
	const circuitId = String(form.get('circuitId') || '');
	if (!circuitId) return { error: 'Pick the store’s circuit.' };
	if (v.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.contactEmail)) {
		return { error: 'That contact email doesn’t look right.' };
	}
	let website = v.website;
	if (website && !/^https?:\/\//i.test(website)) website = `https://${website}`;
	return {
		values: {
			name: v.name,
			circuitId,
			address: v.address || null,
			city: v.city || null,
			state: v.state || null,
			website: website || null,
			phone: v.phone || null,
			contactEmail: v.contactEmail || null,
			active: form.has('hasActive') ? form.get('active') === 'on' : true
		}
	};
}

/** An AGE account by email, or null. */
export async function accountByEmail(email) {
	const e = String(email || '')
		.trim()
		.toLowerCase();
	if (!e) return null;
	const [row] = await db
		.select({ id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email })
		.from(user)
		.where(sql`lower(${user.email}) = ${e}`)
		.limit(1);
	return row || null;
}

/**
 * The account someone picked: by id (from the search box) or by email
 * (typed in full). Null when there's no such account.
 * @param {string | { userId: string }} who
 */
export async function accountFor(who) {
	if (who && typeof who === 'object' && who.userId) {
		const [row] = await db
			.select({
				id: user.id,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email
			})
			.from(user)
			.where(eq(user.id, String(who.userId)))
			.limit(1);
		return row || null;
	}
	return accountByEmail(/** @type {string} */ (who));
}

/** Who a form picked: the search box's userId, or an email typed in full. */
export const pickedFrom = (form) =>
	form.get('userId') ? { userId: String(form.get('userId')) } : String(form.get('email') || '');

const notFound = (who) =>
	typeof who === 'object' ? 'That account no longer exists.' : noAccount(String(who || '').trim());

/** Create a store, optionally with its first owner. */
export async function createStore(values, { ownerEmail, ownerId, actorId } = {}) {
	let owner = null;
	if (ownerId) {
		owner = await accountFor({ userId: ownerId });
		if (!owner) return { error: 'That account no longer exists.' };
	} else if (ownerEmail) {
		owner = await accountByEmail(ownerEmail);
		if (!owner) return { error: noAccount(ownerEmail) };
	}
	let slug = slugify(values.name) || 'store';
	const taken = await db
		.select({ slug: store.slug })
		.from(store)
		.where(sql`${store.slug} = ${slug} OR ${store.slug} LIKE ${slug + '-%'}`);
	if (taken.some((t) => t.slug === slug)) {
		let n = 2;
		while (taken.some((t) => t.slug === `${slug}-${n}`)) n++;
		slug = `${slug}-${n}`;
	}
	const row = await db.transaction(async (tx) => {
		const [s] = await tx
			.insert(store)
			.values({ ...values, slug, createdBy: actorId || null })
			.returning();
		if (owner) {
			await tx
				.insert(storeMember)
				.values({ storeId: s.id, userId: owner.id, role: 'owner', addedBy: actorId || null });
		}
		return s;
	});
	await logStoreActivity(row.id, actorId, 'store_created', { note: row.name });
	if (owner) {
		await logStoreActivity(row.id, actorId, 'member_added', {
			note: nameOf(owner),
			data: { userId: owner.id, role: 'owner' }
		});
		await bump(`user:${owner.id}`);
	}
	return { store: row };
}

export async function updateStore(id, values, actorId) {
	await db
		.update(store)
		.set({ ...values, updatedAt: new Date() })
		.where(eq(store.id, id));
	await logStoreActivity(id, actorId, 'store_updated');
	return { ok: true };
}

const nameOf = (u) => `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email;
async function nameById(id) {
	const [u] = await db
		.select({ firstName: user.firstName, lastName: user.lastName, email: user.email })
		.from(user)
		.where(eq(user.id, id))
		.limit(1);
	return u ? nameOf(u) : null;
}
const noAccount = (email) =>
	`No AGE account uses ${email}. They need to sign up first, with that email.`;

/** Add an account to a store, or change its role if it's already there. */
export async function addMember(storeId, who, role, actorId) {
	if (!['owner', 'manager'].includes(role)) return { error: 'Pick owner or manager.' };
	if (!who || (typeof who === 'string' && !who.trim())) return { error: 'Find the person to add.' };
	const account = await accountFor(who);
	if (!account) return { error: notFound(who) };
	const [existing] = await db
		.select({ role: storeMember.role })
		.from(storeMember)
		.where(and(eq(storeMember.storeId, storeId), eq(storeMember.userId, account.id)))
		.limit(1);
	if (existing?.role === role) return { error: `${nameOf(account)} is already a ${role}.` };
	await db
		.insert(storeMember)
		.values({ storeId, userId: account.id, role, addedBy: actorId || null })
		.onConflictDoUpdate({ target: [storeMember.storeId, storeMember.userId], set: { role } });
	await logStoreActivity(storeId, actorId, existing ? 'member_role' : 'member_added', {
		note: nameOf(account),
		data: { userId: account.id, role }
	});
	await bump(`user:${account.id}`);
	return { ok: true, name: nameOf(account), changed: !!existing };
}

export async function setMemberRole(storeId, userId, role, actorId) {
	if (!['owner', 'manager'].includes(role)) return { error: 'Pick owner or manager.' };
	const [m] = await db
		.update(storeMember)
		.set({ role })
		.where(and(eq(storeMember.storeId, storeId), eq(storeMember.userId, userId)))
		.returning();
	if (!m) return { error: 'That person isn’t in this store.' };
	await logStoreActivity(storeId, actorId, 'member_role', {
		note: await nameById(userId),
		data: { userId, role }
	});
	return { ok: true };
}

export async function removeMember(storeId, userId, actorId) {
	const [m] = await db
		.delete(storeMember)
		.where(and(eq(storeMember.storeId, storeId), eq(storeMember.userId, userId)))
		.returning();
	if (!m) return { error: 'That person isn’t in this store.' };
	await logStoreActivity(storeId, actorId, 'member_removed', {
		note: await nameById(userId),
		data: { userId, role: m.role }
	});
	await bump(`user:${userId}`);
	return { ok: true };
}

/**
 * Link existing events to a store (or unlink with storeId null). Only
 * events in the store's circuit can be linked.
 */
export async function linkEvents(storeId, eventIds, actorId) {
	const ids = eventIds.filter(Boolean);
	if (!ids.length) return { error: 'Pick at least one event.' };
	const [s] = await db
		.select({ circuitName: circuit.name })
		.from(store)
		.innerJoin(circuit, eq(circuit.id, store.circuitId))
		.where(eq(store.id, storeId))
		.limit(1);
	if (!s) return { error: 'That store no longer exists.' };
	const linked = await db
		.update(event)
		.set({ storeId })
		.where(
			and(
				inArray(event.id, ids),
				isNull(event.storeId),
				sql`lower(trim(${event.circuit})) = lower(${s.circuitName})`
			)
		)
		.returning({ id: event.id, title: event.title });
	for (const e of linked) {
		await logStoreActivity(storeId, actorId, 'event_linked', { eventId: e.id, note: e.title });
	}
	await bump('events');
	return { ok: true, count: linked.length };
}

export async function unlinkEvent(storeId, eventId, actorId) {
	const [e] = await db
		.update(event)
		.set({ storeId: null })
		.where(and(eq(event.id, eventId), eq(event.storeId, storeId)))
		.returning({ id: event.id, title: event.title });
	if (!e) return { error: 'That event isn’t linked to this store.' };
	await logStoreActivity(storeId, actorId, 'event_unlinked', { eventId: e.id, note: e.title });
	await bump('events');
	return { ok: true };
}

// ---------------------------------------------------------------- pictures

/** Largest upload accepted; what's stored is a resized WebP. */
export const MAX_CIRCUIT_IMAGE_BYTES = 20 * 1024 * 1024;
const IMAGE_TYPES = /^image\/(jpeg|png|webp|avif|heic|heif)$/i;
// Wide, like the event cards and banners it fills.
const IMAGE_W = 1600;
const IMAGE_H = 900;

/**
 * Upload a circuit's picture, replacing any old one (whose file is
 * deleted). Cropped to 16:9 around the most interesting part, saved as
 * WebP in the Desk's storage bucket under circuits/.
 * @param {string} circuitId
 * @param {File} file
 * @param {{ storage?: any }} [opts] the Supabase client (tests pass a fake)
 */
export async function setCircuitImage(circuitId, file, { storage = getSupabase() } = {}) {
	if (!file || typeof file.arrayBuffer !== 'function' || !file.size) {
		return { error: 'Choose a picture to upload.' };
	}
	if (file.type && !IMAGE_TYPES.test(file.type)) {
		return { error: 'Use a JPEG, PNG, WebP, AVIF or HEIC picture.' };
	}
	if (file.size > MAX_CIRCUIT_IMAGE_BYTES) return { error: 'Pictures must be 20 MB or smaller.' };
	const [c] = await db.select().from(circuit).where(eq(circuit.id, circuitId)).limit(1);
	if (!c) return { error: 'That circuit no longer exists.' };

	let out;
	try {
		out = await sharp(Buffer.from(await file.arrayBuffer()), { failOn: 'none' })
			.rotate()
			.resize(IMAGE_W, IMAGE_H, { fit: 'cover', position: 'attention' })
			.webp({ quality: 82 })
			.toBuffer();
	} catch {
		return { error: 'That file couldn’t be read as a picture. Try a JPEG or PNG.' };
	}
	if (!storage) return { error: 'Storage isn’t set up here.' };
	const bucket = storage.storage.from(DESK_MEDIA_BUCKET);
	const path = `circuits/${c.slug}-${crypto.randomUUID().slice(0, 8)}.webp`;
	const { error } = await bucket.upload(path, out, {
		contentType: 'image/webp',
		cacheControl: '31536000'
	});
	if (error) return { error: `Couldn’t save the picture: ${error.message}` };
	const url = bucket.getPublicUrl(path).data.publicUrl;

	await db
		.update(circuit)
		.set({ imageUrl: url, imagePath: path, updatedAt: new Date() })
		.where(eq(circuit.id, circuitId));
	if (c.imagePath) await bucket.remove([c.imagePath]).catch(() => {});
	await bump(CIRCUITS_TAG);
	return { ok: true, url };
}

/** Remove a circuit's uploaded picture (the built-in one shows again). */
export async function removeCircuitImage(circuitId, { storage = getSupabase() } = {}) {
	const [c] = await db.select().from(circuit).where(eq(circuit.id, circuitId)).limit(1);
	if (!c) return { error: 'That circuit no longer exists.' };
	if (!c.imagePath) return { error: 'There’s no uploaded picture to remove.' };
	await db
		.update(circuit)
		.set({ imageUrl: null, imagePath: null, updatedAt: new Date() })
		.where(eq(circuit.id, circuitId));
	await storage?.storage
		.from(DESK_MEDIA_BUCKET)
		.remove([c.imagePath])
		.catch(() => {});
	await bump(CIRCUITS_TAG);
	return { ok: true };
}

// ---------------------------------------------------------------- deleting

/**
 * Delete a circuit, for good. Only an empty one: no stores, and nothing
 * that refers to it by name (events, standings, heroes, matches) — those
 * would be left pointing at a circuit that no longer exists, so a circuit
 * with history is made inactive instead. The admin types the circuit's
 * exact name to confirm, and ticks that they understand.
 * @param {string} circuitId
 * @param {{ typed: string, understood: boolean, storage?: any }} confirm
 */
export async function deleteCircuit(circuitId, { typed, understood, storage = getSupabase() }) {
	const [c] = await db.select().from(circuit).where(eq(circuit.id, circuitId)).limit(1);
	if (!c) return { error: 'That circuit no longer exists.' };
	if (String(typed ?? '').trim() !== c.name) {
		return { error: `Type the circuit’s name exactly as shown (“${c.name}”) to delete it.` };
	}
	if (!understood) return { error: 'Tick the box to confirm you understand this can’t be undone.' };

	const [{ stores }] = await db
		.select({ stores: sql`count(*)::int` })
		.from(store)
		.where(eq(store.circuitId, c.id));
	if (stores > 0) {
		return {
			error: `${c.name} still has ${stores} ${stores === 1 ? 'store' : 'stores'}. Move or remove ${stores === 1 ? 'it' : 'them'} first, or make the circuit inactive instead.`
		};
	}
	const { history } = await circuitHistory(c.name);
	const left = [
		[history.events, 'event'],
		[history.standings, 'standing'],
		[history.heroes, 'hero record'],
		[history.matches, 'match']
	].filter(([n]) => n > 0);
	if (left.length) {
		const list = left.map(([n, w]) => `${n} ${w}${n === 1 ? '' : 's'}`).join(', ');
		return {
			error: `${c.name} has history (${list}), so deleting it would leave that behind. Make it inactive instead: it disappears from public pages and its history stays.`
		};
	}

	await db.delete(circuit).where(eq(circuit.id, c.id));
	if (c.imagePath) {
		await storage?.storage
			.from(DESK_MEDIA_BUCKET)
			.remove([c.imagePath])
			.catch(() => {});
	}
	await bump(CIRCUITS_TAG);
	return { ok: true, name: c.name };
}
