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

export async function load({ params }) {
	try {
		// Fetch the event
		const [eventData] = await db.select().from(event).where(eq(event.id, params.eventId)).limit(1);

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
			.where(eq(match.eventId, params.eventId))
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
				// Build bracket structure
				const formatBracketMatch = (m, seed1, seed2) => ({
					player1: {
						seed: seed1,
						name: m.player1Name,
						gemId: m.player1GemId,
						hero: getHeroForPlayer(m.player1GemId, m.player1Name),
						isWinner: m.winner === 'player1'
					},
					player2: {
						seed: seed2,
						name: m.player2Name,
						gemId: m.player2GemId,
						hero: getHeroForPlayer(m.player2GemId, m.player2Name),
						isWinner: m.winner === 'player2'
					}
				});

				// Create player to seed mapping from results
				const playerSeeds = new Map();
				top8Players.forEach((p, idx) => {
					const key = playerKeyFromIdName(p.gemId, p.playerName);
					playerSeeds.set(key, idx + 1);
				});

				const getSeed = (gemId, name) => {
					return playerSeeds.get(playerKeyFromIdName(gemId, name)) || 0;
				};

				// Standard bracket seeding: 1v8, 4v5, 2v7, 3v6
				const qfMatches = thirdLastRoundMatches.sort((a, b) => (a.table || 0) - (b.table || 0));
				const sfMatches = secondLastRoundMatches.sort((a, b) => (a.table || 0) - (b.table || 0));
				const finalsMatch = lastRoundMatches[0];

				top8Bracket = {
					quarterfinals: qfMatches.map((m) => {
						const seed1 = getSeed(m.player1GemId, m.player1Name);
						const seed2 = getSeed(m.player2GemId, m.player2Name);
						return formatBracketMatch(m, seed1, seed2);
					}),
					semifinals: sfMatches.map((m) => {
						const seed1 = getSeed(m.player1GemId, m.player1Name);
						const seed2 = getSeed(m.player2GemId, m.player2Name);
						return formatBracketMatch(m, seed1, seed2);
					}),
					finals: (() => {
						const seed1 = getSeed(finalsMatch.player1GemId, finalsMatch.player1Name);
						const seed2 = getSeed(finalsMatch.player2GemId, finalsMatch.player2Name);
						return formatBracketMatch(finalsMatch, seed1, seed2);
					})(),
					champion: {
						name:
							finalsMatch.winner === 'player1' ? finalsMatch.player1Name : finalsMatch.player2Name,
						gemId:
							finalsMatch.winner === 'player1'
								? finalsMatch.player1GemId
								: finalsMatch.player2GemId,
						hero: getHeroForPlayer(
							finalsMatch.winner === 'player1'
								? finalsMatch.player1GemId
								: finalsMatch.player2GemId,
							finalsMatch.winner === 'player1' ? finalsMatch.player1Name : finalsMatch.player2Name
						),
						seed: getSeed(
							finalsMatch.winner === 'player1'
								? finalsMatch.player1GemId
								: finalsMatch.player2GemId,
							finalsMatch.winner === 'player1' ? finalsMatch.player1Name : finalsMatch.player2Name
						)
					}
				};
			}
		}

		// Fetch decklists for this event (top 8 placements)
		const eventDecklists = await db
			.select()
			.from(decklist)
			.where(and(eq(decklist.eventId, params.eventId), eq(decklist.isPublic, true)))
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
