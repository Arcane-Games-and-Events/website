/**
 * The contact inbox: messages to AGE, answered on the site instead of by
 * email.
 *
 * Anyone can start a conversation from /contact. A signed-in person follows
 * it from their account (Account → Messages); a guest gets a private link
 * (/contact/t/<token>), which their browser also remembers, and the
 * conversation moves into their account if they later open that link
 * signed in with the same email. Admins answer from the Inbox tab in
 * /admin, where each conversation reads like an email thread, with
 * internal notes only staff see.
 *
 * Nothing here sends email. New messages show as unread counts on the
 * header menu, the account's Messages tab and the admin Inbox tab, kept
 * current live (a 'notes' event on each person's channel).
 *
 * "Unread" for staff is shared: a conversation is unread until any admin
 * opens it after the person last wrote.
 */
import { randomBytes, randomUUID } from 'node:crypto';
import { and, asc, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { contactMessage, contactThread, user as userTable } from '$lib/server/db/schema.js';
import { bump, cached } from '$lib/server/cache/index.js';
import { publish, userTopic } from '$lib/server/realtime.js';
import { adminIds } from '$lib/server/courses/notifications.js';
import { isMissingTable } from '$lib/server/contentAnalytics/collect.js';
import { LIMITS, isTopic } from '$lib/contact/topics.js';

const t = contactThread;
const m = contactMessage;

/** The cache tag for one person's unread replies, and for the staff inbox. */
const memberTag = (userId) => `contact:${userId}`;
const INBOX_TAG = 'contact:inbox';

const newToken = () => randomBytes(24).toString('base64url');

/** A person has a reply they haven't seen. */
const unreadForMember = sql`(${t.lastStaffAt} is not null and ${t.lastStaffAt} > ${t.memberReadAt})`;
/** The person wrote since an admin last opened the conversation. */
const unreadForStaff = sql`(${t.staffReadAt} is null or ${t.lastMemberAt} > ${t.staffReadAt})`;

/** The newest message the person can see, for list previews. */
const lastVisible = sql`(select json_build_object('body', left(cm.body, 200), 'fromStaff', cm.from_staff)
	from contact_message cm where cm.thread_id = contact_thread.id and not cm.internal
	order by cm.created_at desc limit 1)`;

/** Every admin's id, cached (a role change bumps 'users'). */
const cachedAdminIds = () => cached('contact:admin-ids', adminIds, { tags: ['users'] });

/**
 * Tell whoever is affected that the conversation changed: badges refresh
 * live. The cache bump and the live message go out side by side, since
 * sending waits on both.
 */
async function changed({ userId = null, staff = false }) {
	const tags = [userId && memberTag(userId), staff && INBOX_TAG];
	const topics = async () => [
		...(userId ? [userTopic(userId)] : []),
		...(staff ? (await cachedAdminIds()).map(userTopic) : [])
	];
	await Promise.all([bump(...tags), topics().then((list) => publish(list, 'notes'))]);
}

const iso = (d) => d.toISOString();

const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/**
 * Check a new message from the contact form. Signed-in people's name and
 * email come from their account.
 * @returns {{ error: string } | { value: { name: string, email: string, topic: string, subject: string, body: string } }}
 */
export function validateNew(fields, user = null) {
	const name = user
		? [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email
		: clean(fields.name, LIMITS.name);
	const email = user ? user.email : clean(fields.email, LIMITS.email).toLowerCase();
	const topic = isTopic(fields.topic) ? fields.topic : 'general';
	const subject = clean(fields.subject, LIMITS.subject);
	const body = clean(fields.body, LIMITS.body);
	if (!name) return { error: 'Tell us your name.' };
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'That email doesn’t look right.' };
	if (!subject) return { error: 'Add a subject.' };
	if (body.length < 2) return { error: 'Write your message.' };
	return { value: { name, email, topic, subject, body } };
}

/** Check a reply. */
export function validateReply(body) {
	const text = clean(body, LIMITS.body);
	return text ? { value: text } : { error: 'Write a reply first.' };
}

/**
 * Start a conversation with its first message.
 * @returns {Promise<{ id: string, token: string }>}
 */
export async function startThread({ user = null, value, ip = null, userAgent = null }) {
	const now = iso(new Date());
	const id = randomUUID();
	const token = newToken();
	const author = user?.id ?? null;
	// One statement (the thread, then its first message), so it's atomic
	// without a transaction's extra round trips.
	await db.execute(sql`with thread as (
		insert into contact_thread (id, token, user_id, name, email, topic, subject, ip, user_agent,
			created_at, last_message_at, last_member_at, member_read_at)
		values (${id}, ${token}, ${author}, ${value.name}, ${value.email}, ${value.topic}, ${value.subject},
			${ip}, ${userAgent}, ${now}::timestamptz, ${now}::timestamptz, ${now}::timestamptz, ${now}::timestamptz)
	)
	insert into contact_message (thread_id, author_id, body, created_at)
	values (${id}, ${author}, ${value.body}, ${now}::timestamptz)`);
	await changed({ staff: true });
	return { id, token };
}

// ---------------------------------------------------------------- the person

const listColumns = {
	id: t.id,
	token: t.token,
	topic: t.topic,
	subject: t.subject,
	status: t.status,
	createdAt: t.createdAt,
	lastMessageAt: t.lastMessageAt,
	unread: sql`${unreadForMember}`.mapWith(Boolean),
	last: lastVisible
};

/** A signed-in person's conversations, newest first. */
export function memberThreads(userId) {
	return db
		.select(listColumns)
		.from(t)
		.where(eq(t.userId, userId))
		.orderBy(desc(t.lastMessageAt))
		.limit(100);
}

/** A guest's conversations, from the private links their browser remembers. */
export async function threadsByTokens(tokens) {
	const list = [...new Set(tokens)].filter((x) => typeof x === 'string').slice(0, 20);
	if (!list.length) return [];
	return db
		.select(listColumns)
		.from(t)
		.where(inArray(t.token, list))
		.orderBy(desc(t.lastMessageAt));
}

/** A conversation's messages as the person sees them (no internal notes). */
/** @param {string | import("drizzle-orm").SQL} threadId an id, or a subquery for one */
async function visibleMessages(threadId) {
	return db
		.select({
			id: m.id,
			body: m.body,
			fromStaff: m.fromStaff,
			createdAt: m.createdAt,
			authorFirst: userTable.firstName
		})
		.from(m)
		.leftJoin(userTable, eq(userTable.id, m.authorId))
		.where(and(eq(m.threadId, threadId), eq(m.internal, false)))
		.orderBy(asc(m.createdAt));
}

const threadColumns = {
	id: t.id,
	token: t.token,
	userId: t.userId,
	name: t.name,
	email: t.email,
	topic: t.topic,
	subject: t.subject,
	status: t.status,
	createdAt: t.createdAt,
	lastStaffAt: t.lastStaffAt,
	memberReadAt: t.memberReadAt
};

/**
 * One conversation for the person it belongs to: by id for their account,
 * or by its private link. Null when it isn't theirs.
 */
export async function memberThread({ id = null, token = null, userId = null }) {
	const where = token ? eq(t.token, token) : and(eq(t.id, id), eq(t.userId, userId));
	if (!token && (!id || !userId)) return null;
	// The messages load alongside the conversation; they're only used if
	// it turns out to be this person's.
	const [[thread], messages] = await Promise.all([
		db.select(threadColumns).from(t).where(where).limit(1),
		visibleMessages(token ? sql`(select id from contact_thread where token = ${token})` : id)
	]);
	return thread ? { ...thread, messages } : null;
}

/**
 * Someone opened a guest conversation's link while signed in with the
 * email it was sent from: it moves into their account.
 */
export async function claimThread(thread, user) {
	if (!user || thread.userId || thread.email.toLowerCase() !== user.email.toLowerCase())
		return false;
	await db
		.update(t)
		.set({ userId: user.id })
		.where(and(eq(t.id, thread.id), isNull(t.userId)));
	thread.userId = user.id;
	await changed({ userId: user.id });
	return true;
}

/** The person saw the latest replies. */
export async function markMemberRead(thread) {
	if (!thread.lastStaffAt || thread.lastStaffAt <= thread.memberReadAt) return;
	await db.update(t).set({ memberReadAt: new Date() }).where(eq(t.id, thread.id));
	if (thread.userId) await changed({ userId: thread.userId });
}

/** The person writes back. A conversation marked done opens again. */
export async function memberReply(thread, { user = null, body }) {
	const now = iso(new Date());
	await db.execute(sql`with msg as (
		insert into contact_message (thread_id, author_id, body, created_at)
		values (${thread.id}, ${user?.id ?? null}, ${body}, ${now}::timestamptz)
	)
	update contact_thread set last_message_at = ${now}::timestamptz, last_member_at = ${now}::timestamptz,
		member_read_at = ${now}::timestamptz, status = 'open'
	where id = ${thread.id}`);
	await changed({ userId: thread.userId, staff: true });
}

// ---------------------------------------------------------------- staff

/**
 * The inbox list. filter: open (default), unread, done or all; q searches
 * names, emails, subjects and messages.
 */
export async function inbox({ filter = 'open', q = '' } = {}) {
	const conds = [];
	if (filter === 'open') conds.push(eq(t.status, 'open'));
	if (filter === 'done') conds.push(eq(t.status, 'done'));
	if (filter === 'unread') conds.push(eq(t.status, 'open'), unreadForStaff);
	const term = clean(q, 100);
	if (term) {
		const like = `%${term.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
		conds.push(
			or(
				sql`${t.name} ilike ${like}`,
				sql`${t.email} ilike ${like}`,
				sql`${t.subject} ilike ${like}`,
				sql`exists (select 1 from contact_message cm where cm.thread_id = contact_thread.id and cm.body ilike ${like})`
			)
		);
	}
	return db
		.select({
			id: t.id,
			name: t.name,
			email: t.email,
			userId: t.userId,
			topic: t.topic,
			subject: t.subject,
			status: t.status,
			lastMessageAt: t.lastMessageAt,
			unread: sql`${unreadForStaff}`.mapWith(Boolean),
			messages:
				sql`(select count(*) from contact_message cm where cm.thread_id = contact_thread.id and not cm.internal)`.mapWith(
					Number
				),
			last: lastVisible
		})
		.from(t)
		.where(conds.length ? and(...conds) : undefined)
		.orderBy(desc(t.lastMessageAt))
		.limit(200);
}

/** How many conversations are open, unread and done, for the inbox's filters. */
export async function inboxCounts() {
	const [row] = await db
		.select({
			open: sql`count(*) filter (where ${t.status} = 'open')`.mapWith(Number),
			unread: sql`count(*) filter (where ${t.status} = 'open' and ${unreadForStaff})`.mapWith(
				Number
			),
			done: sql`count(*) filter (where ${t.status} = 'done')`.mapWith(Number),
			all: sql`count(*)`.mapWith(Number)
		})
		.from(t);
	return row;
}

/** One conversation for staff: every message and note, and who wrote it. */
export async function staffThread(id) {
	// The conversation, its messages and the sender's other conversations,
	// side by side.
	const [[thread], messages, [{ others }]] = await Promise.all([
		db
			.select({
				...threadColumns,
				ip: t.ip,
				userAgent: t.userAgent,
				staffReadAt: t.staffReadAt,
				lastMemberAt: t.lastMemberAt,
				accountFirst: userTable.firstName,
				accountLast: userTable.lastName,
				accountRole: userTable.role,
				accountCreatedAt: userTable.createdAt
			})
			.from(t)
			.leftJoin(userTable, eq(userTable.id, t.userId))
			.where(eq(t.id, id))
			.limit(1),
		db
			.select({
				id: m.id,
				body: m.body,
				fromStaff: m.fromStaff,
				internal: m.internal,
				createdAt: m.createdAt,
				authorFirst: userTable.firstName,
				authorLast: userTable.lastName
			})
			.from(m)
			.leftJoin(userTable, eq(userTable.id, m.authorId))
			.where(eq(m.threadId, id))
			.orderBy(asc(m.createdAt)),
		db
			.select({ others: sql`count(*)`.mapWith(Number) })
			.from(t)
			.where(
				and(
					sql`lower(${t.email}) = (select lower(email) from contact_thread where id = ${id})`,
					sql`${t.id} <> ${id}`
				)
			)
	]);
	return thread ? { ...thread, messages, others } : null;
}

/** An admin opened the conversation. */
export async function markStaffRead(thread) {
	if (thread.staffReadAt && thread.staffReadAt >= thread.lastMemberAt) return;
	await db.update(t).set({ staffReadAt: new Date() }).where(eq(t.id, thread.id));
	await changed({ staff: true });
}

/** Back to unread, for whoever looks next. */
export async function markStaffUnread(id) {
	await db.update(t).set({ staffReadAt: null }).where(eq(t.id, id));
	await changed({ staff: true });
}

/** Open or done. */
export async function setStatus(id, status) {
	if (status !== 'open' && status !== 'done') return;
	await db.update(t).set({ status }).where(eq(t.id, id));
	await changed({ staff: true });
}

/**
 * Staff write in a conversation: a reply the person sees, or an internal
 * note. done also marks it done.
 */
export async function staffReply(thread, { staff, body, internal = false, done = false }) {
	const now = iso(new Date());
	// One statement: the message, then the conversation's dates and status.
	await db.execute(sql`with msg as (
		insert into contact_message (thread_id, author_id, from_staff, internal, body, created_at)
		values (${thread.id}, ${staff.id}, true, ${internal}, ${body}, ${now}::timestamptz)
	)
	update contact_thread set staff_read_at = ${now}::timestamptz
		${internal ? sql`` : sql`, last_message_at = ${now}::timestamptz, last_staff_at = ${now}::timestamptz`}
		${done ? sql`, status = 'done'` : sql``}
	where id = ${thread.id}`);
	await changed({ userId: internal ? null : thread.userId, staff: true });
}

// ---------------------------------------------------------------- badges

/** Unread replies for one person. */
export async function memberUnread(userId) {
	const [row] = await db
		.select({ n: sql`count(*)`.mapWith(Number) })
		.from(t)
		.where(and(eq(t.userId, userId), unreadForMember));
	return row?.n || 0;
}

/** Open conversations no admin has read since the person last wrote. */
export async function staffUnread() {
	const [row] = await db
		.select({ n: sql`count(*)`.mapWith(Number) })
		.from(t)
		.where(and(eq(t.status, 'open'), unreadForStaff));
	return row?.n || 0;
}

/**
 * The header's message counts: replies waiting for this person (messages)
 * and, for admins, unread conversations in the inbox. Zeros before
 * migration 044 or on any failure: they're badges.
 */
export async function cachedMessageCounts(user) {
	if (!user) return { messages: 0, inbox: 0 };
	try {
		const [messages, inbox] = await Promise.all([
			cached(`layout:user:${user.id}:contact`, () => memberUnread(user.id), {
				tags: [memberTag(user.id)]
			}),
			user.role === 'admin'
				? cached('layout:contact:inbox', () => staffUnread(), { tags: [INBOX_TAG] })
				: 0
		]);
		return { messages: Number(messages) || 0, inbox: Number(inbox) || 0 };
	} catch (err) {
		if (!isMissingTable(err)) console.error('[contact] counts failed:', err?.message || err);
		return { messages: 0, inbox: 0 };
	}
}
