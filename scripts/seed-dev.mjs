// Seed the DEV database with a year of realistic activity, or remove it.
//   node scripts/seed-dev.mjs seed
//   node scripts/seed-dev.mjs unseed
// Then `node scripts/seed-authnet.mjs run` gives the purchases real
// Authorize.net SANDBOX records. `unseed` cancels those subscriptions too.
// Everything written is marked: user ids `seed-u…`, event ids `seed-ev-…`,
// transaction ids `seed-tx-…`, ticket codes `SEED…`, order meta.seed=true,
// analytics ids starting `5eed`. `unseed` removes exactly those rows.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const require = createRequire(`${ROOT}/package.json`);
const postgres = (await import(require.resolve('postgres'))).default;
const { Argon2id } = await import(require.resolve('oslo/password'));

const env = Object.fromEntries(
	readFileSync(`${ROOT}/.env`, 'utf8')
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
const sql = postgres(env.DATABASE_URL_DIRECT, { max: 1, prepare: false, fetch_types: false });
const mode = process.argv[2];

// ---------------------------------------------------------------- helpers
let seed = 20261028;
const rand = () => {
	seed |= 0;
	seed = (seed + 0x6d2b79f5) | 0;
	let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const int = (a, b) => a + Math.floor(rand() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const weighted = (pairs) => {
	const total = pairs.reduce((s, [, w]) => s + w, 0);
	let r = rand() * total;
	for (const [v, w] of pairs) if ((r -= w) < 0) return v;
	return pairs[0][0];
};
const hex = (n) => Array.from({ length: n }, () => '0123456789abcdef'[int(0, 15)]).join('');
const uuid = () =>
	`5eed${hex(4)}-${hex(4)}-4${hex(3)}-${pick(['8', '9', 'a', 'b'])}${hex(3)}-${hex(12)}`;
const DAY = 864e5;
const now = Date.now();
const daysAgo = (d) => new Date(now - d * DAY);
const addMonths = (d, m) => {
	const x = new Date(d);
	x.setUTCMonth(x.getUTCMonth() + m);
	return x;
};
const money = (v) => (Math.round(v * 100) / 100).toFixed(2);
const MONTHS = [
	'January',
	'February',
	'March',
	'April',
	'May',
	'June',
	'July',
	'August',
	'September',
	'October',
	'November',
	'December'
];

// jsonb and text[] columns go in as literals: type fetching is off.
const JSONB = new Set(['meta', 'depth_seconds', 'sections', 'video_bins']);
const prep = (row) => {
	const out = {};
	for (const [k, v] of Object.entries(row)) {
		if (k === 'additional_roles') out[k] = `{${(v || []).join(',')}}`;
		else if (JSONB.has(k)) out[k] = v == null ? null : sql.json(v);
		else out[k] = v;
	}
	return out;
};
async function insert(table, rows) {
	rows = rows.map(prep);
	// Rows may carry different optional columns; insert the union, nulls elsewhere.
	const all = [...new Set(rows.flatMap((r) => Object.keys(r)))];
	rows = rows.map((r) => Object.fromEntries(all.map((k) => [k, r[k] === undefined ? null : r[k]])));
	for (let i = 0; i < rows.length; i += 500) {
		const chunk = rows.slice(i, i + 500);
		const cols = Object.keys(chunk[0]);
		await sql`insert into ${sql(table)} ${sql(chunk, ...cols)}`;
	}
}

// ---------------------------------------------------------------- unseed
async function unseed() {
	const r = {};
	// Sandbox subscriptions created by seed-authnet.mjs (real numeric ids)
	const subs =
		await sql`select coalesce(subscription_id, last_subscription_id) as id from "user" where id like 'seed-%' and coalesce(subscription_id, last_subscription_id) ~ '^[0-9]+$'`;
	if (subs.length) {
		const { cancelSubscription } = await import('./seed-authnet.mjs');
		let n = 0;
		for (const { id } of subs) if (await cancelSubscription(id)) n++;
		r.sandboxSubscriptionsCancelled = `${n}/${subs.length}`;
	}
	r.ca_event = (await sql`delete from ca_event where view_id::text like '5eed%'`).count;
	r.ca_view = (await sql`delete from ca_view where id::text like '5eed%'`).count;
	r.ca_pageview = (await sql`delete from ca_pageview where id::text like '5eed%'`).count;
	r.ca_conversion = (
		await sql`delete from ca_conversion where visitor_id::text like '5eed%' or user_id like 'seed-%'`
	).count;
	r.payment = (
		await sql`delete from payment where trans_id like 'seed-%' or user_id like 'seed-%'`
	).count;
	r.ticket = (await sql`delete from ticket where code like 'SEED%'`).count;
	r.order = (
		await sql`delete from "order" where user_email like '%@seed.age.test' or provider_ref like 'seed-%'`
	).count;
	r.member_event = (await sql`delete from member_event where user_id like 'seed-%'`).count;
	r.events = (await sql`delete from events where id like 'seed-ev-%'`).count;
	r.session = (await sql`delete from session where user_id like 'seed-%'`).count;
	r.user = (await sql`delete from "user" where id like 'seed-%'`).count;
	return r;
}

// ---------------------------------------------------------------- seed
const FIRST = [
	'Avery',
	'Jordan',
	'Riley',
	'Casey',
	'Morgan',
	'Taylor',
	'Quinn',
	'Reese',
	'Skyler',
	'Emerson',
	'Dakota',
	'Rowan',
	'Sawyer',
	'Finley',
	'Harper',
	'Kai',
	'Logan',
	'Micah',
	'Noel',
	'Parker',
	'Blake',
	'Drew',
	'Elliot',
	'Hayden',
	'Jesse',
	'Kendall',
	'Lane',
	'Marlowe',
	'Nico',
	'Oakley',
	'Peyton',
	'Remy',
	'Sage',
	'Tatum',
	'Val',
	'Wren',
	'Ari',
	'Bellamy',
	'Cameron',
	'Devon'
];
const LAST = [
	'Nakamura',
	'Okafor',
	'Lindqvist',
	'Moreau',
	'Castillo',
	'Brennan',
	'Ivanova',
	'Haddad',
	'Okonkwo',
	'Petrov',
	'Silva',
	'Tanaka',
	'Whitfield',
	'Yilmaz',
	'Abernathy',
	'Bianchi',
	'Carvalho',
	'Dubois',
	'Eriksen',
	'Fontaine',
	'Gallagher',
	'Hoffmann',
	'Iqbal',
	'Jensen',
	'Kowalski',
	'Lombardi',
	'Mendes',
	'Novak',
	'Ortega',
	'Pham',
	'Quintero',
	'Rasmussen',
	'Sato',
	'Thornton',
	'Ueda',
	'Varga',
	'Walsh',
	'Xu',
	'Young',
	'Zimmerman'
];
const CIRCUITS = {
	'Los Angeles': 'Top Deck Keep',
	'St. Louis': 'St Louis LGS',
	'New England': 'Great Stories, Inc.'
};
const ENTRIES = [
	['d62c1d23-e734-46f3-a02e-ed889840e22b', 'gravy-bones-is-back', 'premium', 1, 'video', 4],
	['1bb893af-83b5-4397-839d-2d12d00d538f', 'reading-the-board-not-the-hand', 'free', 2, null, 9],
	[
		'51f2b9c6-3b56-41c5-8b66-69eff0908cca',
		'sideboarding-for-the-calling-what-changed-in-2026',
		'premium',
		2,
		null,
		6
	],
	[
		'9039aaaa-ba4b-4e88-ad09-cbb1d129630b',
		'behind-the-booth-commentating-the-top-8',
		'free',
		2,
		null,
		5
	],
	[
		'eb9d4877-86b4-49df-a19b-b1192ae23c9b',
		'dispatch-from-los-angeles-three-hundred-players-and-one-very-long-round-six',
		'free',
		2,
		null,
		8
	],
	[
		'dbcdf7c8-5414-47af-ab32-cfbd9a7fde5e',
		'hala-in-the-current-meta-is-the-bladesaint-still-worth-the-vow',
		'premium',
		2,
		null,
		7
	],
	[
		'459bc64b-7844-4458-9663-ec4b31acd075',
		'set-review-the-ten-cards-that-will-define-the-next-calling',
		'premium',
		2,
		null,
		10
	],
	[
		'54983c2a-5dfb-4c38-9904-78cf9b48165a',
		'the-slow-burn-of-attrition-why-gravy-bones-wins-long-games',
		'free',
		2,
		null,
		6
	]
];
const COURSES = [
	'sideboarding-for-sealed',
	'mulligan-theory',
	'reading-the-board',
	'punishing-the-mirror',
	'tempo-and-tempo-loss',
	'calling-the-bluff'
];
const UPCOMING = ['LVyOqAP2kb', 'xM5B8-FOrZ', '7mhTg1P-7y', 'Jo7CqNF5xe', 'ob-dM0xV_C'];
const SOURCES = [
	['direct', 34],
	['search', 26],
	['social', 16],
	['community', 9],
	['referral', 6],
	['email', 5]
];
const REFERRERS = {
	search: ['google.com', 'bing.com', 'duckduckgo.com'],
	social: ['x.com', 'youtube.com', 'instagram.com', 'bsky.app'],
	community: ['reddit.com', 'discord.com'],
	referral: ['fabtcg.com', 'fabrary.net', 'thefabcube.com'],
	email: ['mail.google.com'],
	direct: [null]
};
const DEVICES = [
	['mobile', 55],
	['desktop', 40],
	['tablet', 5]
];
const BROWSERS = {
	mobile: [
		['Safari', 55],
		['Chrome', 40],
		['Samsung Internet', 5]
	],
	desktop: [
		['Chrome', 60],
		['Safari', 20],
		['Firefox', 12],
		['Edge', 8]
	],
	tablet: [
		['Safari', 70],
		['Chrome', 30]
	]
};
const OS = {
	mobile: [
		['iOS', 58],
		['Android', 42]
	],
	desktop: [
		['macOS', 45],
		['Windows', 48],
		['Linux', 7]
	],
	tablet: [
		['iOS', 75],
		['Android', 25]
	]
};
const COUNTRIES = [
	['US', 78],
	['CA', 7],
	['GB', 5],
	['AU', 4],
	['DE', 2],
	['FR', 1],
	['JP', 1],
	['NZ', 1],
	['SE', 1]
];

function premiumDiscountFor(price, eventDate) {
	if (new Date(eventDate) < new Date('2026-04-14T00:00:00Z'))
		return Math.round(price * 0.1 * 100) / 100;
	return Math.min(10, price);
}

async function seedAll() {
	const hashed = await new Argon2id().hash('seedpass123');
	const out = {};

	// ---------------- users
	const users = [];
	const used = new Set();
	for (let i = 1; i <= 100; i++) {
		let first, last, email;
		do {
			first = pick(FIRST);
			last = pick(LAST);
			email = `${first}.${last}${i}@seed.age.test`.toLowerCase();
		} while (used.has(email));
		used.add(email);
		// account age: weighted toward the last six months
		const ageDays = weighted([
			[int(0, 60), 35],
			[int(60, 180), 35],
			[int(180, 365), 30]
		]);
		users.push({
			id: `seed-u${String(i).padStart(3, '0')}`,
			email,
			first,
			last,
			created_at: daysAgo(ageDays),
			gem_id: rand() < 0.6 ? String(int(10000000, 99999999)) : null,
			role: 'free',
			kind: 'free'
		});
	}
	// membership mix: 27 paying, 4 comped, 4 lapsed
	const shuffled = [...users].sort(() => rand() - 0.5);
	const paying = shuffled.slice(0, 27);
	const comped = shuffled.slice(27, 31);
	const lapsed = shuffled.slice(31, 35);
	const memberEvents = [];
	const payments = [];
	const orders = [];
	let subN = 0,
		txN = 0;
	const tx = () => `seed-tx-${String(++txN).padStart(5, '0')}`;

	for (const u of paying) {
		const type = rand() < 0.74 ? 'monthly' : 'yearly';
		const ageDays = Math.round((now - u.created_at.getTime()) / DAY);
		const start = daysAgo(int(0, Math.max(1, ageDays - 1)));
		const subId = `seed-sub-${String(++subN).padStart(3, '0')}`;
		const partner = rand() < 0.12 && type === 'monthly';
		// status: mostly active, a few cancelled (still in paid period), one failed
		let status = weighted([
			['active', 85],
			['cancelled', 11],
			['payment_failed', 4]
		]);
		const price = type === 'monthly' ? 10 : 110;
		Object.assign(u, {
			role: 'premium',
			kind: 'paying',
			subscription_id: subId,
			last_subscription_id: subId,
			subscription_type: type,
			subscription_status: status,
			subscription_start_date: start,
			used_partner_code: partner ? 'SEEDPARTNER' : null
		});
		// charges: first, then renewals up to today
		const periods = [];
		let d = new Date(start);
		let n = 1;
		while (d.getTime() <= now) {
			periods.push({ at: new Date(d), n });
			d = addMonths(d, type === 'monthly' ? 1 : 12);
			n++;
		}
		u.next_billing_date = status === 'active' ? d : null;
		if (status === 'cancelled') u.subscription_end_date = d;
		if (status === 'payment_failed') {
			u.subscription_end_date = new Date(periods.at(-1).at.getTime() + 7 * DAY);
			periods.pop(); // the last charge failed
		}
		periods.forEach((p, i) => {
			const first = i === 0;
			const amount = first && partner ? 5 : price;
			payments.push({
				trans_id: tx(),
				kind: first ? (partner ? 'sub_promo_first' : 'sub_first') : 'sub_renewal',
				user_id: u.id,
				user_email: u.email,
				subscription_id: subId,
				subscription_type: type,
				pay_num: p.n,
				amount: money(amount),
				list_amount: money(price),
				discount_amount: money(first && partner ? price - 5 : 0),
				discount_kind: first && partner ? 'partner' : null,
				promo_code: first && partner ? 'SEEDPARTNER' : null,
				occurred_at: p.at,
				refunded_amount: '0.00',
				refunded_at: null,
				source: 'backfill',
				verified_at: p.at
			});
			if (first)
				orders.push({
					id: uuid(),
					refunded_at: null,
					provider: 'authnet',
					provider_ref: subId,
					user_email: u.email,
					amount: money(amount),
					currency: 'USD',
					meta: {
						type: partner ? 'subscription_partner_first' : 'subscription',
						subscriptionId: subId,
						subscriptionType: type,
						promoCode: partner ? 'SEEDPARTNER' : undefined,
						deferredArbAmount: partner ? String(price) : undefined,
						description: `AGE Premium ${type}`,
						seed: true
					},
					created_at: p.at
				});
		});
		memberEvents.push({
			user_id: u.id,
			kind: 'subscribed',
			subscription_id: subId,
			subscription_type: type,
			at: start,
			meta: { seed: true }
		});
		if (status === 'cancelled')
			memberEvents.push({
				user_id: u.id,
				kind: 'cancelled',
				subscription_id: subId,
				subscription_type: type,
				at: new Date(periods.at(-1).at.getTime() + int(2, 20) * DAY),
				meta: { seed: true }
			});
		if (status === 'payment_failed')
			memberEvents.push({
				user_id: u.id,
				kind: 'payment_failed',
				subscription_id: subId,
				subscription_type: type,
				at: new Date(u.subscription_end_date.getTime() - 7 * DAY),
				meta: { seed: true }
			});
	}
	for (const u of comped) {
		const reason = pick(['staff', 'writer', 'teacher', 'partner', 'friend', 'trial']);
		const at = daysAgo(int(5, 300));
		Object.assign(u, {
			role: 'premium',
			kind: 'comped',
			comp_reason: reason,
			comped_at: at,
			comped_by: 'seed-u001' === u.id ? null : null
		});
		memberEvents.push({ user_id: u.id, kind: 'comped', reason, at, meta: { seed: true } });
	}
	for (const u of lapsed) {
		const subId = `seed-sub-${String(++subN).padStart(3, '0')}`;
		const start = daysAgo(int(200, 360));
		const months = int(2, 6);
		Object.assign(u, {
			role: 'free',
			kind: 'lapsed',
			last_subscription_id: subId,
			subscription_type: 'monthly',
			subscription_status: 'expired',
			subscription_start_date: start
		});
		let d = new Date(start);
		for (let n = 1; n <= months; n++) {
			payments.push({
				trans_id: tx(),
				kind: n === 1 ? 'sub_first' : 'sub_renewal',
				user_id: u.id,
				user_email: u.email,
				subscription_id: subId,
				subscription_type: 'monthly',
				pay_num: n,
				amount: '10.00',
				list_amount: '10.00',
				discount_amount: '0.00',
				discount_kind: null,
				promo_code: null,
				occurred_at: new Date(d),
				refunded_amount: '0.00',
				refunded_at: null,
				source: 'backfill',
				verified_at: new Date(d)
			});
			if (n === 1)
				orders.push({
					id: uuid(),
					refunded_at: null,
					provider: 'authnet',
					provider_ref: subId,
					user_email: u.email,
					amount: '10.00',
					currency: 'USD',
					meta: {
						type: 'subscription',
						subscriptionId: subId,
						subscriptionType: 'monthly',
						description: 'AGE Premium monthly',
						seed: true
					},
					created_at: new Date(d)
				});
			d = addMonths(d, 1);
		}
		memberEvents.push({
			user_id: u.id,
			kind: 'subscribed',
			subscription_id: subId,
			subscription_type: 'monthly',
			at: start,
			meta: { seed: true }
		});
		memberEvents.push({
			user_id: u.id,
			kind: 'expired',
			subscription_id: subId,
			subscription_type: 'monthly',
			at: d,
			meta: { seed: true }
		});
	}

	await insert(
		'user',
		users.map((u) => ({
			id: u.id,
			email: u.email,
			hashed_password: hashed,
			first_name: u.first,
			last_name: u.last,
			gem_id: u.gem_id,
			role: u.role,
			additional_roles: u.kind === 'comped' && u.comp_reason === 'writer' ? ['writer'] : [],
			subscription_id: u.subscription_id ?? null,
			subscription_type: u.subscription_type ?? null,
			subscription_status: u.subscription_status ?? null,
			subscription_start_date: u.subscription_start_date ?? null,
			subscription_end_date: u.subscription_end_date ?? null,
			next_billing_date: u.next_billing_date ?? null,
			used_partner_code: u.used_partner_code ?? null,
			comp_reason: u.comp_reason ?? null,
			comped_at: u.comped_at ?? null,
			comped_by: null,
			last_subscription_id: u.last_subscription_id ?? null,
			created_at: u.created_at
		}))
	);
	out.users = users.length;

	// ---------------- past events
	const events = [];
	const circuits = Object.keys(CIRCUITS);
	for (let i = 0; i < 9; i++) {
		const date = new Date(now - (330 - i * 36 + int(-6, 6)) * DAY);
		date.setUTCHours(17, 0, 0, 0);
		const circuit = circuits[i % 3];
		const format = weighted([
			['Classic Constructed', 70],
			['Blitz', 15],
			['Sealed', 15]
		]);
		events.push({
			id: `seed-ev-${String(i + 1).padStart(2, '0')}`,
			title: 'AGE Open Series',
			location: CIRCUITS[circuit],
			address: null,
			price: money(format === 'Classic Constructed' ? 40 : format === 'Blitz' ? 30 : 35),
			format,
			gem_id_required: true,
			circuit,
			month: MONTHS[date.getUTCMonth()],
			event_date: date,
			description: `AGE Open ${circuit} · ${format}`,
			premium_discount: true,
			player_cap: 64,
			status: 'completed',
			closed_at: new Date(date.getTime() + 8 * 3600e3),
			created_at: new Date(date.getTime() - 60 * DAY)
		});
	}
	await insert('events', events);
	out.events = events.length;

	// ---------------- tickets
	const tickets = [];
	const ticketOrders = [];
	const ticketPayments = [];
	const ticketConversions = [];
	let codeN = 0;
	for (const ev of events) {
		const buyers = [...users]
			.sort(() => rand() - 0.5)
			.slice(0, int(18, 46))
			.filter((u) => u.created_at.getTime() < ev.event_date.getTime() - DAY);
		for (const u of buyers) {
			const premiumAt =
				u.role === 'premium' &&
				(!u.subscription_start_date ||
					u.subscription_start_date.getTime() < ev.event_date.getTime());
			const price = Number(ev.price);
			const discount = premiumAt ? premiumDiscountFor(price, ev.event_date) : 0;
			const paid = price - discount;
			const at = new Date(ev.event_date.getTime() - int(1, 30) * DAY - int(0, 20) * 3600e3);
			const refunded = rand() < 0.05;
			const refundedAt = refunded ? new Date(at.getTime() + int(1, 5) * DAY) : null;
			const code = `SEED${String(++codeN).padStart(5, '0')}`;
			const transId = tx();
			const orderId = uuid();
			const ticketId = uuid();
			ticketOrders.push({
				id: orderId,
				provider: 'authnet',
				provider_ref: transId,
				user_email: u.email,
				amount: money(paid),
				currency: 'USD',
				meta: {
					type: 'ticket',
					eventId: ev.id,
					eventTitle: ev.title,
					ticketCode: code,
					gemId: u.gem_id,
					transactionId: transId,
					premiumDiscount: premiumAt,
					cardLastFour: String(int(1000, 9999)),
					ticketId,
					seed: true
				},
				created_at: at,
				refunded_at: refundedAt
			});
			tickets.push({
				id: ticketId,
				user_id: u.id,
				event_id: ev.id,
				order_id: orderId,
				code,
				quantity: 1,
				first_name: u.first,
				last_name: u.last,
				gem_id: u.gem_id,
				amount_paid: money(paid),
				transaction_id: transId,
				refunded,
				refunded_at: refundedAt,
				entered_into_gem: true,
				created_at: at
			});
			ticketPayments.push({
				trans_id: transId,
				kind: 'ticket',
				user_id: u.id,
				user_email: u.email,
				order_id: orderId,
				ticket_id: ticketId,
				event_id: ev.id,
				amount: money(paid),
				list_amount: money(price),
				discount_amount: money(discount),
				discount_kind: discount ? 'premium_event' : null,
				occurred_at: at,
				refunded_amount: refunded ? money(paid) : '0.00',
				refunded_at: refundedAt,
				source: 'backfill',
				verified_at: at
			});
			ticketConversions.push({ user: u, at, eventId: ev.id, amount: paid, premium: premiumAt });
		}
	}
	await insert('order', [...orders, ...ticketOrders]);
	await insert('ticket', tickets);
	await insert('payment', [...payments, ...ticketPayments]);
	await insert('member_event', memberEvents);
	out.tickets = tickets.length;
	out.orders = orders.length + ticketOrders.length;
	out.payments = payments.length + ticketPayments.length;

	// ---------------- browsing
	const pageviews = [];
	const views = [];
	const caEvents = [];
	const conversions = [];
	const anonVisitors = Array.from({ length: 900 }, () => ({
		id: uuid(),
		device: weighted(DEVICES),
		country: weighted(COUNTRIES),
		user: null
	}));
	for (const u of users)
		u.visitor = { id: uuid(), device: weighted(DEVICES), country: weighted(COUNTRIES), user: u };

	function audienceOf(v, at) {
		if (!v.user) return 'anonymous';
		const u = v.user;
		if (
			u.role === 'premium' &&
			(!u.subscription_start_date || u.subscription_start_date.getTime() <= at)
		)
			return 'premium';
		if (u.kind === 'comped' && u.comped_at.getTime() <= at) return 'premium';
		return 'free';
	}
	function session(v, startAt, paths, opts = {}) {
		const sid = uuid();
		const source = opts.source || weighted(SOURCES);
		const refDomain = pick(REFERRERS[source]);
		const browser = weighted(BROWSERS[v.device]);
		const os = weighted(OS[v.device]);
		const audience = audienceOf(v, startAt);
		let at = startAt;
		let prev = null;
		const ids = [];
		paths.forEach((path, i) => {
			const id = uuid();
			ids.push(id);
			const visible = int(4, path.startsWith('/library/') ? 420 : 150);
			pageviews.push({
				id,
				visitor_id: v.id,
				session_id: sid,
				user_id: v.user?.id ?? null,
				audience,
				path,
				route: path.startsWith('/library/')
					? '/library/[slug]'
					: path.startsWith('/age-open/')
						? '/age-open/[eventId]'
						: path.startsWith('/academy/')
							? '/academy/[slug]'
							: path,
				entry_id: null,
				view_id: null,
				source: i === 0 ? source : 'internal',
				referrer_domain: i === 0 && source !== 'direct' ? refDomain : null,
				from_path: prev,
				utm_source: null,
				utm_medium: null,
				utm_campaign: null,
				device: v.device,
				browser,
				os,
				country: v.country,
				viewport_w:
					v.device === 'mobile'
						? pick([390, 393, 412, 430])
						: v.device === 'tablet'
							? pick([768, 820, 1024])
							: pick([1280, 1440, 1536, 1920]),
				started_at: new Date(at),
				last_seen_at: new Date(at + visible * 1000),
				visible_seconds: visible
			});
			const m = path.match(/^\/library\/([^/]+)$/);
			const entry = m && ENTRIES.find((e) => e[1] === m[1]);
			if (entry) {
				const [entryId, , access, readTime, video, weight] = entry;
				const gated = access === 'premium' && audience !== 'premium';
				const readSec = readTime * 60;
				const engaged = gated
					? int(5, 40)
					: Math.max(3, Math.round(readSec * (0.15 + rand() * 1.1)));
				const depth = gated ? int(10, 35) : Math.min(100, Math.round(20 + rand() * 90));
				const completed = !gated && depth >= 90 && engaged >= readSec * 0.5;
				const bins = Array.from({ length: 20 }, (_, b) =>
					b * 5 < depth ? int(1, Math.max(1, Math.round(engaged / 12))) : 0
				);
				const isVideo = !!video;
				const vid = uuid();
				views.push({
					id: vid,
					entry_id: entryId,
					visitor_id: v.id,
					session_id: sid,
					user_id: v.user?.id ?? null,
					audience,
					gated,
					kind: isVideo ? 'article+video' : 'article',
					started_at: new Date(at),
					last_seen_at: new Date(at + visible * 1000),
					qualified: rand() < 0.93,
					source: i === 0 ? source : 'internal',
					referrer_domain: i === 0 && source !== 'direct' ? refDomain : null,
					from_path: prev,
					utm_source: null,
					utm_medium: null,
					utm_campaign: null,
					device: v.device,
					browser,
					os,
					country: v.country,
					viewport_w: pageviews.at(-1).viewport_w,
					visible_seconds: Math.max(visible, engaged),
					engaged_seconds: engaged,
					max_depth: depth,
					depth_seconds: bins,
					sections: {},
					completed,
					video_seconds: isVideo && !gated ? int(30, 600) : 0,
					video_duration: isVideo ? 720 : null,
					video_max_pct: isVideo && !gated ? int(10, 100) : 0,
					video_bins: isVideo ? Array.from({ length: 20 }, () => int(0, 40)) : [],
					video_plays: isVideo && !gated ? 1 : 0,
					video_seeks: isVideo ? int(0, 3) : 0,
					video_completed: isVideo && !gated && rand() < 0.3,
					exit_type: i === paths.length - 1 ? pick(['closed', 'external', 'closed']) : 'internal',
					exit_target: null
				});
				pageviews.at(-1).entry_id = entryId;
				pageviews.at(-1).view_id = vid;
				if (!gated && rand() < 0.18)
					caEvents.push({
						view_id: vid,
						entry_id: entryId,
						type: weighted([
							['card_hover', 50],
							['share', 12],
							['cta_click', 10],
							['decklist_open', 14],
							['link_out', 14]
						]),
						label: null,
						depth: int(10, 100),
						at: new Date(at + int(5, engaged) * 1000)
					});
				void weight;
			}
			prev = path;
			at += visible * 1000 + int(1, 20) * 1000;
		});
		return { sid, endAt: at, ids };
	}
	const entryPaths = ENTRIES.flatMap((e) => Array(e[5]).fill(`/library/${e[1]}`));
	const PAGES = [
		['/', 30],
		['/library', 14],
		['entry', 30],
		['/age-open', 10],
		['event', 5],
		['/premium', 6],
		['/academy', 3],
		['course', 2]
	];
	const randomPath = () => {
		const p = weighted(PAGES);
		if (p === 'entry') return pick(entryPaths);
		if (p === 'event') return `/age-open/${pick(UPCOMING)}`;
		if (p === 'course') return `/academy/${pick(COURSES)}`;
		return p;
	};
	// organic traffic: last 90 days, growing, with weekends and evenings busier
	for (let d = 90; d >= 0; d--) {
		const day = daysAgo(d);
		const weekend = [0, 6].includes(day.getUTCDay());
		const n = Math.round((45 + (90 - d) * 0.9) * (weekend ? 1.35 : 1) * (0.8 + rand() * 0.4));
		for (let i = 0; i < n; i++) {
			const v = rand() < 0.22 ? pick(users).visitor : pick(anonVisitors);
			const hour = weighted([
				[int(0, 7), 8],
				[int(8, 16), 35],
				[int(17, 23), 57]
			]);
			const startAt = Date.UTC(
				day.getUTCFullYear(),
				day.getUTCMonth(),
				day.getUTCDate(),
				hour,
				int(0, 59),
				int(0, 59)
			);
			const len = weighted([
				[1, 48],
				[2, 26],
				[3, 15],
				[4, 7],
				[5, 4]
			]);
			const paths = [randomPath()];
			while (paths.length < len) {
				const p = randomPath();
				if (p !== paths.at(-1)) paths.push(p);
			}
			const s = session(v, startAt, paths);
			// some premium-page visitors start checkout and a few of those are not members yet
			if (paths.includes('/premium') && rand() < 0.28) {
				conversions.push({
					visitor_id: v.id,
					session_id: s.sid,
					user_id: v.user?.id ?? null,
					kind: 'checkout_started',
					at: new Date(s.endAt),
					path: '/premium',
					meta: null
				});
			}
		}
	}
	// the money moments: a session for every sign-up, every subscription and every ticket
	for (const u of users) {
		const at = u.created_at.getTime();
		const s = session(u.visitor, at - int(60, 900) * 1000, [
			rand() < 0.6 ? pick(entryPaths) : '/',
			'/signup'
		]);
		conversions.push({
			visitor_id: u.visitor.id,
			session_id: s.sid,
			user_id: u.id,
			kind: 'signup',
			at: new Date(at),
			path: '/signup',
			meta: null
		});
	}
	for (const u of users.filter((x) => x.subscription_start_date)) {
		const at = u.subscription_start_date.getTime();
		const s = session(
			u.visitor,
			at - int(120, 900) * 1000,
			[
				weighted([
					[pick(entryPaths), 55],
					['/', 30],
					['/library', 15]
				]),
				'/premium'
			],
			{
				source: weighted([
					['direct', 30],
					['internal', 0],
					['search', 25],
					['social', 25],
					['community', 12],
					['email', 8]
				])
			}
		);
		conversions.push({
			visitor_id: u.visitor.id,
			session_id: s.sid,
			user_id: u.id,
			kind: 'checkout_started',
			at: new Date(at - 60 * 1000),
			path: '/premium',
			meta: null
		});
		conversions.push({
			visitor_id: u.visitor.id,
			session_id: s.sid,
			user_id: u.id,
			kind: 'premium',
			at: new Date(at),
			path: '/premium',
			meta: { subscriptionType: u.subscription_type, promo: u.used_partner_code || null }
		});
	}
	for (const t of ticketConversions) {
		const at = t.at.getTime();
		const s = session(t.user.visitor, at - int(60, 600) * 1000, [
			'/age-open',
			`/age-open/${t.eventId}`
		]);
		conversions.push({
			visitor_id: t.user.visitor.id,
			session_id: s.sid,
			user_id: t.user.id,
			kind: 'ticket',
			at: new Date(at),
			path: `/age-open/${t.eventId}`,
			meta: { eventId: t.eventId, amount: t.amount, premiumDiscount: t.premium }
		});
	}
	await insert('ca_view', views);
	await insert('ca_pageview', pageviews);
	await insert('ca_event', caEvents);
	await insert('ca_conversion', conversions);
	out.pageviews = pageviews.length;
	out.contentViews = views.length;
	out.contentEvents = caEvents.length;
	out.conversions = conversions.length;
	return out;
}

async function bustCache() {
	const url = env.UPSTASH_REDIS_REST_URL,
		token = env.UPSTASH_REDIS_REST_TOKEN;
	if (!url || !token) return 'no upstash config';
	const tags = ['users', 'orders', 'tickets', 'events', 'entries', 'standings', 'vods', 'lss'];
	for (const t of tags)
		await fetch(`${url}/incr/dev:v:${t}`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${token}` }
		});
	return tags.join(', ');
}

try {
	if (mode === 'unseed') {
		console.log('removed', await unseed());
	} else if (mode === 'seed') {
		const existing = await sql`select count(*)::int as n from "user" where id like 'seed-%'`;
		if (existing[0].n) {
			console.log('Already seeded — run unseed first.');
			process.exit(1);
		}
		const summary = await seedAll();
		console.log('seeded', summary);
	} else {
		console.log('usage: node seed-dev.mjs seed|unseed');
	}
	console.log('cache bumped:', await bustCache());
} finally {
	await sql.end({ timeout: 3 });
}
