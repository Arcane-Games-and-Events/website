import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { event, order, user, eventStaff, player, playerAlias, seasonStanding, lssSeason } from '$lib/server/db/schema.js';
import { desc, eq, count, and, sql, asc } from 'drizzle-orm';

export async function load({ locals }) {
	// Require admin authentication
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/login?redirect=/admin');
	}

	try {
		// Fetch events
		const events = await db.select().from(event).orderBy(desc(event.createdAt));

		// Fetch recent orders (last 10)
		const recentOrders = await db
			.select()
			.from(order)
			.orderBy(desc(order.createdAt))
			.limit(10);

		// Get stats
		const [eventCount] = await db.select({ count: count() }).from(event);
		const [orderCount] = await db.select({ count: count() }).from(order);
		const [premiumCount] = await db
			.select({ count: count() })
			.from(user)
			.where(eq(user.role, 'premium'));

		// Fetch tournament staff users
		const tournamentStaff = await db
			.select()
			.from(user)
			.where(eq(user.role, 'tournament_staff'));

		// Fetch event staff assignments
		const staffAssignments = await db
			.select()
			.from(eventStaff);

		// Fetch all users for user management
		const allUsers = await db
			.select({
				id: user.id,
				email: user.email,
				role: user.role,
				createdAt: user.createdAt
			})
			.from(user)
			.orderBy(desc(user.createdAt));

		// Fetch players with their aliases for standings management
		const players = await db
			.select({
				id: player.id,
				displayName: player.displayName,
				gemId: player.gemId,
				createdAt: player.createdAt
			})
			.from(player)
			.orderBy(desc(player.createdAt));

		// Fetch player aliases
		const aliases = await db
			.select()
			.from(playerAlias)
			.orderBy(playerAlias.aliasName);

		// Fetch season standings with flattened monthly columns
		const rawStandings = await db
			.select()
			.from(seasonStanding)
			.orderBy(desc(seasonStanding.totalPoints));

		// Map standings with computed monthly data for display
		const standings = rawStandings.map(standing => {
			// Calculate win percentage if we have matches data but no stored percentage
			let winPercentage = standing.winPercentage;
			if (winPercentage === null && standing.matchesPlayed && standing.matchesPlayed > 0) {
				winPercentage = parseFloat(((standing.matchesWon / standing.matchesPlayed) * 100).toFixed(2));
			}

			// Build monthly breakdown from flattened columns
			const monthlyBreakdown = {
				january: { points: standing.januaryPoints || 0, matchesWon: standing.januaryMatchesWon || 0, events: standing.januaryEvents || 0 },
				february: { points: standing.februaryPoints || 0, matchesWon: standing.februaryMatchesWon || 0, events: standing.februaryEvents || 0 },
				march: { points: standing.marchPoints || 0, matchesWon: standing.marchMatchesWon || 0, events: standing.marchEvents || 0 },
				april: { points: standing.aprilPoints || 0, matchesWon: standing.aprilMatchesWon || 0, events: standing.aprilEvents || 0 },
				may: { points: standing.mayPoints || 0, matchesWon: standing.mayMatchesWon || 0, events: standing.mayEvents || 0 },
				june: { points: standing.junePoints || 0, matchesWon: standing.juneMatchesWon || 0, events: standing.juneEvents || 0 },
				july: { points: standing.julyPoints || 0, matchesWon: standing.julyMatchesWon || 0, events: standing.julyEvents || 0 },
				august: { points: standing.augustPoints || 0, matchesWon: standing.augustMatchesWon || 0, events: standing.augustEvents || 0 },
				september: { points: standing.septemberPoints || 0, matchesWon: standing.septemberMatchesWon || 0, events: standing.septemberEvents || 0 },
				october: { points: standing.octoberPoints || 0, matchesWon: standing.octoberMatchesWon || 0, events: standing.octoberEvents || 0 },
				november: { points: standing.novemberPoints || 0, matchesWon: standing.novemberMatchesWon || 0, events: standing.novemberEvents || 0 },
				december: { points: standing.decemberPoints || 0, matchesWon: standing.decemberMatchesWon || 0, events: standing.decemberEvents || 0 }
			};

			return {
				...standing,
				matchesWon: standing.matchesWon ?? 0,
				matchesPlayed: standing.matchesPlayed ?? 0,
				winPercentage,
				totalPoints: standing.totalPoints ?? 0,
				top8Finishes: standing.top8Finishes ?? 0,
				eventsPlayed: standing.eventsPlayed ?? 0,
				rank: standing.rank,
				monthlyBreakdown
			};
		});

		// Get player count
		const [playerCount] = await db.select({ count: count() }).from(player);

		// Fetch LSS tournament seasons
		const lssSeasons = await db
			.select()
			.from(lssSeason)
			.orderBy(desc(lssSeason.startDate));

		return {
			user: locals.user,
			events,
			recentOrders,
			tournamentStaff,
			staffAssignments,
			allUsers,
			players,
			aliases,
			standings,
			lssSeasons,
			stats: {
				totalEvents: eventCount.count,
				totalOrders: orderCount.count,
				premiumUsers: premiumCount.count,
				totalPlayers: playerCount.count
			}
		};
	} catch (error) {
		console.error('Admin page load error:', error);
		// Return default values if there's an error
		return {
			user: locals.user,
			events: [],
			recentOrders: [],
			tournamentStaff: [],
			staffAssignments: [],
			allUsers: [],
			players: [],
			aliases: [],
			standings: [],
			lssSeasons: [],
			stats: {
				totalEvents: 0,
				totalOrders: 0,
				premiumUsers: 0,
				totalPlayers: 0
			}
		};
	}
}

export const actions = {
	// Assign tournament staff to an event
	assignStaff: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const staffId = formData.get('staffId');
		const eventId = formData.get('eventId');

		try {
			// Check if assignment already exists
			const existing = await db
				.select()
				.from(eventStaff)
				.where(and(
					eq(eventStaff.userId, staffId),
					eq(eventStaff.eventId, eventId)
				))
				.limit(1);

			if (existing.length > 0) {
				return fail(400, { error: 'Staff member already assigned to this event' });
			}

			// Create assignment
			await db.insert(eventStaff).values({
				userId: staffId,
				eventId,
				assignedBy: locals.user.id
			});

			return { success: true, message: 'Staff assigned successfully' };
		} catch (err) {
			console.error('Error assigning staff:', err);
			return fail(500, { error: 'Failed to assign staff' });
		}
	},

	// Remove tournament staff from an event
	unassignStaff: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const staffId = formData.get('staffId');
		const eventId = formData.get('eventId');

		try {
			await db
				.delete(eventStaff)
				.where(and(
					eq(eventStaff.userId, staffId),
					eq(eventStaff.eventId, eventId)
				));

			return { success: true, message: 'Staff unassigned successfully' };
		} catch (err) {
			console.error('Error unassigning staff:', err);
			return fail(500, { error: 'Failed to unassign staff' });
		}
	},

	// Update user role
	updateUserRole: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const userId = formData.get('userId');
		const newRole = formData.get('role');

		// Validate role
		const validRoles = ['free', 'premium', 'admin', 'writer', 'tournament_staff'];
		if (!validRoles.includes(newRole)) {
			return fail(400, { error: 'Invalid role' });
		}

		// Prevent admin from changing their own role
		if (userId === locals.user.id) {
			return fail(400, { error: 'Cannot change your own role' });
		}

		try {
			await db
				.update(user)
				.set({ role: newRole })
				.where(eq(user.id, userId));

			return { success: true, message: `User role updated to ${newRole}` };
		} catch (err) {
			console.error('Error updating user role:', err);
			return fail(500, { error: 'Failed to update user role' });
		}
	},

	// Update a single standing field
	updateStanding: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const standingId = formData.get('standingId');
		const field = formData.get('field');
		const value = formData.get('value');

		if (!standingId || !field) {
			return fail(400, { error: 'Standing ID and field are required' });
		}

		// Allowed fields that can be updated
		const allowedFields = [
			'playerName', 'gemId', 'totalPoints', 'winPercentage',
			'eventsPlayed', 'top8Finishes', 'rank', 'qualifiedForChampionship',
			'matchesPlayed', 'matchesWon',
			// Monthly points columns
			'januaryPoints', 'februaryPoints', 'marchPoints', 'aprilPoints',
			'mayPoints', 'junePoints', 'julyPoints', 'augustPoints',
			'septemberPoints', 'octoberPoints', 'novemberPoints', 'decemberPoints',
			// Monthly matches won columns
			'januaryMatchesWon', 'februaryMatchesWon', 'marchMatchesWon', 'aprilMatchesWon',
			'mayMatchesWon', 'juneMatchesWon', 'julyMatchesWon', 'augustMatchesWon',
			'septemberMatchesWon', 'octoberMatchesWon', 'novemberMatchesWon', 'decemberMatchesWon',
			// Monthly events columns
			'januaryEvents', 'februaryEvents', 'marchEvents', 'aprilEvents',
			'mayEvents', 'juneEvents', 'julyEvents', 'augustEvents',
			'septemberEvents', 'octoberEvents', 'novemberEvents', 'decemberEvents'
		];

		if (!allowedFields.includes(field)) {
			return fail(400, { error: `Field "${field}" is not allowed to be updated` });
		}

		try {
			// Parse value based on field type
			let parsedValue = value;

			// Integer fields (including all monthly columns)
			const integerFields = [
				'totalPoints', 'eventsPlayed', 'top8Finishes', 'rank', 'matchesPlayed', 'matchesWon',
				// Monthly points
				'januaryPoints', 'februaryPoints', 'marchPoints', 'aprilPoints',
				'mayPoints', 'junePoints', 'julyPoints', 'augustPoints',
				'septemberPoints', 'octoberPoints', 'novemberPoints', 'decemberPoints',
				// Monthly matches won
				'januaryMatchesWon', 'februaryMatchesWon', 'marchMatchesWon', 'aprilMatchesWon',
				'mayMatchesWon', 'juneMatchesWon', 'julyMatchesWon', 'augustMatchesWon',
				'septemberMatchesWon', 'octoberMatchesWon', 'novemberMatchesWon', 'decemberMatchesWon',
				// Monthly events
				'januaryEvents', 'februaryEvents', 'marchEvents', 'aprilEvents',
				'mayEvents', 'juneEvents', 'julyEvents', 'augustEvents',
				'septemberEvents', 'octoberEvents', 'novemberEvents', 'decemberEvents'
			];

			if (integerFields.includes(field)) {
				parsedValue = value ? parseInt(value) : null;
			} else if (field === 'winPercentage') {
				parsedValue = value ? parseFloat(value) : null;
			} else if (field === 'qualifiedForChampionship') {
				parsedValue = value === 'true';
			} else if (value === '') {
				parsedValue = null;
			}

			await db
				.update(seasonStanding)
				.set({ [field]: parsedValue, updatedAt: new Date() })
				.where(eq(seasonStanding.id, standingId));

			// Get the standing's linked player for sync updates
			const standingData = await db
				.select({ playerId: seasonStanding.playerId })
				.from(seasonStanding)
				.where(eq(seasonStanding.id, standingId))
				.limit(1);

			// If updating gemId, also update the linked player and all other standings for that player
			if (field === 'gemId' && standingData[0]?.playerId) {
				// Update the player's GEM ID
				await db
					.update(player)
					.set({ gemId: parsedValue, updatedAt: new Date() })
					.where(eq(player.id, standingData[0].playerId));

				// Update all other standings linked to this player
				await db
					.update(seasonStanding)
					.set({ gemId: parsedValue, updatedAt: new Date() })
					.where(eq(seasonStanding.playerId, standingData[0].playerId));
			}

			// If updating playerName, also update the linked player's displayName
			if (field === 'playerName' && standingData[0]?.playerId) {
				await db
					.update(player)
					.set({ displayName: parsedValue, updatedAt: new Date() })
					.where(eq(player.id, standingData[0].playerId));
			}

			return { success: true, message: `${field} updated successfully` };
		} catch (err) {
			console.error('Error updating standing:', err);
			return fail(500, { error: 'Failed to update standing' });
		}
	},

	// Delete a standing
	deleteStanding: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const standingId = formData.get('standingId');

		if (!standingId) {
			return fail(400, { error: 'Standing ID is required' });
		}

		try {
			await db
				.delete(seasonStanding)
				.where(eq(seasonStanding.id, standingId));

			return { success: true, message: 'Standing deleted successfully' };
		} catch (err) {
			console.error('Error deleting standing:', err);
			return fail(500, { error: 'Failed to delete standing' });
		}
	},

	// Merge two players into one
	mergePlayers: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const sourcePlayerId = formData.get('sourcePlayerId');
		const targetPlayerId = formData.get('targetPlayerId');

		if (!sourcePlayerId || !targetPlayerId) {
			return fail(400, { error: 'Both source and target player IDs are required' });
		}

		if (sourcePlayerId === targetPlayerId) {
			return fail(400, { error: 'Cannot merge a player with themselves' });
		}

		try {
			// Move all aliases from source to target
			await db
				.update(playerAlias)
				.set({ playerId: targetPlayerId })
				.where(eq(playerAlias.playerId, sourcePlayerId));

			// Move all standings from source to target
			await db
				.update(seasonStanding)
				.set({ playerId: targetPlayerId })
				.where(eq(seasonStanding.playerId, sourcePlayerId));

			// Delete the source player
			await db
				.delete(player)
				.where(eq(player.id, sourcePlayerId));

			return { success: true, message: 'Players merged successfully' };
		} catch (err) {
			console.error('Error merging players:', err);
			return fail(500, { error: 'Failed to merge players' });
		}
	},

	// Update player GEM ID
	updatePlayerGemId: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const playerId = formData.get('playerId');
		const gemId = formData.get('gemId')?.trim() || null;

		if (!playerId) {
			return fail(400, { error: 'Player ID is required' });
		}

		try {
			// Get the player's display name and all aliases
			const playerData = await db
				.select({ displayName: player.displayName })
				.from(player)
				.where(eq(player.id, playerId))
				.limit(1);

			const aliases = await db
				.select({ aliasName: playerAlias.aliasName })
				.from(playerAlias)
				.where(eq(playerAlias.playerId, playerId));

			// Collect all names to match (display name + all aliases)
			const playerNames = [
				playerData[0]?.displayName,
				...aliases.map(a => a.aliasName)
			].filter(Boolean);

			// Update player's GEM ID
			await db
				.update(player)
				.set({ gemId, updatedAt: new Date() })
				.where(eq(player.id, playerId));

			// Update all standings linked to this player by playerId
			await db
				.update(seasonStanding)
				.set({ gemId, playerId, updatedAt: new Date() })
				.where(eq(seasonStanding.playerId, playerId));

			// Also update standings that match by playerName but don't have playerId set
			for (const name of playerNames) {
				await db
					.update(seasonStanding)
					.set({ gemId, playerId, updatedAt: new Date() })
					.where(and(
						eq(seasonStanding.playerName, name),
						sql`${seasonStanding.playerId} IS NULL`
					));
			}

			return { success: true, message: 'GEM ID updated successfully' };
		} catch (err) {
			console.error('Error updating GEM ID:', err);
			return fail(500, { error: 'Failed to update GEM ID' });
		}
	},

	// Update player display name
	updatePlayerName: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const playerId = formData.get('playerId');
		const displayName = formData.get('displayName')?.trim();

		if (!playerId || !displayName) {
			return fail(400, { error: 'Player ID and display name are required' });
		}

		try {
			await db
				.update(player)
				.set({ displayName, updatedAt: new Date() })
				.where(eq(player.id, playerId));

			return { success: true, message: 'Display name updated successfully' };
		} catch (err) {
			console.error('Error updating display name:', err);
			return fail(500, { error: 'Failed to update display name' });
		}
	},

	// Delete a player
	deletePlayer: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const playerId = formData.get('playerId');

		if (!playerId) {
			return fail(400, { error: 'Player ID is required' });
		}

		try {
			// First, unlink any standings that reference this player (set playerId to null)
			await db
				.update(seasonStanding)
				.set({ playerId: null, updatedAt: new Date() })
				.where(eq(seasonStanding.playerId, playerId));

			// Delete all aliases for this player
			await db
				.delete(playerAlias)
				.where(eq(playerAlias.playerId, playerId));

			// Delete the player
			await db
				.delete(player)
				.where(eq(player.id, playerId));

			return { success: true, message: 'Player deleted successfully' };
		} catch (err) {
			console.error('Error deleting player:', err);
			return fail(500, { error: 'Failed to delete player' });
		}
	},

	// Create a new LSS event (season or tournament)
	createLssSeason: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const name = formData.get('name')?.trim();
		const description = formData.get('description')?.trim() || null;
		const startDate = formData.get('startDate');
		const endDate = formData.get('endDate');
		const eventType = formData.get('eventType')?.trim() || null;
		const formatValues = formData.getAll('format');
		const format = formatValues.length > 0 ? formatValues.join(', ') : null;
		const link = formData.get('link')?.trim() || null;

		if (!name || !startDate || !endDate) {
			return fail(400, { error: 'Name, start date, and end date are required' });
		}

		const start = new Date(startDate);
		const end = new Date(endDate);

		if (end <= start) {
			return fail(400, { error: 'End date must be after start date' });
		}

		try {
			await db.insert(lssSeason).values({
				name,
				description,
				startDate: start,
				endDate: end,
				eventType,
				format,
				link,
				isActive: true,
				createdBy: locals.user.id
			});

			return { success: true, message: 'LSS event created successfully' };
		} catch (err) {
			console.error('Error creating LSS event:', err);
			return fail(500, { error: 'Failed to create LSS event' });
		}
	},

	// Update an LSS event (season or tournament)
	updateLssSeason: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const seasonId = formData.get('seasonId');
		const name = formData.get('name')?.trim();
		const description = formData.get('description')?.trim() || null;
		const startDate = formData.get('startDate');
		const endDate = formData.get('endDate');
		const eventType = formData.get('eventType')?.trim() || null;
		const formatValues = formData.getAll('format');
		const format = formatValues.length > 0 ? formatValues.join(', ') : null;
		const link = formData.get('link')?.trim() || null;
		const isActive = formData.get('isActive') === 'true';

		if (!seasonId || !name || !startDate || !endDate) {
			return fail(400, { error: 'Event ID, name, start date, and end date are required' });
		}

		const start = new Date(startDate);
		const end = new Date(endDate);

		if (end <= start) {
			return fail(400, { error: 'End date must be after start date' });
		}

		try {
			await db
				.update(lssSeason)
				.set({
					name,
					description,
					startDate: start,
					endDate: end,
					eventType,
					format,
					link,
					isActive,
					updatedAt: new Date()
				})
				.where(eq(lssSeason.id, seasonId));

			return { success: true, message: 'LSS event updated successfully' };
		} catch (err) {
			console.error('Error updating LSS event:', err);
			return fail(500, { error: 'Failed to update LSS event' });
		}
	},

	// Delete an LSS tournament season
	deleteLssSeason: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const seasonId = formData.get('seasonId');

		if (!seasonId) {
			return fail(400, { error: 'Season ID is required' });
		}

		try {
			await db
				.delete(lssSeason)
				.where(eq(lssSeason.id, seasonId));

			return { success: true, message: 'LSS season deleted successfully' };
		} catch (err) {
			console.error('Error deleting LSS season:', err);
			return fail(500, { error: 'Failed to delete LSS season' });
		}
	},

	// Create a new player standing
	createStanding: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const season = formData.get('season')?.trim();
		const circuit = formData.get('circuit')?.trim();
		const playerName = formData.get('playerName')?.trim();
		const gemId = formData.get('gemId')?.trim() || null;
		const totalPoints = parseInt(formData.get('totalPoints')) || 0;
		const eventsPlayed = parseInt(formData.get('eventsPlayed')) || 0;
		const matchesPlayed = parseInt(formData.get('matchesPlayed')) || 0;
		const matchesWon = parseInt(formData.get('matchesWon')) || 0;
		const top8Finishes = parseInt(formData.get('top8Finishes')) || 0;

		if (!season || !circuit || !playerName) {
			return fail(400, { error: 'Season, circuit, and player name are required' });
		}

		// Calculate win percentage
		const winPercentage = matchesPlayed > 0
			? Math.round((matchesWon / matchesPlayed) * 100 * 100) / 100
			: null;

		try {
			await db.insert(seasonStanding).values({
				season,
				circuit,
				playerName,
				gemId,
				totalPoints,
				eventsPlayed,
				matchesPlayed,
				matchesWon,
				top8Finishes,
				winPercentage,
				qualifiedForChampionship: false
			});

			return { success: true, message: 'Standing created successfully' };
		} catch (err) {
			console.error('Error creating standing:', err);
			// Check for unique constraint violation
			if (err.code === '23505') {
				return fail(400, { error: 'A standing for this player in this season/circuit already exists' });
			}
			return fail(500, { error: 'Failed to create standing' });
		}
	}
};
