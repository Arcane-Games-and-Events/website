import { redirect, error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { event, ticket, user, eventStaff, eventResult, eventDecklist, seasonStanding, eventMatch } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { processTournamentResults } from '$lib/server/tournament-processor.js';
import { invalidateCache, CACHE_KEYS } from '$lib/server/redis/index.js';

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
			.where(and(
				eq(eventStaff.userId, locals.user.id),
				eq(eventStaff.eventId, params.eventId)
			))
			.limit(1);

		if (assignment.length === 0) {
			throw error(403, 'You are not assigned to this event. Please contact an administrator to be assigned to this event.');
		}
	} else if (!isAdmin) {
		throw redirect(302, '/login');
	}

	try {
		// Fetch event details
		const [eventData] = await db
			.select()
			.from(event)
			.where(eq(event.id, params.eventId))
			.limit(1);

		if (!eventData) {
			throw error(404, 'Event not found');
		}

		// Compute dynamic status based on date and completion
		let computedStatus = eventData.status;
		if (eventData.status === 'completed') {
			computedStatus = 'completed'; // Keep as completed/finished if finalized
		} else {
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

		// Fetch existing results for this event
		const existingResults = await db
			.select()
			.from(eventResult)
			.where(eq(eventResult.eventId, params.eventId));

		// Fetch existing decklists for this event
		const existingDecklists = await db
			.select()
			.from(eventDecklist)
			.where(eq(eventDecklist.eventId, params.eventId));

		// Fetch staff assignments for this event (admin only)
		let assignedStaff = [];
		let availableStaff = [];
		if (isAdmin) {
			// Get all tournament staff users
			const allTournamentStaff = await db
				.select({
					id: user.id,
					email: user.email,
					createdAt: user.createdAt
				})
				.from(user)
				.where(eq(user.role, 'tournament staff'));

			// Get staff assignments for this event with user info
			const assignments = await db
				.select({
					id: eventStaff.id,
					userId: eventStaff.userId,
					assignedBy: eventStaff.assignedBy,
					createdAt: eventStaff.createdAt,
					userEmail: user.email
				})
				.from(eventStaff)
				.leftJoin(user, eq(eventStaff.userId, user.id))
				.where(eq(eventStaff.eventId, params.eventId));

			assignedStaff = assignments;

			// Filter out already assigned staff from available list
			const assignedUserIds = new Set(assignments.map(a => a.userId));
			availableStaff = allTournamentStaff.filter(s => !assignedUserIds.has(s.id));
		}

		return {
			user: locals.user,
			isAdmin,
			isTournamentStaff,
			event: eventData,
			tickets,
			participants,
			existingResults,
			existingDecklists,
			assignedStaff,
			availableStaff,
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
			const [ticketData] = await db
				.select()
				.from(ticket)
				.where(eq(ticket.id, ticketId))
				.limit(1);

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
				eventDate: new Date(eventDate),
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

			await db
				.update(event)
				.set(updateData)
				.where(eq(event.id, params.eventId));

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
			await db
				.update(event)
				.set({ gemIdRequired })
				.where(eq(event.id, params.eventId));

			return { success: true, message: `GEM ID ${gemIdRequired ? 'now required' : 'no longer required'}` };
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
			await db
				.update(ticket)
				.set({ enteredIntoGem })
				.where(eq(ticket.id, ticketId));

			return { success: true, message: `Ticket ${enteredIntoGem ? 'marked as entered' : 'unmarked'} in GEM` };
		} catch (err) {
			console.error('Error toggling Gem entry status:', err);
			return fail(500, { error: 'Failed to update GEM entry status' });
		}
	},

	// Save a single result
	saveResult: async ({ params, request, locals }) => {
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'tournament staff')) {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const resultId = formData.get('resultId');
		const playerName = formData.get('playerName');
		const gemId = formData.get('gemId') || null;
		const userId = formData.get('userId') || null;
		const placement = parseInt(formData.get('placement'));
		const wins = parseInt(formData.get('wins') || '0');
		const losses = parseInt(formData.get('losses') || '0');
		const draws = parseInt(formData.get('draws') || '0');
		const agePoints = parseInt(formData.get('agePoints') || '0');
		const prizeAmount = formData.get('prizeAmount') || null;

		if (!playerName || isNaN(placement) || placement < 1) {
			return fail(400, { error: 'Player name and valid placement are required' });
		}

		try {
			const resultData = {
				eventId: params.eventId,
				playerName,
				gemId,
				userId,
				placement,
				wins,
				losses,
				draws,
				agePoints,
				prizeAmount: prizeAmount ? parseFloat(prizeAmount).toFixed(2) : null
			};

			if (resultId) {
				await db
					.update(eventResult)
					.set(resultData)
					.where(eq(eventResult.id, resultId));
			} else {
				await db.insert(eventResult).values(resultData);
			}

			return { success: true, message: 'Result saved successfully' };
		} catch (err) {
			console.error('Error saving result:', err);
			return fail(500, { error: 'Failed to save result' });
		}
	},

	// Delete a result
	deleteResult: async ({ request, locals }) => {
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'tournament staff')) {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const resultId = formData.get('resultId');

		try {
			await db.delete(eventResult).where(eq(eventResult.id, resultId));
			return { success: true, message: 'Result deleted' };
		} catch (err) {
			console.error('Error deleting result:', err);
			return fail(500, { error: 'Failed to delete result' });
		}
	},

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
				await db
					.update(eventDecklist)
					.set(decklistData)
					.where(eq(eventDecklist.id, decklistId));
			} else {
				await db.insert(eventDecklist).values(decklistData);
			}

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
			await db.delete(eventDecklist).where(eq(eventDecklist.id, decklistId));
			return { success: true, message: 'Decklist deleted' };
		} catch (err) {
			console.error('Error deleting decklist:', err);
			return fail(500, { error: 'Failed to delete decklist' });
		}
	},

	// Process CSV files to import tournament results
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

			const processedResults = await processTournamentResults(
				swissStandingsCsv,
				pairingsCsv,
				{
					eventId: params.eventId,
					circuit: eventData.circuit,
					month: eventData.month,
					eventDate: eventData.eventDate
				}
			);

			// Clear existing results for this event
			await db.delete(eventResult).where(eq(eventResult.eventId, params.eventId));

			// Insert new results (batched to avoid connection pool exhaustion)
			if (processedResults.results.length > 0) {
				const resultsToInsert = processedResults.results.map(result => ({
					eventId: params.eventId,
					playerName: result.name,
					gemId: result.playerId || null,
					placement: result.placement,
					wins: result.matchesWon || 0,
					losses: result.matchesPlayed - result.matchesWon || 0,
					draws: 0,
					agePoints: result.points,
					prizeAmount: result.prize > 0 ? result.prize.toFixed(2) : null
				}));
				await db.insert(eventResult).values(resultsToInsert);
			}

			// Clear existing matches for this event and insert new ones
			const eventDate = eventData.eventDate ? new Date(eventData.eventDate) : new Date();
			const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
				'July', 'August', 'September', 'October', 'November', 'December'];
			const eventMonthName = monthNames[eventDate.getMonth()];
			const eventYear = eventDate.getFullYear().toString();

			if (eventData.circuit) {
				await db.delete(eventMatch).where(
					and(
						eq(eventMatch.year, eventYear),
						eq(eventMatch.circuit, eventData.circuit),
						eq(eventMatch.month, eventMonthName)
					)
				);
			}

			if (processedResults.matches?.length > 0 && eventData.circuit) {
				const matchesToInsert = processedResults.matches.map(m => ({
					year: eventYear,
					circuit: eventData.circuit,
					month: eventMonthName,
					round: m.round,
					table: m.table || null,
					player1GemId: m.player1GemId || null,
					player1Name: m.player1Name,
					player2GemId: m.player2GemId || null,
					player2Name: m.player2Name,
					winner: m.winner || null
				}));
				await db.insert(eventMatch).values(matchesToInsert);
			}

			return {
				success: true,
				message: `Processed ${processedResults.results.length} players and ${processedResults.matches?.length || 0} matches. Winner: ${processedResults.summary.winner?.name || 'Unknown'}`,
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
			await db
				.update(event)
				.set({ status: 'in_progress' })
				.where(eq(event.id, params.eventId));

			return { success: true, message: 'Progress saved. Results are stored but standings have not been updated yet.' };
		} catch (err) {
			console.error('Error saving progress:', err);
			return fail(500, { error: 'Failed to save progress' });
		}
	},

	// Finalize the event - update season standings
	finalizeEvent: async ({ params, locals }) => {
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'tournament staff')) {
			return fail(403, { error: 'Unauthorized' });
		}

		try {
			const [eventData] = await db
				.select()
				.from(event)
				.where(eq(event.id, params.eventId))
				.limit(1);

			if (!eventData) {
				return fail(404, { error: 'Event not found' });
			}

			const results = await db
				.select()
				.from(eventResult)
				.where(eq(eventResult.eventId, params.eventId));

			if (results.length === 0) {
				return fail(400, { error: 'No results to finalize. Please import or add results first.' });
			}

			const eventDate = eventData.eventDate ? new Date(eventData.eventDate) : new Date();
			const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
				'july', 'august', 'september', 'october', 'november', 'december'];
			const eventMonth = monthNames[eventDate.getMonth()];
			const currentYear = eventDate.getFullYear().toString();

			let playersUpdated = 0;
			let playersCreated = 0;
			const errors = [];

			if (eventData.circuit && results.length > 0) {
				for (const result of results) {
					try {
						const matchesWon = result.wins || 0;
						const matchesPlayed = matchesWon + (result.losses || 0) + (result.draws || 0);

						let existingStanding = null;

						if (result.gemId) {
							const [byGemId] = await db
								.select()
								.from(seasonStanding)
								.where(and(
									eq(seasonStanding.season, currentYear),
									eq(seasonStanding.circuit, eventData.circuit),
									eq(seasonStanding.gemId, result.gemId)
								))
								.limit(1);
							existingStanding = byGemId;
						}

						if (!existingStanding) {
							const [byName] = await db
								.select()
								.from(seasonStanding)
								.where(and(
									eq(seasonStanding.season, currentYear),
									eq(seasonStanding.circuit, eventData.circuit),
									eq(seasonStanding.playerName, result.playerName)
								))
								.limit(1);
							existingStanding = byName;
						}

						if (existingStanding) {
							const monthPointsCol = `${eventMonth}Points`;
							const monthMatchesWonCol = `${eventMonth}MatchesWon`;
							const monthMatchesCol = `${eventMonth}Matches`;

							const newTotalPoints = (existingStanding.totalPoints || 0) + (result.agePoints || 0);
							const newMatchesWon = (existingStanding.matchesWon || 0) + matchesWon;
							const newMatchesPlayed = (existingStanding.matchesPlayed || 0) + matchesPlayed;
							const newWinPercentage = newMatchesPlayed > 0
								? parseFloat(((newMatchesWon / newMatchesPlayed) * 100).toFixed(2))
								: null;

							const updateData = {
								totalPoints: newTotalPoints,
								matchesWon: newMatchesWon,
								matchesPlayed: newMatchesPlayed,
								winPercentage: newWinPercentage,
								updatedAt: new Date()
							};

							updateData[monthPointsCol] = (existingStanding[monthPointsCol] || 0) + (result.agePoints || 0);
							updateData[monthMatchesWonCol] = (existingStanding[monthMatchesWonCol] || 0) + matchesWon;
							updateData[monthMatchesCol] = (existingStanding[monthMatchesCol] || 0) + matchesPlayed;

							if (result.gemId && !existingStanding.gemId) {
								updateData.gemId = result.gemId;
							}

							if (result.gemId && existingStanding.gemId === result.gemId) {
								updateData.playerName = result.playerName;
							}

							await db
								.update(seasonStanding)
								.set(updateData)
								.where(eq(seasonStanding.id, existingStanding.id));

							playersUpdated++;
						} else {
							const monthPointsCol = `${eventMonth}Points`;
							const monthMatchesWonCol = `${eventMonth}MatchesWon`;
							const monthMatchesCol = `${eventMonth}Matches`;

							const newStanding = {
								season: currentYear,
								circuit: eventData.circuit,
								gemId: result.gemId || null,
								playerName: result.playerName,
								totalPoints: result.agePoints || 0,
								matchesWon: matchesWon,
								matchesPlayed: matchesPlayed,
								winPercentage: matchesPlayed > 0
									? parseFloat(((matchesWon / matchesPlayed) * 100).toFixed(2))
									: null
							};

							newStanding[monthPointsCol] = result.agePoints || 0;
							newStanding[monthMatchesWonCol] = matchesWon;
							newStanding[monthMatchesCol] = matchesPlayed;

							await db.insert(seasonStanding).values(newStanding);
							playersCreated++;
						}
					} catch (playerErr) {
						console.error(`Error processing player ${result.playerName}:`, playerErr);
						errors.push(`Failed to update ${result.playerName}: ${playerErr.message}`);
					}
				}
			}

			await db
				.update(event)
				.set({
					status: 'completed',
					closedAt: new Date(),
					closedBy: locals.user.id
				})
				.where(eq(event.id, params.eventId));

			// Invalidate all relevant caches so updates appear immediately
			await invalidateCache(`${CACHE_KEYS.EVENTS}:all`);
			await invalidateCache(`${CACHE_KEYS.EVENTS}:upcoming:3`);
			await invalidateCache(`${CACHE_KEYS.EVENTS}:results:all`);
			await invalidateCache(`${CACHE_KEYS.STANDINGS}:all`);

			let message = `Event finalized. ${playersUpdated} players updated, ${playersCreated} new players added.`;
			if (errors.length > 0) {
				message += ` ${errors.length} errors occurred.`;
			}

			return {
				success: true,
				message,
				details: {
					playersUpdated,
					playersCreated,
					errors: errors.length > 0 ? errors : undefined
				}
			};
		} catch (err) {
			console.error('Error finalizing event:', err);
			return fail(500, { error: 'Failed to finalize event' });
		}
	},

	// Reopen a closed event (admin only)
	// This reverses the standings changes made during finalization
	reopenEvent: async ({ params, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Only admins can reopen events' });
		}

		try {
			// Get event data
			const [eventData] = await db
				.select()
				.from(event)
				.where(eq(event.id, params.eventId))
				.limit(1);

			if (!eventData) {
				return fail(404, { error: 'Event not found' });
			}

			// Only reverse standings if event was completed (finalized)
			if (eventData.status === 'completed' && eventData.circuit) {
				// Get the results that were finalized
				const results = await db
					.select()
					.from(eventResult)
					.where(eq(eventResult.eventId, params.eventId));

				if (results.length > 0) {
					const eventDate = eventData.eventDate ? new Date(eventData.eventDate) : new Date();
					const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
						'july', 'august', 'september', 'october', 'november', 'december'];
					const eventMonth = monthNames[eventDate.getMonth()];
					const currentYear = eventDate.getFullYear().toString();

					// Subtract points from each player's standings
					for (const result of results) {
						try {
							const matchesWon = result.wins || 0;
							const matchesPlayed = matchesWon + (result.losses || 0) + (result.draws || 0);

							let existingStanding = null;

							// Find by GEM ID first
							if (result.gemId) {
								const [byGemId] = await db
									.select()
									.from(seasonStanding)
									.where(and(
										eq(seasonStanding.season, currentYear),
										eq(seasonStanding.circuit, eventData.circuit),
										eq(seasonStanding.gemId, result.gemId)
									))
									.limit(1);
								existingStanding = byGemId;
							}

							// Fall back to name if no GEM ID match
							if (!existingStanding) {
								const [byName] = await db
									.select()
									.from(seasonStanding)
									.where(and(
										eq(seasonStanding.season, currentYear),
										eq(seasonStanding.circuit, eventData.circuit),
										eq(seasonStanding.playerName, result.playerName)
									))
									.limit(1);
								existingStanding = byName;
							}

							if (existingStanding) {
								const monthPointsCol = `${eventMonth}Points`;
								const monthMatchesWonCol = `${eventMonth}MatchesWon`;
								const monthMatchesCol = `${eventMonth}Matches`;

								// Subtract the event's contribution
								const newTotalPoints = Math.max(0, (existingStanding.totalPoints || 0) - (result.agePoints || 0));
								const newMatchesWon = Math.max(0, (existingStanding.matchesWon || 0) - matchesWon);
								const newMatchesPlayed = Math.max(0, (existingStanding.matchesPlayed || 0) - matchesPlayed);
								const newWinPercentage = newMatchesPlayed > 0
									? parseFloat(((newMatchesWon / newMatchesPlayed) * 100).toFixed(2))
									: null;

								const updateData = {
									totalPoints: newTotalPoints,
									matchesWon: newMatchesWon,
									matchesPlayed: newMatchesPlayed,
									winPercentage: newWinPercentage,
									updatedAt: new Date()
								};

								// Subtract from monthly columns
								updateData[monthPointsCol] = Math.max(0, (existingStanding[monthPointsCol] || 0) - (result.agePoints || 0));
								updateData[monthMatchesWonCol] = Math.max(0, (existingStanding[monthMatchesWonCol] || 0) - matchesWon);
								updateData[monthMatchesCol] = Math.max(0, (existingStanding[monthMatchesCol] || 0) - matchesPlayed);

								await db
									.update(seasonStanding)
									.set(updateData)
									.where(eq(seasonStanding.id, existingStanding.id));
							}
						} catch (playerErr) {
							console.error(`Error reversing standings for ${result.playerName}:`, playerErr);
							// Continue with other players even if one fails
						}
					}
				}
			}

			await db
				.update(event)
				.set({
					status: 'in_progress',
					closedAt: null,
					closedBy: null
				})
				.where(eq(event.id, params.eventId));

			// Invalidate all relevant caches
			await invalidateCache(`${CACHE_KEYS.EVENTS}:all`);
			await invalidateCache(`${CACHE_KEYS.STANDINGS}:all`);

			return { success: true, message: 'Event reopened. Previous standings changes have been reversed. You can now update results and re-finalize.' };
		} catch (err) {
			console.error('Error reopening event:', err);
			return fail(500, { error: 'Failed to reopen event' });
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

	// Delete event and all related data (admin only)
	deleteEvent: async ({ params, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Only admins can delete events' });
		}

		try {
			// Delete in order due to foreign key constraints
			// 1. Delete event matches
			await db.delete(eventMatch).where(
				and(
					eq(eventMatch.circuit, params.eventId) // Note: eventMatch uses month/year/circuit, not eventId directly
				)
			).catch(() => {}); // Ignore if no matches

			// 2. Delete event decklists
			await db.delete(eventDecklist).where(eq(eventDecklist.eventId, params.eventId));

			// 3. Delete event results
			await db.delete(eventResult).where(eq(eventResult.eventId, params.eventId));

			// 4. Delete staff assignments
			await db.delete(eventStaff).where(eq(eventStaff.eventId, params.eventId));

			// 5. Delete tickets
			await db.delete(ticket).where(eq(ticket.eventId, params.eventId));

			// 6. Finally delete the event
			await db.delete(event).where(eq(event.id, params.eventId));

			// Redirect to events list
			throw redirect(302, '/admin?tab=events');
		} catch (err) {
			if (err.status === 302) throw err; // Re-throw redirect
			console.error('Error deleting event:', err);
			return fail(500, { error: 'Failed to delete event. There may be related data that could not be removed.' });
		}
	}
};
