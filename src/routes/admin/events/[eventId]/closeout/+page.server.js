import { redirect, error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { event, ticket, user, eventStaff, eventResult, eventDecklist, seasonStanding, player, playerAlias } from '$lib/server/db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { processTournamentResults, AGE_POINTS, PARTICIPATION_POINTS } from '$lib/server/tournament-processor.js';

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
			throw error(403, 'You are not assigned to this event.');
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

		// Fetch all registered players (tickets)
		const tickets = await db
			.select({
				ticketId: ticket.id,
				firstName: ticket.firstName,
				lastName: ticket.lastName,
				gemId: ticket.gemId,
				userId: ticket.userId,
				refunded: ticket.refunded
			})
			.from(ticket)
			.where(eq(ticket.eventId, params.eventId));

		// Get non-refunded tickets as potential participants
		const participants = tickets
			.filter((t) => !t.refunded)
			.map((t) => ({
				...t,
				playerName: `${t.firstName || ''} ${t.lastName || ''}`.trim() || 'Unknown Player'
			}));

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

		return {
			user: locals.user,
			isAdmin,
			isTournamentStaff,
			event: eventData,
			participants,
			existingResults,
			existingDecklists
		};
	} catch (err) {
		if (err.status === 404 || err.status === 403) {
			throw err;
		}
		console.error('Error loading closeout page:', err);
		throw error(500, 'Failed to load closeout page');
	}
}

export const actions = {
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
				// Update existing result
				await db
					.update(eventResult)
					.set(resultData)
					.where(eq(eventResult.id, resultId));
			} else {
				// Create new result
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
		const deckName = formData.get('deckName') || null;
		const hero = formData.get('hero') || null;
		const format = formData.get('format') || null;
		const cardsJson = formData.get('cards');
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
				deckName,
				hero,
				format,
				cards,
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
			// Read CSV files
			const swissStandingsCsv = await swissStandingsFile.text();
			const pairingsCsv = await pairingsFile.text();

			// Fetch event info
			const [eventData] = await db
				.select()
				.from(event)
				.where(eq(event.id, params.eventId))
				.limit(1);

			if (!eventData) {
				return fail(404, { error: 'Event not found' });
			}

			// Process tournament results
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

			// Insert new results
			for (const result of processedResults.results) {
				await db.insert(eventResult).values({
					eventId: params.eventId,
					playerName: result.name,
					gemId: result.playerId || null,
					placement: result.placement,
					wins: result.matchesWon || 0,
					losses: result.matchesPlayed - result.matchesWon || 0,
					draws: 0,
					agePoints: result.points,
					prizeAmount: result.prize > 0 ? result.prize.toFixed(2) : null
				});
			}

			return {
				success: true,
				message: `Processed ${processedResults.results.length} players. Winner: ${processedResults.summary.winner?.name || 'Unknown'}`,
				processedResults: processedResults.summary
			};
		} catch (err) {
			console.error('Error processing CSV:', err);
			return fail(500, { error: `Failed to process CSV: ${err.message}` });
		}
	},

	// Close out the event
	closeEvent: async ({ params, locals }) => {
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'tournament staff')) {
			return fail(403, { error: 'Unauthorized' });
		}

		try {
			// Fetch event to get circuit info
			const [eventData] = await db
				.select()
				.from(event)
				.where(eq(event.id, params.eventId))
				.limit(1);

			if (!eventData) {
				return fail(404, { error: 'Event not found' });
			}

			// Fetch all results for this event
			const results = await db
				.select()
				.from(eventResult)
				.where(eq(eventResult.eventId, params.eventId));

			// Determine month column prefix from event date
			const eventDate = eventData.eventDate ? new Date(eventData.eventDate) : new Date();
			const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
				'july', 'august', 'september', 'october', 'november', 'december'];
			const eventMonth = monthNames[eventDate.getMonth()];
			const currentYear = eventDate.getFullYear().toString();

			// Update season standings for each participant with AGE points
			if (eventData.circuit && results.length > 0) {
				for (const result of results) {
					if (result.agePoints > 0) {
						// Check if player already has a standing record for this season/circuit
						// First try by GEM ID, then by player name
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

						// Calculate match stats
						const matchesWon = result.wins || 0;
						const matchesPlayed = matchesWon + (result.losses || 0) + (result.draws || 0);

						if (existingStanding) {
							// Build update object with dynamic monthly column
							const updateData = {
								totalPoints: (existingStanding.totalPoints || 0) + result.agePoints,
								eventsPlayed: (existingStanding.eventsPlayed || 0) + 1,
								matchesWon: (existingStanding.matchesWon || 0) + matchesWon,
								matchesPlayed: (existingStanding.matchesPlayed || 0) + matchesPlayed,
								top8Finishes: (existingStanding.top8Finishes || 0) + (result.placement <= 8 ? 1 : 0),
								updatedAt: new Date()
							};

							// Update monthly columns dynamically
							const monthPointsCol = `${eventMonth}Points`;
							const monthMatchesCol = `${eventMonth}MatchesWon`;
							const monthEventsCol = `${eventMonth}Events`;

							updateData[monthPointsCol] = (existingStanding[monthPointsCol] || 0) + result.agePoints;
							updateData[monthMatchesCol] = (existingStanding[monthMatchesCol] || 0) + matchesWon;
							updateData[monthEventsCol] = (existingStanding[monthEventsCol] || 0) + 1;

							// Calculate new win percentage
							const totalMatchesPlayed = updateData.matchesPlayed;
							const totalMatchesWon = updateData.matchesWon;
							if (totalMatchesPlayed > 0) {
								updateData.winPercentage = parseFloat(((totalMatchesWon / totalMatchesPlayed) * 100).toFixed(2));
							}

							await db
								.update(seasonStanding)
								.set(updateData)
								.where(eq(seasonStanding.id, existingStanding.id));
						} else {
							// Create new standing
							const newStanding = {
								season: currentYear,
								circuit: eventData.circuit,
								gemId: result.gemId,
								userId: result.userId,
								playerName: result.playerName,
								totalPoints: result.agePoints,
								eventsPlayed: 1,
								matchesWon: matchesWon,
								matchesPlayed: matchesPlayed,
								top8Finishes: result.placement <= 8 ? 1 : 0,
								winPercentage: matchesPlayed > 0 ? parseFloat(((matchesWon / matchesPlayed) * 100).toFixed(2)) : null
							};

							// Set monthly columns
							newStanding[`${eventMonth}Points`] = result.agePoints;
							newStanding[`${eventMonth}MatchesWon`] = matchesWon;
							newStanding[`${eventMonth}Events`] = 1;

							await db.insert(seasonStanding).values(newStanding);
						}
					}
				}
			}

			// Mark event as completed
			await db
				.update(event)
				.set({
					status: 'completed',
					closedAt: new Date(),
					closedBy: locals.user.id
				})
				.where(eq(event.id, params.eventId));

			return { success: true, message: 'Event closed successfully. Results have been recorded and standings updated.' };
		} catch (err) {
			console.error('Error closing event:', err);
			return fail(500, { error: 'Failed to close event' });
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
					status: 'upcoming',
					closedAt: null,
					closedBy: null
				})
				.where(eq(event.id, params.eventId));

			return { success: true, message: 'Event reopened' };
		} catch (err) {
			console.error('Error reopening event:', err);
			return fail(500, { error: 'Failed to reopen event' });
		}
	}
};
