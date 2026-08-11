import { error } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { event, match, eventPlayerHero, decklist } from '$lib/server/db/schema.js';
import { eq, asc, and } from 'drizzle-orm';
import { calculateFinalStandings } from '$lib/server/tournament-processor.js';
import { playerKeyFromIdName } from '$lib/server/players/key.js';
import { getCachedOrFetch, CACHE_KEYS, CACHE_TTL } from '$lib/server/redis/index.js';

/**
 * Convert hero name to static image URL
 * e.g., "Kayo, Armed and Dangerous" -> "/hero_images/kayo-armed-and-dangerous.webp"
 */
function getHeroImageUrl(heroName) {
	if (!heroName) return null;
	const slug = heroName
		.toLowerCase()
		.replace(/ð/g, 'd')
		.replace(/þ/g, 'th')
		.replace(/æ/g, 'ae')
		.replace(/ø/g, 'o')
		.replace(/å/g, 'a')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[!@#$%^&*()+=[\]{}|\\:;<>?/~`]/g, '')
		.replace(/[,'"]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.trim();
	return `/hero_images/${slug}.webp`;
}

export async function load({ params, setHeaders }) {
	try {
		// Peek the event row uncached so we can pick the right TTL: in-progress
		// events still change, completed events never do. This one lookup is
		// cheap (single row by primary key) and avoids caching completed-vs-
		// in-progress state under one TTL.
		const [eventPeek] = await db
			.select({ status: event.status })
			.from(event)
			.where(eq(event.id, params.eventId))
			.limit(1);

		if (!eventPeek) {
			throw error(404, 'Event not found');
		}
		if (eventPeek.status !== 'completed' && eventPeek.status !== 'in_progress') {
			throw error(404, 'Results not available for this event');
		}

		// Completed events: cache for a day (their data is frozen). Live
		// events: 5 min so scoring updates surface quickly. Both layers
		// use the same TTL — Redis (server-side) and Vercel edge.
		const isCompleted = eventPeek.status === 'completed';
		const ttl = isCompleted ? CACHE_TTL.DAY : CACHE_TTL.MEDIUM;

		// Edge cache directive matches the Redis TTL. Completed events get
		// aggressive edge caching (1 day fresh, 1 week stale-revalidate);
		// live events get MEDIUM freshness with a 5-min stale window so
		// updates from admin CSV processing surface quickly at the edge.
		// No `Vary: Cookie` — payload is fully public and shared across
		// visitors; keying on session cookie destroys the CDN hit rate for
		// no functional benefit here.
		setHeaders({
			'cache-control': isCompleted
				? 'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800'
				: 'public, max-age=0, s-maxage=300, stale-while-revalidate=300'
		});

		return await getCachedOrFetch(
			`${CACHE_KEYS.EVENTS}:results:${params.eventId}`,
			() => buildEventResults(params.eventId),
			ttl
		);
	} catch (err) {
		if (err.status === 404) throw err;
		console.error('Error loading event results:', err);
		throw error(500, 'Failed to load event results');
	}
}

async function buildEventResults(eventId) {
	try {
		// Fetch the event
		const [eventData] = await db.select().from(event).where(eq(event.id, eventId)).limit(1);

		if (!eventData) {
			throw error(404, 'Event not found');
		}

		// Only show results for completed or in_progress events
		if (eventData.status !== 'completed' && eventData.status !== 'in_progress') {
			throw error(404, 'Results not available for this event');
		}

		// Fetch matches for this event
		const eventMatches = await db
			.select()
			.from(match)
			.where(eq(match.eventId, eventId))
			.orderBy(asc(match.round));

		// Use stored tournament results if available (preserves correct Swiss standings order)
		// Fall back to computing from matches for backwards compatibility
		let results = [];

		if (eventData.tournamentResults && Array.isArray(eventData.tournamentResults)) {
			results = eventData.tournamentResults;
		} else if (eventMatches.length > 0) {
			// Legacy fallback: compute from matches (won't have correct Swiss rank order)
			const playerMap = new Map();
			for (const m of eventMatches) {
				if (m.player1GemId || m.player1Name) {
					const key = playerKeyFromIdName(m.player1GemId, m.player1Name);
					if (!playerMap.has(key)) {
						playerMap.set(key, { playerId: m.player1GemId, name: m.player1Name, wins: 0 });
					}
				}
				if (m.player2GemId || m.player2Name) {
					const key = playerKeyFromIdName(m.player2GemId, m.player2Name);
					if (!playerMap.has(key)) {
						playerMap.set(key, { playerId: m.player2GemId, name: m.player2Name, wins: 0 });
					}
				}
			}

			const pairings = eventMatches.map((m) => ({
				round: m.round,
				table: m.table,
				player1Id: m.player1GemId,
				player1Name: m.player1Name,
				player2Id: m.player2GemId,
				player2Name: m.player2Name,
				result: m.winner === 'player1' ? '1WIN' : m.winner === 'player2' ? '2WIN' : 'DRAW'
			}));

			try {
				const swissStandings = Array.from(playerMap.values());
				const standings = calculateFinalStandings(swissStandings, pairings);
				results = standings.results.map((r) => ({
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
				console.error('Error calculating standings:', err);
			}
		}

		// Fetch hero data for this event (by season/circuit/month)
		let heroData = [];
		let metagameBreakdown = [];
		if (eventData.circuit && eventData.month && eventData.eventDate) {
			const season = new Date(eventData.eventDate).getUTCFullYear().toString();
			heroData = await getCachedOrFetch(
				`${CACHE_KEYS.EVENTS}:heroes:${season}|${eventData.circuit}|${eventData.month}`,
				() =>
					db
						.select()
						.from(eventPlayerHero)
						.where(
							and(
								eq(eventPlayerHero.season, season),
								eq(eventPlayerHero.circuit, eventData.circuit),
								eq(eventPlayerHero.month, eventData.month)
							)
						),
				CACHE_TTL.MEDIUM
			);
		}

		// Create hero lookup maps
		const heroByGemId = new Map(heroData.filter((h) => h.gemId).map((h) => [h.gemId, h.hero]));
		const heroByName = new Map(heroData.map((h) => [h.playerName.toLowerCase(), h.hero]));

		// Helper function to get hero for a player
		const getHeroForPlayer = (gemId, name) => {
			return (
				(gemId && heroByGemId.get(gemId)) || (name && heroByName.get(name.toLowerCase())) || null
			);
		};

		// Calculate hero stats from match data
		const heroStats = new Map(); // hero -> { wins, losses, draws, players: Map<playerKey, { name, gemId, wins, losses, draws }> }

		for (const m of eventMatches) {
			const p1Hero = getHeroForPlayer(m.player1GemId, m.player1Name);
			const p2Hero = getHeroForPlayer(m.player2GemId, m.player2Name);
			const p1Key = playerKeyFromIdName(m.player1GemId, m.player1Name);
			const p2Key = playerKeyFromIdName(m.player2GemId, m.player2Name);

			// Initialize hero stats if needed
			for (const hero of [p1Hero, p2Hero]) {
				if (hero && !heroStats.has(hero)) {
					heroStats.set(hero, { wins: 0, losses: 0, draws: 0, players: new Map() });
				}
			}

			// Initialize player stats within hero if needed
			if (p1Hero) {
				const stats = heroStats.get(p1Hero);
				if (!stats.players.has(p1Key)) {
					stats.players.set(p1Key, {
						name: m.player1Name,
						gemId: m.player1GemId,
						wins: 0,
						losses: 0,
						draws: 0
					});
				}
			}
			if (p2Hero) {
				const stats = heroStats.get(p2Hero);
				if (!stats.players.has(p2Key)) {
					stats.players.set(p2Key, {
						name: m.player2Name,
						gemId: m.player2GemId,
						wins: 0,
						losses: 0,
						draws: 0
					});
				}
			}

			// Update win/loss/draw stats
			if (m.winner === 'player1') {
				if (p1Hero) {
					heroStats.get(p1Hero).wins++;
					heroStats.get(p1Hero).players.get(p1Key).wins++;
				}
				if (p2Hero) {
					heroStats.get(p2Hero).losses++;
					heroStats.get(p2Hero).players.get(p2Key).losses++;
				}
			} else if (m.winner === 'player2') {
				if (p2Hero) {
					heroStats.get(p2Hero).wins++;
					heroStats.get(p2Hero).players.get(p2Key).wins++;
				}
				if (p1Hero) {
					heroStats.get(p1Hero).losses++;
					heroStats.get(p1Hero).players.get(p1Key).losses++;
				}
			} else {
				// Draw
				if (p1Hero) {
					heroStats.get(p1Hero).draws++;
					heroStats.get(p1Hero).players.get(p1Key).draws++;
				}
				if (p2Hero) {
					heroStats.get(p2Hero).draws++;
					heroStats.get(p2Hero).players.get(p2Key).draws++;
				}
			}
		}

		// Build enhanced metagame breakdown with win rates and player records
		if (heroData.length > 0) {
			const counts = {};
			for (const entry of heroData) {
				counts[entry.hero] = (counts[entry.hero] || 0) + 1;
			}
			metagameBreakdown = Object.entries(counts)
				.map(([hero, count]) => {
					const stats = heroStats.get(hero) || { wins: 0, losses: 0, draws: 0, players: new Map() };
					const totalMatches = stats.wins + stats.losses + stats.draws;
					const winRate = totalMatches > 0 ? ((stats.wins / totalMatches) * 100).toFixed(1) : '0.0';

					// Convert players map to sorted array
					const players = Array.from(stats.players.values())
						.map((p) => ({
							...p,
							totalMatches: p.wins + p.losses + p.draws,
							winRate:
								p.wins + p.losses + p.draws > 0
									? ((p.wins / (p.wins + p.losses + p.draws)) * 100).toFixed(1)
									: '0.0'
						}))
						.sort((a, b) => b.wins - a.wins || a.losses - b.losses);

					return {
						hero,
						imageUrl: getHeroImageUrl(hero),
						count,
						percentage: ((count / heroData.length) * 100).toFixed(1),
						wins: stats.wins,
						losses: stats.losses,
						draws: stats.draws,
						totalMatches,
						winRate,
						players
					};
				})
				.sort((a, b) => b.count - a.count);
		}

		// Enrich results with hero data
		const enrichedResults = results.map((r) => ({
			...r,
			hero: getHeroForPlayer(r.gemId, r.playerName)
		}));

		// Organize matches by round for the matches tab
		const totalRounds = eventMatches.length > 0 ? Math.max(...eventMatches.map((m) => m.round)) : 0;
		const matchesByRound = [];
		for (let round = 1; round <= totalRounds; round++) {
			const roundMatches = eventMatches
				.filter((m) => m.round === round)
				.map((m) => ({
					table: m.table,
					player1: {
						name: m.player1Name,
						gemId: m.player1GemId,
						hero: getHeroForPlayer(m.player1GemId, m.player1Name)
					},
					player2: {
						name: m.player2Name,
						gemId: m.player2GemId,
						hero: getHeroForPlayer(m.player2GemId, m.player2Name)
					},
					winner: m.winner,
					isDraw: !m.winner || m.winner === 'draw'
				}))
				.sort((a, b) => (a.table || 0) - (b.table || 0));

			matchesByRound.push({
				round,
				matches: roundMatches
			});
		}

		// Extract Top 8 bracket data
		// Top 8 consists of: Quarterfinals (4 matches), Semifinals (2 matches), Finals (1 match)
		// These are typically the last 3 rounds if there's a cut to top 8
		let top8Bracket = null;

		// Check if we have enough players and rounds for a top 8
		if (enrichedResults.length >= 8 && totalRounds >= 3) {
			// Get top 8 players by placement
			const top8Players = enrichedResults.slice(0, 8);

			// Try to identify elimination rounds
			// Quarterfinals = 4 matches, Semifinals = 2 matches, Finals = 1 match
			const lastRoundMatches = eventMatches.filter((m) => m.round === totalRounds);
			const secondLastRoundMatches = eventMatches.filter((m) => m.round === totalRounds - 1);
			const thirdLastRoundMatches = eventMatches.filter((m) => m.round === totalRounds - 2);

			// Check if the last 3 rounds follow the elimination pattern
			const hasTop8Pattern =
				lastRoundMatches.length === 1 &&
				secondLastRoundMatches.length === 2 &&
				thirdLastRoundMatches.length === 4;

			if (hasTop8Pattern) {
				// Hard-coded top-8 bracket display, top-to-bottom:
				//   1v8 / 4v5 / 3v6 / 2v7.
				// We don't try to match this back to whichever actual pairings
				// the tournament ran — we just render the traditional bracket
				// shape using the top-8 finishers by placement, and infer
				// winners from placement (seeds 1–4 won their QF, seeds 5–8
				// lost). This gives every event a clean, consistent bracket
				// visual regardless of how re-seeding or upsets played out.
				const HARDCODED_QF_PAIRS = [
					[1, 8],
					[4, 5],
					[3, 6],
					[2, 7]
				];

				// top8Players is already sorted by placement — index 0 is the
				// event winner (seed 1), index 7 is 8th place (seed 8).
				const bySeed = (seed) => top8Players[seed - 1] || null;

				const virtualBracketPlayer = (seed) => {
					const p = bySeed(seed);
					if (!p) return { seed, name: null, gemId: null, hero: null, isWinner: false };
					return {
						seed,
						name: p.playerName,
						gemId: p.gemId,
						// Prefer the hero already enriched onto the placement
						// row; fall back to a fresh lookup if it's missing.
						hero: p.hero || getHeroForPlayer(p.gemId, p.playerName),
						// Seeds 1–4 all advanced past QF (finished in top 4).
						isWinner: seed <= 4
					};
				};

				const virtualSFPlayer = (seed) => {
					// Seeds 1–2 advanced past SF (finished in top 2).
					const base = virtualBracketPlayer(seed);
					return { ...base, isWinner: seed <= 2 };
				};

				const virtualFinalsPlayer = (seed) => {
					// Only seed 1 advanced past finals.
					const base = virtualBracketPlayer(seed);
					return { ...base, isWinner: seed === 1 };
				};

				top8Bracket = {
					quarterfinals: HARDCODED_QF_PAIRS.map(([sA, sB]) => ({
						player1: virtualBracketPlayer(sA),
						player2: virtualBracketPlayer(sB)
					})),
					// SF top: winners of the 1v8 and 4v5 slots (seeds 1 and 4).
					// SF bottom: winners of the 3v6 and 2v7 slots (seeds 3 and 2).
					semifinals: [
						{ player1: virtualSFPlayer(1), player2: virtualSFPlayer(4) },
						{ player1: virtualSFPlayer(3), player2: virtualSFPlayer(2) }
					],
					// Finals: seeds 1 and 2 meet.
					finals: {
						player1: virtualFinalsPlayer(1),
						player2: virtualFinalsPlayer(2)
					},
					champion: (() => {
						const champ = top8Players[0] || null;
						return champ
							? {
									name: champ.playerName,
									gemId: champ.gemId,
									hero: champ.hero || getHeroForPlayer(champ.gemId, champ.playerName),
									seed: 1
								}
							: null;
					})()
				};
			}
		}

		// Fetch decklists for this event (top 8 placements)
		const eventDecklists = await db
			.select()
			.from(decklist)
			.where(and(eq(decklist.eventId, eventId), eq(decklist.isPublic, true)))
			.orderBy(asc(decklist.placement));

		// Add hero image URLs to decklists
		const decklistsWithImages = eventDecklists.map((d) => ({
			...d,
			heroImageUrl: getHeroImageUrl(d.hero)
		}));

		return {
			event: eventData,
			results: enrichedResults,
			totalRounds,
			metagameBreakdown,
			totalPlayers: heroData.length,
			matchesByRound,
			top8Bracket,
			decklists: decklistsWithImages
		};
	} catch (err) {
		if (err.status === 404) {
			throw err;
		}
		console.error('Error loading event results:', err);
		throw error(500, 'Failed to load event results');
	}
}
