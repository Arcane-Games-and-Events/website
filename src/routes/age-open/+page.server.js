import { db } from '$lib/server/db/index.js';
import { event, match, decklist, standing, lssEvent, ticket } from '$lib/server/db/schema.js';
import { calculateFinalStandings, isBye } from '$lib/server/tournament-processor.js';
import { asc, desc, eq, sql } from 'drizzle-orm';
import { cached, CACHE_TTL } from '$lib/server/cache/index.js';
import {
	calculateAgeRatingTotal,
	getRatingTier,
	calculatePercentileFromSorted,
	calculateRankPercentileFromSorted
} from '$lib/age-rating.js';
// Aliased to avoid colliding with the local `playerKey` loop variable below.
import { playerKey as getPlayerKey } from '$lib/server/players/key.js';
import { topByCircuit } from '$lib/server/players/circuitLeaders.js';
import { calculateDerivedStats, compareStandings } from '$lib/players/standings.js';

// Note: calculatePercentile, calculateRankPercentile, calculateAgeRating, and getRatingTier
// are imported from $lib/age-rating.js for single source of truth

export async function load({ url, setHeaders }) {
	// Cache for 1 minute at the edge, stale-while-revalidate for 5 minutes.
	// No `Vary: Cookie` — this response is fully public (no locals.user, no
	// cookies read anywhere in this load function) and the sidebar/layout
	// data comes from +layout.server.js, so keying cache on session cookie
	// just fragments the edge cache into a per-user entry and destroys hit
	// rate for anonymous visitors.
	setHeaders({
		'cache-control': 'public, max-age=0, s-maxage=60, stale-while-revalidate=300'
	});

	const currentYear = new Date().getFullYear().toString();
	const selectedSeason = url.searchParams.get('season') || 'all';
	const selectedCircuit = url.searchParams.get('circuit') || null;
	// Tab determines which expensive computation paths run. The tournament
	// archive (eventResults) is only built for the 'results' tab; the AGE
	// Rating pass over every player is only done for the 'standings' tab.
	// Every other tab gets a much cheaper page render.
	const activeTab = url.searchParams.get('tab') || 'overview';
	const needsArchive = activeTab === 'results';
	const needsAgeRating = activeTab === 'standings';
	// Which tabs need which datasets — used below to skip the heavy fetches
	// when the current tab won't render them. Overview + Events show
	// upcoming-event chrome (LSS chip + capacity counts); Decklists loads
	// the public-decklist join only when open; Results loads the full
	// match table only when the archive tab is active.
	const needsUpcomingChrome = activeTab === 'overview' || activeTab === 'events';
	const needsDecklists = activeTab === 'decklists';

	try {
		// Cache the fully-computed page output by tab + filter combo so each
		// tab returns ready-to-render data on cache hit. Different tabs cache
		// separately because they carry different payloads. Any write to
		// the underlying tables makes every combo stale; five minutes at most
		// so upcoming/past splits follow the clock.
		return await cached(
			`age-open:page:v3:${activeTab}|${selectedSeason}|${selectedCircuit || 'none'}`,
			async () => {
				// Each raw table read is cached on its own as well, so tabs
				// share them. Each fetch is gated on whether the current tab actually needs
				// the data. Skipped fetches resolve to []` immediately so
				// downstream code stays unchanged. Overview visitors used to
				// pay for the full match-table dump, public-decklist join,
				// and LSS query even though those tabs never rendered on
				// their page — this is where most of the cold-cache wait was
				// coming from.
				const [events, allEventMatches, allStandings, decklists, lssEvents, ticketCounts] =
					await Promise.all([
						// Events — used across every tab (upcoming/past events,
						// filter dropdowns, archive lookup).
						cached('events:all', () => db.select().from(event).orderBy(asc(event.eventDate)), {
							tags: ['events']
						}),
						// Match table — only the Results tab's archive uses it.
						needsArchive
							? cached(
									'events:matches:all',
									() => db.select().from(match).orderBy(asc(match.round)),
									{ tags: ['matches'] }
								)
							: Promise.resolve([]),
						// Standings — used for filter dropdowns + career/season
						// computation on multiple tabs. Kept across all tabs.
						cached(
							'standings:all',
							() => db.select().from(standing).orderBy(desc(standing.totalPoints)),
							{ tags: ['standings'] }
						),
						// Public decklists — only the Decklists tab renders them.
						needsDecklists
							? cached(
									'events:decklists:public',
									() =>
										db
											.select({
												id: decklist.id,
												eventId: decklist.eventId,
												playerName: decklist.playerName,
												gemId: decklist.gemId,
												hero: decklist.hero,
												format: decklist.format,
												placement: decklist.placement,
												cards: decklist.cards,
												createdAt: decklist.createdAt,
												eventTitle: event.title,
												eventDate: event.eventDate,
												circuit: event.circuit,
												month: event.month
											})
											.from(decklist)
											.innerJoin(event, eq(decklist.eventId, event.id))
											.where(eq(decklist.isPublic, true))
											.orderBy(desc(decklist.createdAt)),
									{ tags: ['decklists', 'events'] }
								)
							: Promise.resolve([]),
						// LSS tournament chips — only shown in the upcoming-event
						// slots on Overview + Events tabs.
						needsUpcomingChrome
							? cached(
									'events:lss:active',
									() =>
										db
											.select()
											.from(lssEvent)
											.where(eq(lssEvent.isActive, true))
											.orderBy(asc(lssEvent.startDate)),
									{ tags: ['lss'] }
								)
							: Promise.resolve([]),
						// Ticket counts — only rendered as capacity chips on
						// upcoming-event cards (Overview + Events).
						needsUpcomingChrome
							? cached(
									'events:ticket-counts',
									() =>
										db
											.select({
												eventId: ticket.eventId,
												count: sql`count(*)::int`
											})
											.from(ticket)
											.where(eq(ticket.refunded, false))
											.groupBy(ticket.eventId),
									{ tags: ['tickets'] }
								)
							: Promise.resolve([])
					]);

				// Build ticket count lookup map
				const ticketCountMap = new Map();
				for (const tc of ticketCounts) {
					ticketCountMap.set(tc.eventId, tc.count);
				}

				// Extract unique seasons and circuits from standings data (dynamic filters)
				const uniqueSeasons = [...new Set(allStandings.map((s) => s.season))]
					.filter(Boolean)
					.sort()
					.reverse();
				const availableSeasons = ['all', ...uniqueSeasons];

				// Build circuits by year dynamically
				const circuitsByYear = { all: [] };
				for (const standing of allStandings) {
					if (!standing.season || !standing.circuit) continue;
					if (!circuitsByYear[standing.season]) {
						circuitsByYear[standing.season] = [];
					}
					if (!circuitsByYear[standing.season].includes(standing.circuit)) {
						circuitsByYear[standing.season].push(standing.circuit);
					}
					if (!circuitsByYear['all'].includes(standing.circuit)) {
						circuitsByYear['all'].push(standing.circuit);
					}
				}
				// Sort circuits alphabetically
				for (const year of Object.keys(circuitsByYear)) {
					circuitsByYear[year].sort();
				}

				// Get active/completed events with results for the Tournament Archive tab
				const archiveEvents = events.filter(
					(e) => (e.status === 'completed' || e.status === 'in_progress') && e.eventDate
				);

				// Group event matches by eventId — only needed when computing the
				// archive Top-8 results below. Skip building the map entirely on
				// tabs that don't render the archive.
				const matchesByEventId = new Map();
				if (needsArchive) {
					for (const match of allEventMatches) {
						if (!matchesByEventId.has(match.eventId)) {
							matchesByEventId.set(match.eventId, []);
						}
						matchesByEventId.get(match.eventId).push(match);
					}
				}

				// Archive results. An event's stored `tournament_results` (saved at
				// CSV upload, in Swiss-rank order) are what the admin Results tab and
				// the standings use, so they come first. Older events without them
				// are worked out from their match rows. An In Progress event is
				// listed even before its first upload, so the live strip shows it.
				const fromMatches = (matches) => {
					const playerMap = new Map();
					const note = (id, name) => {
						if ((!id && !name) || isBye(id, name)) return;
						const key = id || name;
						if (!playerMap.has(key)) playerMap.set(key, { playerId: id, name, wins: 0 });
					};
					for (const m of matches) {
						note(m.player1GemId, m.player1Name);
						note(m.player2GemId, m.player2Name);
					}
					const pairings = matches.map((m) => ({
						round: m.round,
						table: m.table,
						player1Id: m.player1GemId,
						player1Name: m.player1Name,
						player2Id: m.player2GemId,
						player2Name: m.player2Name,
						result: m.winner === 'player1' ? '1WIN' : m.winner === 'player2' ? '2WIN' : 'DRAW'
					}));
					return calculateFinalStandings([...playerMap.values()], pairings).results.map((r) => ({
						playerName: r.name,
						gemId: r.playerId,
						placement: r.placement,
						wins: r.matchesWon,
						losses: r.matchesPlayed - r.matchesWon,
						draws: 0,
						agePoints: r.points,
						prizeAmount: r.prize
					}));
				};
				const allResults = !needsArchive
					? []
					: archiveEvents
							.map((evt) => {
								let results = [];
								if (Array.isArray(evt.tournamentResults) && evt.tournamentResults.length > 0) {
									results = evt.tournamentResults;
								} else if (matchesByEventId.has(evt.id)) {
									try {
										results = fromMatches(matchesByEventId.get(evt.id));
									} catch (err) {
										console.error(`Error calculating results for event ${evt.id}:`, err);
									}
								}
								return { event: evt, results };
							})
							.filter((r) => r.results.length > 0 || r.event.status === 'in_progress');

				let standings = [];

				if (selectedSeason === 'all') {
					// Group by gemId to aggregate career stats (using allStandings from Promise.all)
					const careerStatsMap = new Map();

					for (const standing of allStandings) {
						// Identity by GEM ID. Rows without a GEM ID stay isolated
						// (see playerKey()) so same-name players don't merge.
						const key = getPlayerKey(standing);

						if (!careerStatsMap.has(key)) {
							careerStatsMap.set(key, {
								gemId: standing.gemId,
								playerName: standing.playerName,
								totalPoints: 0,
								matchesWon: 0,
								matchesPlayed: 0,
								eventsPlayed: 0,
								top8Finishes: 0,
								seasonsPlayed: new Set(),
								circuitsPlayed: new Set()
							});
						}

						const derived = calculateDerivedStats(standing);
						const career = careerStatsMap.get(key);
						career.totalPoints += standing.totalPoints || 0;
						career.matchesWon += standing.matchesWon || 0;
						career.matchesPlayed += standing.matchesPlayed || 0;
						career.eventsPlayed += derived.eventsPlayed;
						career.top8Finishes += derived.top8Finishes;
						career.seasonsPlayed.add(standing.season);
						career.circuitsPlayed.add(standing.circuit);
					}

					// Convert map to array and calculate win percentage
					const careerStats = Array.from(careerStatsMap.values()).map((career) => ({
						...career,
						winPercentage:
							career.matchesPlayed > 0
								? Math.round((career.matchesWon / career.matchesPlayed) * 10000) / 100
								: null,
						seasonsPlayed: Array.from(career.seasonsPlayed),
						circuitsPlayed: Array.from(career.circuitsPlayed)
					}));

					// Sort using tiebreaker rules and assign ranks
					careerStats.sort(compareStandings);
					standings = careerStats.map((player, index) => ({
						...player,
						calculatedRank: index + 1
					}));

					// Apply circuit filter if selected
					if (selectedCircuit) {
						standings = standings.filter((s) => s.circuitsPlayed.includes(selectedCircuit));
						// Recalculate ranks after filtering
						standings = standings.map((player, index) => ({
							...player,
							calculatedRank: index + 1
						}));
					}
				} else {
					// Filter standings from already-fetched data (no additional query needed)
					let rawStandings = allStandings.filter((s) => s.season === selectedSeason);

					if (selectedCircuit) {
						rawStandings = rawStandings.filter((s) => s.circuit === selectedCircuit);
					}

					// Pre-calculate seasonPoints from monthly columns (more reliable than totalPoints field)
					// This fixes cases where totalPoints may have been incorrectly stored
					rawStandings = rawStandings.map((s) => {
						const derived = calculateDerivedStats(s);
						return {
							...s,
							// Override totalPoints with calculated seasonPoints for correct display
							totalPoints: derived.seasonPoints,
							_eventsPlayed: derived.eventsPlayed,
							_top8Finishes: derived.top8Finishes
						};
					});

					// Sort using tiebreaker rules and assign ranks (now using corrected totalPoints)
					rawStandings.sort(compareStandings);

					// Calculate ranks and win percentage
					standings = rawStandings.map((standing, index) => {
						const winPercentage =
							standing.matchesPlayed > 0
								? Math.round((standing.matchesWon / standing.matchesPlayed) * 10000) / 100
								: null;

						return {
							...standing,
							calculatedRank: index + 1,
							winPercentage: standing.winPercentage || winPercentage,
							eventsPlayed: standing._eventsPlayed,
							top8Finishes: standing._top8Finishes
						};
					});
				}

				// === Calculate AGE Rating for each player in standings ===
				// The AGE Rating pass is heavy (iterates allStandings several
				// times, sorts groups, computes percentile arrays). Only run it
				// for the standings tab — other tabs that show a standings
				// preview don't display AGE Rating.
				if (needsAgeRating && standings.length > 0) {
					// Pre-group standings by circuit/season for efficient rank lookup
					const standingsByCircuitSeason = new Map();
					for (const s of allStandings) {
						const key = `${s.season}|${s.circuit}`;
						if (!standingsByCircuitSeason.has(key)) {
							standingsByCircuitSeason.set(key, []);
						}
						standingsByCircuitSeason.get(key).push(s);
					}

					// Sort each circuit/season group once (instead of sorting repeatedly in loop)
					for (const [, group] of standingsByCircuitSeason) {
						group.sort(compareStandings);
					}

					// Cache for derived stats to avoid redundant calculations
					const derivedStatsCache = new Map();

					// Group by player identity (GEM ID; GEM-less rows stay isolated).
					const playerStatsMap = new Map();
					for (const standing of allStandings) {
						const key = getPlayerKey(standing);
						if (!key) continue;

						if (!playerStatsMap.has(key)) {
							playerStatsMap.set(key, {
								totalPoints: 0,
								matchesWon: 0,
								matchesPlayed: 0,
								eventsPlayed: 0,
								top8Finishes: 0,
								bestRank: null,
								championshipQualifications: 0,
								standingsList: []
							});
						}

						// Use cached derived stats
						if (!derivedStatsCache.has(standing.id)) {
							derivedStatsCache.set(standing.id, calculateDerivedStats(standing));
						}
						const derived = derivedStatsCache.get(standing.id);

						const playerData = playerStatsMap.get(key);
						playerData.totalPoints += standing.totalPoints || 0;
						playerData.matchesWon += standing.matchesWon || 0;
						playerData.matchesPlayed += standing.matchesPlayed || 0;
						playerData.eventsPlayed += derived.eventsPlayed;
						playerData.top8Finishes += derived.top8Finishes;
						playerData.standingsList.push(standing);
					}

					// Calculate ranks using pre-grouped and pre-sorted data (no more O(n*m) filtering)
					for (const [playerKey, playerData] of playerStatsMap) {
						for (const standing of playerData.standingsList) {
							const circuitSeasonKey = `${standing.season}|${standing.circuit}`;
							const circuitSeasonStandings = standingsByCircuitSeason.get(circuitSeasonKey) || [];
							const rank =
								circuitSeasonStandings.findIndex((s) => getPlayerKey(s) === playerKey) + 1;

							if (rank > 0) {
								if (playerData.bestRank === null || rank < playerData.bestRank) {
									playerData.bestRank = rank;
								}
								if (rank <= 16) {
									playerData.championshipQualifications++;
								}
							}
						}
					}

					// Extract arrays for percentile calculation. Sort each ONCE
					// out here — the previous `calculatePercentile` implementation
					// sorted its input on every call, so with ~6 percentile lookups
					// per player and hundreds of players this loop was doing
					// millions of unnecessary sort operations and pushing the
					// serverless function past its timeout on the standings tab.
					// The `FromSorted` variants use binary search: O(log N) per
					// call after one O(N log N) sort — thousandfold speedup at
					// realistic player counts.
					const allPlayers = Array.from(playerStatsMap.values()).filter((p) => p.eventsPlayed >= 1);
					const numAsc = (a, b) => a - b;
					const sortedWinRates = allPlayers
						.map((p) => (p.matchesPlayed > 0 ? p.matchesWon / p.matchesPlayed : 0))
						.sort(numAsc);
					const sortedTop8Rates = allPlayers
						.map((p) => (p.eventsPlayed > 0 ? p.top8Finishes / p.eventsPlayed : 0))
						.sort(numAsc);
					const sortedEventsPlayed = allPlayers.map((p) => p.eventsPlayed).sort(numAsc);
					const sortedBestRanks = allPlayers
						.filter((p) => p.bestRank !== null)
						.map((p) => p.bestRank)
						.sort(numAsc);
					const sortedAvgPointsPerEvent = allPlayers
						.map((p) => (p.eventsPlayed > 0 ? p.totalPoints / p.eventsPlayed : 0))
						.sort(numAsc);
					const sortedChampionshipQuals = allPlayers
						.map((p) => p.championshipQualifications)
						.sort(numAsc);

					// Calculate AGE Rating for each player in standings
					standings = standings.map((standing) => {
						const key = getPlayerKey(standing);
						const playerData = playerStatsMap.get(key);

						if (!playerData) {
							return { ...standing, ageRating: null, ratingTier: null };
						}

						// Calculate metrics for this player
						const winRate =
							playerData.matchesPlayed > 0 ? playerData.matchesWon / playerData.matchesPlayed : 0;
						const top8Rate =
							playerData.eventsPlayed > 0 ? playerData.top8Finishes / playerData.eventsPlayed : 0;
						const avgPtsPerEvent =
							playerData.eventsPlayed > 0 ? playerData.totalPoints / playerData.eventsPlayed : 0;

						// Calculate percentiles (binary search into pre-sorted arrays).
						const percentiles = {
							winRate: calculatePercentileFromSorted(winRate, sortedWinRates),
							top8Rate: calculatePercentileFromSorted(top8Rate, sortedTop8Rates),
							experience: calculatePercentileFromSorted(
								playerData.eventsPlayed,
								sortedEventsPlayed
							),
							bestRank:
								playerData.bestRank !== null
									? calculateRankPercentileFromSorted(playerData.bestRank, sortedBestRanks)
									: 50,
							efficiency: calculatePercentileFromSorted(avgPtsPerEvent, sortedAvgPointsPerEvent),
							championship: calculatePercentileFromSorted(
								playerData.championshipQualifications,
								sortedChampionshipQuals
							)
						};

						const ageRating = calculateAgeRatingTotal(percentiles, playerData.eventsPlayed);
						const ratingTier = getRatingTier(ageRating);
						const isProvisional = playerData.eventsPlayed < 3;

						return {
							...standing,
							ageRating,
							ratingTier,
							isProvisional
						};
					});
				}

				// decklists and lssEvents already fetched in Promise.all above

				// Sort results: in_progress events first, then by date (most recent first)
				const sortedResults = [...allResults].sort((a, b) => {
					// In-progress events come first
					if (a.event.status === 'in_progress' && b.event.status !== 'in_progress') return -1;
					if (a.event.status !== 'in_progress' && b.event.status === 'in_progress') return 1;
					// Then sort by date (most recent first)
					return new Date(b.event.eventDate) - new Date(a.event.eventDate);
				});

				// Events still ahead or running now (In Progress), with ticket counts
				const upcomingEvents = events
					.filter((e) => e.status === 'upcoming' || e.status === 'in_progress')
					.map((e) => ({
						...e,
						registeredCount: ticketCountMap.get(e.id) || 0
					}));

				return {
					events: upcomingEvents,
					allEvents: events, // All events for circuit tracker
					archiveEvents,
					eventResults: sortedResults,
					standings,
					standingsByCircuit: activeTab === 'overview' ? topByCircuit(allStandings, 10) : {},
					decklists,
					lssEvents,
					currentYear,
					selectedSeason,
					selectedCircuit,
					availableSeasons,
					circuitsByYear
				};
			},
			{
				tags: ['events', 'matches', 'standings', 'decklists', 'lss', 'tickets'],
				ttl: CACHE_TTL.FIVE_MINUTES
			}
		);
	} catch (error) {
		console.error('Error loading AGE Open data:', error);
		return {
			events: [],
			allEvents: [],
			archiveEvents: [],
			eventResults: [],
			standings: [],
			standingsByCircuit: {},
			decklists: [],
			lssEvents: [],
			currentYear,
			selectedSeason: 'all',
			selectedCircuit,
			availableSeasons: ['all'],
			circuitsByYear: { all: [] }
		};
	}
}
