import { redirect, error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { event, ticket, user, eventStaff, eventResult, eventDecklist, seasonStanding } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';

export async function load({ params, locals }) {
	// Require authentication (admin or tournament staff)
	if (!locals.user) {
		throw redirect(302, '/login');
	}

	const isAdmin = locals.user.role === 'admin';
	const isTournamentStaff = locals.user.role === 'tournament_staff';

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
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'tournament_staff')) {
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
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'tournament_staff')) {
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
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'tournament_staff')) {
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
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'tournament_staff')) {
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

	// Close out the event
	closeEvent: async ({ params, locals }) => {
		if (!locals.user || (locals.user.role !== 'admin' && locals.user.role !== 'tournament_staff')) {
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

			// Update season standings for each participant with AGE points
			if (eventData.circuit && results.length > 0) {
				const currentYear = new Date().getFullYear().toString();

				for (const result of results) {
					if (result.agePoints > 0) {
						// Check if player already has a standing record for this season/circuit
						const [existingStanding] = await db
							.select()
							.from(seasonStanding)
							.where(and(
								eq(seasonStanding.season, currentYear),
								eq(seasonStanding.circuit, eventData.circuit),
								eq(seasonStanding.gemId, result.gemId)
							))
							.limit(1);

						if (existingStanding) {
							// Update existing standing
							await db
								.update(seasonStanding)
								.set({
									totalPoints: existingStanding.totalPoints + result.agePoints,
									eventsPlayed: existingStanding.eventsPlayed + 1,
									firstPlaceFinishes: existingStanding.firstPlaceFinishes + (result.placement === 1 ? 1 : 0),
									top4Finishes: existingStanding.top4Finishes + (result.placement <= 4 ? 1 : 0),
									top8Finishes: existingStanding.top8Finishes + (result.placement <= 8 ? 1 : 0),
									updatedAt: new Date()
								})
								.where(eq(seasonStanding.id, existingStanding.id));
						} else {
							// Create new standing
							await db.insert(seasonStanding).values({
								season: currentYear,
								circuit: eventData.circuit,
								gemId: result.gemId,
								userId: result.userId,
								playerName: result.playerName,
								totalPoints: result.agePoints,
								eventsPlayed: 1,
								firstPlaceFinishes: result.placement === 1 ? 1 : 0,
								top4Finishes: result.placement <= 4 ? 1 : 0,
								top8Finishes: result.placement <= 8 ? 1 : 0
							});
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
