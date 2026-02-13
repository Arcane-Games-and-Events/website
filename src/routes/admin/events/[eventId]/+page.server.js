import { redirect, error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import {
	event,
	ticket,
	user,
	eventStaff,
	decklist,
	standing,
	match,
	eventPlayerHero
} from '$lib/server/db/schema.js';
import { eq, and, ilike } from 'drizzle-orm';
import {
	processTournamentResults,
	calculateFinalStandings,
	parseSwissStandings,
	parsePairings
} from '$lib/server/tournament-processor.js';
import { invalidateCache, CACHE_KEYS } from '$lib/server/redis/index.js';
import { parseDatetimeLocal } from '$lib/server/dates.js';

export async function load({ params, locals }) {
	// Require authentication (admin or tournament staff)
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const isAdmin = locals.user.role === 'admin';
	const isTournamentStaff = locals.user.role === 'tournament staff';

	// If tournament staff, check if they're assigned to this event
	if (isTournamentStaff) {
		const assignment = await db
			.select()
			.from(eventStaff)
			.where(and(eq(eventStaff.userId, locals.user.id), eq(eventStaff.eventId, params.eventId)))
			.limit(1);

		if (assignment.length === 0) {
			throw error(
				403,
				'You are not assigned to this event. Please contact an administrator to be assigned to this event.'
			);
		}
	} else if (!isAdmin) {
		throw redirect(302, '/login');
	}

	try {
		// Fetch event details
		const [eventData] = await db.select().from(event).where(eq(event.id, params.eventId)).limit(1);

		if (!eventData) {
			throw error(404, 'Event not found');
		}

		// Compute dynamic status based on date and completion
		// Respect manually set statuses (completed, cancelled, in_progress)
		// Only auto-compute if status is 'upcoming' or not set
		let computedStatus = eventData.status;
		if (eventData.status === 'completed' || eventData.status === 'cancelled' || eventData.status === 'in_progress') {
			computedStatus = eventData.status; // Keep manually set status
		} else {
			// Auto-compute for 'upcoming' or null status based on date
			const now = new Date();
			const eventDate = eventData.eventDate ? new Date(eventData.eventDate) : null;
			if (eventDate) {
				if (now < eventDate) {
					computedStatus = 'upcoming';
				} else {
					computedStatus = 'in_progress';
				}
			}
		}
		// Update the event data with computed status
		eventData.computedStatus = computedStatus;

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

		// Fetch existing hero data for this event (for metagame display)
		// Use season/circuit/month to match the standings structure
		const eventDate = eventData.eventDate ? new Date(eventData.eventDate) : null;
		const eventYear = eventDate ? eventDate.getUTCFullYear().toString() : null;
		let existingHeroes = [];
		if (eventData.circuit && eventData.month && eventYear) {
			existingHeroes = await db
				.select()
				.from(eventPlayerHero)
				.where(
					and(
						eq(eventPlayerHero.season, eventYear),
						eq(eventPlayerHero.circuit, eventData.circuit),
						eq(eventPlayerHero.month, eventData.month)
					)
				);
		}

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
	refund: async ({ params, request, locals }) => {
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'tournament staff')) {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const ticketId = formData.get('ticketId');

		try {
			const [ticketData] = await db.select().from(ticket).where(eq(ticket.id, ticketId)).limit(1);

			if (!ticketData) {
				return fail(404, { error: 'Ticket not found' });
			}

			if (ticketData.refunded) {
				return fail(400, { error: 'Ticket already refunded' });
			}

			if (!ticketData.transactionId || !ticketData.amountPaid) {
				return fail(400, { error: 'Ticket does not have transaction information' });
			}

			const { authnet } = await import('$lib/server/authnet/client.js');
			let refundType = '';

			try {
				await authnet.voidTransaction(ticketData.transactionId);
				refundType = 'voided';
			} catch (voidError) {
				console.log('Void failed, attempting refund:', voidError.message);
				await authnet.refundTransaction({
					transactionId: ticketData.transactionId,
					amount: ticketData.amountPaid,
					cardNumber: '1111'
				});
				refundType = 'refunded';
			}

			await db
				.update(ticket)
				.set({
					refunded: true,
					refundedAt: new Date()
				})
				.where(eq(ticket.id, ticketId));

			return { success: true, message: `Ticket ${refundType} successfully` };
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

		try {
			const updateData = {
				title,
				location,
				address: address || null,
				format,
				circuit: circuit || null,
				month: month || null,
				eventDate: parseDatetimeLocal(eventDate),
				description: description || null,
				gemIdRequired,
				premiumDiscount
			};

			if (isAdmin) {
				const priceNum = parseFloat(price);
				if (isNaN(priceNum) || priceNum < 0) {
					return fail(400, { error: 'Invalid price' });
				}
				updateData.price = priceNum.toFixed(2);
			}

			await db.update(event).set(updateData).where(eq(event.id, params.eventId));

			// Invalidate events cache so changes appear immediately
			await invalidateCache(`${CACHE_KEYS.EVENTS}:all`);
			await invalidateCache(`${CACHE_KEYS.EVENTS}:upcoming:3`);

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
	toggleGemEntry: async ({ params, request, locals }) => {
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

			// Invalidate the public decklists cache so the age-open page updates
			await invalidateCache(`${CACHE_KEYS.EVENTS}:decklists:public`);

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

			// Invalidate the public decklists cache so the age-open page updates
			await invalidateCache(`${CACHE_KEYS.EVENTS}:decklists:public`);

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

			// Format results for standings sync
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

			// Sync standings directly (update season_standing table)
			let standingsUpdated = false;
			let standingsError = null;
			let isReupload = false;
			if (eventData.circuit) {
				try {
					const eventDate = eventData.eventDate ? new Date(eventData.eventDate) : new Date();
					const currentYear = eventDate.getUTCFullYear().toString();
					const monthNames = [
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
					const eventMonthName = monthNames[eventDate.getUTCMonth()];
					const monthKey = eventMonthName.toLowerCase();

					// Check if this is a re-upload by looking for existing matches
					const existingEventMatches = await db
						.select()
						.from(match)
						.where(eq(match.eventId, params.eventId));

					if (existingEventMatches.length > 0) {
						isReupload = true;
						// Calculate old standings contribution from existing matches to subtract
						const oldPlayerStats = new Map();
						for (const match of existingEventMatches) {
							// Track player 1
							const p1Key = match.player1GemId || match.player1Name;
							if (!oldPlayerStats.has(p1Key)) {
								oldPlayerStats.set(p1Key, {
									gemId: match.player1GemId,
									name: match.player1Name,
									wins: 0,
									matches: 0
								});
							}
							const p1 = oldPlayerStats.get(p1Key);
							p1.matches++;
							if (match.winner === 'player1') p1.wins++;

							// Track player 2
							const p2Key = match.player2GemId || match.player2Name;
							if (!oldPlayerStats.has(p2Key)) {
								oldPlayerStats.set(p2Key, {
									gemId: match.player2GemId,
									name: match.player2Name,
									wins: 0,
									matches: 0
								});
							}
							const p2 = oldPlayerStats.get(p2Key);
							p2.matches++;
							if (match.winner === 'player2') p2.wins++;
						}

						// Calculate old AGE points for each player (simplified - use same logic as tournament processor)
						const oldSorted = Array.from(oldPlayerStats.values()).sort((a, b) => b.wins - a.wins);
						const oldPointsMap = new Map();
						const pointsTable = {
							1: 30,
							2: 25,
							3: 20,
							4: 20,
							5: 15,
							6: 15,
							7: 15,
							8: 15,
							9: 12,
							10: 12,
							11: 12,
							12: 12,
							13: 8,
							14: 8,
							15: 8,
							16: 8
						};
						oldSorted.forEach((player, idx) => {
							const placement = idx + 1;
							oldPointsMap.set(player.gemId || player.name, {
								points: pointsTable[placement] || 1,
								wins: player.wins,
								matches: player.matches
							});
						});

						// Subtract old contribution from standings
						const existingStandings = await db
							.select()
							.from(standing)
							.where(
								and(eq(standing.season, currentYear), eq(standing.circuit, eventData.circuit))
							);

						const monthPointsCol = `${monthKey}Points`;
						const monthMatchesWonCol = `${monthKey}MatchesWon`;
						const monthMatchesCol = `${monthKey}Matches`;

						for (const standing of existingStandings) {
							const key = standing.gemId || standing.playerName;
							const oldStats = oldPointsMap.get(key);
							if (oldStats) {
								await db
									.update(standing)
									.set({
										totalPoints: Math.max(0, (standing.totalPoints || 0) - oldStats.points),
										matchesWon: Math.max(0, (standing.matchesWon || 0) - oldStats.wins),
										matchesPlayed: Math.max(0, (standing.matchesPlayed || 0) - oldStats.matches),
										[monthPointsCol]: Math.max(
											0,
											(standing[monthPointsCol] || 0) - oldStats.points
										),
										[monthMatchesWonCol]: Math.max(
											0,
											(standing[monthMatchesWonCol] || 0) - oldStats.wins
										),
										[monthMatchesCol]: Math.max(
											0,
											(standing[monthMatchesCol] || 0) - oldStats.matches
										)
									})
									.where(eq(standing.id, standing.id));
							}
						}
					}

					// Now add new standings contribution
					// Re-fetch standings after potential subtraction
					const existingStandings = await db
						.select()
						.from(standing)
						.where(and(eq(standing.season, currentYear), eq(standing.circuit, eventData.circuit)));

					// Build lookup maps for existing standings
					const byGemId = new Map(
						existingStandings.filter((s) => s.gemId).map((s) => [s.gemId, s])
					);
					const byName = new Map(existingStandings.map((s) => [s.playerName, s]));

					const monthPointsCol = `${monthKey}Points`;
					const monthMatchesWonCol = `${monthKey}MatchesWon`;
					const monthMatchesCol = `${monthKey}Matches`;

					// Process each result
					for (const result of resultsJson) {
						// Find existing standing by gemId first, then by name
						let existing = result.gemId ? byGemId.get(result.gemId) : null;
						if (!existing) {
							existing = byName.get(result.playerName);
						}

						if (existing) {
							// Update existing standing - add new points/matches to totals and monthly
							const newTotalPoints = (existing.totalPoints || 0) + result.agePoints;
							const newMatchesWon = (existing.matchesWon || 0) + result.wins;
							const newMatchesPlayed = (existing.matchesPlayed || 0) + result.wins + result.losses;
							const newWinPercentage =
								newMatchesPlayed > 0
									? Math.round((newMatchesWon / newMatchesPlayed) * 10000) / 100
									: null;

							// Get current monthly values
							const currentMonthPoints = existing[monthPointsCol] || 0;
							const currentMonthWon = existing[monthMatchesWonCol] || 0;
							const currentMonthMatches = existing[monthMatchesCol] || 0;

							await db
								.update(standing)
								.set({
									totalPoints: newTotalPoints,
									matchesWon: newMatchesWon,
									matchesPlayed: newMatchesPlayed,
									winPercentage: newWinPercentage,
									gemId: result.gemId || existing.gemId,
									[monthPointsCol]: currentMonthPoints + result.agePoints,
									[monthMatchesWonCol]: currentMonthWon + result.wins,
									[monthMatchesCol]: currentMonthMatches + result.wins + result.losses,
									updatedAt: new Date()
								})
								.where(eq(standing.id, existing.id));
						} else {
							// Insert new standing
							const insertData = {
								season: currentYear,
								circuit: eventData.circuit,
								gemId: result.gemId || null,
								playerName: result.playerName,
								totalPoints: result.agePoints,
								matchesWon: result.wins,
								matchesPlayed: result.wins + result.losses,
								winPercentage:
									result.wins + result.losses > 0
										? Math.round((result.wins / (result.wins + result.losses)) * 10000) / 100
										: null,
								[monthPointsCol]: result.agePoints,
								[monthMatchesWonCol]: result.wins,
								[monthMatchesCol]: result.wins + result.losses
							};
							await db.insert(standing).values(insertData);
						}
					}
					standingsUpdated = true;
					console.log(
						`Standings synced for ${resultsJson.length} players in ${eventData.circuit}${isReupload ? ' (re-upload)' : ''}`
					);
				} catch (err) {
					standingsError = err.message;
					console.error('Standings sync failed:', err.message);
				}
			}

			// Store matches (source of truth for computing results)
			// Delete existing matches for this event
			await db.delete(match).where(eq(match.eventId, params.eventId));

			// Insert new matches with eventId
			if (processedResults.matches?.length > 0) {
				const eventDate = eventData.eventDate ? new Date(eventData.eventDate) : new Date();
				const monthNames = [
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
				const eventMonthName = monthNames[eventDate.getUTCMonth()];
				const eventYear = eventDate.getUTCFullYear().toString();

				const matchesToInsert = processedResults.matches.map((m) => ({
					eventId: params.eventId,
					// Legacy fields for backwards compatibility
					year: eventYear,
					circuit: eventData.circuit,
					month: eventMonthName,
					// Match data
					round: m.round,
					table: m.table || null,
					player1GemId: m.player1GemId || null,
					player1Name: m.player1Name,
					player2GemId: m.player2GemId || null,
					player2Name: m.player2Name,
					winner: m.winner || null
				}));
				await db.insert(match).values(matchesToInsert);
			}

			// Store tournament results on the event (preserves Swiss standings order)
			await db
				.update(event)
				.set({ tournamentResults: resultsJson })
				.where(eq(event.id, params.eventId));

			// Invalidate caches so changes appear immediately
			await invalidateCache(`${CACHE_KEYS.EVENTS}:all`);
			await invalidateCache(`${CACHE_KEYS.EVENTS}:matches:${params.eventId}`);
			await invalidateCache(`${CACHE_KEYS.EVENTS}:matches:all`);
			await invalidateCache(`${CACHE_KEYS.STANDINGS}:all`);

			const standingsMessage = standingsUpdated
				? ' Standings updated.'
				: eventData.circuit
					? ` (Standings sync failed: ${standingsError || 'unknown error'})`
					: '';

			return {
				success: true,
				message: `Processed ${processedResults.results.length} players and ${processedResults.matches?.length || 0} matches.${standingsMessage} Winner: ${processedResults.summary.winner?.name || 'Unknown'}`,
				processedResults: processedResults.summary
			};
		} catch (err) {
			console.error('Error processing CSV:', err);
			return fail(500, { error: `Failed to process CSV: ${err.message}` });
		}
	},

	// Save progress without finalizing
	saveProgress: async ({ params, locals }) => {
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'tournament staff')) {
			return fail(403, { error: 'Unauthorized' });
		}

		try {
			await db.update(event).set({ status: 'in_progress' }).where(eq(event.id, params.eventId));

			return {
				success: true,
				message: 'Progress saved. Results are stored but standings have not been updated yet.'
			};
		} catch (err) {
			console.error('Error saving progress:', err);
			return fail(500, { error: 'Failed to save progress' });
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
			await db.delete(eventStaff).where(eq(eventStaff.eventId, params.eventId));

			await invalidateCache(`${CACHE_KEYS.EVENTS}:all`);
			await invalidateCache(`${CACHE_KEYS.EVENTS}:upcoming:3`);

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

			await invalidateCache(`${CACHE_KEYS.EVENTS}:all`);

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
			if (newStatus === 'completed' || newStatus === 'cancelled') {
				await db.delete(eventStaff).where(eq(eventStaff.eventId, params.eventId));
			}

			await invalidateCache(`${CACHE_KEYS.EVENTS}:all`);
			await invalidateCache(`${CACHE_KEYS.EVENTS}:upcoming:3`);

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

			const eventDate = eventData.eventDate ? new Date(eventData.eventDate) : new Date();
			const season = eventDate.getUTCFullYear().toString();

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

			// Delete existing hero data for this season/circuit/month
			await db
				.delete(eventPlayerHero)
				.where(
					and(
						eq(eventPlayerHero.season, season),
						eq(eventPlayerHero.circuit, eventData.circuit),
						eq(eventPlayerHero.month, eventData.month)
					)
				);

			// Insert new hero data
			await db.insert(eventPlayerHero).values(heroData);

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

			const season = new Date(eventData.eventDate).getUTCFullYear().toString();

			await db
				.delete(eventPlayerHero)
				.where(
					and(
						eq(eventPlayerHero.season, season),
						eq(eventPlayerHero.circuit, eventData.circuit),
						eq(eventPlayerHero.month, eventData.month)
					)
				);

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

			// Delete in order due to foreign key constraints
			// 1. Delete event matches
			await db.delete(match).where(eq(match.eventId, params.eventId));

			// 2. Delete event decklists
			await db.delete(decklist).where(eq(decklist.eventId, params.eventId));

			// 3. Delete hero data (by season/circuit/month)
			if (eventData?.circuit && eventData?.month && eventData?.eventDate) {
				const season = new Date(eventData.eventDate).getUTCFullYear().toString();
				await db
					.delete(eventPlayerHero)
					.where(
						and(
							eq(eventPlayerHero.season, season),
							eq(eventPlayerHero.circuit, eventData.circuit),
							eq(eventPlayerHero.month, eventData.month)
						)
					);
			}

			// 4. Delete staff assignments
			await db.delete(eventStaff).where(eq(eventStaff.eventId, params.eventId));

			// 5. Delete tickets
			await db.delete(ticket).where(eq(ticket.eventId, params.eventId));

			// 6. Finally delete the event
			await db.delete(event).where(eq(event.id, params.eventId));

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
