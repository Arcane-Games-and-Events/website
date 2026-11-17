/**
 * A store's players: everyone who bought a ticket to one of its events,
 * with their GEM ID, Premium status and ticket history at this store.
 * Only tickets to this store's events are read, never what a player
 * bought elsewhere, and no emails (stores don't see them).
 */
import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { event, ticket, user } from '$lib/server/db/schema.js';
import { isPremium } from '$lib/server/auth/roles.js';

/**
 * One row per player, most recent first. A player is their AGE account,
 * or (for tickets without one) their GEM ID, or their name.
 * @param {string} storeId
 */
export async function storePlayers(storeId) {
	const rows = await db
		.select({
			ticketId: ticket.id,
			userId: ticket.userId,
			firstName: ticket.firstName,
			lastName: ticket.lastName,
			gemId: ticket.gemId,
			seats: ticket.quantity,
			amountPaid: ticket.amountPaid,
			refunded: ticket.refunded,
			voidedAt: ticket.voidedAt,
			boughtAt: ticket.createdAt,
			eventId: event.id,
			title: event.title,
			eventDate: event.eventDate,
			status: event.status,
			accountFirst: user.firstName,
			accountLast: user.lastName,
			accountGem: user.gemId,
			role: user.role
		})
		.from(ticket)
		.innerJoin(event, eq(event.id, ticket.eventId))
		.leftJoin(user, eq(user.id, ticket.userId))
		.where(eq(event.storeId, storeId))
		.orderBy(desc(event.eventDate), desc(ticket.createdAt));

	const players = new Map();
	for (const r of rows) {
		const first = r.firstName || r.accountFirst || '';
		const last = r.lastName || r.accountLast || '';
		const name = `${first} ${last}`.trim();
		const gemId = r.gemId || r.accountGem || null;
		const key = r.userId
			? `u:${r.userId}`
			: gemId
				? `g:${gemId}`
				: `n:${name.toLowerCase() || r.ticketId}`;
		let p = players.get(key);
		if (!p) {
			// Rows come newest first, so the first one seen names the player.
			p = {
				key,
				name: name || 'Player',
				initials: `${first[0] || ''}${last[0] || ''}`.toUpperCase() || '?',
				gemId,
				premium: isPremium({ role: r.role }),
				hasAccount: !!r.userId,
				events: 0,
				spent: 0,
				lastEventDate: r.eventDate,
				firstBoughtAt: r.boughtAt,
				history: []
			};
			players.set(key, p);
		}
		if (!p.gemId && gemId) p.gemId = gemId;
		const out = !!r.refunded || !!r.voidedAt;
		const paid = Number(r.amountPaid || 0);
		if (!out) {
			p.spent += paid;
			if (!p.history.some((h) => h.eventId === r.eventId && !h.out)) p.events += 1;
		}
		if (r.boughtAt && (!p.firstBoughtAt || r.boughtAt < p.firstBoughtAt))
			p.firstBoughtAt = r.boughtAt;
		p.history.push({
			ticketId: r.ticketId,
			eventId: r.eventId,
			title: r.title,
			eventDate: r.eventDate,
			seats: r.seats || 1,
			paid,
			boughtAt: r.boughtAt,
			out,
			state: r.refunded
				? 'refunded'
				: r.voidedAt
					? 'voided'
					: r.status === 'cancelled'
						? 'cancelled'
						: r.status === 'completed'
							? 'played'
							: 'registered'
		});
	}
	return [...players.values()].map((p) => ({ ...p, spent: Math.round(p.spent * 100) / 100 }));
}
