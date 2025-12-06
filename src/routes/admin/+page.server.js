import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import {
	event,
	order,
	user,
	seasonStanding,
	lssSeason,
	ticket,
	entitlement
} from '$lib/server/db/schema.js';
import { desc, eq, count, and, sql, asc, gte } from 'drizzle-orm';

export async function load({ locals }) {
	// Require admin authentication
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/login?redirect=/admin');
	}

	try {
		const currentDate = new Date();
		const thirtyDaysFromNow = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000);
		const now = new Date();
		const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
		const weekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
		const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
		const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

		// ========== RUN QUERIES IN BATCHES TO AVOID CONNECTION POOL EXHAUSTION ==========
		// Batch 1: Core data (most important)
		const [events, allOrders, allUsers, rawStandings, lssSeasons] = await Promise.all([
			db.select().from(event).orderBy(desc(event.createdAt)),
			db.select().from(order).orderBy(desc(order.createdAt)).limit(500),
			db.select({
				id: user.id,
				email: user.email,
				role: user.role,
				createdAt: user.createdAt
			}).from(user).orderBy(desc(user.createdAt)).limit(200),
			db.select().from(seasonStanding).orderBy(desc(seasonStanding.totalPoints)),
			db.select().from(lssSeason).orderBy(desc(lssSeason.startDate))
		]);

		// Batch 2: Counts and ticket stats
		const [
			ticketStatsByEvent,
			[eventCount],
			[orderCount],
			[premiumCount],
			[playerCount],
			[refundedCount]
		] = await Promise.all([
			db.select({
				eventId: ticket.eventId,
				sold: count(),
				refunded: sql`SUM(CASE WHEN refunded = true THEN 1 ELSE 0 END)::int`,
				revenue: sql`COALESCE(SUM(CAST(amount_paid AS DECIMAL)), 0)`
			}).from(ticket).groupBy(ticket.eventId),
			db.select({ count: count() }).from(event),
			db.select({ count: count() }).from(order),
			db.select({ count: count() }).from(user).where(eq(user.role, 'premium')),
			db.select({ count: sql`COUNT(DISTINCT gem_id)` }).from(seasonStanding),
			db.select({ count: count() }).from(ticket).where(eq(ticket.refunded, true))
		]);

		// Batch 3: Revenue analytics
		const [
			[todayRevenueResult],
			[weekRevenueResult],
			[monthRevenueResult],
			[totalRevenueResult],
			revenueByType
		] = await Promise.all([
			db.select({ total: sql`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)` })
				.from(order).where(gte(order.createdAt, todayStart)),
			db.select({ total: sql`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)` })
				.from(order).where(gte(order.createdAt, weekStart)),
			db.select({ total: sql`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)` })
				.from(order).where(gte(order.createdAt, monthStart)),
			db.select({ total: sql`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)` })
				.from(order),
			db.select({
				type: sql`COALESCE(meta->>'type', 'unknown')`,
				total: sql`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`,
				count: count()
			}).from(order).groupBy(sql`meta->>'type'`)
		]);

		// Batch 4: Additional analytics (less critical)
		const [dailyRevenueTrend, topEvents, customerStatsRaw] = await Promise.all([
			db.select({
				date: sql`DATE(created_at)`,
				total: sql`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`,
				count: count()
			}).from(order).where(gte(order.createdAt, thirtyDaysAgo))
				.groupBy(sql`DATE(created_at)`).orderBy(sql`DATE(created_at)`),
			db.select({
				eventId: sql`meta->>'eventId'`,
				eventTitle: sql`meta->>'eventTitle'`,
				totalRevenue: sql`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`,
				ticketCount: count()
			}).from(order).where(sql`meta->>'type' = 'ticket'`)
				.groupBy(sql`meta->>'eventId'`, sql`meta->>'eventTitle'`)
				.orderBy(desc(sql`SUM(CAST(amount AS DECIMAL))`)).limit(5),
			db.select({
				email: order.userEmail,
				orderCount: count(),
				totalSpent: sql`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`,
				firstOrder: sql`MIN(created_at)`,
				lastOrder: sql`MAX(created_at)`
			}).from(order).groupBy(order.userEmail)
		]);

		// ========== EVENT ANALYTICS ==========
		// Convert ticket stats to Map for fast lookup
		const ticketsByEvent = new Map();
		for (const t of ticketStatsByEvent) {
			ticketsByEvent.set(t.eventId, {
				sold: Number(t.sold) || 0,
				refunded: Number(t.refunded) || 0,
				revenue: parseFloat(t.revenue) || 0
			});
		}

		// Compute event analytics
		let upcomingEvents = 0;
		let pastEvents = 0;
		let eventsNoDate = 0;
		let totalTicketsSold = 0;
		let totalTicketRevenue = 0;
		const eventsByCircuit = {};
		const eventsByFormat = {};
		const eventsByStatus = { upcoming: 0, in_progress: 0, completed: 0, cancelled: 0 };
		const upcomingEventsList = [];

		for (const e of events) {
			// Status counts
			const status = e.status || 'upcoming';
			eventsByStatus[status] = (eventsByStatus[status] || 0) + 1;

			// Date analysis
			if (e.eventDate) {
				const eventDate = new Date(e.eventDate);
				if (eventDate > currentDate) {
					upcomingEvents++;
					// Add to upcoming list if within 30 days
					if (eventDate <= thirtyDaysFromNow) {
						upcomingEventsList.push(e);
					}
				} else {
					pastEvents++;
				}
			} else {
				eventsNoDate++;
			}

			// Circuit breakdown
			const circuit = e.circuit || 'Unassigned';
			eventsByCircuit[circuit] = (eventsByCircuit[circuit] || 0) + 1;

			// Format breakdown
			const format = e.format || 'Unknown';
			eventsByFormat[format] = (eventsByFormat[format] || 0) + 1;

			// Ticket stats for this event
			const ticketStats = ticketsByEvent.get(e.id);
			if (ticketStats) {
				totalTicketsSold += ticketStats.sold;
				totalTicketRevenue += ticketStats.revenue;
			}
		}

		// Sort upcoming events by date
		upcomingEventsList.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));

		// Find top performing events
		const eventsWithTickets = events
			.map((e) => {
				const stats = ticketsByEvent.get(e.id) || { sold: 0, revenue: 0, refunded: 0 };
				return {
					id: e.id,
					title: e.title,
					circuit: e.circuit,
					eventDate: e.eventDate,
					status: e.status,
					ticketsSold: stats.sold,
					revenue: stats.revenue,
					refunded: stats.refunded
				};
			})
			.filter((e) => e.ticketsSold > 0);

		const topEventsByTickets = [...eventsWithTickets]
			.sort((a, b) => b.ticketsSold - a.ticketsSold)
			.slice(0, 5);

		const topEventsByRevenue = [...eventsWithTickets]
			.sort((a, b) => b.revenue - a.revenue)
			.slice(0, 5);

		// Recent completed events
		const recentCompletedEvents = events
			.filter((e) => e.status === 'completed' || (e.eventDate && new Date(e.eventDate) < currentDate))
			.slice(0, 5)
			.map((e) => {
				const stats = ticketsByEvent.get(e.id) || { sold: 0, revenue: 0 };
				return {
					...e,
					ticketsSold: stats.sold,
					revenue: stats.revenue
				};
			});

		// Bundle event analytics
		const eventAnalytics = {
			totalEvents: events.length,
			upcomingEvents,
			pastEvents,
			eventsNoDate,
			totalTicketsSold,
			totalTicketRevenue,
			avgTicketPrice: totalTicketsSold > 0 ? (totalTicketRevenue / totalTicketsSold).toFixed(2) : 0,
			byCircuit: Object.entries(eventsByCircuit).map(([name, count]) => ({ name, count })),
			byFormat: Object.entries(eventsByFormat).map(([name, count]) => ({ name, count })),
			byStatus: eventsByStatus,
			upcomingEventsList: upcomingEventsList.slice(0, 5),
			topEventsByTickets,
			topEventsByRevenue,
			recentCompletedEvents,
			ticketsByEvent: Object.fromEntries(ticketsByEvent)
		};

		// ========== REVENUE ANALYTICS ==========

		// Process customer stats
		const newCustomers = customerStatsRaw.filter((c) => Number(c.orderCount) === 1).length;
		const returningCustomers = customerStatsRaw.filter((c) => Number(c.orderCount) > 1).length;
		const topCustomers = [...customerStatsRaw]
			.sort((a, b) => parseFloat(b.totalSpent) - parseFloat(a.totalSpent))
			.slice(0, 5);

		// Bundle revenue stats
		const revenueStats = {
			today: parseFloat(todayRevenueResult?.total) || 0,
			week: parseFloat(weekRevenueResult?.total) || 0,
			month: parseFloat(monthRevenueResult?.total) || 0,
			allTime: parseFloat(totalRevenueResult?.total) || 0,
			byType: revenueByType.map((r) => ({
				type: r.type,
				total: parseFloat(r.total) || 0,
				count: Number(r.count) || 0
			}))
		};

		const customerInsights = {
			newCustomers,
			returningCustomers,
			totalCustomers: customerStatsRaw.length,
			topCustomers: topCustomers.map((c) => ({
				email: c.email,
				orderCount: Number(c.orderCount),
				totalSpent: parseFloat(c.totalSpent) || 0,
				firstOrder: c.firstOrder,
				lastOrder: c.lastOrder
			})),
			allCustomers: customerStatsRaw.map((c) => ({
				email: c.email,
				orderCount: Number(c.orderCount),
				totalSpent: parseFloat(c.totalSpent) || 0,
				firstOrder: c.firstOrder,
				lastOrder: c.lastOrder
			}))
		};

		const refundStats = {
			refundedTickets: Number(refundedCount?.count) || 0,
			totalTicketOrders: revenueByType.find((r) => r.type === 'ticket')?.count || 0
		};

		// Map standings with computed monthly data for display
		const standings = rawStandings.map((standing) => {
			// Calculate win percentage if we have matches data but no stored percentage
			let winPercentage = standing.winPercentage;
			if (winPercentage === null && standing.matchesPlayed && standing.matchesPlayed > 0) {
				winPercentage = parseFloat(
					((standing.matchesWon / standing.matchesPlayed) * 100).toFixed(2)
				);
			}

			// Build monthly breakdown from flattened columns
			const monthlyBreakdown = {
				january: {
					points: standing.januaryPoints || 0,
					matchesWon: standing.januaryMatchesWon || 0,
					events: standing.januaryEvents || 0
				},
				february: {
					points: standing.februaryPoints || 0,
					matchesWon: standing.februaryMatchesWon || 0,
					events: standing.februaryEvents || 0
				},
				march: {
					points: standing.marchPoints || 0,
					matchesWon: standing.marchMatchesWon || 0,
					events: standing.marchEvents || 0
				},
				april: {
					points: standing.aprilPoints || 0,
					matchesWon: standing.aprilMatchesWon || 0,
					events: standing.aprilEvents || 0
				},
				may: {
					points: standing.mayPoints || 0,
					matchesWon: standing.mayMatchesWon || 0,
					events: standing.mayEvents || 0
				},
				june: {
					points: standing.junePoints || 0,
					matchesWon: standing.juneMatchesWon || 0,
					events: standing.juneEvents || 0
				},
				july: {
					points: standing.julyPoints || 0,
					matchesWon: standing.julyMatchesWon || 0,
					events: standing.julyEvents || 0
				},
				august: {
					points: standing.augustPoints || 0,
					matchesWon: standing.augustMatchesWon || 0,
					events: standing.augustEvents || 0
				},
				september: {
					points: standing.septemberPoints || 0,
					matchesWon: standing.septemberMatchesWon || 0,
					events: standing.septemberEvents || 0
				},
				october: {
					points: standing.octoberPoints || 0,
					matchesWon: standing.octoberMatchesWon || 0,
					events: standing.octoberEvents || 0
				},
				november: {
					points: standing.novemberPoints || 0,
					matchesWon: standing.novemberMatchesWon || 0,
					events: standing.novemberEvents || 0
				},
				december: {
					points: standing.decemberPoints || 0,
					matchesWon: standing.decemberMatchesWon || 0,
					events: standing.decemberEvents || 0
				}
			};

			return {
				...standing,
				matchesWon: standing.matchesWon ?? 0,
				matchesPlayed: standing.matchesPlayed ?? 0,
				winPercentage,
				totalPoints: standing.totalPoints ?? 0,
				monthlyBreakdown
			};
		});

		// ========== ENRICH ORDERS WITH REFUND STATUS ==========
		// Get all ticket IDs from order meta
		const ticketOrderIds = allOrders
			.filter(o => o.meta?.type === 'ticket' && o.meta?.ticketId)
			.map(o => o.meta.ticketId);

		// Fetch refund status for all tickets in one query
		let ticketRefundMap = new Map();
		if (ticketOrderIds.length > 0) {
			const ticketStatuses = await db
				.select({
					id: ticket.id,
					refunded: ticket.refunded
				})
				.from(ticket)
				.where(sql`${ticket.id} IN ${ticketOrderIds}`);

			ticketStatuses.forEach(t => {
				ticketRefundMap.set(t.id, t.refunded);
			});
		}

		// Enrich orders with status
		const enrichedOrders = allOrders.map(o => {
			let status = 'completed';
			if (o.meta?.type === 'ticket' && o.meta?.ticketId) {
				const isRefunded = ticketRefundMap.get(o.meta.ticketId);
				status = isRefunded ? 'refunded' : 'completed';
			} else if (o.meta?.type === 'subscription') {
				status = 'active'; // Subscriptions are managed separately
			}
			return { ...o, status };
		});

		return {
			user: locals.user,
			events,
			eventAnalytics,
			allOrders: enrichedOrders,
			allUsers,
			standings,
			lssSeasons,
			// Revenue analytics
			revenueStats,
			dailyRevenueTrend: dailyRevenueTrend.map((d) => ({
				date: d.date,
				total: parseFloat(d.total) || 0,
				count: Number(d.count) || 0
			})),
			topEvents: topEvents.map((e) => ({
				eventId: e.eventId,
				eventTitle: e.eventTitle,
				totalRevenue: parseFloat(e.totalRevenue) || 0,
				ticketCount: Number(e.ticketCount) || 0
			})),
			customerInsights,
			refundStats,
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
			eventAnalytics: {
				totalEvents: 0,
				upcomingEvents: 0,
				pastEvents: 0,
				eventsNoDate: 0,
				totalTicketsSold: 0,
				totalTicketRevenue: 0,
				avgTicketPrice: 0,
				byCircuit: [],
				byFormat: [],
				byStatus: { upcoming: 0, in_progress: 0, completed: 0, cancelled: 0 },
				upcomingEventsList: [],
				topEventsByTickets: [],
				topEventsByRevenue: [],
				recentCompletedEvents: [],
				ticketsByEvent: {}
			},
			allOrders: [],
			allUsers: [],
			standings: [],
			lssSeasons: [],
			revenueStats: { today: 0, week: 0, month: 0, allTime: 0, byType: [] },
			dailyRevenueTrend: [],
			topEvents: [],
			customerInsights: {
				newCustomers: 0,
				returningCustomers: 0,
				totalCustomers: 0,
				topCustomers: [],
				allCustomers: []
			},
			refundStats: { refundedTickets: 0, totalTicketOrders: 0 },
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
	// Update user role
	updateUserRole: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const userId = formData.get('userId');
		const newRole = formData.get('role');

		// Validate role
		const validRoles = ['free', 'premium', 'admin', 'writer', 'tournament staff'];
		if (!validRoles.includes(newRole)) {
			return fail(400, { error: 'Invalid role' });
		}

		// Prevent admin from changing their own role
		if (userId === locals.user.id) {
			return fail(400, { error: 'Cannot change your own role' });
		}

		try {
			await db.update(user).set({ role: newRole }).where(eq(user.id, userId));

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
			'playerName',
			'gemId',
			'totalPoints',
			'winPercentage',
			'qualifiedForChampionship',
			'matchesPlayed',
			'matchesWon',
			// Monthly points columns
			'januaryPoints',
			'februaryPoints',
			'marchPoints',
			'aprilPoints',
			'mayPoints',
			'junePoints',
			'julyPoints',
			'augustPoints',
			'septemberPoints',
			'octoberPoints',
			'novemberPoints',
			'decemberPoints',
			// Monthly matches won columns
			'januaryMatchesWon',
			'februaryMatchesWon',
			'marchMatchesWon',
			'aprilMatchesWon',
			'mayMatchesWon',
			'juneMatchesWon',
			'julyMatchesWon',
			'augustMatchesWon',
			'septemberMatchesWon',
			'octoberMatchesWon',
			'novemberMatchesWon',
			'decemberMatchesWon',
			// Monthly events columns
			'januaryEvents',
			'februaryEvents',
			'marchEvents',
			'aprilEvents',
			'mayEvents',
			'juneEvents',
			'julyEvents',
			'augustEvents',
			'septemberEvents',
			'octoberEvents',
			'novemberEvents',
			'decemberEvents'
		];

		if (!allowedFields.includes(field)) {
			return fail(400, { error: `Field "${field}" is not allowed to be updated` });
		}

		try {
			// Parse value based on field type
			let parsedValue = value;

			// Integer fields (including all monthly columns)
			const integerFields = [
				'totalPoints',
				'matchesPlayed',
				'matchesWon',
				// Monthly points
				'januaryPoints',
				'februaryPoints',
				'marchPoints',
				'aprilPoints',
				'mayPoints',
				'junePoints',
				'julyPoints',
				'augustPoints',
				'septemberPoints',
				'octoberPoints',
				'novemberPoints',
				'decemberPoints',
				// Monthly matches won
				'januaryMatchesWon',
				'februaryMatchesWon',
				'marchMatchesWon',
				'aprilMatchesWon',
				'mayMatchesWon',
				'juneMatchesWon',
				'julyMatchesWon',
				'augustMatchesWon',
				'septemberMatchesWon',
				'octoberMatchesWon',
				'novemberMatchesWon',
				'decemberMatchesWon',
				// Monthly events
				'januaryEvents',
				'februaryEvents',
				'marchEvents',
				'aprilEvents',
				'mayEvents',
				'juneEvents',
				'julyEvents',
				'augustEvents',
				'septemberEvents',
				'octoberEvents',
				'novemberEvents',
				'decemberEvents'
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

			// Special handling for gemId - update ALL standings for this player
			if (field === 'gemId') {
				const [currentStanding] = await db
					.select({ oldGemId: seasonStanding.gemId })
					.from(seasonStanding)
					.where(eq(seasonStanding.id, standingId))
					.limit(1);

				const oldGemId = currentStanding?.oldGemId;
				if (oldGemId) {
					// Update ALL standings with the old gemId to the new gemId
					await db
						.update(seasonStanding)
						.set({ gemId: parsedValue, updatedAt: new Date() })
						.where(eq(seasonStanding.gemId, oldGemId));
				} else {
					// No old gemId, just update this standing
					await db
						.update(seasonStanding)
						.set({ gemId: parsedValue, updatedAt: new Date() })
						.where(eq(seasonStanding.id, standingId));
				}
				return { success: true, message: 'GEM ID updated across all seasons' };
			}

			// Standard field update
			await db
				.update(seasonStanding)
				.set({ [field]: parsedValue, updatedAt: new Date() })
				.where(eq(seasonStanding.id, standingId));

			return { success: true, message: `${field} updated successfully` };
		} catch (err) {
			return fail(500, { error: 'Failed to update standing' });
		}
	},

	// Update standing player info (name and GEM ID) in one request
	// Note: playerName only updates this standing, gemId updates all standings for this player
	updateStandingPlayerInfo: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const standingId = formData.get('standingId');
		const playerName = formData.get('playerName');
		const gemId = formData.get('gemId') || null;

		if (!standingId || !playerName) {
			return fail(400, { error: 'Standing ID and player name are required' });
		}

		try {
			// Get current standing data
			const [currentStanding] = await db
				.select({ oldGemId: seasonStanding.gemId })
				.from(seasonStanding)
				.where(eq(seasonStanding.id, standingId))
				.limit(1);

			const oldGemId = currentStanding?.oldGemId;

			// Update this standing's playerName
			await db
				.update(seasonStanding)
				.set({
					playerName,
					updatedAt: new Date()
				})
				.where(eq(seasonStanding.id, standingId));

			// If gemId changed, update ALL standings with the old gemId
			if (gemId !== oldGemId) {
				if (oldGemId) {
					// Update all standings that share the old GEM ID to the new GEM ID
					await db
						.update(seasonStanding)
						.set({ gemId, updatedAt: new Date() })
						.where(eq(seasonStanding.gemId, oldGemId));
				} else {
					// No old gemId, just update this standing's gemId
					await db
						.update(seasonStanding)
						.set({ gemId, updatedAt: new Date() })
						.where(eq(seasonStanding.id, standingId));
				}
			}

			return { success: true, message: 'Player info updated successfully' };
		} catch (err) {
			return fail(500, { error: 'Failed to update player info' });
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
			await db.delete(seasonStanding).where(eq(seasonStanding.id, standingId));

			return { success: true, message: 'Standing deleted successfully' };
		} catch (err) {
			console.error('Error deleting standing:', err);
			return fail(500, { error: 'Failed to delete standing' });
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
			await db.delete(lssSeason).where(eq(lssSeason.id, seasonId));

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
		const matchesPlayed = parseInt(formData.get('matchesPlayed')) || 0;
		const matchesWon = parseInt(formData.get('matchesWon')) || 0;

		if (!season || !circuit || !playerName) {
			return fail(400, { error: 'Season, circuit, and player name are required' });
		}

		// Calculate win percentage
		const winPercentage =
			matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100 * 100) / 100 : null;

		try {
			await db.insert(seasonStanding).values({
				season,
				circuit,
				playerName,
				gemId,
				totalPoints,
				matchesPlayed,
				matchesWon,
				winPercentage,
				qualifiedForChampionship: false
			});

			return { success: true, message: 'Standing created successfully' };
		} catch (err) {
			console.error('Error creating standing:', err);
			// Check for unique constraint violation
			if (err.code === '23505') {
				return fail(400, {
					error: 'A standing for this player in this season/circuit already exists'
				});
			}
			return fail(500, { error: 'Failed to create standing' });
		}
	},

	// Admin refund order - bypasses user restrictions
	refundOrder: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Admin access required' });
		}

		const formData = await request.formData();
		const orderId = formData.get('orderId');

		if (!orderId) {
			return fail(400, { error: 'Order ID is required' });
		}

		try {
			// Fetch order details
			const [orderData] = await db.select().from(order).where(eq(order.id, orderId)).limit(1);

			if (!orderData) {
				return fail(404, { error: 'Order not found' });
			}

			const { authnet } = await import('$lib/server/authnet/client.js');
			let refundType = '';

			// Handle subscription orders
			if (orderData.meta?.type === 'subscription') {
				// Cancel the subscription if we have the ID
				if (orderData.meta.subscriptionId) {
					try {
						await authnet.cancelSubscription(orderData.meta.subscriptionId);
					} catch (cancelErr) {
						console.log('Subscription cancellation error (may already be cancelled):', cancelErr.message);
					}
				}

				// Downgrade user to free tier
				await db
					.update(user)
					.set({
						subscriptionStatus: 'cancelled',
						role: 'free'
					})
					.where(eq(user.email, orderData.userEmail));

				// Try to void/refund the payment
				try {
					await authnet.voidTransaction(orderData.providerRef);
					refundType = 'voided';
				} catch (voidError) {
					console.log('Void failed, attempting refund:', voidError.message);
					try {
						await authnet.refundTransaction({
							transactionId: orderData.providerRef,
							amount: orderData.amount,
							cardNumber: '1111'
						});
						refundType = 'refunded';
					} catch (refundError) {
						// Payment might already be refunded or too old
						console.log('Refund also failed:', refundError.message);
						refundType = 'subscription cancelled (payment refund failed - may be too old)';
					}
				}

				return {
					success: true,
					message: `Subscription cancelled and ${refundType}. User downgraded to free tier.`
				};
			}

			// For ticket and course orders: Try VOID first, then REFUND
			try {
				await authnet.voidTransaction(orderData.providerRef);
				refundType = 'voided';
			} catch (voidError) {
				console.log('Void failed, attempting refund:', voidError.message);
				await authnet.refundTransaction({
					transactionId: orderData.providerRef,
					amount: orderData.amount,
					cardNumber: '1111'
				});
				refundType = 'refunded';
			}

			// Update related records based on order type
			if (orderData.meta?.type === 'ticket' && orderData.meta.ticketId) {
				// Mark ticket as refunded
				await db
					.update(ticket)
					.set({
						refunded: true,
						refundedAt: new Date()
					})
					.where(eq(ticket.id, orderData.meta.ticketId));
			} else if (orderData.meta?.type === 'course' && orderData.meta.entitlementId) {
				// Revoke course entitlement
				await db.delete(entitlement).where(eq(entitlement.id, orderData.meta.entitlementId));
			}

			return {
				success: true,
				message: `Order ${refundType} successfully`
			};
		} catch (err) {
			console.error('Error refunding order:', err);
			return fail(500, { error: err.message || 'Failed to process refund' });
		}
	}
};
