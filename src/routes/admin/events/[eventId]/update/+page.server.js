import { redirect, error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { event, ticket, eventStaff, decklist, standing, match } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import {
	processTournamentResults,
	AGE_POINTS,
	PARTICIPATION_POINTS
} from '$lib/server/tournament-processor.js';
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
			.where(and(eq(eventStaff.userId, locals.user.id), eq(eventStaff.eventId, params.eventId)))
			.limit(1);

		if (assignment.length === 0) {
			throw error(403, 'You are not assigned to this event.');
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

		// Fetch existing decklists for this event
		const existingDecklists = await db
			.select()
			.from(decklist)
			.where(eq(decklist.eventId, params.eventId));

		return {
			user: locals.user,
			isAdmin,
			isTournamentStaff,
			event: eventData,
			participants,
			existingDecklists
		};
	} catch (err) {
		if (err.status === 404 || err.status === 403) {
			throw err;
		}
		console.error('Error loading tournament update page:', err);
		throw error(500, 'Failed to load tournament update page');
	}
}

export const actions = {
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
			const processedResults = await processTournamentResults(swissStandingsCsv, pairingsCsv, {
				eventId: params.eventId,
				circuit: eventData.circuit,
				month: eventData.month,
				eventDate: eventData.eventDate
			});

			// Clear existing matches for this event and insert new ones
			// Get month name and year from event date
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

			if (eventData.circuit) {
				await db
					.delete(match)
					.where(
						and(
							eq(match.year, eventYear),
							eq(match.circuit, eventData.circuit),
							eq(match.month, eventMonthName)
						)
					);
			}

			if (processedResults.matches?.length > 0 && eventData.circuit) {
				// Transform matches to new format with year, circuit, month
				const matchesToInsert = processedResults.matches.map((m) => ({
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
				await db.insert(match).values(matchesToInsert);
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

	// Save progress without finalizing (saves results but doesn't update standings)
	saveProgress: async ({ params, locals }) => {
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'tournament staff')) {
			return fail(403, { error: 'Unauthorized' });
		}

		try {
			// Just update event status to in_progress
			await db
				.update(event)
				.set({
					status: 'in_progress'
				})
				.where(eq(event.id, params.eventId));

			return {
				success: true,
				message: 'Progress saved. Results are stored but standings have not been updated yet.'
			};
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
			// Fetch event to get circuit info
			const [eventData] = await db
				.select()
				.from(event)
				.where(eq(event.id, params.eventId))
				.limit(1);

			if (!eventData) {
				return fail(404, { error: 'Event not found' });
			}

			// Determine month info from event date
			const eventDate = eventData.eventDate ? new Date(eventData.eventDate) : new Date();
			const monthNamesCapitalized = [
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
			const eventMonthCapitalized = monthNamesCapitalized[eventDate.getUTCMonth()];
			const currentYear = eventDate.getUTCFullYear().toString();

			if (!eventData.circuit) {
				return fail(400, { error: 'Event must have a circuit to finalize standings.' });
			}

			// Fetch matches for this event to compute results
			const eventMatches = await db
				.select()
				.from(match)
				.where(
					and(
						eq(match.year, currentYear),
						eq(match.circuit, eventData.circuit),
						eq(match.month, eventMonthCapitalized)
					)
				);

			if (eventMatches.length === 0) {
				return fail(400, {
					error: 'No matches found. Please import tournament results first using CSV upload.'
				});
			}

			// Compute player stats from matches
			const playerStats = {};
			for (const m of eventMatches) {
				// Initialize player 1
				const p1Key = m.player1GemId || m.player1Name;
				if (!playerStats[p1Key]) {
					playerStats[p1Key] = {
						playerName: m.player1Name,
						gemId: m.player1GemId,
						wins: 0,
						losses: 0,
						draws: 0
					};
				}

				// Initialize player 2
				const p2Key = m.player2GemId || m.player2Name;
				if (m.player2Name && !playerStats[p2Key]) {
					playerStats[p2Key] = {
						playerName: m.player2Name,
						gemId: m.player2GemId,
						wins: 0,
						losses: 0,
						draws: 0
					};
				}

				// Count wins/losses based on winner
				if (m.winner === m.player1Name || m.winner === m.player1GemId) {
					playerStats[p1Key].wins++;
					if (m.player2Name) playerStats[p2Key].losses++;
				} else if (m.winner === m.player2Name || m.winner === m.player2GemId) {
					if (m.player2Name) playerStats[p2Key].wins++;
					playerStats[p1Key].losses++;
				} else if (m.winner === 'Draw' || m.winner === 'draw') {
					playerStats[p1Key].draws++;
					if (m.player2Name) playerStats[p2Key].draws++;
				}
			}

			// Convert to array and sort by wins (descending) to determine placement
			const results = Object.values(playerStats)
				.sort((a, b) => b.wins - a.wins || a.losses - b.losses)
				.map((player, index) => {
					const placement = index + 1;
					const pointsEntry = AGE_POINTS[placement];
					return {
						...player,
						placement,
						agePoints: pointsEntry ? pointsEntry.points : PARTICIPATION_POINTS
					};
				});

			// Get lowercase month for column names
			const eventMonth = eventMonthCapitalized.toLowerCase();

			// Track updates for summary
			let playersUpdated = 0;
			let playersCreated = 0;
			const errors = [];

			// Update season standings for each participant with AGE points
			if (eventData.circuit && results.length > 0) {
				for (const result of results) {
					try {
						// Calculate match stats
						const matchesWon = result.wins || 0;
						const matchesPlayed = matchesWon + (result.losses || 0) + (result.draws || 0);

						// Find existing standing - try by GEM ID first, then by player name
						let existingStanding = null;

						if (result.gemId) {
							const [byGemId] = await db
								.select()
								.from(standing)
								.where(
									and(
										eq(standing.season, currentYear),
										eq(standing.circuit, eventData.circuit),
										eq(standing.gemId, result.gemId)
									)
								)
								.limit(1);
							existingStanding = byGemId;
						}

						// If no GEM ID match, try by player name
						if (!existingStanding) {
							const [byName] = await db
								.select()
								.from(standing)
								.where(
									and(
										eq(standing.season, currentYear),
										eq(standing.circuit, eventData.circuit),
										eq(standing.playerName, result.playerName)
									)
								)
								.limit(1);
							existingStanding = byName;
						}

						if (existingStanding) {
							// Update existing standing
							const monthPointsCol = `${eventMonth}Points`;
							const monthMatchesWonCol = `${eventMonth}MatchesWon`;
							const monthMatchesCol = `${eventMonth}Matches`;

							// Calculate new totals
							const newTotalPoints = (existingStanding.totalPoints || 0) + (result.agePoints || 0);
							const newMatchesWon = (existingStanding.matchesWon || 0) + matchesWon;
							const newMatchesPlayed = (existingStanding.matchesPlayed || 0) + matchesPlayed;
							const newWinPercentage =
								newMatchesPlayed > 0
									? parseFloat(((newMatchesWon / newMatchesPlayed) * 100).toFixed(2))
									: null;

							const updateData = {
								totalPoints: newTotalPoints,
								matchesWon: newMatchesWon,
								matchesPlayed: newMatchesPlayed,
								winPercentage: newWinPercentage,
								updatedAt: new Date()
							};

							// Update monthly columns
							updateData[monthPointsCol] =
								(existingStanding[monthPointsCol] || 0) + (result.agePoints || 0);
							updateData[monthMatchesWonCol] =
								(existingStanding[monthMatchesWonCol] || 0) + matchesWon;
							updateData[monthMatchesCol] =
								(existingStanding[monthMatchesCol] || 0) + matchesPlayed;

							// If player has GEM ID and existing record doesn't, update it
							if (result.gemId && !existingStanding.gemId) {
								updateData.gemId = result.gemId;
							}

							// Update player name to latest (in case it changed)
							if (result.gemId && existingStanding.gemId === result.gemId) {
								updateData.playerName = result.playerName;
							}

							await db.update(standing).set(updateData).where(eq(standing.id, existingStanding.id));

							playersUpdated++;
						} else {
							// Create new standing
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
								winPercentage:
									matchesPlayed > 0
										? parseFloat(((matchesWon / matchesPlayed) * 100).toFixed(2))
										: null
							};

							// Set monthly columns
							newStanding[monthPointsCol] = result.agePoints || 0;
							newStanding[monthMatchesWonCol] = matchesWon;
							newStanding[monthMatchesCol] = matchesPlayed;

							await db.insert(standing).values(newStanding);
							playersCreated++;
						}
					} catch (playerErr) {
						console.error(`Error processing player ${result.playerName}:`, playerErr);
						errors.push(`Failed to update ${result.playerName}: ${playerErr.message}`);
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

			return {
				success: true,
				message: 'Event reopened. You can now update results and standings.'
			};
		} catch (err) {
			console.error('Error reopening event:', err);
			return fail(500, { error: 'Failed to reopen event' });
		}
	}
};
