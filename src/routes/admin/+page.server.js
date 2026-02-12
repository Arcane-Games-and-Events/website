import { redirect, fail } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import {
	order,
	user,
	standing,
	match,
	lssEvent,
	ticket,
	entitlement,
	podcast,
	podcastEpisode,
	vod,
	event
} from '$lib/server/db/schema.js';
import { eq, and, sql, or, ilike, desc } from 'drizzle-orm';

// Helper to add timeout to promises
const withTimeout = (promise, ms, fallback) =>
	Promise.race([promise, new Promise((resolve) => setTimeout(() => resolve(fallback), ms))]);

// Default empty data for when database is unavailable
function getEmptyAdminData() {
	return {
		events: [],
		standings: [],
		orders: [],
		users: [],
		lssEvents: [],
		stats: {
			totalEvents: 0,
			totalOrders: 0,
			premiumUsers: 0,
			totalPlayers: 0,
			totalTicketsSold: 0,
			totalRefunded: 0,
			upcomingEvents: 0,
			pastEvents: 0
		},
		analytics: {
			todayRevenue: 0,
			weekRevenue: 0,
			monthRevenue: 0,
			totalRevenue: 0,
			revenueByType: [],
			dailyTrend: [],
			topEvents: [],
			customerStats: []
		},
		eventAnalytics: {
			byCircuit: {},
			byFormat: {},
			byStatus: { upcoming: 0, in_progress: 0, completed: 0, cancelled: 0 },
			upcoming: []
		},
		dbError: true
	};
}

/**
 * Admin dashboard - uses RPC function for single database call
 *
 * The get_admin_dashboard_stats() function consolidates 20+ queries into one.
 * To migrate: Run the SQL migration in supabase/migrations/001_rpc_functions.sql
 */
export async function load({ locals }) {
	// Require admin authentication
	if (!locals.user || locals.user.role !== 'admin') {
		throw redirect(302, '/login?redirect=/admin');
	}

	try {
		// Single RPC call replaces 20+ individual queries with 15s timeout
		const result = await withTimeout(
			db.execute(sql`SELECT get_admin_dashboard_stats() as data`),
			15000,
			null
		);

		if (!result) {
			console.warn('Admin dashboard RPC timed out - returning empty data');
			return { ...getEmptyAdminData(), user: locals.user };
		}

		const data = result.rows?.[0]?.data || result[0]?.data;

		if (!data) {
			throw new Error('No data returned from get_admin_dashboard_stats()');
		}

		// Parse the RPC result
		const currentDate = new Date();
		const thirtyDaysFromNow = new Date(currentDate.getTime() + 30 * 24 * 60 * 60 * 1000);

		// Extract events and build analytics
		// Transform snake_case to camelCase for frontend compatibility
		const rawEvents = data.events || [];
		const events = rawEvents.map((e) => ({
			id: e.id,
			title: e.title,
			location: e.location,
			address: e.address,
			price: e.price,
			format: e.format,
			circuit: e.circuit,
			month: e.month,
			eventDate: e.event_date,
			description: e.description,
			gemIdRequired: e.gem_id_required,
			premiumDiscount: e.premium_discount,
			status: e.status,
			closedAt: e.closed_at,
			closedBy: e.closed_by,
			createdBy: e.created_by,
			createdAt: e.created_at
		}));
		const ticketStatsList = data.ticketStats || [];

		// Convert ticket stats to Map for fast lookup
		const ticketsByEvent = new Map();
		for (const t of ticketStatsList) {
			ticketsByEvent.set(t.eventId, {
				sold: Number(t.sold) || 0,
				refunded: Number(t.refunded) || 0,
				revenue: parseFloat(t.revenue) || 0
			});
		}

		// Compute event analytics from events
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
			const status = e.status || 'upcoming';
			eventsByStatus[status] = (eventsByStatus[status] || 0) + 1;

			if (e.eventDate) {
				const eventDate = new Date(e.eventDate);
				if (eventDate > currentDate) {
					upcomingEvents++;
					if (eventDate <= thirtyDaysFromNow) {
						upcomingEventsList.push(e);
					}
				} else {
					pastEvents++;
				}
			} else {
				eventsNoDate++;
			}

			const circuit = e.circuit || 'Unassigned';
			eventsByCircuit[circuit] = (eventsByCircuit[circuit] || 0) + 1;

			const format = e.format || 'Unknown';
			eventsByFormat[format] = (eventsByFormat[format] || 0) + 1;

			const ticketStats = ticketsByEvent.get(e.id);
			if (ticketStats) {
				totalTicketsSold += ticketStats.sold;
				totalTicketRevenue += ticketStats.revenue;
			}
		}

		upcomingEventsList.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));

		// Top events by tickets/revenue
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

		const recentCompletedEvents = events
			.filter(
				(e) => e.status === 'completed' || (e.eventDate && new Date(e.eventDate) < currentDate)
			)
			.slice(0, 5)
			.map((e) => {
				const stats = ticketsByEvent.get(e.id) || { sold: 0, revenue: 0 };
				return { ...e, ticketsSold: stats.sold, revenue: stats.revenue };
			});

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

		// Process standings with monthly breakdown
		const rawStandings = data.standings || [];
		const standings = rawStandings.map((standing) => {
			let winPercentage = standing.win_percentage || standing.winPercentage;
			const matchesPlayed = standing.matches_played || standing.matchesPlayed || 0;
			const matchesWon = standing.matches_won || standing.matchesWon || 0;

			if (winPercentage === null && matchesPlayed > 0) {
				winPercentage = parseFloat(((matchesWon / matchesPlayed) * 100).toFixed(2));
			}

			// Build monthly breakdown from flattened columns
			const monthlyBreakdown = {
				january: {
					points: standing.january_points || standing.januaryPoints || 0,
					matchesWon: standing.january_matches_won || standing.januaryMatchesWon || 0,
					events: standing.january_events || standing.januaryEvents || 0
				},
				february: {
					points: standing.february_points || standing.februaryPoints || 0,
					matchesWon: standing.february_matches_won || standing.februaryMatchesWon || 0,
					events: standing.february_events || standing.februaryEvents || 0
				},
				march: {
					points: standing.march_points || standing.marchPoints || 0,
					matchesWon: standing.march_matches_won || standing.marchMatchesWon || 0,
					events: standing.march_events || standing.marchEvents || 0
				},
				april: {
					points: standing.april_points || standing.aprilPoints || 0,
					matchesWon: standing.april_matches_won || standing.aprilMatchesWon || 0,
					events: standing.april_events || standing.aprilEvents || 0
				},
				may: {
					points: standing.may_points || standing.mayPoints || 0,
					matchesWon: standing.may_matches_won || standing.mayMatchesWon || 0,
					events: standing.may_events || standing.mayEvents || 0
				},
				june: {
					points: standing.june_points || standing.junePoints || 0,
					matchesWon: standing.june_matches_won || standing.juneMatchesWon || 0,
					events: standing.june_events || standing.juneEvents || 0
				},
				july: {
					points: standing.july_points || standing.julyPoints || 0,
					matchesWon: standing.july_matches_won || standing.julyMatchesWon || 0,
					events: standing.july_events || standing.julyEvents || 0
				},
				august: {
					points: standing.august_points || standing.augustPoints || 0,
					matchesWon: standing.august_matches_won || standing.augustMatchesWon || 0,
					events: standing.august_events || standing.augustEvents || 0
				},
				september: {
					points: standing.september_points || standing.septemberPoints || 0,
					matchesWon: standing.september_matches_won || standing.septemberMatchesWon || 0,
					events: standing.september_events || standing.septemberEvents || 0
				},
				october: {
					points: standing.october_points || standing.octoberPoints || 0,
					matchesWon: standing.october_matches_won || standing.octoberMatchesWon || 0,
					events: standing.october_events || standing.octoberEvents || 0
				},
				november: {
					points: standing.november_points || standing.novemberPoints || 0,
					matchesWon: standing.november_matches_won || standing.novemberMatchesWon || 0,
					events: standing.november_events || standing.novemberEvents || 0
				},
				december: {
					points: standing.december_points || standing.decemberPoints || 0,
					matchesWon: standing.december_matches_won || standing.decemberMatchesWon || 0,
					events: standing.december_events || standing.decemberEvents || 0
				}
			};

			return {
				...standing,
				// Normalize field names
				playerName: standing.player_name || standing.playerName,
				gemId: standing.gem_id || standing.gemId,
				totalPoints: standing.total_points || standing.totalPoints || 0,
				matchesWon,
				matchesPlayed,
				winPercentage,
				monthlyBreakdown
			};
		});

		// Process orders and enrich with refund status
		const allOrders = data.orders || [];
		const ticketOrderIds = allOrders
			.filter((o) => o.meta?.type === 'ticket' && o.meta?.ticketId)
			.map((o) => o.meta.ticketId);

		let ticketRefundMap = new Map();
		if (ticketOrderIds.length > 0) {
			const ticketStatuses = await db
				.select({ id: ticket.id, refunded: ticket.refunded })
				.from(ticket)
				.where(sql`${ticket.id} IN ${ticketOrderIds}`);

			ticketStatuses.forEach((t) => {
				ticketRefundMap.set(t.id, t.refunded);
			});
		}

		const enrichedOrders = allOrders.map((o) => {
			let status = 'completed';
			if (o.meta?.type === 'ticket' && o.meta?.ticketId) {
				status = ticketRefundMap.get(o.meta.ticketId) ? 'refunded' : 'completed';
			} else if (o.meta?.type === 'subscription') {
				status = 'active';
			}
			// Transform snake_case from RPC to camelCase for frontend
			return {
				id: o.id,
				provider: o.provider,
				providerRef: o.provider_ref || o.providerRef,
				userEmail: o.user_email || o.userEmail,
				amount: o.amount,
				currency: o.currency,
				meta: o.meta,
				createdAt: o.created_at || o.createdAt,
				status
			};
		});

		// Process customer stats
		const customerStatsRaw = data.analytics?.customerStats || [];
		const newCustomers = customerStatsRaw.filter((c) => Number(c.orderCount) === 1).length;
		const returningCustomers = customerStatsRaw.filter((c) => Number(c.orderCount) > 1).length;
		const topCustomers = [...customerStatsRaw]
			.sort((a, b) => parseFloat(b.totalSpent) - parseFloat(a.totalSpent))
			.slice(0, 5);

		const revenueStats = {
			today: parseFloat(data.analytics?.todayRevenue) || 0,
			week: parseFloat(data.analytics?.weekRevenue) || 0,
			month: parseFloat(data.analytics?.monthRevenue) || 0,
			allTime: parseFloat(data.analytics?.totalRevenue) || 0,
			byType: (data.analytics?.revenueByType || []).map((r) => ({
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
			refundedTickets: ticketStatsList.reduce((sum, t) => sum + (Number(t.refunded) || 0), 0),
			totalTicketOrders: revenueStats.byType.find((r) => r.type === 'ticket')?.count || 0
		};

		// Transform LSS events from snake_case to camelCase
		const rawLssEvents = data.lssEvents || [];
		const lssEvents = rawLssEvents.map((e) => ({
			id: e.id,
			name: e.name,
			description: e.description,
			startDate: e.start_date || e.startDate,
			endDate: e.end_date || e.endDate,
			eventType: e.event_type || e.eventType,
			format: e.format,
			link: e.link,
			isActive: e.is_active ?? e.isActive ?? true,
			createdBy: e.created_by || e.createdBy,
			createdAt: e.created_at || e.createdAt,
			updatedAt: e.updated_at || e.updatedAt
		}));

		// Fetch podcasts and episodes separately (not in RPC)
		let podcasts = [];
		let podcastEpisodes = [];
		try {
			podcasts = await db
				.select()
				.from(podcast)
				.orderBy(podcast.sortOrder, podcast.createdAt);

			podcastEpisodes = await db
				.select()
				.from(podcastEpisode)
				.orderBy(desc(podcastEpisode.publishedAt));
		} catch (podcastErr) {
			console.warn('Could not fetch podcasts (table may not exist yet):', podcastErr.message);
		}

		// Fetch VODs
		let vods = [];
		try {
			const rawVods = await db
				.select()
				.from(vod)
				.orderBy(desc(vod.createdAt));

			// Sign thumbnail tokens for signed playback VODs
			const muxMod = await import('$lib/server/mux.js');
			const muxClient = muxMod.default;
			vods = await Promise.all(
				rawVods.map(async (v) => {
					if (!v.muxPlaybackId) return v;
					try {
						const thumbnailToken = await muxClient.jwt.signPlaybackId(v.muxPlaybackId, {
							type: 'thumbnail',
							expiration: '24h'
						});
						return { ...v, thumbnailToken };
					} catch {
						return v;
					}
				})
			);
		} catch (vodErr) {
			console.warn('Could not fetch VODs (table may not exist yet):', vodErr.message);
		}

		return {
			user: locals.user,
			events,
			eventAnalytics,
			allOrders: enrichedOrders,
			allUsers: data.users || [],
			standings,
			lssEvents,
			podcasts,
			podcastEpisodes,
			vods,
			revenueStats,
			dailyRevenueTrend: (data.analytics?.dailyTrend || []).map((d) => ({
				date: d.date,
				total: parseFloat(d.total) || 0,
				count: Number(d.count) || 0
			})),
			topEvents: (data.analytics?.topEvents || []).map((e) => ({
				eventId: e.eventId,
				eventTitle: e.eventTitle,
				totalRevenue: parseFloat(e.totalRevenue) || 0,
				ticketCount: Number(e.ticketCount) || 0
			})),
			customerInsights,
			refundStats,
			stats: {
				totalEvents: parseInt(data.stats?.totalEvents) || 0,
				totalOrders: parseInt(data.stats?.totalOrders) || 0,
				premiumUsers: parseInt(data.stats?.premiumUsers) || 0,
				totalPlayers: parseInt(data.stats?.totalPlayers) || 0,
				totalUsers: parseInt(data.stats?.totalUsers) || 0
			}
		};
	} catch (error) {
		console.error('Admin page load error:', error);

		if (error.message?.includes('get_admin_dashboard_stats')) {
			console.error(
				'RPC function not found. Run the migration: supabase/migrations/001_rpc_functions.sql'
			);
		}

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
			lssEvents: [],
			podcasts: [],
			podcastEpisodes: [],
			vods: [],
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
				totalPlayers: 0,
				totalUsers: 0
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
					.select({ oldGemId: standing.gemId })
					.from(standing)
					.where(eq(standing.id, standingId))
					.limit(1);

				const oldGemId = currentStanding?.oldGemId;
				if (oldGemId) {
					// Update ALL standings with the old gemId to the new gemId
					await db
						.update(standing)
						.set({ gemId: parsedValue, updatedAt: new Date() })
						.where(eq(standing.gemId, oldGemId));
				} else {
					// No old gemId, just update this standing
					await db
						.update(standing)
						.set({ gemId: parsedValue, updatedAt: new Date() })
						.where(eq(standing.id, standingId));
				}
				return { success: true, message: 'GEM ID updated across all seasons' };
			}

			// Standard field update
			await db
				.update(standing)
				.set({ [field]: parsedValue, updatedAt: new Date() })
				.where(eq(standing.id, standingId));

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
				.select({ oldGemId: standing.gemId })
				.from(standing)
				.where(eq(standing.id, standingId))
				.limit(1);

			const oldGemId = currentStanding?.oldGemId;

			// Update this standing's playerName
			await db
				.update(standing)
				.set({
					playerName,
					updatedAt: new Date()
				})
				.where(eq(standing.id, standingId));

			// If gemId changed, update ALL standings with the old gemId
			if (gemId !== oldGemId) {
				if (oldGemId) {
					// Update all standings that share the old GEM ID to the new GEM ID
					await db
						.update(standing)
						.set({ gemId, updatedAt: new Date() })
						.where(eq(standing.gemId, oldGemId));
				} else {
					// No old gemId, just update this standing's gemId
					await db
						.update(standing)
						.set({ gemId, updatedAt: new Date() })
						.where(eq(standing.id, standingId));
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
			await db.delete(standing).where(eq(standing.id, standingId));

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
			await db.insert(lssEvent).values({
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
				.update(lssEvent)
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
				.where(eq(lssEvent.id, seasonId));

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
			await db.delete(lssEvent).where(eq(lssEvent.id, seasonId));

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
			await db.insert(standing).values({
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
						console.log(
							'Subscription cancellation error (may already be cancelled):',
							cancelErr.message
						);
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
	},

	// Recalculate monthly standings from match data
	recalculateStandings: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Admin access required' });
		}

		const formData = await request.formData();
		const season = formData.get('season')?.trim();
		const circuit = formData.get('circuit')?.trim();

		if (!season || !circuit) {
			return fail(400, { error: 'Season and circuit are required' });
		}

		try {
			// AGE points table based on placement
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
			const monthKeys = [
				'january',
				'february',
				'march',
				'april',
				'may',
				'june',
				'july',
				'august',
				'september',
				'october',
				'november',
				'december'
			];

			// Get all matches for this season/circuit
			const allMatches = await db
				.select()
				.from(match)
				.where(and(eq(match.year, season), eq(match.circuit, circuit)));

			if (allMatches.length === 0) {
				return fail(400, { error: `No matches found for ${circuit} ${season}` });
			}

			// Group matches by month
			const matchesByMonth = new Map();
			for (const m of allMatches) {
				const monthName = m.month;
				if (!matchesByMonth.has(monthName)) {
					matchesByMonth.set(monthName, []);
				}
				matchesByMonth.get(monthName).push(m);
			}

			// For each month, calculate player stats
			const playerMonthlyStats = new Map(); // key: gemId or playerName, value: { monthStats }

			for (const [monthName, matches] of matchesByMonth) {
				const monthKey = monthName.toLowerCase();
				const monthIndex = monthKeys.indexOf(monthKey);
				if (monthIndex === -1) continue;

				// Calculate stats for each player in this month
				const monthPlayerStats = new Map();

				for (const m of matches) {
					// Player 1
					const p1Key = m.player1GemId || m.player1Name;
					if (!monthPlayerStats.has(p1Key)) {
						monthPlayerStats.set(p1Key, {
							gemId: m.player1GemId,
							name: m.player1Name,
							wins: 0,
							matches: 0
						});
					}
					const p1 = monthPlayerStats.get(p1Key);
					p1.matches++;
					if (m.winner === 'player1') p1.wins++;

					// Player 2
					const p2Key = m.player2GemId || m.player2Name;
					if (!monthPlayerStats.has(p2Key)) {
						monthPlayerStats.set(p2Key, {
							gemId: m.player2GemId,
							name: m.player2Name,
							wins: 0,
							matches: 0
						});
					}
					const p2 = monthPlayerStats.get(p2Key);
					p2.matches++;
					if (m.winner === 'player2') p2.wins++;
				}

				// Sort players by wins to determine placement and points
				const sortedPlayers = Array.from(monthPlayerStats.values()).sort((a, b) => b.wins - a.wins);

				sortedPlayers.forEach((player, idx) => {
					const placement = idx + 1;
					const points = pointsTable[placement] || 1;

					const playerKey = player.gemId || player.name;
					if (!playerMonthlyStats.has(playerKey)) {
						playerMonthlyStats.set(playerKey, {
							gemId: player.gemId,
							name: player.name,
							months: {}
						});
					}

					const playerData = playerMonthlyStats.get(playerKey);
					playerData.months[monthKey] = {
						points,
						wins: player.wins,
						matches: player.matches
					};
				});
			}

			// Get existing standings for this season/circuit
			const existingStandings = await db
				.select()
				.from(standing)
				.where(and(eq(standing.season, season), eq(standing.circuit, circuit)));

			// Build lookup maps
			const standingByGemId = new Map(
				existingStandings.filter((s) => s.gemId).map((s) => [s.gemId, s])
			);
			const standingByName = new Map(existingStandings.map((s) => [s.playerName, s]));

			let updated = 0;
			let created = 0;

			// Update each player's standing with calculated monthly stats
			for (const [playerKey, playerData] of playerMonthlyStats) {
				// Find existing standing
				let existingStanding = playerData.gemId ? standingByGemId.get(playerData.gemId) : null;
				if (!existingStanding) {
					existingStanding = standingByName.get(playerData.name);
				}

				// Calculate totals from monthly data
				let totalPoints = 0;
				let totalWins = 0;
				let totalMatches = 0;

				const monthlyUpdate = {};
				for (const monthKey of monthKeys) {
					const monthStats = playerData.months[monthKey];
					if (monthStats) {
						monthlyUpdate[`${monthKey}Points`] = monthStats.points;
						monthlyUpdate[`${monthKey}MatchesWon`] = monthStats.wins;
						monthlyUpdate[`${monthKey}Matches`] = monthStats.matches;
						totalPoints += monthStats.points;
						totalWins += monthStats.wins;
						totalMatches += monthStats.matches;
					} else {
						monthlyUpdate[`${monthKey}Points`] = 0;
						monthlyUpdate[`${monthKey}MatchesWon`] = 0;
						monthlyUpdate[`${monthKey}Matches`] = 0;
					}
				}

				const winPercentage =
					totalMatches > 0 ? Math.round((totalWins / totalMatches) * 10000) / 100 : null;

				if (existingStanding) {
					// Update existing standing
					await db
						.update(standing)
						.set({
							totalPoints,
							matchesWon: totalWins,
							matchesPlayed: totalMatches,
							winPercentage,
							gemId: playerData.gemId || existingStanding.gemId,
							...monthlyUpdate,
							updatedAt: new Date()
						})
						.where(eq(standing.id, existingStanding.id));
					updated++;
				} else {
					// Create new standing
					await db.insert(standing).values({
						season,
						circuit,
						playerName: playerData.name,
						gemId: playerData.gemId || null,
						totalPoints,
						matchesWon: totalWins,
						matchesPlayed: totalMatches,
						winPercentage,
						...monthlyUpdate
					});
					created++;
				}
			}

			return {
				success: true,
				message: `Recalculated standings for ${circuit} ${season}: ${updated} updated, ${created} created from ${allMatches.length} matches`
			};
		} catch (err) {
			console.error('Error recalculating standings:', err);
			return fail(500, { error: err.message || 'Failed to recalculate standings' });
		}
	},

	// Backfill GEM IDs to match records based on standings data
	backfillMatchGemIds: async ({ locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Admin access required' });
		}

		try {
			// Get all standings with GEM IDs
			const allStandings = await db
				.select()
				.from(standing)
				.where(sql`${standing.gemId} IS NOT NULL AND ${standing.gemId} != ''`);

			// Build a map of player name -> GEM ID
			// Use all names the player has used across all their standings
			const nameToGemId = new Map();
			for (const s of allStandings) {
				if (s.gemId && s.playerName) {
					// Only set if not already set (prefer existing mapping)
					if (!nameToGemId.has(s.playerName)) {
						nameToGemId.set(s.playerName, s.gemId);
					}
				}
			}

			console.log(`Found ${nameToGemId.size} unique player name -> GEM ID mappings`);

			// Get all matches that are missing GEM IDs
			const matchesNeedingUpdate = await db
				.select()
				.from(match)
				.where(
					sql`(${match.player1GemId} IS NULL OR ${match.player1GemId} = '')
				    OR (${match.player2GemId} IS NULL OR ${match.player2GemId} = '')`
				);

			console.log(`Found ${matchesNeedingUpdate.length} matches needing GEM ID updates`);

			let updated = 0;
			for (const m of matchesNeedingUpdate) {
				const p1GemId = m.player1GemId || nameToGemId.get(m.player1Name) || null;
				const p2GemId = m.player2GemId || nameToGemId.get(m.player2Name) || null;

				// Only update if we found at least one new GEM ID
				if ((p1GemId && p1GemId !== m.player1GemId) || (p2GemId && p2GemId !== m.player2GemId)) {
					await db
						.update(match)
						.set({
							player1GemId: p1GemId,
							player2GemId: p2GemId
						})
						.where(eq(match.id, m.id));
					updated++;
				}
			}

			return {
				success: true,
				message: `Backfilled GEM IDs: ${updated} matches updated out of ${matchesNeedingUpdate.length} checked. ${nameToGemId.size} player name mappings used.`
			};
		} catch (err) {
			console.error('Error backfilling GEM IDs:', err);
			return fail(500, { error: err.message || 'Failed to backfill GEM IDs' });
		}
	},

	// Server-side search for users
	searchUsers: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const query = formData.get('query')?.toString().trim();

		if (!query || query.length < 2) {
			return fail(400, { error: 'Search query must be at least 2 characters' });
		}

		try {
			const searchPattern = `%${query}%`;
			const results = await db
				.select({
					id: user.id,
					email: user.email,
					role: user.role,
					createdAt: user.createdAt,
					first_name: user.firstName,
					last_name: user.lastName
				})
				.from(user)
				.where(
					or(
						ilike(user.email, searchPattern),
						ilike(user.firstName, searchPattern),
						ilike(user.lastName, searchPattern)
					)
				)
				.orderBy(user.createdAt)
				.limit(100);

			return {
				success: true,
				searchType: 'users',
				results: results.map((u) => ({
					id: u.id,
					email: u.email,
					role: u.role,
					createdAt: u.createdAt,
					first_name: u.first_name,
					last_name: u.last_name
				}))
			};
		} catch (err) {
			console.error('Error searching users:', err);
			return fail(500, { error: 'Failed to search users' });
		}
	},

	// Server-side search for orders
	searchOrders: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const query = formData.get('query')?.toString().trim();

		if (!query || query.length < 2) {
			return fail(400, { error: 'Search query must be at least 2 characters' });
		}

		try {
			const searchPattern = `%${query}%`;
			const results = await db
				.select()
				.from(order)
				.where(
					or(
						ilike(order.userEmail, searchPattern),
						ilike(order.id, searchPattern)
					)
				)
				.orderBy(order.createdAt)
				.limit(100);

			return {
				success: true,
				searchType: 'orders',
				results
			};
		} catch (err) {
			console.error('Error searching orders:', err);
			return fail(500, { error: 'Failed to search orders' });
		}
	},

	// Create podcast
	createPodcast: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString().trim();
		const description = formData.get('description')?.toString().trim();
		const youtubePlaylistUrl = formData.get('youtubePlaylistUrl')?.toString().trim();

		if (!name) {
			return fail(400, { error: 'Podcast name is required' });
		}

		try {
			const [newPodcast] = await db
				.insert(podcast)
				.values({
					name,
					description: description || null,
					youtubePlaylistUrl: youtubePlaylistUrl || null,
					createdBy: locals.user.id
				})
				.returning();

			return { success: true, podcast: newPodcast };
		} catch (err) {
			console.error('Error creating podcast:', err);
			return fail(500, { error: 'Failed to create podcast' });
		}
	},

	// Update podcast
	updatePodcast: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const podcastId = formData.get('podcastId')?.toString();
		const name = formData.get('name')?.toString().trim();
		const description = formData.get('description')?.toString().trim();
		const youtubePlaylistUrl = formData.get('youtubePlaylistUrl')?.toString().trim();
		const isActive = formData.get('isActive') === 'true';

		if (!podcastId || !name) {
			return fail(400, { error: 'Podcast ID and name are required' });
		}

		try {
			const [updated] = await db
				.update(podcast)
				.set({
					name,
					description: description || null,
					youtubePlaylistUrl: youtubePlaylistUrl || null,
					isActive,
					updatedAt: new Date()
				})
				.where(eq(podcast.id, podcastId))
				.returning();

			return { success: true, podcast: updated };
		} catch (err) {
			console.error('Error updating podcast:', err);
			return fail(500, { error: 'Failed to update podcast' });
		}
	},

	// Delete podcast
	deletePodcast: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const podcastId = formData.get('podcastId')?.toString();

		if (!podcastId) {
			return fail(400, { error: 'Podcast ID is required' });
		}

		try {
			await db.delete(podcast).where(eq(podcast.id, podcastId));
			return { success: true };
		} catch (err) {
			console.error('Error deleting podcast:', err);
			return fail(500, { error: 'Failed to delete podcast' });
		}
	},

	// Create podcast episode
	createPodcastEpisode: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const podcastId = formData.get('podcastId')?.toString();
		const youtubeUrl = formData.get('youtubeUrl')?.toString().trim();
		const title = formData.get('title')?.toString().trim();
		const description = formData.get('description')?.toString().trim();
		const guest = formData.get('guest')?.toString().trim();
		const season = formData.get('season')?.toString();
		const episode = formData.get('episode')?.toString();
		const publishedAt = formData.get('publishedAt')?.toString();
		const thumbnailUrl = formData.get('thumbnailUrl')?.toString().trim();
		const duration = formData.get('duration')?.toString().trim();

		if (!podcastId || !youtubeUrl || !title) {
			return fail(400, { error: 'Podcast ID, YouTube URL, and title are required' });
		}

		// Extract video ID from YouTube URL
		let youtubeVideoId = null;
		try {
			const url = new URL(youtubeUrl);
			if (url.hostname.includes('youtube.com')) {
				youtubeVideoId = url.searchParams.get('v');
			} else if (url.hostname.includes('youtu.be')) {
				youtubeVideoId = url.pathname.slice(1);
			}
		} catch {
			// Invalid URL, continue without video ID
		}

		try {
			const [newEpisode] = await db
				.insert(podcastEpisode)
				.values({
					podcastId,
					youtubeUrl,
					youtubeVideoId,
					title,
					description: description || null,
					guest: guest || null,
					season: season ? parseInt(season) : null,
					episode: episode ? parseInt(episode) : null,
					publishedAt: publishedAt ? new Date(publishedAt) : null,
					thumbnailUrl: thumbnailUrl || null,
					duration: duration || null,
					createdBy: locals.user.id
				})
				.returning();

			return { success: true, episode: newEpisode };
		} catch (err) {
			console.error('Error creating podcast episode:', err);
			return fail(500, { error: 'Failed to create podcast episode' });
		}
	},

	// Update podcast episode
	updatePodcastEpisode: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const episodeId = formData.get('episodeId')?.toString();
		const title = formData.get('title')?.toString().trim();
		const description = formData.get('description')?.toString().trim();
		const guest = formData.get('guest')?.toString().trim();
		const season = formData.get('season')?.toString();
		const episode = formData.get('episode')?.toString();
		const publishedAt = formData.get('publishedAt')?.toString();
		const isPublished = formData.get('isPublished') === 'true';

		if (!episodeId || !title) {
			return fail(400, { error: 'Episode ID and title are required' });
		}

		try {
			const [updated] = await db
				.update(podcastEpisode)
				.set({
					title,
					description: description || null,
					guest: guest || null,
					season: season ? parseInt(season) : null,
					episode: episode ? parseInt(episode) : null,
					publishedAt: publishedAt ? new Date(publishedAt) : null,
					isPublished,
					updatedAt: new Date()
				})
				.where(eq(podcastEpisode.id, episodeId))
				.returning();

			return { success: true, episode: updated };
		} catch (err) {
			console.error('Error updating podcast episode:', err);
			return fail(500, { error: 'Failed to update podcast episode' });
		}
	},

	// Delete podcast episode
	deletePodcastEpisode: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const episodeId = formData.get('episodeId')?.toString();

		if (!episodeId) {
			return fail(400, { error: 'Episode ID is required' });
		}

		try {
			await db.delete(podcastEpisode).where(eq(podcastEpisode.id, episodeId));
			return { success: true };
		} catch (err) {
			console.error('Error deleting podcast episode:', err);
			return fail(500, { error: 'Failed to delete podcast episode' });
		}
	},

	// Create VOD
	createVod: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const title = formData.get('title')?.toString().trim();
		const description = formData.get('description')?.toString().trim();
		const player1Name = formData.get('player1Name')?.toString().trim();
		const player1Hero = formData.get('player1Hero')?.toString().trim();
		const player2Name = formData.get('player2Name')?.toString().trim();
		const player2Hero = formData.get('player2Hero')?.toString().trim();
		const eventId = formData.get('eventId')?.toString().trim();
		const isPremium = formData.get('isPremium') !== 'false';

		if (!title) {
			return fail(400, { error: 'Title is required' });
		}

		try {
			const [newVod] = await db
				.insert(vod)
				.values({
					title,
					description: description || null,
					player1Name: player1Name || null,
					player1Hero: player1Hero || null,
					player2Name: player2Name || null,
					player2Hero: player2Hero || null,
					eventId: eventId || null,
					isPremium,
					status: 'waiting',
					createdBy: locals.user.id
				})
				.returning();

			return { success: true, vod: newVod };
		} catch (err) {
			console.error('Error creating VOD:', err);
			return fail(500, { error: 'Failed to create VOD' });
		}
	},

	// Update VOD
	updateVod: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const vodId = formData.get('vodId')?.toString();
		const title = formData.get('title')?.toString().trim();
		const description = formData.get('description')?.toString().trim();
		const player1Name = formData.get('player1Name')?.toString().trim();
		const player1Hero = formData.get('player1Hero')?.toString().trim();
		const player2Name = formData.get('player2Name')?.toString().trim();
		const player2Hero = formData.get('player2Hero')?.toString().trim();
		const eventId = formData.get('eventId')?.toString().trim();
		const isPremium = formData.get('isPremium') !== 'false';

		if (!vodId || !title) {
			return fail(400, { error: 'VOD ID and title are required' });
		}

		try {
			const [updated] = await db
				.update(vod)
				.set({
					title,
					description: description || null,
					player1Name: player1Name || null,
					player1Hero: player1Hero || null,
					player2Name: player2Name || null,
					player2Hero: player2Hero || null,
					eventId: eventId || null,
					isPremium,
					updatedAt: new Date()
				})
				.where(eq(vod.id, vodId))
				.returning();

			return { success: true, vod: updated };
		} catch (err) {
			console.error('Error updating VOD:', err);
			return fail(500, { error: 'Failed to update VOD' });
		}
	},

	// Delete VOD (also deletes Mux asset)
	deleteVod: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const vodId = formData.get('vodId')?.toString();

		if (!vodId) {
			return fail(400, { error: 'VOD ID is required' });
		}

		try {
			const [vodRecord] = await db.select().from(vod).where(eq(vod.id, vodId)).limit(1);

			if (!vodRecord) {
				return fail(404, { error: 'VOD not found' });
			}

			// Delete Mux asset if it exists
			if (vodRecord.muxAssetId) {
				try {
					const mux = (await import('$lib/server/mux.js')).default;
					await mux.video.assets.delete(vodRecord.muxAssetId);
				} catch (muxErr) {
					console.warn('Could not delete Mux asset:', muxErr.message);
				}
			}

			await db.delete(vod).where(eq(vod.id, vodId));
			return { success: true };
		} catch (err) {
			console.error('Error deleting VOD:', err);
			return fail(500, { error: 'Failed to delete VOD' });
		}
	},

	// Publish VOD
	publishVod: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const vodId = formData.get('vodId')?.toString();

		if (!vodId) {
			return fail(400, { error: 'VOD ID is required' });
		}

		try {
			await db
				.update(vod)
				.set({
					isPublished: true,
					publishedAt: new Date(),
					updatedAt: new Date()
				})
				.where(eq(vod.id, vodId));

			return { success: true };
		} catch (err) {
			console.error('Error publishing VOD:', err);
			return fail(500, { error: 'Failed to publish VOD' });
		}
	},

	// Unpublish VOD
	unpublishVod: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const vodId = formData.get('vodId')?.toString();

		if (!vodId) {
			return fail(400, { error: 'VOD ID is required' });
		}

		try {
			await db
				.update(vod)
				.set({
					isPublished: false,
					updatedAt: new Date()
				})
				.where(eq(vod.id, vodId));

			return { success: true };
		} catch (err) {
			console.error('Error unpublishing VOD:', err);
			return fail(500, { error: 'Failed to unpublish VOD' });
		}
	},

	// Sync VOD status from Mux (workaround for webhook failures)
	syncVod: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const vodId = formData.get('vodId')?.toString();

		if (!vodId) {
			return fail(400, { error: 'VOD ID is required' });
		}

		try {
			const [vodRecord] = await db.select().from(vod).where(eq(vod.id, vodId)).limit(1);
			if (!vodRecord) {
				return fail(404, { error: 'VOD not found' });
			}

			const mux = (await import('$lib/server/mux.js')).default;

			// If we have an upload ID but no asset ID, fetch from the upload
			let assetId = vodRecord.muxAssetId;
			if (!assetId && vodRecord.muxUploadId) {
				const upload = await mux.video.uploads.retrieve(vodRecord.muxUploadId);
				assetId = upload.asset_id;
				if (assetId) {
					await db
						.update(vod)
						.set({ muxAssetId: assetId, updatedAt: new Date() })
						.where(eq(vod.id, vodId));
				}
			}

			if (!assetId) {
				return fail(400, { error: 'No Mux asset found for this VOD. Upload may still be processing.' });
			}

			// Fetch asset details from Mux
			const asset = await mux.video.assets.retrieve(assetId);
			const playbackId = asset.playback_ids?.[0]?.id;

			const updateData = {
				muxAssetId: assetId,
				muxPlaybackId: playbackId || vodRecord.muxPlaybackId,
				duration: asset.duration || vodRecord.duration,
				aspectRatio: asset.aspect_ratio || vodRecord.aspectRatio,
				status: asset.status === 'ready' ? 'ready' : asset.status === 'errored' ? 'errored' : 'preparing',
				updatedAt: new Date()
			};

			await db.update(vod).set(updateData).where(eq(vod.id, vodId));

			return { success: true, syncedStatus: updateData.status };
		} catch (err) {
			console.error('Error syncing VOD from Mux:', err);
			return fail(500, { error: `Failed to sync: ${err.message}` });
		}
	},

	// Fetch YouTube video metadata
	fetchYouTubeMetadata: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'admin') {
			return fail(403, { error: 'Unauthorized' });
		}

		const formData = await request.formData();
		const youtubeUrl = formData.get('youtubeUrl')?.toString().trim();

		if (!youtubeUrl) {
			return fail(400, { error: 'YouTube URL is required' });
		}

		// Extract video ID
		let videoId = null;
		try {
			const url = new URL(youtubeUrl);
			if (url.hostname.includes('youtube.com')) {
				videoId = url.searchParams.get('v');
			} else if (url.hostname.includes('youtu.be')) {
				videoId = url.pathname.slice(1);
			}
		} catch {
			return fail(400, { error: 'Invalid YouTube URL' });
		}

		if (!videoId) {
			return fail(400, { error: 'Could not extract video ID from URL' });
		}

		try {
			// Use YouTube oEmbed API (no API key needed)
			const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
			const response = await fetch(oembedUrl);

			if (!response.ok) {
				throw new Error('Video not found');
			}

			const oembedData = await response.json();

			// Get high-quality thumbnail
			const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

			return {
				success: true,
				metadata: {
					videoId,
					title: oembedData.title,
					thumbnailUrl,
					authorName: oembedData.author_name
				}
			};
		} catch (err) {
			console.error('Error fetching YouTube metadata:', err);
			return fail(500, { error: 'Failed to fetch video metadata. Make sure the URL is a valid public YouTube video.' });
		}
	}
};
