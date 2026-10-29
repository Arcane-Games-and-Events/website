import { redirect, error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { event, ticket, user, eventStaff, decklist, match, order } from '$lib/server/db/schema.js';
import { eq, and, ilike } from 'drizzle-orm';
import {
	processTournamentResults,
	calculateFinalStandings
} from '$lib/server/tournament-processor.js';
import { bump } from '$lib/server/cache/index.js';
import { parseDatetimeLocal } from '$lib/server/dates.js';
import { listHeroNames } from '$lib/server/cards/heroes.js';
import { eventPeriod, rebuildStandings } from '$lib/server/standings/rebuild.js';
import {
	listEventHeroes,
	replaceEventHeroes,
	deleteEventHeroes
} from '$lib/server/events/heroes.js';

export async function load({ params, locals }) {
	// The admin layout only lets admins this far; tournament staff run
	// their events from /staff/[eventId]. The flags stay for the template.
	const isAdmin = true;
	const isTournamentStaff = false;

	try {
		// Fetch event details
		const [eventData] = await db.select().from(event).where(eq(event.id, params.eventId)).limit(1);

		if (!eventData) {
			throw error(404, 'Event not found');
		}

		// The stored status is the status — nothing is inferred from the date.
		// A past-dated event that was never closed just shows as such.
		if (!eventData.status) eventData.status = 'upcoming';

		// Fetch all tickets for this event with user information
		const tickets = await db
			.select({
				ticketId: ticket.id,
				ticketCode: ticket.code,
				quantity: ticket.quantity,
				firstName: ticket.firstName,
				lastName: ticket.lastName,
				gemId: ticket.gemId,
				amountPaid: ticket.amountPaid,
				transactionId: ticket.transactionId,
				refunded: ticket.refunded,
				refundedAt: ticket.refundedAt,
				enteredIntoGem: ticket.enteredIntoGem,
				createdAt: ticket.createdAt,
				userId: ticket.userId,
				userEmail: user.email
			})
			.from(ticket)
			.leftJoin(user, eq(ticket.userId, user.id))
			.where(eq(ticket.eventId, params.eventId));

		// Get non-refunded tickets as potential participants for tournament forms
		const participants = tickets
			.filter((t) => !t.refunded)
			.map((t) => ({
				...t,
				playerName: `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Unknown Player'
			}));

		// Calculate totals
		const totalRevenue = tickets
			.filter((t) => !t.refunded)
			.reduce((sum, t) => sum + parseFloat(t.amountPaid || 0), 0);

		const totalTickets = tickets.filter((t) => !t.refunded).length;
		const totalRefunded = tickets.filter((t) => t.refunded).length;

		// Fetch existing matches for this event
		const existingMatches = await db
			.select()
			.from(match)
			.where(eq(match.eventId, params.eventId))
			.orderBy(match.round);

		// Use stored tournament results if available (preserves correct Swiss standings order)
		// Fall back to computing from matches for backwards compatibility
		let existingResults = [];
		if (eventData.tournamentResults && Array.isArray(eventData.tournamentResults)) {
			existingResults = eventData.tournamentResults;
		} else if (existingMatches.length > 0) {
			// Legacy fallback: compute from matches (won't have correct Swiss rank order)
			const playerMap = new Map();
			for (const m of existingMatches) {
				if (m.player1GemId || m.player1Name) {
					const key = m.player1GemId || m.player1Name;
					if (!playerMap.has(key)) {
						playerMap.set(key, { playerId: m.player1GemId, name: m.player1Name, wins: 0 });
					}
				}
				if (m.player2GemId || m.player2Name) {
					const key = m.player2GemId || m.player2Name;
					if (!playerMap.has(key)) {
						playerMap.set(key, { playerId: m.player2GemId, name: m.player2Name, wins: 0 });
					}
				}
			}

			const swissStandings = Array.from(playerMap.values());
			const pairings = existingMatches.map((m) => ({
				round: m.round,
				table: m.table,
				player1Id: m.player1GemId,
				player1Name: m.player1Name,
				player2Id: m.player2GemId,
				player2Name: m.player2Name,
				result: m.winner === 'player1' ? '1WIN' : m.winner === 'player2' ? '2WIN' : 'DRAW'
			}));

			try {
				const standings = calculateFinalStandings(swissStandings, pairings);
				existingResults = standings.results.map((r) => ({
					playerName: r.name,
					gemId: r.playerId,
					placement: r.placement,
					wins: r.matchesWon,
					losses: r.matchesPlayed - r.matchesWon,
					draws: 0,
					agePoints: r.points,
					prizeAmount: r.prize
				}));
			} catch (err) {
				console.error('Error calculating results from matches:', err);
			}
		}

		// Fetch existing decklists for this event
		const existingDecklists = await db
			.select()
			.from(decklist)
			.where(eq(decklist.eventId, params.eventId));

		// Hero data for the metagame tab
		const existingHeroes = await listEventHeroes(eventData);

		// Standings file under the event's date; a `month` that disagrees with
		// it is flagged on the page so it can be fixed.
		const period = eventData.eventDate ? eventPeriod(eventData.eventDate) : null;
		const monthMismatch =
			period && eventData.month && period.monthName !== eventData.month ? period.monthName : null;

		// Fetch staff assignments for this event (admin only)
		let assignedStaff = [];
		if (isAdmin) {
			// Get staff assignments for this event with user info
			const assignments = await db
				.select({
					id: eventStaff.id,
					userId: eventStaff.userId,
					assignedBy: eventStaff.assignedBy,
					createdAt: eventStaff.createdAt,
					userEmail: user.email,
					userRole: user.role
				})
				.from(eventStaff)
				.leftJoin(user, eq(eventStaff.userId, user.id))
				.where(eq(eventStaff.eventId, params.eventId));

			assignedStaff = assignments;
		}

		return {
			user: locals.user,
			isAdmin,
			isTournamentStaff,
			event: eventData,
			tickets,
			participants,
			existingResults,
			existingMatches,
			existingDecklists,
			existingHeroes,
			monthMismatch,
			heroNames: listHeroNames(),
			assignedStaff,
			stats: {
				totalRevenue: isAdmin ? totalRevenue.toFixed(2) : null,
				totalTickets,
				totalRefunded
			}
		};
	} catch (err) {
		if (err.status === 404 || err.status === 403) {
			throw err;
		}
		console.error('Error loading event management:', err);
		throw error(500, 'Failed to load event management page');
	}
}

export const actions = {
	// Refund a ticket
	refund: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Only admins can refund tickets' });
		}

		const formData = await request.formData();
		const ticketId = formData.get('ticketId');

		try {
			const [ticketData] = await db.select().from(ticket).where(eq(ticket.id, ticketId)).limit(1);
			if (!ticketData) return fail(404, { error: 'Ticket not found' });
			if (ticketData.refunded) return fail(400, { error: 'Ticket already refunded' });
			if (!ticketData.transactionId || !(Number(ticketData.amountPaid) > 0)) {
				return fail(400, { error: 'This ticket was free; nothing to refund.' });
			}

			const { refundTransaction } = await import('$lib/server/payments/refunds.js');
			const result = await refundTransaction({
				transId: ticketData.transactionId,
				amountCents: Math.round(Number(ticketData.amountPaid) * 100),
				reason: formData.get('reason')?.toString() || 'admin refund',
				requestedBy: locals.user.id,
				orderId: ticketData.orderId,
				ticketIds: [ticketData.id]
			});
			if (!result.ok && result.status !== 'waiting_settlement') {
				return fail(result.status === 'pending' ? 202 : 400, { error: result.message });
			}
			return { success: true, message: result.message };
		} catch (err) {
			console.error('Error refunding ticket:', err);
			return fail(500, { error: err.message || 'Failed to refund ticket' });
		}
	},

	// Update event details
	updateEvent: async ({ params, request, locals }) => {
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'tournament staff')) {
			return fail(403, { error: 'Unauthorized' });
		}

		const isAdmin = locals.user.role === 'admin';
		const formData = await request.formData();
		const title = formData.get('title');
		const location = formData.get('location');
		const address = formData.get('address');
		const price = formData.get('price');
		const format = formData.get('format');
		const circuit = formData.get('circuit');
		const month = formData.get('month');
		const eventDate = formData.get('eventDate');
		const description = formData.get('description');
		const gemIdRequired = formData.get('gemIdRequired') === 'on';
		const premiumDiscount = formData.get('premiumDiscount') === 'on';
		const playerCapRaw = formData.get('playerCap');
		const playerCap = playerCapRaw ? parseInt(playerCapRaw) : null;

		const parsedDate = parseDatetimeLocal(eventDate);
		if (month && parsedDate && eventPeriod(parsedDate).monthName !== month) {
			return fail(400, {
				error: `The month is set to ${month} but the event date is in ${eventPeriod(parsedDate).monthName}. Standings file under the date, so the two must agree.`
			});
		}

		try {
			const updateData = {
				title,
				location,
				address: address || null,
				format,
				circuit: circuit || null,
				month: month || null,
				eventDate: parsedDate,
				description: description || null,
				gemIdRequired,
				premiumDiscount,
				playerCap
			};

			if (isAdmin) {
				const priceNum = parseFloat(price);
				if (isNaN(priceNum) || priceNum < 0) {
					return fail(400, { error: 'Invalid price' });
				}
				updateData.price = priceNum.toFixed(2);
			}

			await db.update(event).set(updateData).where(eq(event.id, params.eventId));

			await bump('events');

			return { success: true, message: 'Event updated successfully' };
		} catch (err) {
			console.error('Error updating event:', err);
			return fail(500, { error: 'Failed to update event' });
		}
	},

	// Toggle GEM ID Required setting
	toggleGemIdRequired: async ({ params, request, locals }) => {
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'tournament staff')) {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const gemIdRequired = formData.get('gemIdRequired') === 'true';

		try {
			await db.update(event).set({ gemIdRequired }).where(eq(event.id, params.eventId));
			await bump('events');

			return {
				success: true,
				message: `GEM ID ${gemIdRequired ? 'now required' : 'no longer required'}`
			};
		} catch (err) {
			console.error('Error toggling GEM ID required:', err);
			return fail(500, { error: 'Failed to update setting' });
		}
	},

	// Toggle "Entered into Gem?" status
	toggleGemEntry: async ({ request, locals }) => {
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'tournament staff')) {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const ticketId = formData.get('ticketId');
		const enteredIntoGem = formData.get('enteredIntoGem') === 'true';

		try {
			await db.update(ticket).set({ enteredIntoGem }).where(eq(ticket.id, ticketId));

			return {
				success: true,
				message: `Ticket ${enteredIntoGem ? 'marked as entered' : 'unmarked'} in GEM`
			};
		} catch (err) {
			console.error('Error toggling Gem entry status:', err);
			return fail(500, { error: 'Failed to update GEM entry status' });
		}
	},

	// NOTE: saveResult and deleteResult actions removed
	// Results are now computed from event_match data
	// To update results, re-upload the tournament CSV files

	// Save a decklist
	saveDecklist: async ({ params, request, locals }) => {
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'tournament staff')) {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const decklistId = formData.get('decklistId');
		const playerName = formData.get('playerName');
		const gemId = formData.get('gemId') || null;
		const userId = formData.get('userId') || null;
		const hero = formData.get('hero') || null;
		const format = formData.get('format') || null;
		const placement = formData.get('placement') ? parseInt(formData.get('placement')) : null;
		const cardsJson = formData.get('cards');
		const rawText = formData.get('rawText') || null;
		const isPublic = formData.get('isPublic') === 'true';

		if (!playerName || !cardsJson) {
			return fail(400, { error: 'Player name and cards are required' });
		}

		let cards;
		try {
			cards = JSON.parse(cardsJson);
		} catch {
			return fail(400, { error: 'Invalid cards format' });
		}

		try {
			const decklistData = {
				eventId: params.eventId,
				playerName,
				gemId,
				userId,
				hero,
				format,
				placement,
				cards,
				rawText,
				isPublic
			};

			if (decklistId) {
				await db.update(decklist).set(decklistData).where(eq(decklist.id, decklistId));
			} else {
				await db.insert(decklist).values(decklistData);
			}

			await bump('decklists');

			return { success: true, message: 'Decklist saved successfully' };
		} catch (err) {
			console.error('Error saving decklist:', err);
			return fail(500, { error: 'Failed to save decklist' });
		}
	},

	// Delete a decklist
	deleteDecklist: async ({ request, locals }) => {
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'tournament staff')) {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const decklistId = formData.get('decklistId');

		try {
			await db.delete(decklist).where(eq(decklist.id, decklistId));

			await bump('decklists');

			return { success: true, message: 'Decklist deleted' };
		} catch (err) {
			console.error('Error deleting decklist:', err);
			return fail(500, { error: 'Failed to delete decklist' });
		}
	},

	// Process CSV files to import tournament results
	// Updates standings in real-time - no separate finalize step needed
	processCSV: async ({ params, request, locals }) => {
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'tournament staff')) {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const swissStandingsFile = formData.get('swissStandings');
		const pairingsFile = formData.get('pairings');

		if (!swissStandingsFile || !pairingsFile) {
			return fail(400, { error: 'Both Swiss Standings and Pairings CSV files are required' });
		}

		try {
			const swissStandingsCsv = await swissStandingsFile.text();
			const pairingsCsv = await pairingsFile.text();

			const [eventData] = await db
				.select()
				.from(event)
				.where(eq(event.id, params.eventId))
				.limit(1);

			if (!eventData) {
				return fail(404, { error: 'Event not found' });
			}

			const processedResults = await processTournamentResults(swissStandingsCsv, pairingsCsv, {
				eventId: params.eventId,
				circuit: eventData.circuit,
				month: eventData.month,
				eventDate: eventData.eventDate
			});

			// The results as stored on the event (the authoritative Swiss order)
			const resultsJson = processedResults.results.map((result) => ({
				playerName: result.name,
				gemId: result.playerId || null,
				placement: result.placement,
				wins: result.matchesWon || 0,
				losses: result.matchesPlayed - result.matchesWon || 0,
				draws: 0,
				agePoints: result.points,
				prizeAmount: result.prize > 0 ? result.prize.toFixed(2) : null
			}));

			const period = eventPeriod(eventData.eventDate);
			const matchesToInsert = (processedResults.matches || []).map((m) => ({
				eventId: params.eventId,
				// Legacy grouping fields, kept in step with the event's date
				year: period.season,
				circuit: eventData.circuit,
				month: period.monthName,
				round: m.round,
				table: m.table || null,
				player1GemId: m.player1GemId || null,
				player1Name: m.player1Name,
				player2GemId: m.player2GemId || null,
				player2Name: m.player2Name,
				winner: m.winner || null
			}));

			// Matches, results and standings change together or not at all. The
			// standings are rebuilt from every event in the season rather than
			// adjusted, so uploading the same file twice gives the same numbers;
			// players dropped by the new file lose their points from the old one.
			const wasUpcoming = eventData.status === 'upcoming' || !eventData.status;
			let rebuilt = null;
			await db.transaction(async (tx) => {
				await tx.delete(match).where(eq(match.eventId, params.eventId));
				if (matchesToInsert.length > 0) await tx.insert(match).values(matchesToInsert);
				await tx
					.update(event)
					.set({
						tournamentResults: resultsJson,
						...(wasUpcoming ? { status: 'in_progress' } : {})
					})
					.where(eq(event.id, params.eventId));
				if (eventData.circuit) {
					rebuilt = await rebuildStandings(
						{ season: period.season, circuit: eventData.circuit, months: [period.monthKey] },
						tx
					);
				}
			});

			await bump('events', 'matches', 'standings');

			const standingsMessage = rebuilt
				? ` ${eventData.circuit} ${period.monthName} ${period.season} standings rebuilt.`
				: ' No circuit set, so standings were not touched.';

			return {
				success: true,
				message: `Processed ${processedResults.results.length} players and ${matchesToInsert.length} matches.${standingsMessage}${wasUpcoming ? ' Event is now in progress.' : ''} Winner: ${processedResults.summary.winner?.name || 'Unknown'}`,
				processedResults: processedResults.summary
			};
		} catch (err) {
			console.error('Error processing CSV:', err);
			return fail(500, { error: `Failed to process CSV: ${err.message}` });
		}
	},

	// Mark event as completed
	// Standings are already updated in real-time when CSV is uploaded
	finalizeEvent: async ({ params, locals }) => {
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'tournament staff')) {
			return fail(403, { error: 'Unauthorized' });
		}

		try {
			// Check for matches before finalizing
			const matches = await db.select().from(match).where(eq(match.eventId, params.eventId));

			if (matches.length === 0) {
				return fail(400, {
					error: 'No match data to finalize. Please upload tournament results first.'
				});
			}

			await db
				.update(event)
				.set({
					status: 'completed',
					closedAt: new Date(),
					closedBy: locals.user.id
				})
				.where(eq(event.id, params.eventId));

			// Remove all staff assignments for this event now that it's closed
			const affectedStaff = await db
				.select({ userId: eventStaff.userId })
				.from(eventStaff)
				.where(eq(eventStaff.eventId, params.eventId));
			await db.delete(eventStaff).where(eq(eventStaff.eventId, params.eventId));

			await bump('events', ...affectedStaff.map((s) => `user:${s.userId}`));

			return {
				success: true,
				message: 'Event marked as completed. Staff assignments have been cleared.'
			};
		} catch (err) {
			console.error('Error finalizing event:', err);
			return fail(500, { error: 'Failed to finalize event' });
		}
	},

	// Reopen a closed event (admin only)
	reopenEvent: async ({ params, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Only admins can reopen events' });
		}

		try {
			await db
				.update(event)
				.set({
					status: 'in_progress',
					closedAt: null,
					closedBy: null
				})
				.where(eq(event.id, params.eventId));

			await bump('events');

			return { success: true, message: 'Event reopened. You can now update results.' };
		} catch (err) {
			console.error('Error reopening event:', err);
			return fail(500, { error: 'Failed to reopen event' });
		}
	},

	// Update event status directly
	updateStatus: async ({ params, request, locals }) => {
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'tournament staff')) {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const newStatus = formData.get('status');

		const validStatuses = ['upcoming', 'in_progress', 'completed', 'cancelled'];
		if (!validStatuses.includes(newStatus)) {
			return fail(400, { error: 'Invalid status' });
		}

		try {
			const updateData = { status: newStatus };

			// If marking as completed, set closedAt and closedBy
			if (newStatus === 'completed') {
				updateData.closedAt = new Date();
				updateData.closedBy = locals.user.id;
			} else {
				// Clear closed fields for non-completed status
				updateData.closedAt = null;
				updateData.closedBy = null;
			}

			await db.update(event).set(updateData).where(eq(event.id, params.eventId));

			// Remove staff assignments when event is completed or cancelled
			let affectedStaff = [];
			if (newStatus === 'completed' || newStatus === 'cancelled') {
				affectedStaff = await db
					.select({ userId: eventStaff.userId })
					.from(eventStaff)
					.where(eq(eventStaff.eventId, params.eventId));
				await db.delete(eventStaff).where(eq(eventStaff.eventId, params.eventId));
			}

			await bump('events', ...affectedStaff.map((s) => `user:${s.userId}`));

			const statusMessage =
				newStatus === 'completed' || newStatus === 'cancelled'
					? `Event status updated to ${newStatus.replace('_', ' ')}. Staff assignments have been cleared.`
					: `Event status updated to ${newStatus.replace('_', ' ')}`;

			return {
				success: true,
				message: statusMessage
			};
		} catch (err) {
			console.error('Error updating event status:', err);
			return fail(500, { error: 'Failed to update event status' });
		}
	},

	// Assign tournament staff to this event (admin only)
	assignStaff: async ({ params, request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Only admins can assign staff' });
		}

		const formData = await request.formData();
		const staffId = formData.get('staffId');

		if (!staffId) {
			return fail(400, { error: 'Staff member is required' });
		}

		try {
			// Check if assignment already exists
			const existing = await db
				.select()
				.from(eventStaff)
				.where(and(eq(eventStaff.userId, staffId), eq(eventStaff.eventId, params.eventId)))
				.limit(1);

			if (existing.length > 0) {
				return fail(400, { error: 'Staff member already assigned to this event' });
			}

			// Create assignment
			await db.insert(eventStaff).values({
				userId: staffId,
				eventId: params.eventId,
				assignedBy: locals.user.id
			});

			await bump(`user:${staffId}`);

			return { success: true, message: 'Staff assigned successfully' };
		} catch (err) {
			console.error('Error assigning staff:', err);
			return fail(500, { error: 'Failed to assign staff' });
		}
	},

	// Remove tournament staff from this event (admin only)
	unassignStaff: async ({ params, request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Only admins can unassign staff' });
		}

		const formData = await request.formData();
		const staffId = formData.get('staffId');

		if (!staffId) {
			return fail(400, { error: 'Staff member is required' });
		}

		try {
			await db
				.delete(eventStaff)
				.where(and(eq(eventStaff.userId, staffId), eq(eventStaff.eventId, params.eventId)));

			await bump(`user:${staffId}`);

			return { success: true, message: 'Staff unassigned successfully' };
		} catch (err) {
			console.error('Error unassigning staff:', err);
			return fail(500, { error: 'Failed to unassign staff' });
		}
	},

	// Search users by email for staff assignment (admin only)
	searchUsers: async ({ params, request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Only admins can search users' });
		}

		const formData = await request.formData();
		const email = formData.get('email')?.trim();

		if (!email || email.length < 3) {
			return { success: true, users: [] };
		}

		try {
			// Get users already assigned to this event
			const assignedUserIds = await db
				.select({ userId: eventStaff.userId })
				.from(eventStaff)
				.where(eq(eventStaff.eventId, params.eventId));

			const assignedIds = assignedUserIds.map((a) => a.userId);

			// Search all users by email (case-insensitive)
			const users = await db
				.select({
					id: user.id,
					email: user.email,
					role: user.role
				})
				.from(user)
				.where(ilike(user.email, `%${email}%`))
				.limit(10);

			// Filter out already assigned users
			const availableUsers = users.filter((u) => !assignedIds.includes(u.id));

			return { success: true, users: availableUsers };
		} catch (err) {
			console.error('Error searching users:', err);
			return fail(500, { error: 'Failed to search users' });
		}
	},

	// Upload hero data from CSV
	uploadHeroes: async ({ params, request, locals }) => {
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'tournament staff')) {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const heroesFile = formData.get('heroesFile');

		if (!heroesFile) {
			return fail(400, { error: 'Heroes CSV file is required' });
		}

		try {
			// Get event details for season/circuit/month
			const [eventData] = await db
				.select()
				.from(event)
				.where(eq(event.id, params.eventId))
				.limit(1);

			if (!eventData) {
				return fail(404, { error: 'Event not found' });
			}

			if (!eventData.circuit || !eventData.month) {
				return fail(400, {
					error: 'Event must have circuit and month set before uploading hero data'
				});
			}

			const { season } = eventPeriod(eventData.eventDate);

			const csvText = await heroesFile.text();
			const lines = csvText.trim().split('\n');

			if (lines.length < 2) {
				return fail(400, { error: 'CSV file must have a header row and at least one data row' });
			}

			// Parse header to find column indices
			const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
			const playerNameIdx = header.findIndex(
				(h) => h === 'player name' || h === 'playername' || h === 'name'
			);
			const playerIdIdx = header.findIndex(
				(h) =>
					h === 'player id' ||
					h === 'playerid' ||
					h === 'player_id' ||
					h === 'gem id' ||
					h === 'gemid' ||
					h === 'gem_id'
			);
			const heroIdx = header.findIndex((h) => h === 'hero' || h === 'hero name');
			const countryIdx = header.findIndex(
				(h) => h === 'country/region' || h === 'country' || h === 'region'
			);

			if (playerNameIdx === -1 || heroIdx === -1) {
				return fail(400, { error: 'CSV must have "Player Name" and "Hero" columns' });
			}

			// Parse data rows
			const heroData = [];
			for (let i = 1; i < lines.length; i++) {
				const line = lines[i].trim();
				if (!line) continue;

				// Handle CSV with quoted fields containing commas
				const values = [];
				let current = '';
				let inQuotes = false;
				for (const char of line) {
					if (char === '"') {
						inQuotes = !inQuotes;
					} else if (char === ',' && !inQuotes) {
						values.push(current.trim());
						current = '';
					} else {
						current += char;
					}
				}
				values.push(current.trim());

				const playerName = values[playerNameIdx]?.replace(/^"|"$/g, '').trim();
				const gemId =
					playerIdIdx !== -1 ? values[playerIdIdx]?.replace(/^"|"$/g, '').trim() || null : null;
				// Sanitize hero name: remove "(LL)" suffix and trim
				const rawHero = values[heroIdx]?.replace(/^"|"$/g, '').trim();
				const hero = rawHero?.replace(/\s*\(LL\)\s*$/i, '').trim();
				const countryRegion =
					countryIdx !== -1 ? values[countryIdx]?.replace(/^"|"$/g, '').trim() || null : null;

				if (playerName && hero) {
					heroData.push({
						season,
						circuit: eventData.circuit,
						month: eventData.month,
						gemId: gemId || null,
						playerName,
						hero,
						countryRegion: countryRegion || null
					});
				}
			}

			if (heroData.length === 0) {
				return fail(400, { error: 'No valid hero data found in CSV' });
			}

			await replaceEventHeroes(eventData, heroData);
			await bump('events');

			return {
				success: true,
				message: `Uploaded hero data for ${heroData.length} players`
			};
		} catch (err) {
			console.error('Error uploading heroes:', err);
			return fail(500, { error: `Failed to upload heroes: ${err.message}` });
		}
	},

	// Delete hero data for this event
	deleteHeroes: async ({ params, locals }) => {
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'tournament staff')) {
			return fail(403, { error: 'Unauthorized' });
		}

		try {
			// Get event details for season/circuit/month
			const [eventData] = await db
				.select()
				.from(event)
				.where(eq(event.id, params.eventId))
				.limit(1);

			if (!eventData || !eventData.circuit || !eventData.month || !eventData.eventDate) {
				return fail(400, { error: 'Event not properly configured' });
			}

			await deleteEventHeroes(eventData);

			await bump('events');
			return { success: true, message: 'Hero data deleted' };
		} catch (err) {
			console.error('Error deleting heroes:', err);
			return fail(500, { error: 'Failed to delete hero data' });
		}
	},

	// Delete event and all related data (admin only)
	deleteEvent: async ({ params, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Only admins can delete events' });
		}

		try {
			// Get event details first for hero data cleanup
			const [eventData] = await db
				.select()
				.from(event)
				.where(eq(event.id, params.eventId))
				.limit(1);

			if (!eventData) return fail(404, { error: 'Event not found' });

			// Everything the event owns goes with it, and the season's standings
			// are rebuilt without its results — in one transaction.
			await db.transaction(async (tx) => {
				await tx.delete(match).where(eq(match.eventId, params.eventId));
				await tx.delete(decklist).where(eq(decklist.eventId, params.eventId));
				await deleteEventHeroes(eventData, tx);
				await tx.delete(eventStaff).where(eq(eventStaff.eventId, params.eventId));
				await tx.delete(ticket).where(eq(ticket.eventId, params.eventId));
				await tx.delete(event).where(eq(event.id, params.eventId));
				// Only an event that fed the standings changes them on delete.
				const hadResults =
					Array.isArray(eventData.tournamentResults) && eventData.tournamentResults.length > 0;
				if (eventData.circuit && eventData.eventDate && hadResults) {
					const { season, monthKey } = eventPeriod(eventData.eventDate);
					await rebuildStandings({ season, circuit: eventData.circuit, months: [monthKey] }, tx);
				}
			});

			// Deleting a whole event removes its decklists, matches, tickets
			// and standings points.
			await bump('events', 'matches', 'decklists', 'standings', 'tickets');

			// Redirect to events list
			throw redirect(302, '/admin/events');
		} catch (err) {
			if (err.status === 302) throw err; // Re-throw redirect
			console.error('Error deleting event:', err);
			return fail(500, {
				error: 'Failed to delete event. There may be related data that could not be removed.'
			});
		}
	}
};
