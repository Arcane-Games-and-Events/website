<script>
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { goto, invalidateAll } from '$app/navigation';
	import { onMount, onDestroy } from 'svelte';
	import {
		CIRCUITS,
		DEFAULT_CIRCUIT,
		getCircuit,
		getCircuitImage,
		getCircuitNames,
		buildCircuitColorsMap
	} from '$lib/data/circuits.js';
	import StandingsCard from '$lib/components/StandingsCard.svelte';
	import UpcomingEvents from '$lib/components/UpcomingEvents.svelte';
	import NextEventBanner from '$lib/components/NextEventBanner.svelte';
	import EventCard from '$lib/components/EventCard.svelte';
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import EventRow from '$lib/components/age/EventRow.svelte';

	export let data;

	// Refresh state for standings
	let isRefreshing = false;
	let lastRefresh = null;
	let autoRefreshInterval = null;

	// Check if there are any in-progress events
	$: hasLiveEvents = (data.eventResults || []).some((e) => e.event.status === 'in_progress');

	// Auto-refresh for live events when on archive tab
	$: if (browser && activeTab === 'results' && hasLiveEvents) {
		startAutoRefresh();
	} else {
		stopAutoRefresh();
	}

	function startAutoRefresh() {
		if (autoRefreshInterval) return;
		// Refresh every 30 seconds for live events
		autoRefreshInterval = setInterval(() => {
			refreshStandings();
		}, 30000);
	}

	function stopAutoRefresh() {
		if (autoRefreshInterval) {
			clearInterval(autoRefreshInterval);
			autoRefreshInterval = null;
		}
	}

	onDestroy(() => {
		stopAutoRefresh();
	});

	// Refresh standings data
	async function refreshStandings() {
		if (isRefreshing) return;
		isRefreshing = true;
		try {
			await invalidateAll();
			lastRefresh = new Date();
		} finally {
			isRefreshing = false;
		}
	}

	const tabs = [
		{ id: 'overview', name: 'Overview', icon: 'home' },
		{ id: 'events', name: 'Events', icon: 'ticket' },
		{ id: 'standings', name: 'Standings', icon: 'trophy' },
		{ id: 'decklists', name: 'Decklists', icon: 'cards' },
		{ id: 'results', name: 'Tournament Archive', icon: 'chart' },
		{ id: 'rules', name: 'Rules & Info', icon: 'info' }
	];

	// Get active tab from URL, defaulting to 'overview'
	$: activeTab = $page.url.searchParams.get('tab') || 'overview';

	// Function to switch tabs and update URL. We pass noScroll so SvelteKit
	// keeps the user's current scroll position when the URL changes.
	function switchTab(tabId) {
		const url = new URL($page.url);
		if (tabId === 'overview') {
			url.searchParams.delete('tab');
		} else {
			url.searchParams.set('tab', tabId);
		}
		goto(url.toString(), { replaceState: false, noScroll: true });
	}

	// Handle standings preview filter changes (for sidebar)
	function updateStandingsFilter(param, value) {
		const url = new URL($page.url);
		if (param === 'season' && value === data.currentYear) {
			url.searchParams.delete('season');
		} else if (param === 'circuit' && !value) {
			url.searchParams.delete('circuit');
		} else {
			url.searchParams.set(param, value);
		}
		goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });
	}

	// Get available circuits for selected season
	$: availableCircuits = data.circuitsByYear[data.selectedSeason] || [];

	// Calendar state
	let calendarMonth = new Date().getMonth();
	let calendarYear = new Date().getFullYear();

	// Get calendar data for current month view
	$: calendarDays = getCalendarDays(calendarYear, calendarMonth);
	$: monthName = new Date(calendarYear, calendarMonth).toLocaleDateString('en-US', {
		month: 'long',
		year: 'numeric'
	});

	function getCalendarDays(year, month) {
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const startPadding = firstDay.getDay();
		const daysInMonth = lastDay.getDate();

		const days = [];

		// Previous month padding
		const prevMonth = new Date(year, month, 0);
		for (let i = startPadding - 1; i >= 0; i--) {
			days.push({
				day: prevMonth.getDate() - i,
				isCurrentMonth: false,
				date: new Date(year, month - 1, prevMonth.getDate() - i)
			});
		}

		// Current month
		for (let i = 1; i <= daysInMonth; i++) {
			days.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
		}

		// Next month padding
		const remaining = 42 - days.length; // 6 rows of 7 days
		for (let i = 1; i <= remaining; i++) {
			days.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
		}

		return days;
	}

	function previousMonth() {
		if (calendarMonth === 0) {
			calendarMonth = 11;
			calendarYear--;
		} else {
			calendarMonth--;
		}
	}

	function nextMonth() {
		if (calendarMonth === 11) {
			calendarMonth = 0;
			calendarYear++;
		} else {
			calendarMonth++;
		}
	}

	function goToToday() {
		calendarMonth = new Date().getMonth();
		calendarYear = new Date().getFullYear();
	}

	// Get events for a specific date
	// Helper to get a local date representing the UTC date (fixes timezone offset issue)
	function getLocalDateFromUTC(utcDate) {
		const d = new Date(utcDate);
		return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
	}

	function getEventsForDate(date) {
		// Use allEvents (all events) with fallback to events (upcoming only)
		const allEvts = data.allEvents?.length > 0 ? data.allEvents : data.events || [];
		return allEvts.filter((event) => {
			if (!event.eventDate) return false;
			const eventDate = getLocalDateFromUTC(event.eventDate);
			return (
				eventDate.getFullYear() === date.getFullYear() &&
				eventDate.getMonth() === date.getMonth() &&
				eventDate.getDate() === date.getDate()
			);
		});
	}

	// Get LSS seasons for a specific date
	function getSeasonsForDate(date) {
		return (data.lssEvents || []).filter((season) => {
			const start = getLocalDateFromUTC(season.startDate);
			const end = getLocalDateFromUTC(season.endDate);
			// Set time to start/end of day for proper comparison
			start.setHours(0, 0, 0, 0);
			end.setHours(23, 59, 59, 999);
			const compareDate = new Date(date);
			compareDate.setHours(12, 0, 0, 0); // Middle of day to avoid edge cases
			return compareDate >= start && compareDate <= end;
		});
	}

	// Color for LSS season bars - all use the same amber/yellow color
	const seasonColor = {
		bg: 'bg-amber-500/30',
		border: 'border-amber-500/50',
		text: 'text-amber-300'
	};

	function getSeasonColor(index) {
		return seasonColor;
	}

	// Filter LSS events to only show upcoming/active events (not past)
	$: upcomingLssEvents = (data.lssEvents || []).filter((season) => {
		const endDate = new Date(season.endDate);
		const now = new Date();
		return now <= endDate;
	});

	// Split calendar days into weeks
	$: calendarWeeks = calendarDays
		? [
				calendarDays.slice(0, 7),
				calendarDays.slice(7, 14),
				calendarDays.slice(14, 21),
				calendarDays.slice(21, 28),
				calendarDays.slice(28, 35),
				calendarDays.slice(35, 42)
			]
		: [];

	// Check if date is today
	function isToday(date) {
		const today = new Date();
		return (
			date.getFullYear() === today.getFullYear() &&
			date.getMonth() === today.getMonth() &&
			date.getDate() === today.getDate()
		);
	}

	// Circuit colors for badges (from centralized config)
	const circuitColors = buildCircuitColorsMap();

	// Default colors for events without a circuit
	const defaultCircuitColor = DEFAULT_CIRCUIT.colors;

	// Standings search and filter
	let searchQuery = '';
	let standingsCircuit = 'all';
	let standingsSeason = data.selectedSeason || 'all';

	// Sorting state for standings
	let sortColumn = 'rank'; // 'rank', 'points', 'record', 'winPct', 'events', 'top8', 'ageRating'
	let sortDirection = 'asc'; // 'asc' or 'desc'

	function toggleSort(column) {
		if (sortColumn === column) {
			// Three-state toggle: desc → asc → clear (back to rank)
			if (sortDirection === 'desc') {
				sortDirection = 'asc';
			} else if (sortDirection === 'asc' && column !== 'rank') {
				// Clear sort - return to default rank sorting
				sortColumn = 'rank';
				sortDirection = 'asc';
			} else {
				// For rank column or already at asc, toggle to desc
				sortDirection = 'desc';
			}
		} else {
			sortColumn = column;
			// Default to descending for most columns, ascending for rank
			sortDirection = column === 'rank' ? 'asc' : 'desc';
		}
		standingsPage = 1; // Reset to first page when sorting
	}

	/**
	 * Compare two standings using tiebreaker rules:
	 * 1. Total Points (primary)
	 * 2. Number of Top 8's made
	 * 3. Total match wins
	 * 4. Number of events attended
	 */
	function compareStandings(a, b) {
		const pointsDiff = (b.totalPoints || 0) - (a.totalPoints || 0);
		if (pointsDiff !== 0) return pointsDiff;
		const top8Diff = (b.top8Finishes || 0) - (a.top8Finishes || 0);
		if (top8Diff !== 0) return top8Diff;
		const winsDiff = (b.matchesWon || 0) - (a.matchesWon || 0);
		if (winsDiff !== 0) return winsDiff;
		return (b.eventsPlayed || 0) - (a.eventsPlayed || 0);
	}

	// Custom sort function based on selected column
	function sortStandings(a, b) {
		let aVal, bVal;

		switch (sortColumn) {
			case 'rank':
				aVal = a.calculatedRank || a.rank || 999;
				bVal = b.calculatedRank || b.rank || 999;
				break;
			case 'points':
				aVal = a.totalPoints || 0;
				bVal = b.totalPoints || 0;
				break;
			case 'record':
				// Sort by wins primarily
				aVal = a.matchesWon || 0;
				bVal = b.matchesWon || 0;
				break;
			case 'winPct':
				aVal = a.winPercentage || 0;
				bVal = b.winPercentage || 0;
				break;
			case 'events':
				aVal = a.eventsPlayed || 0;
				bVal = b.eventsPlayed || 0;
				break;
			case 'top8':
				aVal = a.top8Finishes || 0;
				bVal = b.top8Finishes || 0;
				break;
			case 'ageRating':
				aVal = a.ageRating || 0;
				bVal = b.ageRating || 0;
				break;
			default:
				return (a.calculatedRank || 999) - (b.calculatedRank || 999);
		}

		// For rank column, lower is better, so ascending means lower first
		// For other columns, higher is better in descending order
		const diff =
			sortColumn === 'rank'
				? sortDirection === 'asc'
					? aVal - bVal
					: bVal - aVal
				: sortDirection === 'desc'
					? bVal - aVal
					: aVal - bVal;

		// Use tiebreaker rules if values are equal
		if (diff === 0) return compareStandings(a, b);
		return diff;
	}

	// Pagination for standings
	let standingsPage = 1;
	const standingsPerPage = 25;

	// Sync season when data updates from server
	$: if (data.selectedSeason) standingsSeason = data.selectedSeason;

	// Get available circuits for the selected standings season
	$: standingsAvailableCircuits = data.circuitsByYear?.[standingsSeason] || ['Los Angeles'];

	// Function to change season (reloads data from server)
	function changeSeason(season) {
		standingsSeason = season;
		standingsCircuit = 'all'; // Reset circuit filter when changing season
		const url = new URL($page.url);
		url.searchParams.set('season', season);
		url.searchParams.set('tab', 'standings');
		goto(url.toString(), { replaceState: false, noScroll: true });
	}

	// Decklists filters
	let decklistCircuit = 'all';
	let decklistHero = 'all';
	let decklistSearch = '';

	// FAQ accordion state
	let openFaqIndex = null;

	// Comprehensive rulebook sections
	const rulebookSections = [
		{
			id: 'registration',
			title: 'Registration & Entry',
			icon: 'ticket',
			items: [
				{
					question: 'How do I register for an AGE Open?',
					answer:
						'Register online through our website by selecting your desired event from the Events tab and completing payment. On-site registration may be available if capacity permits, but online pre-registration is strongly recommended as events can sell out. Premium members receive a 10% discount on all event registrations.'
				},
				{
					question: 'Is a GEM ID required?',
					answer:
						'Yes, a valid GEM ID is required to participate in all AGE Open events. Your GEM ID ensures accurate tracking of match results, standings, and AGE Points. You can register for a free GEM ID through Legend Story Studios at fabtcg.com. Please have your GEM ID ready at check-in.'
				},
				{
					question: 'What is the refund policy?',
					answer:
						"Full refunds are available up until 24 hours before the event start time. Refunds are processed back to the original credit card used for purchase. No refunds are available within 24 hours of the event. Exceptions may be made for documented emergencies at the Tournament Organizer's discretion. Contact us directly for refund requests."
				},
				{
					question: 'Can I transfer my registration to another player?',
					answer:
						"Registration transfers are permitted up to 24 hours before the event start time. Contact the Tournament Organizer with both the original registrant's and new player's information. The new player must meet all registration requirements including having a valid GEM ID."
				},
				{
					question: 'What time should I arrive?',
					answer:
						"Players should arrive at least 30 minutes before the posted start time to complete check-in. Late arrivals may receive a Round 1 game loss or match loss at the Head Judge's discretion. Players who are not checked in by the start of Round 1 pairings may be dropped from the event."
				},
				{
					question: 'What do I need to bring?',
					answer:
						'Required: Your registered and sleeved deck, hero card, equipment, weapons, tokens/counters, a method to track life totals, your GEM ID, and valid photo ID. Recommended: Playmat, dice, pen and paper, water bottle, and snacks. All cards must be in tournament-legal condition (not marked, bent, or identifiable from the back).'
				}
			]
		},
		{
			id: 'deck-rules',
			title: 'Deck Registration & Legality',
			icon: 'cards',
			items: [
				{
					question: 'Do I need to submit a decklist?',
					answer:
						"Yes, all players must submit a decklist before the start of Round 1. Decklists can be submitted online during registration or on paper at check-in. Players who fail to submit a decklist by the deadline will receive a game loss in Round 1. Decklists are confidential during the event and may be published afterward at the Tournament Organizer's discretion."
				},
				{
					question: 'Can I change my deck after submitting?',
					answer:
						'No changes to your registered decklist are permitted once submitted, except to correct illegal configurations discovered before Round 1. If an illegal deck is discovered after the event begins, penalties will be assessed. Players are responsible for verifying their deck matches their submitted list.'
				},
				{
					question: 'What happens if my deck is illegal?',
					answer:
						'If an illegal deck (wrong card count, banned cards, unregistered cards, etc.) is discovered before Round 1, you may correct it without penalty. If discovered during the tournament, penalties range from a game loss to disqualification depending on severity and whether advantage was gained. Deck checks may occur at any time during the event.'
				},
				{
					question: 'What card conditions are allowed?',
					answer:
						'All cards must be genuine Flesh and Blood cards in Near Mint to Lightly Played condition. Cards must be sleeved in opaque sleeves that make card backs indistinguishable. Marked, bent, or damaged cards that could allow identification must be replaced. Judges may require sleeve or card replacement at any time.'
				},
				{
					question: 'Are proxy cards allowed?',
					answer:
						'No proxy cards are permitted in AGE Open events. All cards must be genuine Flesh and Blood cards. Players may request to borrow cards from other participants or spectators before the event, but all cards must be authentic during play.'
				},
				{
					question: 'What format is played at AGE Opens?',
					answer:
						'AGE Opens use Classic Constructed format unless otherwise specified. The current banned and restricted list as published by Legend Story Studios applies. Check the specific event listing for format details and any additional restrictions.'
				}
			]
		},
		{
			id: 'tournament-structure',
			title: 'Tournament Structure',
			icon: 'bracket',
			items: [
				{
					question: 'How many Swiss rounds are played?',
					answer:
						'Swiss rounds are determined by attendance: 8 players = 3 rounds, 9-16 players = 4 rounds, 17-32 players = 5 rounds, 33-64 players = 6 rounds, 65-128 players = 7 rounds, 129-226 players = 8 rounds, 227-409 players = 9 rounds, 410+ players = 10 rounds. The Head Judge reserves the right to adjust round count based on time constraints.'
				},
				{
					question: 'Is there a Top 8 cut?',
					answer:
						"Yes, after Swiss rounds, the Top 8 players by standings advance to a single-elimination playoff bracket. Quarterfinals and Semifinals are best-of-one matches. The Finals may be best-of-three at the Tournament Organizer's discretion. Draws are not permitted in Top 8 matches."
				},
				{
					question: 'How are tiebreakers calculated?',
					answer:
						'Following official FAB tournament policy, standings are determined by: 1) Match Points (3 for win, 0 for draw/loss), 2) CTB (Cumulative Tiebreaker) - the player whose wins came later in the tournament has the advantage, 3) PML (Player Match Loss) - fewer match losses is better, 4) OML% (Opponent Match Loss %) - lower percentage is better, 5) OCTB (Opponent Cumulative Tiebreaker) - higher is better, 6) Random if still tied. In Top 8, the player with better tiebreakers receives the higher seed.'
				},
				{
					question: 'What happens if there is an odd number of players?',
					answer:
						'The lowest-ranked player without a bye receives a bye each round. A bye counts as a 2-0 match win (3 match points). Players cannot receive more than one bye during Swiss rounds unless all other players have already received one. Byes earned through other means (e.g., promotional byes) are applied first.'
				},
				{
					question: 'Can I intentionally draw with my opponent?',
					answer:
						'Per FAB Tournament Rules and Policy: Players may intentionally draw games and/or matches by mutual agreement at any time, EXCEPT during elimination rounds (Top 8). Draws award 0 match points. For concessions: Players may concede at any time during Swiss rounds, but in timed rounds, once you take an in-game action after time is called, you may no longer concede and must play to conclusion. IMPORTANT: Players may NOT ask their opponent for a concession at any time - doing so results in a match loss in the next round. Players may not concede in exchange for any consideration (prizes, money, etc.) as this constitutes bribery.'
				},
				{
					question: 'What if I need to drop from the tournament?',
					answer:
						'Players may drop from the tournament at any time through GEM (the tournament software) or by notifying a judge. Dropped players receive a match loss for the current round if in progress. Players who drop during Top 8 forfeit all prizes associated with their finishing position. Re-entry is not permitted after dropping.'
				}
			]
		},
		{
			id: 'match-procedures',
			title: 'Match & Round Procedures',
			icon: 'clock',
			items: [
				{
					question: 'How long are rounds?',
					answer:
						'Swiss rounds are 55 minutes. All rounds are Best of 1 (single game). Per FAB Tournament Rules and Policy End-of-Game Procedure: When time is called, if the turn player has no decisions remaining or clearly indicates they intend to end their turn, the opponent gets a full turn, then 1 additional turn occurs. If neither player has won after extra turns, the player with the higher life total wins the game. If life totals are tied after extra turns, the game is a draw. Top 8 matches have no time limit but are subject to slow play enforcement.'
				},
				{
					question: 'Who goes first?',
					answer:
						'All AGE Open rounds are Best of 1 (single game per round). At the start of each game, players roll dice or use another random method to determine who chooses to go first or second. In Top 8, the higher-seeded player chooses whether to go first or second.'
				},
				{
					question: 'Can I take notes during a match?',
					answer:
						'Yes, you may take notes during your match about the current game state, life totals, and publicly known information. You may NOT reference outside notes or information brought into the match. Notes must be taken in view of your opponent and judges may request to see your notes at any time. Per FAB rules, electronic devices may be used for note-taking as long as they are visible and accessible to all players, and you are not receiving outside assistance.'
				},
				{
					question: 'What about electronic devices during matches?',
					answer:
						'Per FAB Tournament Rules and Policy, electronic devices may be used during matches if they are visible and accessible to all players in the match. However, electronic devices cannot be used to receive strategic advice from external sources during a match. Players may use devices for life tracking or timers. Using electronic devices to receive outside assistance during a match (coaching, strategy tips, etc.) is considered Outside Assistance and may result in penalties. Feature match players may have additional restrictions on device use.'
				},
				{
					question: 'Can I get an extension for a judge call?',
					answer:
						'Yes, time extensions are granted for judge calls that significantly interrupt play. Extensions are typically 2-3 minutes per call and are added to the end of the round. The table judge or Head Judge determines appropriate extensions. Players should not exploit judge calls to gain extra time.'
				},
				{
					question: 'What happens if I need a bathroom break?',
					answer:
						'Players may request a bathroom break once per match by calling a judge. The match clock continues during breaks. Breaks longer than 5 minutes may result in slow play penalties. Plan accordingly and use breaks between rounds when possible. Top 8 players may request judge supervision during breaks.'
				}
			]
		},
		{
			id: 'penalties',
			title: 'Penalties & Infractions',
			icon: 'warning',
			items: [
				{
					question: 'What is the penalty structure?',
					answer:
						'Penalties escalate in severity: Caution (verbal reminder, no penalty), Warning (documented, no game impact), Game Loss (lose current or next game), Match Loss (lose the match), Disqualification (removed from event, forfeits prizes). Repeated warnings of the same type upgrade to game losses. Severe or intentional infractions may skip directly to harsher penalties.'
				},
				{
					question: 'What counts as slow play?',
					answer:
						'Per FAB Tournament Rules and Policy, slow play is taking more time than reasonably necessary to make game decisions. The start-of-game procedure (including hero reveal, equipment selection, and shuffling) should take no more than 5 minutes for the first game and 3 minutes for subsequent games. During gameplay, factors considered include: game complexity, time remaining, and whether the pace is unreasonable. First offense is typically a Warning. Continued slow play results in a Game Loss. Stalling (intentionally playing slowly to benefit from time) is Unsporting Conduct - Cheating and results in Disqualification.'
				},
				{
					question: 'What is considered cheating?',
					answer:
						'Cheating includes: marked cards or sleeves, drawing extra cards, misrepresenting game state, stacking decks, bribery, improperly determining match outcome, and any intentional rule violation to gain advantage. Cheating results in immediate Disqualification and may include bans from future events. Suspected cheating should be reported to a judge immediately.'
				},
				{
					question: 'What happens if I make a game error?',
					answer:
						'Game Rule Violations (GRV) occur when rules are broken unintentionally. Judges will correct the game state if possible and issue a Warning. Repeated GRVs upgrade to Game Loss. If both players commit errors, both receive penalties. Players are expected to know the game rules; ignorance is not an excuse.'
				},
				{
					question: "Can I be penalized for my opponent's mistake?",
					answer:
						'Failure to Maintain Game State (FTMGS) occurs when you allow your opponent to commit an error without catching it. This includes missing mandatory triggers and not correcting illegal plays. FTMGS results in a Warning. You are expected to help maintain correct game state at all times.'
				},
				{
					question: 'What is Unsporting Conduct?',
					answer:
						'Unsporting Conduct includes: profanity, aggressive behavior, harassment, arguing with officials, damaging property, theft, or any behavior that creates a hostile environment. Minor offenses result in Warnings. Major offenses result in Game/Match Loss or Disqualification. Harassment or discrimination results in immediate Disqualification and potential ban from future events.'
				},
				{
					question: "What happens if I'm late to a round?",
					answer:
						"Per FAB Procedure and Penalty Guide, tardiness occurs when a player is not at their assigned table when the round timer begins. Penalties: Less than 1 minute late = Warning (downgrade), 1-10 minutes late = IP2 (Intellect Penalty - Minor), More than 10 minutes late = Game Loss (upgrade). The table's round time is extended by the total time delayed. If a player is more than 10 minutes tardy, they should be dropped before the next round unless they report to the scorekeeper. Time is measured from when the round timer begins (or scheduled end of previous round if matches finished early). Tardiness infractions do not escalate - each is handled individually."
				}
			]
		},
		{
			id: 'judges',
			title: 'Judges & Rulings',
			icon: 'gavel',
			items: [
				{
					question: 'How do I call a judge?',
					answer:
						'Raise your hand and clearly say "Judge!" to summon a floor judge. Pause the game while waiting (do not continue play). Either player may call a judge at any time for any reason. Do not attempt to resolve disputes without a judge. Judge calls are free and encouraged - never hesitate to call a judge.'
				},
				{
					question: 'Can I appeal a ruling?',
					answer:
						'Per FAB Tournament Rules and Policy: After a judge makes a ruling, but before the procedure or penalty is applied, either player may appeal by stating "I would like to appeal." The floor judge will explain their ruling to the Head Judge, who makes the final decision. If the Head Judge is the first responder, you may still request an appeal - the Head Judge will consult with another judge before affirming or modifying their ruling. At events with only one judge present, that judge\'s ruling is final. Players may appeal to the Tournament Organizer, who will discuss the ruling privately and issue a final decision. After the event, players may contact the TO to leave feedback about rulings, judges, or situations.'
				},
				{
					question: 'What if I disagree with the Head Judge?',
					answer:
						'Head Judge rulings are final during the event. After the event, you may submit feedback to the Tournament Organizer. Arguing with officials after a ruling is made is Unsporting Conduct and may result in penalties. Maintain professionalism even when you disagree with a ruling.'
				},
				{
					question: 'Can judges give strategic advice?',
					answer:
						'No, judges cannot provide strategic advice or suggest plays. They can only answer rules questions, clarify card interactions, and resolve disputes. Judges will not tell you the "correct" play in a situation. If you ask "what should I do?", a judge can only explain your legal options.'
				},
				{
					question: "What if there's a language barrier?",
					answer:
						'Players who speak different languages may request a judge to facilitate communication. English is the official tournament language for card text and rules disputes. Players may bring a translator (who is not a current participant) with Head Judge approval. All official announcements will be made in English.'
				}
			]
		},
		{
			id: 'conduct',
			title: 'Player Conduct',
			icon: 'user',
			items: [
				{
					question: 'What behavior is expected at AGE Opens?',
					answer:
						'Players are expected to: treat opponents, judges, and staff with respect; maintain good hygiene; keep play areas clean; play in a timely manner; represent the game state accurately; and accept judge rulings gracefully. AGE Opens are competitive but friendly events - good sportsmanship is paramount.'
				},
				{
					question: 'What about hygiene standards?',
					answer:
						'Players must maintain reasonable hygiene standards. This includes wearing clean clothing, using deodorant, and washing hands. Players with hygiene issues that impact opponents may be asked to address the issue, and failure to comply may result in removal from the event. This policy ensures a comfortable environment for all participants.'
				},
				{
					question: 'Can I eat or drink during matches?',
					answer:
						'Non-alcoholic beverages in spill-proof containers are permitted at tables. Light snacks are acceptable but should not delay play or create mess. Keep food and drink away from cards and play areas. Clean up after yourself. Alcohol is not permitted during competition regardless of venue policies.'
				},
				{
					question: 'What about spectators and coaching?',
					answer:
						'Spectators must remain silent during matches and may not communicate with players by any means. Coaching from spectators is strictly prohibited during matches and in Top 8. Between rounds, players may discuss games with others. Spectators who interfere with matches may be asked to leave the event.'
				},
				{
					question: 'What if I observe cheating or misconduct?',
					answer:
						'Report suspected cheating or misconduct to a judge immediately. You may request to speak privately if sensitive. Provide as much detail as possible: what you saw, when, and who was involved. Reports are taken seriously and investigated confidentially. Retaliation against reporters is prohibited.'
				},
				{
					question: 'Can I concede a match to help a friend?',
					answer:
						"Per FAB Tournament Rules and Policy: Players may concede games and/or matches at any time during Swiss rounds. However, in timed rounds, once you take an in-game action after time is called (or acknowledge your opponent's action), you may no longer concede and must play to conclusion. IMPORTANT: You may NOT ask your opponent for a concession at any time - doing so results in a match loss in the next round. You may NOT concede in exchange for any consideration (prizes, money, etc.) as this constitutes bribery. If players discuss considerations dependent on match outcome, they may no longer concede. Coordinating concessions to manipulate standings is collusion and results in Disqualification."
				}
			]
		},
		{
			id: 'streaming',
			title: 'Stream & Coverage',
			icon: 'camera',
			items: [
				{
					question: 'Can I be selected for feature match or stream?',
					answer:
						'Yes, by registering for an AGE Open, you consent to being selected for feature matches and live stream coverage. Matches may be recorded, photographed, and broadcast on official AGE channels. This footage may be used for promotional purposes. Players who are uncomfortable appearing on camera should notify the Tournament Organizer before the event.'
				},
				{
					question: 'Can I refuse to be on stream?',
					answer:
						'Players may request not to be featured on stream by notifying the Tournament Organizer before the event. However, in Top 8, being featured on stream may be mandatory. If you refuse to participate in Top 8 coverage after being selected, you may be required to forfeit your match. Accommodations for legitimate concerns (safety, privacy) will be considered on a case-by-case basis.'
				},
				{
					question: 'Is there a stream delay?',
					answer:
						'Our official broadcast has a minimal stream delay. Players in feature matches may not access electronic devices except in extraneous circumstances (emergency situations, being on call for work or other obligations). Using electronic devices to view the stream during a match is considered cheating and will be dealt with appropriately. Communication with spectators is prohibited during matches. Attempting to receive outside information during a feature match results in Disqualification.'
				},
				{
					question: 'What about content creation and recording?',
					answer:
						"Personal recording of your own matches is generally permitted with opponent consent. Recording other players' matches requires their permission. Commercial recording or streaming requires Tournament Organizer approval. Decklists, standings, and official coverage are property of Arcane Games & Events."
				}
			]
		},
		{
			id: 'prizes',
			title: 'Prizes & Standings',
			icon: 'trophy',
			items: [
				{
					question: 'How do I collect my prizes?',
					answer:
						'Cash prizes are distributed at the end of the event to Top 8 finishers. Bring valid photo ID matching your registration. Prizes not claimed within 30 days of the event may be forfeited. For players who must leave early, contact the Tournament Organizer to arrange pickup or alternative arrangements.'
				},
				{
					question: 'Can prize payouts be split?',
					answer:
						'Prize splits among Top 8 finishers are permitted if agreed upon before matches begin. Players must still play out matches to determine standings and AGE Points. Split agreements cannot involve players outside Top 8, and the tournament structure must still be followed. Report all splits to the Head Judge.'
				},
				{
					question: 'Are prizes taxable?',
					answer:
						'Prizes may be subject to local tax laws. Players who win $600 or more in a calendar year will receive appropriate tax documentation. International players should consult their local tax regulations. AGE is not responsible for tax obligations of prize winners.'
				},
				{
					question: 'How are AGE Points awarded?',
					answer:
						'AGE Points are awarded based on final standings: 1st = 30 pts, 2nd = 25 pts, 3rd-4th = 20 pts, 5th-8th = 15 pts, 9th-12th = 12 pts, 13th-16th = 8 pts, All participants = 1 pt. Points are tracked per circuit and accumulate throughout the season. Disqualified players do not receive AGE Points.'
				},
				{
					question: "How are Player's Championship invites determined?",
					answer:
						'The top 16 players by total AGE Points in each circuit at the end of the season receive invitations. Tiebreakers for qualification are: 1) Most Top 8 finishes, 2) Most match wins, 3) Most events attended. Players must accept their invitation within 14 days or the next eligible player is invited.'
				},
				{
					question: "What happens if a qualified player can't attend the Championship?",
					answer:
						"Players who decline or cannot attend the Player's Championship should notify AGE as soon as possible. Their spot will pass down to the next qualified player. Invitations are non-transferable to specific players. Players who withdraw with proper notice will not face any penalties or future restrictions. However, failure to show up to the Player's Championship without warning or notice may result in penalties or restrictions from future AGE events."
				}
			]
		},
		{
			id: 'dq-bans',
			title: 'Disqualifications & Bans',
			icon: 'ban',
			items: [
				{
					question: 'What results in automatic Disqualification?',
					answer:
						"Automatic DQ offenses include: Cheating of any kind, bribery or collusion, aggressive or threatening behavior, theft, harassment or discrimination, severe Unsporting Conduct, physical altercation, or impersonating another player. DQ'd players must leave the venue immediately and forfeit all prizes. DQs are reported to and may be investigated by Legend Story Studios."
				},
				{
					question: 'What happens after a Disqualification?',
					answer:
						'The disqualified player will be dropped from the tournament immediately. No prizing will be awarded. All information will be documented and submitted to Legend Story Studios (LSS). AGE will conduct its own investigation and hand out appropriate penalties as we see fit. Players may be asked to leave the venue entirely. Further action (suspension or ban from future AGE events) may follow investigation.'
				},
				{
					question: 'How do event bans work?',
					answer:
						'Players may be banned from future AGE events for serious infractions. Ban lengths range from a single event to lifetime depending on severity. Bans may be issued immediately at an event or following investigation. Banned players who attempt to register or attend events may be removed without refund and reported to authorities if trespassing.'
				},
				{
					question: 'Can I appeal a Disqualification or ban?',
					answer:
						'You may submit a written appeal to Arcane Games & Events within 30 days of the DQ or ban. Include your full account of events and any supporting evidence. Appeals are reviewed by TO staff not involved in the original decision. You will receive a written response within 14 days. Appeal decisions are final.'
				},
				{
					question: 'What about LSS suspensions?',
					answer:
						'Players suspended by Legend Story Studios are not permitted to participate in AGE Open events for the duration of their suspension. AGE reserves the right to independently ban players regardless of LSS status. Participation in events while suspended results in immediate removal and extended ban.'
				}
			]
		}
	];

	// Track which rulebook sections are expanded
	let openRulebookSection = null;
	let openRulebookItem = null;

	function toggleRulebookSection(sectionId) {
		openRulebookSection = openRulebookSection === sectionId ? null : sectionId;
		openRulebookItem = null; // Close any open item when changing sections
	}

	function toggleRulebookItem(itemIndex) {
		openRulebookItem = openRulebookItem === itemIndex ? null : itemIndex;
	}

	// Section icons
	const sectionIcons = {
		ticket:
			'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z',
		cards:
			'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
		bracket:
			'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z',
		clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
		warning:
			'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
		gavel:
			'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3',
		user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
		camera:
			'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
		trophy:
			'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
		ban: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636'
	};

	const faqItems = [
		{
			question: 'What is the AGE Open Series?',
			answer:
				"The AGE Open Series is a year-long competitive Flesh and Blood tournament circuit featuring monthly $1,000 Opens across multiple circuits. Players earn AGE Points based on their performance, with the top 16 players in each circuit qualifying for the Player's Championship. In 2026, the series expands to 24 Opens, a $30,000 total prize pool, and 3 AGE Championships across our circuits."
		},
		{
			question: 'How do I register for an event?',
			answer:
				'Register online through this website by selecting your desired event from the Events tab. Pre-registration is strongly recommended as events can sell out. Premium members receive a 10% discount on all registrations. A valid GEM ID is required for all events.'
		},
		{
			question: 'What format is played at AGE Opens?',
			answer:
				'AGE Opens use Classic Constructed format unless otherwise specified in the event listing. The current LSS banned and restricted list applies. Check individual event pages for format-specific details.'
		},
		{
			question: 'How do AGE Points work?',
			answer:
				"AGE Points are earned based on final placement: 1st = 30 pts, 2nd = 25 pts, 3rd-4th = 20 pts, 5th-8th = 15 pts, 9th-12th = 12 pts, 13th-16th = 8 pts, all participants = 1 pt. Points accumulate throughout the season to determine Player's Championship qualifiers."
		},
		{
			question: "How do I qualify for the Player's Championship?",
			answer:
				'The top 16 players by AGE Points in each circuit receive automatic invitations. Tiebreakers are: 1) Most Top 8 finishes, 2) Most match wins, 3) Most events attended. Check the Standings tab to view current rankings.'
		},
		{
			question: "Can I get a refund if I can't attend?",
			answer:
				'Full refunds are available up until 24 hours before the event. Refunds are processed back to the original credit card used for purchase. No refunds within 24 hours of the event. Contact us for special circumstances or emergencies.'
		}
	];

	function toggleFaq(index) {
		openFaqIndex = openFaqIndex === index ? null : index;
	}

	// Get unique heroes from decklists
	$: uniqueHeroes = [...new Set((data.decklists || []).map((d) => d.hero).filter(Boolean))].sort();

	// Filter decklists
	$: filteredDecklists = (data.decklists || [])
		.filter((d) => decklistCircuit === 'all' || d.circuit === decklistCircuit)
		.filter((d) => decklistHero === 'all' || d.hero === decklistHero)
		.filter((d) => {
			if (!decklistSearch) return true;
			const search = decklistSearch.toLowerCase();
			return (
				d.playerName.toLowerCase().includes(search) ||
				(d.deckName && d.deckName.toLowerCase().includes(search)) ||
				(d.hero && d.hero.toLowerCase().includes(search))
			);
		});

	// Filter ALL events by circuit (for circuit tracker)
	$: laEvents = (data.allEvents || []).filter((e) => e.circuit === 'Los Angeles');
	$: stlEvents = (data.allEvents || []).filter((e) => e.circuit === 'St. Louis');
	$: neEvents = (data.allEvents || []).filter((e) => e.circuit === 'New England');

	// ============ Events tab: circuit filter for editorial events list ============
	let eventsCircuit = 'all';

	// Filtered upcoming events for the Events tab (separate from `upcomingEvents`
	// which is the unfiltered list used by the Overview tab).
	$: filteredEventsTabList = (() => {
		const now = new Date();
		return (data.events || [])
			.filter((e) => {
				if (!e.eventDate) return false;
				const end = new Date(e.eventDate);
				end.setUTCHours(23, 59, 59, 999);
				return end >= now;
			})
			.filter((e) => eventsCircuit === 'all' || e.circuit === eventsCircuit)
			.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));
	})();

	// Count events per circuit
	$: laCount = laEvents.length;
	$: stlCount = stlEvents.length;
	$: neCount = neEvents.length;

	// All upcoming events sorted by date (show until end of event day, closest first)
	$: upcomingEvents = (data.events || [])
		.filter((e) => {
			if (!e.eventDate) return false;
			const eventEnd = new Date(e.eventDate);
			eventEnd.setUTCHours(23, 59, 59, 999);
			return eventEnd >= new Date();
		})
		.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));

	// Circuit slots configuration (8 guaranteed opens per circuit)
	const SLOTS_PER_CIRCUIT = 8;

	// Get circuit slots - sorted by date, fill slots 1-8
	function getCircuitSlots(events, circuit) {
		const circuitEvents = events
			.filter((e) => e.circuit === circuit)
			.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));

		const slots = [];
		for (let i = 0; i < SLOTS_PER_CIRCUIT; i++) {
			slots.push(circuitEvents[i] || null);
		}
		return slots;
	}

	$: laSlots = getCircuitSlots(data.allEvents || [], 'Los Angeles');
	$: neSlots = getCircuitSlots(data.allEvents || [], 'New England');
	$: stlSlots = getCircuitSlots(data.allEvents || [], 'St. Louis');

	// Get circuit color classes
	function getCircuitColor(circuit) {
		return circuitColors[circuit] || defaultCircuitColor;
	}

	// Get ordinal suffix for placement (1st, 2nd, 3rd, etc.)
	function getOrdinal(n) {
		if (!n) return '';
		const s = ['th', 'st', 'nd', 'rd'];
		const v = n % 100;
		return n + (s[(v - 20) % 10] || s[v] || s[0]);
	}

	// Filter standings by circuit and search query (explicitly reference sort state for reactivity)
	$: filteredStandings = (() => {
		// These references ensure reactivity when sort state changes
		const _sortCol = sortColumn;
		const _sortDir = sortDirection;

		const filtered = (data.standings || [])
			.filter((p) => {
				// For career/all-time stats, check circuitsPlayed array; for season stats, check circuit
				if (standingsCircuit === 'all') return true;
				if (p.circuitsPlayed) return p.circuitsPlayed.includes(standingsCircuit);
				return p.circuit === standingsCircuit;
			})
			.filter((p) => p.playerName.toLowerCase().includes(searchQuery.toLowerCase()))
			.sort(sortStandings);

		// Recalculate ranks within this filtered dataset
		// When a specific circuit is selected, ranks should reflect positions within that ecosystem
		return filtered.map((player, index) => ({
			...player,
			calculatedRank: index + 1
		}));
	})();

	// Paginated standings
	$: totalStandingsPages = Math.ceil(filteredStandings.length / standingsPerPage);
	$: paginatedStandings = filteredStandings.slice(
		(standingsPage - 1) * standingsPerPage,
		standingsPage * standingsPerPage
	);

	// Reset page when filters change
	$: if (searchQuery || standingsCircuit || standingsSeason) {
		standingsPage = 1;
	}

	function formatDate(dateStr) {
		if (!dateStr) return 'TBA';
		const date = new Date(dateStr);
		return new Intl.DateTimeFormat('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
			timeZone: 'UTC'
		}).format(date);
	}

	function formatDateShort(dateStr) {
		if (!dateStr) return 'TBA';
		const date = new Date(dateStr);
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			timeZone: 'UTC'
		}).format(date);
	}

	function formatPrice(price) {
		return parseFloat(price).toFixed(2);
	}
</script>

<svelte:head>
	<title>AGE Open Series</title>
	<meta
		name="description"
		content="Join the AGE Open Series - premier competitive Flesh and Blood tournaments in Los Angeles, St. Louis, and New England"
	/>
</svelte:head>

<AgeShell active="AGE Open">
	<!-- ============ EDITORIAL HERO ============ -->
	<section
		class="aeo-hero relative flex min-h-[540px] items-end overflow-hidden border-b-[3px] border-double border-ink bg-cover bg-center"
		style="background-image: url('/banner/age-open-banner.webp');"
	>
		<span
			class="aeo-vlabel absolute top-[34px] left-[18px] z-[1] text-[10px] font-extrabold tracking-[0.34em] uppercase text-white/60"
			style="writing-mode: vertical-rl; transform: rotate(180deg);"
		>
			The Circuit · 2026
		</span>
		<span
			class="pointer-events-none absolute inset-0"
			style="background: linear-gradient(60deg, rgba(10,9,6,0.92) 12%, rgba(10,9,6,0.55) 52%, rgba(10,9,6,0.12) 100%);"
			aria-hidden="true"
		></span>
		<div class="relative z-[1] w-full">
			<div class="mx-auto w-full max-w-[min(94vw,1920px)] px-14 py-[56px]">
				<div class="max-w-[820px] text-white">
					<span
						class="bg-warm inline-flex items-center px-[10px] py-[5px] text-[10px] font-extrabold tracking-[0.14em] uppercase text-white"
					>
						2026 Season · Now Open
					</span>
					<h1
						class="font-newsreader mt-4 mb-[18px] text-[clamp(48px,7vw,86px)] font-semibold leading-[0.9] tracking-[-0.02em] text-white"
					>
						AGE Open Series
					</h1>
					<p class="m-0 max-w-[600px] text-[18px] leading-[1.55] text-white/80">
						The premier independent Flesh and Blood tournament circuit — $1,000 prize pools, AGE
						Points, and your shot at the Player's Championship.
					</p>

					<div
						class="my-7 flex flex-wrap gap-0 border-y border-white/25"
					>
						<div class="border-r border-white/20 py-[16px] pr-[34px] mr-[34px]">
							<div class="font-newsreader text-[42px] font-semibold leading-[0.9] text-white">
								{(data.events?.length || 0) + (data.archiveEvents?.length || 0) || '24'}
							</div>
							<div class="mt-[7px] text-[11px] font-extrabold tracking-[0.16em] uppercase" style="color:#f4c66a;">
								Events
							</div>
						</div>
						<div class="border-r border-white/20 py-[16px] pr-[34px] mr-[34px]">
							<div class="font-newsreader text-[42px] font-semibold leading-[0.9] text-white">
								$30K+
							</div>
							<div class="mt-[7px] text-[11px] font-extrabold tracking-[0.16em] uppercase" style="color:#f4c66a;">
								Prize Pools
							</div>
						</div>
						<div class="py-[16px]">
							<div class="font-newsreader text-[42px] font-semibold leading-[0.9] text-white">
								3
							</div>
							<div class="mt-[7px] text-[11px] font-extrabold tracking-[0.16em] uppercase" style="color:#f4c66a;">
								Regions
							</div>
						</div>
					</div>

					<div class="flex flex-wrap gap-3">
						<button
							type="button"
							onclick={() => switchTab('events')}
							class="inline-flex items-center gap-2 border-[1.5px] border-white bg-white px-5 py-[13px] text-[12px] font-bold tracking-[0.05em] text-ink uppercase transition-colors hover:bg-white/90"
						>
							Find an Event
						</button>
						<button
							type="button"
							onclick={() => switchTab('standings')}
							class="inline-flex items-center gap-2 border-[1.5px] border-white bg-transparent px-5 py-[13px] text-[12px] font-bold tracking-[0.05em] text-white uppercase transition-colors hover:bg-white hover:text-ink"
						>
							View Standings
						</button>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- ============ NEXT EVENT BAR ============ -->
	{#if upcomingEvents.length > 0}
		{@const _next = upcomingEvents[0]}
		<div class="bg-ink text-paper-bg">
			<div
				class="mx-auto flex w-full max-w-[min(94vw,1920px)] flex-wrap items-center justify-between gap-5 px-14 py-[13px]"
			>
				<div class="flex flex-wrap items-center gap-4 text-[13.5px] font-bold">
					<span class="text-[10px] font-extrabold tracking-[0.16em] uppercase" style="color: #f4c66a;">
						Next Event
					</span>
					<span>AGE Open Series</span>
					<span class="text-fade">·</span>
					<span>{formatDateShort(_next.eventDate)}</span>
					<span class="text-fade">·</span>
					{#if _next.circuit}
						{@const _cc = getCircuit(_next.circuit)}
						<span class="inline-flex items-center gap-[7px]">
							<span class="block h-[9px] w-[9px]" style="background-color: {_cc?.color || '#1b4f9c'};"></span>
							{_next.circuit}
						</span>
						<span class="text-fade">·</span>
					{/if}
					<span>{_next.venueName || _next.location || ''}</span>
				</div>
				<a
					href="/age-open/{_next.id}"
					class="border-accent bg-accent inline-flex items-center gap-2 border-[1.5px] px-4 py-[7px] text-[11px] font-bold tracking-[0.05em] uppercase text-white transition-[filter] hover:brightness-110"
				>
					Sign Up →
				</a>
			</div>
		</div>
	{/if}

	<!-- ============ TAB STRIP (sticky) ============ -->
	<nav
		class="bg-paper border-ink sticky top-0 z-[5] flex items-center gap-[2px] border-b-[2px] overflow-x-auto"
	>
		<div class="mx-auto flex w-full max-w-[min(94vw,1920px)] items-center gap-[2px] px-14">
			{#each tabs as tab (tab.id)}
				<button
					type="button"
					onclick={() => switchTab(tab.id)}
					class="-mb-[2px] cursor-pointer border-none bg-transparent px-[18px] pt-[17px] pb-[15px] text-[13px] font-bold whitespace-nowrap transition-colors border-b-[3px] {activeTab ===
					tab.id
						? 'text-ink border-accent'
						: 'text-soft hover:text-ink border-transparent'}"
				>
					{tab.name}
				</button>
			{/each}
		</div>
	</nav>

	<!-- ============ TAB CONTENT ============ -->
	<div class="bg-paper-bg">
		<div class="mx-auto w-full max-w-[min(94vw,1920px)]">
			<!-- Overview Tab -->
			{#if activeTab === 'overview'}
				<!-- ============ QUICK DIRECTORY ============ -->
				<section class="border-ink border-b-[3px] border-double bg-paper-bg px-14 pt-10 pb-11">
					<div class="mb-5 flex flex-wrap items-baseline gap-[14px]">
						<span class="text-accent text-[10.5px] font-extrabold tracking-[0.2em] uppercase">
							Find what you need
						</span>
						<span class="text-fade text-[12px] font-bold">
							Jump straight to any part of the AGE Open
						</span>
					</div>
					<div class="border-line2 grid grid-cols-1 border sm:grid-cols-2 lg:grid-cols-5">
						<button
							type="button"
							onclick={() => switchTab('events')}
							class="border-line2 hover:bg-paper border-t-[3px] border-r bg-transparent text-left transition-colors flex flex-col px-[22px] py-[22px] cursor-pointer"
							style="border-top-color: var(--ed-accent, #16489E);"
						>
							<span class="font-newsreader text-accent mb-[14px] text-[30px] font-semibold leading-[0.8]">◉</span>
							<h4 class="font-newsreader mb-2 text-[21px] font-semibold tracking-[-0.01em]">Events</h4>
							<p class="text-soft m-0 mb-[14px] text-[12px] leading-[1.45]">
								Browse every Open by date, city, and format — and register.
							</p>
							<span class="text-accent mt-auto text-[10.5px] font-extrabold tracking-[0.07em] uppercase">
								Open →
							</span>
						</button>
						<button
							type="button"
							onclick={() => switchTab('standings')}
							class="border-line2 hover:bg-paper border-t-[3px] border-r bg-transparent text-left transition-colors flex flex-col px-[22px] py-[22px] cursor-pointer"
							style="border-top-color: #C8922E;"
						>
							<span class="font-newsreader mb-[14px] text-[30px] font-semibold leading-[0.8]" style="color:#C8922E;">★</span>
							<h4 class="font-newsreader mb-2 text-[21px] font-semibold tracking-[-0.01em]">Standings</h4>
							<p class="text-soft m-0 mb-[14px] text-[12px] leading-[1.45]">
								Season leaderboards, filterable by year and circuit.
							</p>
							<span class="mt-auto text-[10.5px] font-extrabold tracking-[0.07em] uppercase" style="color:#C8922E;">
								Open →
							</span>
						</button>
						<button
							type="button"
							onclick={() => switchTab('decklists')}
							class="border-line2 hover:bg-paper border-t-[3px] border-r bg-transparent text-left transition-colors flex flex-col px-[22px] py-[22px] cursor-pointer"
							style="border-top-color: var(--ed-warm, #C0461F);"
						>
							<span class="font-newsreader text-warm mb-[14px] text-[30px] font-semibold leading-[0.8]">♠</span>
							<h4 class="font-newsreader mb-2 text-[21px] font-semibold tracking-[-0.01em]">Decklists</h4>
							<p class="text-soft m-0 mb-[14px] text-[12px] leading-[1.45]">
								Winning and Top 8 lists from every event.
							</p>
							<span class="text-warm mt-auto text-[10.5px] font-extrabold tracking-[0.07em] uppercase">
								Open →
							</span>
						</button>
						<button
							type="button"
							onclick={() => switchTab('results')}
							class="border-line2 hover:bg-paper border-t-[3px] border-r bg-transparent text-left transition-colors flex flex-col px-[22px] py-[22px] cursor-pointer"
							style="border-top-color: var(--ed-prem, #1C7A4B);"
						>
							<span class="font-newsreader text-prem mb-[14px] text-[30px] font-semibold leading-[0.8]">◰</span>
							<h4 class="font-newsreader mb-2 text-[21px] font-semibold tracking-[-0.01em]">
								Tournament Archive
							</h4>
							<p class="text-soft m-0 mb-[14px] text-[12px] leading-[1.45]">
								Past results, brackets, and event coverage.
							</p>
							<span class="text-prem mt-auto text-[10.5px] font-extrabold tracking-[0.07em] uppercase">
								Open →
							</span>
						</button>
						<button
							type="button"
							onclick={() => switchTab('rules')}
							class="hover:bg-paper border-t-[3px] bg-transparent text-left transition-colors flex flex-col px-[22px] py-[22px] cursor-pointer"
							style="border-top-color: var(--ed-ink, #17150F);"
						>
							<span class="font-newsreader text-ink mb-[14px] text-[30px] font-semibold leading-[0.8]">§</span>
							<h4 class="font-newsreader mb-2 text-[21px] font-semibold tracking-[-0.01em]">
								Rules &amp; Info
							</h4>
							<p class="text-soft m-0 mb-[14px] text-[12px] leading-[1.45]">
								Formats, rules level, and what to bring.
							</p>
							<span class="text-ink mt-auto text-[10.5px] font-extrabold tracking-[0.07em] uppercase">
								Open →
							</span>
						</button>
					</div>
				</section>

				<!-- ============ JOURNEY ============ -->
				<section class="bg-paper border-ink border-b-[3px] border-double px-14 py-14">
					<div class="mb-[30px]">
						<div class="text-accent mb-3 text-[10.5px] font-extrabold tracking-[0.2em] uppercase">
							The Journey
						</div>
						<h2 class="font-newsreader mb-[9px] mt-[11px] text-[42px] font-semibold leading-none tracking-[-0.02em]">
							Your path to becoming an AGE Champion
						</h2>
						<p class="text-soft m-0 max-w-[620px] text-[15px] leading-[1.55]">
							Every legend has an origin story — yours starts here. Battle through local events,
							rack up AGE Points, and rise through the ranks. The top players earn their spot at
							the Player's Championship.
						</p>
					</div>
					<div class="grid grid-cols-1 gap-[30px] sm:grid-cols-2 lg:grid-cols-4 mb-[34px]">
						{#each [{ n: '01', t: 'Register', d: 'Sign up for any AGE Open event in your region.' }, { n: '02', t: 'Compete', d: 'Battle through Swiss rounds and a Top 8 playoff.' }, { n: '03', t: 'Earn Points', d: 'Accumulate AGE Points and climb the rankings.' }, { n: '04', t: 'Become Champion', d: 'Top the leaderboard and qualify for the Championship.' }] as step (step.n)}
							<div class="border-ink border-t-2 pt-5">
								<div class="font-newsreader text-warm mb-4 text-[50px] font-semibold leading-[0.7]">
									{step.n}
								</div>
								<h4 class="font-newsreader mb-[9px] text-[22px] font-semibold leading-none">
									{step.t}
								</h4>
								<p class="text-soft m-0 text-[13px] leading-[1.5]">{step.d}</p>
							</div>
						{/each}
					</div>
					<div class="flex flex-wrap items-center gap-[18px]">
						<span class="text-ink text-[14px] font-bold">Ready to begin?</span>
						<button
							type="button"
							onclick={() => switchTab('events')}
							class="border-warm bg-warm hover:brightness-110 inline-flex cursor-pointer items-center gap-2 border-[1.5px] px-5 py-[13px] text-[12px] font-bold tracking-[0.05em] uppercase text-white transition-[filter]"
						>
							Find Your First Event
						</button>
					</div>
				</section>

				<!-- ============ CIRCUITS ============ -->
				<section class="border-ink border-b-[3px] border-double px-14 py-14">
					<div class="mb-[30px]">
						<div class="text-accent mb-3 text-[10.5px] font-extrabold tracking-[0.2em] uppercase">
							Regional Competition
						</div>
						<h2 class="font-newsreader mb-[9px] mt-[11px] text-[42px] font-semibold leading-none tracking-[-0.02em]">
							Three circuits. Three champions.
						</h2>
						<p class="text-soft m-0 max-w-[620px] text-[15px] leading-[1.55]">
							Each circuit crowns its own AGE Champion at the end of the season. Dominate your
							region and etch your name into AGE Open history.
						</p>
					</div>

					<div class="grid grid-cols-1 gap-6 md:grid-cols-3">
						{#each [{ ab: 'LA', code: 'Los Angeles', city: 'Los Angeles', region: 'West Coast Circuit', est: 'Flagship · Est. 2023', desc: 'The original AGE Open circuit and birthplace of our series — fierce competition and an electric atmosphere on the West Coast.' }, { ab: 'NE', code: 'New England', city: 'New England', region: 'East Coast Circuit', est: 'Rising Scene · Est. 2025', desc: 'High-stakes Flesh and Blood on the East Coast. A passionate community producing rising stars and memorable matches.' }, { ab: 'STL', code: 'St. Louis', city: 'St. Louis', region: 'Midwest Circuit', est: 'Newest · Est. 2026', desc: 'Premier competitive play in the heart of America — the Midwest\'s growing community and hunger for high-level FaB.' }] as c (c.ab)}
							{@const _circ = getCircuit(c.code)}
							{@const _ccColor = _circ?.color || '#1B4F9C'}
							{@const _img = getCircuitImage(c.code) || '/banner/age-open-banner.webp'}
							<button
								type="button"
								onclick={() => {
									standingsCircuit = c.code;
									switchTab('events');
								}}
								class="border-line2 bg-paper-bg flex cursor-pointer flex-col border bg-transparent border-t-[3px] text-left transition-colors"
								style="border-top-color: {_ccColor};"
							>
								<div
									class="relative h-[264px] bg-cover bg-center"
									style="background-image: url('{_img}');"
								>
									<span
										class="pointer-events-none absolute inset-0"
										style="background: linear-gradient(0deg, rgba(10,9,6,0.78), rgba(10,9,6,0.05) 55%);"
									></span>
									<span
										class="font-archivo absolute bottom-[14px] left-5 z-[1] block pl-[13px] text-[48px] font-black leading-[0.78] tracking-[-0.03em] text-white border-l-[6px]"
										style="border-left-color: {_ccColor};"
									>
										{c.ab}
									</span>
								</div>
								<div class="flex flex-1 flex-col px-[26px] py-[22px] pb-6">
									<span
										class="mb-2 inline-flex items-center gap-[7px] text-[10px] font-extrabold tracking-[0.14em] uppercase"
										style="color: {_ccColor};"
									>
										<span class="block h-[9px] w-[9px]" style="background-color: {_ccColor};"></span>
										{c.region}
									</span>
									<h3 class="font-newsreader mb-[11px] text-[28px] font-semibold leading-none">
										{c.city}
									</h3>
									<p class="text-soft m-0 mb-4 text-[13px] leading-[1.55]">{c.desc}</p>
									<div class="border-line mt-auto flex items-center justify-between border-t pt-[14px]">
										<span class="text-fade text-[11px] font-bold tracking-[0.04em] uppercase">
											{c.est}
										</span>
										<span
											class="text-[11px] font-extrabold tracking-[0.06em] uppercase"
											style="color: {_ccColor};"
										>
											Explore Events →
										</span>
									</div>
								</div>
							</button>
						{/each}
					</div>
				</section>

				<!-- ============ UPCOMING EVENTS ============ -->
				<section class="bg-paper border-ink border-b-[3px] border-double px-14 py-[50px]">
					<div class="mb-[30px] flex items-end justify-between gap-6">
						<div>
							<div class="text-accent mb-3 text-[10.5px] font-extrabold tracking-[0.2em] uppercase">
								Schedule
							</div>
							<h2 class="font-newsreader m-0 text-[42px] font-semibold leading-none tracking-[-0.02em]">
								Upcoming Events
							</h2>
						</div>
						<button
							type="button"
							onclick={() => switchTab('events')}
							class="text-accent cursor-pointer border-none bg-transparent text-[11px] font-extrabold tracking-[0.07em] whitespace-nowrap uppercase"
						>
							View all →
						</button>
					</div>

					<!--
						Overview tab's upcoming events preview — uses the
						shared EventRow component so this list matches the
						events tab list, the homepage Across AGE digest,
						and the Hub sidebar.
					-->
					{#if upcomingEvents.length > 0}
						<div class="border-line2 border-t border-b">
							{#each upcomingEvents.slice(0, 5) as ev (ev.id)}
								{@const _date = new Date(ev.eventDate)}
								{@const _day = _date.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'UTC' })}
								{@const _mo = _date
									.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
									.toUpperCase()}
								<div class="border-line2 border-b last:border-b-0">
									<EventRow
										day={_day}
										month={_mo}
										circuit={ev.circuit}
										title={ev.title || `AGE Open · ${ev.circuit || ev.location || ''}`}
										format={ev.format}
										venue={ev.venueName || ev.location || ''}
										price={ev.price ? `$${formatPrice(ev.price)}` : null}
										href={`/age-open/${ev.id}`}
										size="lg"
									/>
								</div>
							{/each}
						</div>
					{:else}
						<div class="border-line2 bg-paper-bg py-12 text-center">
							<div class="font-newsreader text-ink mb-2 text-[22px] font-semibold">
								No upcoming events
							</div>
							<p class="text-soft m-0 text-[13px]">
								Check back soon for new tournament announcements.
							</p>
						</div>
					{/if}
				</section>

				<!-- ============ STANDINGS PREVIEW + WHY ============ -->
				<section class="border-ink grid grid-cols-1 border-b-[3px] border-double lg:grid-cols-[1.25fr_1fr]">
					<!-- standings preview -->
					<div class="border-ink lg:border-r px-12 py-[46px]">
						<div class="mb-[18px] flex items-end justify-between gap-4">
							<div>
								<div class="text-accent mb-3 text-[10.5px] font-extrabold tracking-[0.2em] uppercase">
									Leaderboard
								</div>
								<h2 class="font-newsreader m-0 text-[42px] font-semibold leading-none tracking-[-0.02em]">
									Standings
								</h2>
							</div>
							<button
								type="button"
								onclick={() => switchTab('standings')}
								class="text-accent cursor-pointer border-none bg-transparent text-[11px] font-extrabold tracking-[0.07em] whitespace-nowrap uppercase"
							>
								View all →
							</button>
						</div>

						<!-- season pills -->
						<div class="mb-[14px] flex flex-wrap gap-2">
							{#each ['all', ...(data.availableSeasons || []).filter((y) => y !== 'all').slice(0, 4)] as season (season)}
								<button
									type="button"
									onclick={() => updateStandingsFilter('season', season === 'all' ? data.currentYear : season)}
									class="inline-flex items-center gap-[7px] border px-[13px] py-[7px] text-[11px] font-bold tracking-[0.04em] transition-colors cursor-pointer {data.selectedSeason ===
									season
										? 'border-ink bg-ink text-paper-bg'
										: 'border-line2 text-soft hover:border-ink'}"
								>
									{season === 'all' ? 'All Time' : season}
								</button>
							{/each}
						</div>

						<!-- circuit pills -->
						<div class="mb-6 flex flex-wrap gap-2">
							<button
								type="button"
								onclick={() => updateStandingsFilter('circuit', '')}
								class="inline-flex items-center gap-[7px] border px-[13px] py-[7px] text-[11px] font-bold tracking-[0.04em] transition-colors cursor-pointer {!data.selectedCircuit
									? 'border-ink bg-ink text-paper-bg'
									: 'border-line2 text-soft hover:border-ink'}"
							>
								All Circuits
							</button>
							{#each availableCircuits as circuit (circuit)}
								{@const _ccColor = getCircuit(circuit)?.color || '#17150F'}
								<button
									type="button"
									onclick={() => updateStandingsFilter('circuit', circuit)}
									class="inline-flex items-center gap-[7px] border px-[13px] py-[7px] text-[11px] font-bold tracking-[0.04em] transition-colors cursor-pointer {data.selectedCircuit ===
									circuit
										? 'bg-ink text-paper-bg border-ink'
										: 'border-line2 text-soft hover:border-ink'}"
								>
									<span class="block h-[9px] w-[9px]" style="background-color: {_ccColor};"></span>
									{circuit}
								</button>
							{/each}
						</div>

						<!-- top 8 -->
						<div>
							{#each (data.standings || []).slice(0, 8) as s, i (s.id || i)}
								{@const _cc = s.circuit ? getCircuit(s.circuit) : null}
								{@const _ccColor = _cc?.color || '#928B79'}
								{@const _init = ((s.playerName || '').split(' ').map((n) => n[0]).join('').slice(0, 2) || '·').toUpperCase()}
								<a
									href={s.gemId ? `/player/${s.gemId}` : '#'}
									class="border-line grid grid-cols-[34px_38px_1fr_auto] items-center gap-[14px] border-t py-[13px] {i ===
									0
										? 'border-t-0'
										: ''}"
								>
									<span
										class="font-newsreader text-[22px] font-semibold leading-[0.8]"
										style="color:#C8922E;"
									>
										{String(i + 1).padStart(2, '0')}
									</span>
									<span
										class="flex h-[34px] w-[34px] items-center justify-center rounded-full border text-[11px] font-extrabold"
										style="color: {_ccColor}; background-color: color-mix(in srgb, {_ccColor} 13%, var(--ed-paper-bg)); border-color: {_ccColor};"
									>
										{_init}
									</span>
									<span class="flex flex-wrap items-center gap-[9px] text-[15px] font-bold">
										{s.playerName || 'Unknown'}
										{#if _cc}
											<span
												class="px-[6px] py-[2px] text-[9px] font-extrabold tracking-[0.1em] uppercase leading-none border"
												style="color: {_ccColor}; border-color: color-mix(in srgb, {_ccColor} 45%, transparent);"
											>
												{_cc.abbreviation || s.circuit}
											</span>
										{/if}
									</span>
									<span class="font-newsreader text-[18px] font-semibold">
										{s.totalPoints || 0} pts
									</span>
								</a>
							{/each}
						</div>
					</div>

					<!-- why -->
					<div class="bg-ink text-paper-bg px-12 py-[46px]">
						<div class="mb-[11px] text-[10.5px] font-extrabold tracking-[0.2em] uppercase" style="color:#f4c66a;">
							Why AGE Open?
						</div>
						<h3 class="font-newsreader mt-[11px] mb-5 text-[30px] font-semibold leading-[1.05] text-white">
							Built for players who love to compete.
						</h3>
						<ul class="m-0 list-none p-0">
							{#each ['$1,000 prize pool at every event', 'Earn AGE Points toward the Championship', 'Join a competitive, player-focused community', 'Fully independent — by players, for players'] as item, i (i)}
								<li
									class="flex items-start gap-[13px] py-[14px] text-[15px] font-semibold leading-snug border-t border-white/15 first:border-t-0"
									style="color:#efeadc;"
								>
									<span class="bg-warm mt-[7px] block h-2 w-2 flex-shrink-0 rounded-full"></span>
									<span>{item}</span>
								</li>
							{/each}
						</ul>
					</div>
				</section>

				<!-- ============ CLOSING CTA ============ -->
				<section
					class="bg-prem relative overflow-hidden border-ink border-b-[3px] border-double px-14 py-16 text-center text-white"
				>
					<div class="relative z-[1] mx-auto max-w-[760px]">
						<div class="mb-[14px] text-[10.5px] font-extrabold tracking-[0.2em] uppercase" style="color:#cfebd9;">
							Ready to start your journey?
						</div>
						<h2 class="font-newsreader my-[14px] text-[52px] leading-[1.02] font-semibold text-white">
							Your path to becoming an AGE Champion starts here.
						</h2>
						<button
							type="button"
							onclick={() => switchTab('events')}
							class="text-prem mx-auto mt-[22px] inline-flex cursor-pointer items-center gap-2 border-[1.5px] border-white bg-white px-7 py-[14px] text-[13px] font-bold tracking-[0.05em] uppercase transition-colors hover:bg-white/90"
						>
							Find an Event
						</button>
					</div>
				</section>

				<!-- Events Tab -->
			{:else if activeTab === 'events'}
				<!-- ============ EVENTS LIST + CIRCUIT FILTER ============ -->
				<section class="border-ink border-b-[3px] border-double px-14 py-[50px]">
					<div class="mb-7 flex flex-wrap items-end justify-between gap-6">
						<div>
							<div class="text-accent mb-3 text-[10.5px] font-extrabold tracking-[0.2em] uppercase">
								All Events
							</div>
							<h2 class="font-newsreader m-0 text-[42px] font-semibold leading-none tracking-[-0.02em]">
								Upcoming Events
							</h2>
							<p class="text-soft mt-[9px] max-w-[620px] text-[15px] leading-[1.55]">
								Browse every AGE Open by date, city, and format — and register for one.
							</p>
						</div>
					</div>

					<!-- circuit filter pills -->
					<div class="mb-6 flex flex-wrap gap-2">
						<button
							type="button"
							onclick={() => (eventsCircuit = 'all')}
							class="inline-flex cursor-pointer items-center gap-[7px] border px-[13px] py-[7px] text-[11px] font-bold tracking-[0.04em] transition-colors {eventsCircuit ===
							'all'
								? 'border-ink bg-ink text-paper-bg'
								: 'border-line2 text-soft hover:border-ink'}"
						>
							All Circuits
						</button>
						{#each ['Los Angeles', 'New England', 'St. Louis'] as circuit (circuit)}
							{@const _ccColor = getCircuit(circuit)?.color || '#17150F'}
							<button
								type="button"
								onclick={() => (eventsCircuit = circuit)}
								class="inline-flex cursor-pointer items-center gap-[7px] border px-[13px] py-[7px] text-[11px] font-bold tracking-[0.04em] transition-colors {eventsCircuit ===
								circuit
									? 'border-ink bg-ink text-paper-bg'
									: 'border-line2 text-soft hover:border-ink'}"
							>
								<span class="block h-[9px] w-[9px]" style="background-color: {_ccColor};"></span>
								{circuit}
							</button>
						{/each}
					</div>

					<!--
						Events list — uses the shared EventRow component
						(solid circuit-colored date tile) so this list,
						the homepage Across AGE digest, and the Hub
						sidebar all render the same row treatment. The
						`lg` variant adds the price column + Sign Up CTA
						on the right.
					-->
					{#if filteredEventsTabList.length > 0}
						<div class="border-line2 border-t border-b">
							{#each filteredEventsTabList as ev (ev.id)}
								{@const _date = new Date(ev.eventDate)}
								{@const _day = _date.toLocaleDateString('en-US', { day: 'numeric', timeZone: 'UTC' })}
								{@const _mo = _date
									.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })
									.toUpperCase()}
								<div class="border-line2 border-b last:border-b-0">
									<EventRow
										day={_day}
										month={_mo}
										circuit={ev.circuit}
										title={ev.title || `AGE Open · ${ev.circuit || ev.location || ''}`}
										format={ev.format}
										venue={ev.venueName || ev.location || ''}
										price={ev.price ? `$${formatPrice(ev.price)}` : null}
										href={`/age-open/${ev.id}`}
										size="lg"
									/>
								</div>
							{/each}
						</div>
					{:else}
						<div class="border-line2 bg-paper py-12 text-center">
							<div class="font-newsreader text-ink mb-2 text-[22px] font-semibold">
								{eventsCircuit === 'all'
									? 'No upcoming events'
									: `No upcoming ${eventsCircuit} events`}
							</div>
							<p class="text-soft m-0 text-[13px]">
								Check back soon for new tournament announcements.
							</p>
						</div>
					{/if}
				</section>

				<!--
					CIRCUIT SEASON TRACKER — each circuit now shows a
					three-segment progress bar (done / upcoming / open
					slots), a numeric stat strip ("5 DONE · 2 UPCOMING ·
					1 OPEN"), and slot tiles whose fill, border, top bar,
					and label all switch with state so the season-progress
					reads at a glance instead of through a tiny corner
					dot. Legend at the top mirrors the slot fills exactly
					so the chrome teaches the visual language.
				-->
				<section class="bg-paper border-ink border-b-[3px] border-double px-14 py-[50px]">
					<div class="mb-7 flex flex-wrap items-end justify-between gap-6">
						<div>
							<div class="text-accent mb-3 text-[10.5px] font-extrabold tracking-[0.2em] uppercase">
								Season Tracker
							</div>
							<h2 class="font-newsreader m-0 text-[42px] font-semibold leading-none tracking-[-0.02em]">
								{data.currentYear || '2026'} Circuit Tracker
							</h2>
							<p class="text-soft mt-[9px] max-w-[620px] text-[15px] leading-[1.55]">
								Eight guaranteed Opens per circuit, filled by date as the season unfolds.
							</p>
						</div>

						<!-- legend — mirrors the slot fills so users can
							 decode the per-circuit grid from this row. -->
						<div class="flex flex-wrap items-center gap-4 text-[11px] font-semibold">
							<span class="text-soft inline-flex items-center gap-2">
								<span
									class="block h-[14px] w-[14px] border"
									style="background-color: color-mix(in srgb, var(--ed-prem) 18%, var(--ed-paper)); border-color: color-mix(in srgb, var(--ed-prem) 55%, transparent);"
								></span>
								Done
							</span>
							<span class="text-soft inline-flex items-center gap-2">
								<span
									class="block h-[14px] w-[14px] border"
									style="background-color: color-mix(in srgb, var(--ed-warm) 18%, var(--ed-paper)); border-color: color-mix(in srgb, var(--ed-warm) 55%, transparent);"
								></span>
								Upcoming
							</span>
							<span class="text-soft inline-flex items-center gap-2">
								<span
									class="border-line2 bg-paper-bg block h-[14px] w-[14px] border border-dashed"
								></span>
								Open slot
							</span>
						</div>
					</div>

					<div class="space-y-9">
						{#each [{ name: 'Los Angeles', code: 'LA', slots: laSlots, count: laCount }, { name: 'New England', code: 'NE', slots: neSlots, count: neCount }, { name: 'St. Louis', code: 'STL', slots: stlSlots, count: stlCount }] as circ (circ.code)}
							{@const _ccColor = getCircuit(circ.name)?.color || '#17150F'}
							{@const _doneCount = circ.slots.filter((s) => s && (s.status === 'completed' || s.status === 'in_progress')).length}
							{@const _upcomingCount = circ.slots.filter((s) => s && !(s.status === 'completed' || s.status === 'in_progress')).length}
							{@const _openCount = circ.slots.filter((s) => !s).length}
							<div class="border-line2 bg-paper-bg border p-5">
								<!--
									Circuit header row — circuit chip, name,
									numeric stat strip on the right, then a
									three-segment progress bar underneath
									sized by done / upcoming / open ratios.
								-->
								<div class="mb-4 flex flex-wrap items-center gap-[14px]">
									<span
										class="font-archivo flex h-[40px] w-[40px] items-center justify-center text-[13px] font-black tracking-[0.04em] uppercase text-white"
										style="background-color: {_ccColor};"
									>
										{circ.code}
									</span>
									<div class="flex-1 min-w-0">
										<div class="font-newsreader text-[20px] font-semibold leading-none tracking-[-0.01em]">
											{circ.name}
										</div>
										<div class="text-fade font-mono-system mt-[5px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase">
											{circ.count} of 8 Opens scheduled
										</div>
									</div>
									<!-- Stat strip — three-number breakdown -->
									<div class="font-mono-system flex items-center gap-4 text-[11px] font-extrabold tracking-[0.1em] uppercase">
										<span class="inline-flex items-center gap-[6px] text-prem">
											<span class="font-archivo text-[18px] tabular-nums">{_doneCount}</span>
											Done
										</span>
										<span class="text-line2" aria-hidden="true">·</span>
										<span class="inline-flex items-center gap-[6px] text-warm">
											<span class="font-archivo text-[18px] tabular-nums">{_upcomingCount}</span>
											Upcoming
										</span>
										<span class="text-line2" aria-hidden="true">·</span>
										<span class="text-fade inline-flex items-center gap-[6px]">
											<span class="font-archivo text-[18px] tabular-nums">{_openCount}</span>
											Open
										</span>
									</div>
								</div>

								<!-- Three-segment progress bar — done | upcoming | open. -->
								<div
									class="border-line2 flex h-[10px] w-full overflow-hidden border bg-paper"
								>
									{#if _doneCount > 0}
										<div
											class="bg-prem h-full transition-[width] duration-500"
											style="width: {(_doneCount / 8) * 100}%;"
											title="{_doneCount} done"
										></div>
									{/if}
									{#if _upcomingCount > 0}
										<div
											class="bg-warm h-full transition-[width] duration-500"
											style="width: {(_upcomingCount / 8) * 100}%;"
											title="{_upcomingCount} upcoming"
										></div>
									{/if}
									{#if _openCount > 0}
										<div
											class="h-full transition-[width] duration-500"
											style="width: {(_openCount / 8) * 100}%; background-color: var(--ed-paper-bg);"
											title="{_openCount} open"
										></div>
									{/if}
								</div>

								<!-- 8 slot grid -->
								<div class="mt-5 grid grid-cols-4 gap-2 sm:grid-cols-8">
									{#each circ.slots as slot, i (i)}
										{#if slot}
											{@const _isDone =
												slot.status === 'completed' || slot.status === 'in_progress'}
											{@const _stateColor = _isDone ? 'var(--ed-prem)' : 'var(--ed-warm)'}
											{@const _stateLabel = _isDone ? 'Done' : 'Upcoming'}
											<a
												href={_isDone
													? `/age-open/${slot.id}/results`
													: `/age-open/${slot.id}`}
												class="group relative flex flex-col items-center overflow-hidden border bg-paper px-2 pt-[14px] pb-[8px] transition-[transform,box-shadow] hover:-translate-y-[2px]"
												style="background-color: color-mix(in srgb, {_stateColor} 12%, var(--ed-paper)); border-color: color-mix(in srgb, {_stateColor} 50%, transparent);"
											>
												<!-- top status bar -->
												<span
													class="absolute inset-x-0 top-0 block h-[4px]"
													style="background-color: {_stateColor};"
													aria-hidden="true"
												></span>
												<!-- slot number -->
												<div
													class="font-newsreader text-[24px] font-semibold leading-none tabular-nums"
													style="color: {_stateColor};"
												>
													{i + 1}
												</div>
												<!-- date -->
												<div class="text-ink font-mono-system mt-[6px] truncate text-center text-[10px] font-extrabold tracking-[0.05em] tabular-nums uppercase">
													{new Date(slot.eventDate).toLocaleDateString('en-US', {
														month: 'short',
														day: 'numeric',
														timeZone: 'UTC'
													})}
												</div>
												<!-- state label -->
												<div
													class="font-mono-system mt-[6px] inline-flex items-center gap-[5px] text-[9px] font-extrabold tracking-[0.1em] uppercase"
													style="color: {_stateColor};"
												>
													{#if _isDone}
														<span aria-hidden="true">✓</span>
													{:else}
														<span class="block h-[6px] w-[6px] rounded-full" style="background-color: {_stateColor};" aria-hidden="true"></span>
													{/if}
													{_stateLabel}
												</div>
											</a>
										{:else}
											<!-- Open slot — dashed paper tile, no link -->
											<div
												class="border-line2 bg-paper-bg flex flex-col items-center justify-center border border-dashed px-2 pt-[14px] pb-[8px]"
												aria-label="Open slot {i + 1}"
											>
												<div class="text-fade font-newsreader text-[24px] font-semibold leading-none tabular-nums">
													{i + 1}
												</div>
												<div class="text-fade font-mono-system mt-[6px] text-[10px] font-extrabold tracking-[0.1em] uppercase">
													—
												</div>
												<div class="text-fade font-mono-system mt-[6px] text-[9px] font-extrabold tracking-[0.1em] uppercase">
													Open
												</div>
											</div>
										{/if}
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</section>

				<!-- ============ CALENDAR ============ -->
				<section class="border-ink border-b-[3px] border-double px-14 py-[50px]">
					<div class="mb-7 flex flex-wrap items-end justify-between gap-6">
						<div>
							<div class="text-accent mb-3 text-[10.5px] font-extrabold tracking-[0.2em] uppercase">
								Calendar
							</div>
							<h2 class="font-newsreader m-0 text-[42px] font-semibold leading-none tracking-[-0.02em]">
								Month at a glance
							</h2>
							<p class="text-soft mt-[9px] max-w-[620px] text-[15px] leading-[1.55]">
								AGE Opens and LSS tournaments on a single grid. Click any event to open it.
							</p>
						</div>
					</div>

					<!-- month nav -->
					<div class="border-ink mb-0 flex items-center justify-between border-2 bg-paper-bg px-5 py-3">
						<button
							type="button"
							onclick={previousMonth}
							class="border-line2 text-soft hover:border-ink hover:text-ink flex h-9 w-9 cursor-pointer items-center justify-center border bg-transparent transition-colors"
							aria-label="Previous month"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
							</svg>
						</button>
						<div class="flex items-center gap-4">
							<h3 class="font-newsreader m-0 text-[24px] font-semibold leading-none tracking-[-0.01em]">
								{monthName}
							</h3>
							<button
								type="button"
								onclick={goToToday}
								class="text-accent hover:bg-accent hover:text-paper-bg cursor-pointer border border-accent/40 bg-transparent px-3 py-[5px] text-[10px] font-extrabold tracking-[0.08em] uppercase transition-colors"
							>
								Today
							</button>
						</div>
						<button
							type="button"
							onclick={nextMonth}
							class="border-line2 text-soft hover:border-ink hover:text-ink flex h-9 w-9 cursor-pointer items-center justify-center border bg-transparent transition-colors"
							aria-label="Next month"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
							</svg>
						</button>
					</div>

					<!-- day-of-week header -->
					<div class="border-ink grid grid-cols-7 border-x-2 border-b-2 bg-paper">
						{#each ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as day (day)}
							<div class="text-fade py-2 text-center text-[10px] font-extrabold tracking-[0.14em] uppercase">
								{day}
							</div>
						{/each}
					</div>

					<!-- grid -->
					<div class="border-ink grid grid-cols-7 border-x-2 border-b-2">
						{#each calendarWeeks as week, w (w)}
							{#each week as day, di (di)}
								{@const _dayEvents = getEventsForDate(day.date)}
								{@const _daySeasons = getSeasonsForDate(day.date)}
								{@const _isToday = isToday(day.date)}
								<div
									class="border-line2 min-h-[110px] border-t border-r p-2 transition-colors {di ===
									6
										? 'border-r-0'
										: ''} {day.isCurrentMonth ? 'bg-paper-bg' : 'bg-paper opacity-60'} {_isToday
										? 'ring-2 ring-accent ring-inset'
										: ''}"
								>
									<div class="mb-1 flex items-start justify-between">
										<span
											class="font-newsreader text-[16px] font-semibold leading-none {_isToday
												? 'text-accent'
												: day.isCurrentMonth
													? 'text-ink'
													: 'text-fade'}"
										>
											{day.day}
										</span>
									</div>
									{#each _dayEvents.slice(0, 3) as event (event.id)}
										{@const _ccColor = getCircuit(event.circuit)?.color || '#17150F'}
										<a
											href="/age-open/{event.id}"
											title="{event.title} ({event.circuit || 'TBA'})"
											class="mb-1 block truncate border-l-[3px] bg-paper px-1.5 py-[2px] text-[10px] font-semibold transition-colors hover:bg-paper-bg"
											style="border-left-color: {_ccColor};"
										>
											<span class="truncate" style="color: {_ccColor};">{event.title}</span>
										</a>
									{/each}
									{#if _dayEvents.length > 3}
										<div class="text-fade mt-1 text-[9px] font-bold">
											+{_dayEvents.length - 3} more
										</div>
									{/if}
									{#each _daySeasons.slice(0, 2) as season, si (si)}
										<div
											class="text-fade mt-[2px] truncate border-l-[3px] border-warm/60 px-1.5 py-[1px] text-[9.5px] font-semibold"
										>
											{season.name}
										</div>
									{/each}
								</div>
							{/each}
						{/each}
					</div>
				</section>

				<!-- ============ LSS TOURNAMENT SEASONS ============ -->
				{#if upcomingLssEvents && upcomingLssEvents.length > 0}
					<section class="bg-paper border-ink border-b-[3px] border-double px-14 py-[50px]">
						<div class="mb-7">
							<div class="text-accent mb-3 text-[10.5px] font-extrabold tracking-[0.2em] uppercase">
								Also on the calendar
							</div>
							<h2 class="font-newsreader m-0 text-[42px] font-semibold leading-none tracking-[-0.02em]">
								LSS Tournament Seasons
							</h2>
							<p class="text-soft mt-[9px] max-w-[620px] text-[15px] leading-[1.55]">
								Official Legend Story Studios events running alongside the AGE Open circuit.
							</p>
						</div>

						<div>
							{#each upcomingLssEvents as season, i (season.id || i)}
								{@const _startDate = new Date(season.startDate)}
								{@const _endDate = new Date(season.endDate)}
								{@const _isActive = _startDate <= new Date() && _endDate >= new Date()}
								<div
									class="border-line2 hover:bg-paper-bg grid grid-cols-1 items-center gap-4 border-b py-[18px] transition-colors md:grid-cols-[1fr_auto_auto] {i ===
									0
										? 'border-t'
										: ''}"
								>
									<div class="flex flex-wrap items-center gap-3">
										<span
											class="font-newsreader text-[18px] font-semibold tracking-[-0.01em]"
										>
											{season.name}
										</span>
										{#if season.eventType}
											<span class="border-warm/40 text-warm bg-warm/10 border px-[7px] py-[2px] text-[9.5px] font-extrabold tracking-[0.07em] uppercase">
												{season.eventType}
											</span>
										{/if}
										{#if season.format}
											<span class="border-line2 text-soft border px-[7px] py-[2px] text-[9.5px] font-extrabold tracking-[0.07em] uppercase">
												{season.format}
											</span>
										{/if}
										{#if _isActive}
											<span class="text-prem inline-flex items-center gap-[6px] text-[10.5px] font-extrabold tracking-[0.06em] uppercase">
												<span class="bg-prem block h-[7px] w-[7px] rounded-full"></span>
												Live
											</span>
										{/if}
									</div>
									<div class="text-fade text-[12.5px] font-semibold tabular-nums">
										{_startDate.toLocaleDateString('en-US', {
											month: 'short',
											day: 'numeric',
											timeZone: 'UTC'
										})} – {_endDate.toLocaleDateString('en-US', {
											month: 'short',
											day: 'numeric',
											timeZone: 'UTC'
										})}
									</div>
									{#if season.link}
										<a
											href={season.link}
											target="_blank"
											rel="noopener noreferrer"
											class="text-accent text-[11px] font-extrabold tracking-[0.07em] uppercase"
										>
											Open →
										</a>
									{:else}
										<span></span>
									{/if}
								</div>
							{/each}
						</div>
					</section>
				{/if}

				<!-- ============ AT EVERY OPEN ============ -->
				<section class="border-ink border-b-[3px] border-double px-14 py-[50px]">
					<div class="mb-7">
						<div class="text-accent mb-3 text-[10.5px] font-extrabold tracking-[0.2em] uppercase">
							At every Open
						</div>
						<h2 class="font-newsreader m-0 text-[42px] font-semibold leading-none tracking-[-0.02em]">
							What you'll find on the floor.
						</h2>
					</div>

					<div class="grid grid-cols-1 gap-0 border-line2 border md:grid-cols-3">
						<div class="border-line2 border-t-[3px] flex flex-col gap-3 border-b p-7 md:border-r md:border-b-0" style="border-top-color: var(--ed-accent, #16489E);">
							<span class="font-newsreader text-accent text-[42px] font-semibold leading-none">$1K</span>
							<h3 class="font-newsreader text-[20px] font-semibold tracking-[-0.01em]">
								$1,000 Opens
							</h3>
							<p class="text-soft m-0 text-[13.5px] leading-[1.55]">
								Guaranteed prize pool for Top 8 finishers at every AGE Open across all three
								circuits.
							</p>
						</div>
						<div class="border-line2 border-t-[3px] flex flex-col gap-3 border-b p-7 md:border-r md:border-b-0" style="border-top-color: #C8922E;">
							<span class="font-newsreader text-[42px] font-semibold leading-none" style="color:#C8922E;">★</span>
							<h3 class="font-newsreader text-[20px] font-semibold tracking-[-0.01em]">
								AGE Points
							</h3>
							<p class="text-soft m-0 text-[13.5px] leading-[1.55]">
								Earn points based on final placement that count toward the Player's Championship.
							</p>
						</div>
						<div class="flex flex-col gap-3 border-t-[3px] p-7" style="border-top-color: var(--ed-prem, #1C7A4B);">
							<span class="font-newsreader text-prem text-[42px] font-semibold leading-none">-10%</span>
							<h3 class="font-newsreader text-[20px] font-semibold tracking-[-0.01em]">
								Premium Discount
							</h3>
							<p class="text-soft m-0 text-[13.5px] leading-[1.55]">
								AGE Premium members save 10% on registration for every event, all season long.
							</p>
						</div>
					</div>
				</section>

			{/if}

			<!-- Decklists Tab -->
			{#if activeTab === 'decklists'}
				<!-- ============ HEADER + LEDE ============ -->
				<section class="border-ink border-b-[3px] border-double px-14 pt-[44px] pb-[36px]">
					<div class="mb-7">
						<div class="text-accent mb-3 text-[10.5px] font-extrabold tracking-[0.2em] uppercase">
							Lists
						</div>
						<h2 class="font-newsreader m-0 text-[42px] font-semibold leading-none tracking-[-0.02em]">
							Decklists
						</h2>
						<p class="text-soft mt-[9px] max-w-[620px] text-[15px] leading-[1.55]">
							Every list from every event — sortable by circuit, hero, and finish.
						</p>
					</div>

					<!-- filter bar -->
					<div class="flex flex-wrap items-center gap-3">
						<!-- search -->
						<div class="border-line2 focus-within:border-ink relative flex items-center border bg-paper-bg">
							<span class="text-fade pl-3 text-[14px]" aria-hidden="true">⌕</span>
							<input
								type="search"
								bind:value={decklistSearch}
								placeholder="Search player, deck, or hero"
								class="text-ink placeholder:text-fade h-[36px] w-[260px] appearance-none border-0 bg-transparent px-2 text-[12px] font-bold shadow-none outline-none focus:border-0 focus:shadow-none focus:ring-0 focus:outline-none [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
							/>
						</div>

						<span class="border-line2 hidden h-6 w-px bg-line2 lg:block" aria-hidden="true"></span>

						<!-- circuit pills -->
						<div class="flex flex-wrap gap-[5px]">
							<button
								type="button"
								onclick={() => (decklistCircuit = 'all')}
								class="cursor-pointer border px-[13px] py-[9px] text-[11px] font-bold tracking-[0.04em] uppercase transition-colors {decklistCircuit ===
								'all'
									? 'border-ink bg-ink text-paper-bg'
									: 'border-line2 text-soft hover:text-ink'}"
							>
								All Circuits
							</button>
							{#each ['Los Angeles', 'New England', 'St. Louis'] as circuit (circuit)}
								{@const _ccColor = getCircuit(circuit)?.color || '#17150F'}
								<button
									type="button"
									onclick={() => (decklistCircuit = circuit)}
									class="inline-flex cursor-pointer items-center gap-[7px] border px-[13px] py-[9px] text-[11px] font-bold tracking-[0.04em] uppercase transition-colors {decklistCircuit ===
									circuit
										? 'border-ink bg-ink text-paper-bg'
										: 'border-line2 text-soft hover:text-ink'}"
								>
									<span class="block h-[9px] w-[9px]" style="background-color: {_ccColor};"></span>
									{circuit}
								</button>
							{/each}
						</div>

						<span class="border-line2 hidden h-6 w-px bg-line2 lg:block" aria-hidden="true"></span>

						<!-- hero dropdown -->
						<select
							bind:value={decklistHero}
							class="border-line2 text-soft hover:text-ink focus:border-ink h-[36px] cursor-pointer border bg-paper-bg px-3 text-[11px] font-bold tracking-[0.04em] uppercase outline-none"
						>
							<option value="all">All Heroes</option>
							{#each uniqueHeroes as hero (hero)}
								<option value={hero}>{hero}</option>
							{/each}
						</select>
					</div>
				</section>

				<!-- ============ RESULTS ============ -->
				<section class="border-ink border-b-[3px] border-double px-14 pt-[24px] pb-[44px]">
					{#if (data.decklists || []).length === 0}
						<!-- no data at all -->
						<div class="border-line2 bg-paper py-14 text-center">
							<div class="font-newsreader text-ink mb-2 text-[24px] font-semibold">
								No decklists yet.
							</div>
							<p class="text-soft mx-auto m-0 max-w-[420px] text-[14px] leading-[1.55]">
								Lists from completed events will appear here as soon as they're published.
							</p>
						</div>
					{:else if filteredDecklists.length === 0}
						<!-- nothing matches the filter -->
						<div class="border-line2 bg-paper py-14 text-center">
							<div class="font-newsreader text-ink mb-2 text-[24px] font-semibold">
								No matches.
							</div>
							<p class="text-soft mx-auto mb-6 max-w-[420px] text-[14px] leading-[1.55]">
								Try a different circuit, hero, or search term.
							</p>
							<button
								type="button"
								onclick={() => {
									decklistSearch = '';
									decklistCircuit = 'all';
									decklistHero = 'all';
								}}
								class="border-ink text-ink hover:bg-ink hover:text-paper-bg cursor-pointer border-[1.5px] bg-transparent px-5 py-[10px] text-[11px] font-extrabold tracking-[0.07em] uppercase transition-colors"
							>
								Clear Filters
							</button>
						</div>
					{:else}
						<!-- result line -->
						<div
							class="text-fade mb-4 text-[11.5px] font-bold tracking-[0.05em] uppercase"
						>
							Showing
							<b class="text-ink">{filteredDecklists.length}</b>
							{filteredDecklists.length === 1 ? 'decklist' : 'decklists'}
							{decklistCircuit !== 'all' ? ` · ${decklistCircuit}` : ''}
							{decklistHero !== 'all' ? ` · ${decklistHero}` : ''}
						</div>

						<!-- ===== MOBILE: card stack ===== -->
						<div class="space-y-3 md:hidden">
							{#each filteredDecklists as decklist (decklist.id)}
								{@const _ccColor = decklist.circuit ? getCircuit(decklist.circuit)?.color : null}
								<a
									href="/age-open/{decklist.eventId}/decklist/{decklist.id}"
									class="border-line2 hover:border-ink bg-paper block border border-t-[3px] px-4 py-4 transition-colors"
									style={_ccColor ? `border-top-color: ${_ccColor};` : 'border-top-color: var(--ed-ink);'}
								>
									<div class="mb-2 flex items-baseline justify-between gap-3">
										<div class="min-w-0 flex-1">
											<div class="text-ink truncate text-[15px] font-extrabold">
												{decklist.playerName}
											</div>
											{#if decklist.hero}
												<div class="text-warm mt-[2px] truncate text-[13px] font-semibold">
													{decklist.hero}
												</div>
											{/if}
										</div>
										{#if decklist.placement}
											<div class="font-newsreader text-[22px] font-semibold leading-none tracking-[-0.01em]" style="color: {decklist.placement <= 8 ? 'var(--ed-warm)' : 'var(--ed-fade)'};">
												{getOrdinal(decklist.placement)}
											</div>
										{/if}
									</div>
									<div class="border-line mt-3 flex items-center justify-between gap-3 border-t pt-3 text-[10px] font-bold tracking-[0.08em] uppercase">
										<div class="text-fade flex flex-wrap items-center gap-2">
											{#if decklist.circuit}
												<span class="inline-flex items-center gap-[6px]" style="color: {_ccColor};">
													<span class="block h-[8px] w-[8px]" style="background-color: {_ccColor};"></span>
													{decklist.circuit}
												</span>
											{/if}
											{#if decklist.month}
												<span class="text-fade">· {decklist.month}</span>
											{/if}
											{#if decklist.format}
												<span class="text-fade">· {decklist.format}</span>
											{/if}
										</div>
										<span class="text-accent">View →</span>
									</div>
								</a>
							{/each}
						</div>

						<!-- ===== DESKTOP: editorial table ===== -->
						<div class="border-ink hidden overflow-x-auto border md:block">
							<table class="w-full">
								<thead>
									<tr class="border-ink border-b-2 bg-paper">
										<th
											class="text-fade px-4 py-[14px] text-left text-[10.5px] font-extrabold tracking-[0.14em] uppercase"
										>
											Place
										</th>
										<th
											class="text-fade px-4 py-[14px] text-left text-[10.5px] font-extrabold tracking-[0.14em] uppercase"
										>
											Player
										</th>
										<th
											class="text-fade px-4 py-[14px] text-left text-[10.5px] font-extrabold tracking-[0.14em] uppercase"
										>
											Hero
										</th>
										<th
											class="text-fade px-4 py-[14px] text-left text-[10.5px] font-extrabold tracking-[0.14em] uppercase"
										>
											Circuit
										</th>
										<th
											class="text-fade px-4 py-[14px] text-left text-[10.5px] font-extrabold tracking-[0.14em] uppercase"
										>
											Month
										</th>
										<th
											class="text-fade px-4 py-[14px] text-left text-[10.5px] font-extrabold tracking-[0.14em] uppercase"
										>
											Format
										</th>
										<th
											class="px-4 py-[14px] text-right text-[10.5px] font-extrabold tracking-[0.14em] uppercase"
										></th>
									</tr>
								</thead>
								<tbody>
									{#each filteredDecklists as decklist, i (decklist.id)}
										{@const _ccColor = decklist.circuit ? getCircuit(decklist.circuit)?.color : null}
										{@const _placeColor = !decklist.placement
											? 'var(--ed-fade)'
											: decklist.placement === 1
												? '#C8922E'
												: decklist.placement <= 3
													? 'var(--ed-warm)'
													: decklist.placement <= 8
														? 'var(--ed-accent)'
														: 'var(--ed-soft)'}
										<tr
											class="border-line {i === filteredDecklists.length - 1
												? ''
												: 'border-b'} hover:bg-paper group cursor-pointer transition-colors"
											onclick={(e) => {
												if (!e.target.closest('a'))
													window.location.href = `/age-open/${decklist.eventId}/decklist/${decklist.id}`;
											}}
										>
											<td class="px-4 py-[14px]">
												{#if decklist.placement}
													<span
														class="font-newsreader text-[22px] font-semibold leading-none tracking-[-0.01em] tabular-nums"
														style="color: {_placeColor};"
													>
														{getOrdinal(decklist.placement)}
													</span>
												{:else}
													<span class="text-fade">—</span>
												{/if}
											</td>
											<td class="px-4 py-[14px]">
												<span class="text-ink text-[15px] font-extrabold group-hover:text-warm transition-colors">
													{decklist.playerName}
												</span>
											</td>
											<td class="px-4 py-[14px]">
												{#if decklist.hero}
													<span class="text-warm text-[14px] font-semibold">
														{decklist.hero}
													</span>
												{:else}
													<span class="text-fade">—</span>
												{/if}
											</td>
											<td class="px-4 py-[14px]">
												{#if decklist.circuit && _ccColor}
													<span
														class="inline-flex items-center gap-[7px] text-[11px] font-extrabold tracking-[0.06em] uppercase"
														style="color: {_ccColor};"
													>
														<span class="block h-[8px] w-[8px]" style="background-color: {_ccColor};"></span>
														{decklist.circuit}
													</span>
												{:else}
													<span class="text-fade">—</span>
												{/if}
											</td>
											<td class="px-4 py-[14px]">
												<span class="text-soft text-[13px] font-semibold">
													{decklist.month || '—'}
												</span>
											</td>
											<td class="px-4 py-[14px]">
												<span class="text-soft text-[13px] font-semibold">
													{decklist.format || '—'}
												</span>
											</td>
											<td class="px-4 py-[14px] text-right">
												<a
													href="/age-open/{decklist.eventId}/decklist/{decklist.id}"
													class="text-accent text-[11px] font-extrabold tracking-[0.07em] uppercase opacity-0 transition-opacity group-hover:opacity-100"
												>
													View →
												</a>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}
				</section>
			{/if}

			<!-- Standings Tab -->
			{#if activeTab === 'standings'}
				<!-- ============ HEADER + FILTER BAR ============ -->
				<section class="border-ink border-b-[3px] border-double px-14 pt-[44px] pb-[36px]">
					<div class="mb-7 flex flex-wrap items-end justify-between gap-6">
						<div>
							<div class="text-accent mb-3 text-[10.5px] font-extrabold tracking-[0.2em] uppercase">
								Leaderboard
							</div>
							<h2 class="font-newsreader m-0 text-[42px] font-semibold leading-none tracking-[-0.02em]">
								Circuit Standings
							</h2>
							<p class="text-soft mt-[9px] max-w-[620px] text-[15px] leading-[1.55]">
								Top 16 by AGE Points in each circuit qualify for the Player's Championship.
							</p>
						</div>
						<button
							type="button"
							onclick={refreshStandings}
							disabled={isRefreshing}
							class="border-line2 text-soft hover:border-ink hover:text-ink inline-flex cursor-pointer items-center gap-2 border bg-transparent px-4 py-[10px] text-[11px] font-extrabold tracking-[0.06em] uppercase transition-colors disabled:opacity-40"
							title="Refresh standings"
						>
							<svg
								class="h-3.5 w-3.5 {isRefreshing ? 'animate-spin' : ''}"
								fill="none"
								stroke="currentColor"
								stroke-width="1.8"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
								/>
							</svg>
							{isRefreshing ? 'Refreshing…' : 'Refresh'}
						</button>
					</div>

					<!-- filter bar -->
					<div class="flex flex-wrap items-center gap-3">
						<!-- search -->
						<div class="border-line2 focus-within:border-ink relative flex items-center border bg-paper-bg">
							<span class="text-fade pl-3 text-[14px]" aria-hidden="true">⌕</span>
							<input
								type="search"
								bind:value={searchQuery}
								placeholder="Search players"
								class="text-ink placeholder:text-fade h-[36px] w-[240px] appearance-none border-0 bg-transparent px-2 text-[12px] font-bold shadow-none outline-none focus:border-0 focus:shadow-none focus:ring-0 focus:outline-none [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
							/>
						</div>

						<span class="border-line2 hidden h-6 w-px bg-line2 lg:block" aria-hidden="true"></span>

						<!-- season pills -->
						<div class="flex flex-wrap gap-[5px]">
							{#each data.availableSeasons || ['all'] as season (season)}
								<button
									type="button"
									onclick={() => changeSeason(season)}
									class="cursor-pointer border px-[13px] py-[9px] text-[11px] font-bold tracking-[0.04em] uppercase transition-colors {standingsSeason ===
									season
										? 'border-ink bg-ink text-paper-bg'
										: 'border-line2 text-soft hover:text-ink'}"
								>
									{season === 'all' ? 'All Time' : season}
								</button>
							{/each}
						</div>

						<span class="border-line2 hidden h-6 w-px bg-line2 lg:block" aria-hidden="true"></span>

						<!-- circuit pills -->
						<div class="flex flex-wrap gap-[5px]">
							<button
								type="button"
								onclick={() => (standingsCircuit = 'all')}
								class="cursor-pointer border px-[13px] py-[9px] text-[11px] font-bold tracking-[0.04em] uppercase transition-colors {standingsCircuit ===
								'all'
									? 'border-ink bg-ink text-paper-bg'
									: 'border-line2 text-soft hover:text-ink'}"
							>
								All Circuits
							</button>
							{#each ['Los Angeles', 'New England', 'St. Louis'].filter((c) => availableCircuits.includes(c)) as circuit (circuit)}
								{@const _ccColor = getCircuit(circuit)?.color || '#17150F'}
								<button
									type="button"
									onclick={() => (standingsCircuit = circuit)}
									class="inline-flex cursor-pointer items-center gap-[7px] border px-[13px] py-[9px] text-[11px] font-bold tracking-[0.04em] uppercase transition-colors {standingsCircuit ===
									circuit
										? 'border-ink bg-ink text-paper-bg'
										: 'border-line2 text-soft hover:text-ink'}"
								>
									<span class="block h-[9px] w-[9px]" style="background-color: {_ccColor};"></span>
									{circuit}
								</button>
							{/each}
						</div>
					</div>
				</section>

				<!-- ============ RESULTS ============ -->
				<section class="border-ink border-b-[3px] border-double px-14 pt-[24px] pb-[44px]">
					{#if filteredStandings.length === 0}
						<div class="border-line2 bg-paper py-14 text-center">
							<div class="font-newsreader text-ink mb-2 text-[24px] font-semibold">
								No players match.
							</div>
							<p class="text-soft mx-auto mb-6 max-w-[420px] text-[14px] leading-[1.55]">
								Try a different season, circuit, or search term.
							</p>
							<button
								type="button"
								onclick={() => {
									searchQuery = '';
									standingsCircuit = 'all';
								}}
								class="border-ink text-ink hover:bg-ink hover:text-paper-bg cursor-pointer border-[1.5px] bg-transparent px-5 py-[10px] text-[11px] font-extrabold tracking-[0.07em] uppercase transition-colors"
							>
								Clear Filters
							</button>
						</div>
					{:else}
						<!-- result line -->
						<div class="text-fade mb-4 text-[11.5px] font-bold tracking-[0.05em] uppercase">
							Showing
							<b class="text-ink">{(standingsPage - 1) * standingsPerPage + 1}–{Math.min(standingsPage * standingsPerPage, filteredStandings.length)}</b>
							of
							<b class="text-ink">{filteredStandings.length}</b>
							players{standingsSeason !== 'all' ? ` · ${standingsSeason}` : ''}{standingsCircuit !== 'all' ? ` · ${standingsCircuit}` : ''}
						</div>

						<!-- ===== MOBILE: editorial card stack ===== -->
						<div class="space-y-3 md:hidden">
							{#each paginatedStandings as player (player.id || player.playerName)}
								{@const rank = player.calculatedRank || player.rank}
								{@const losses = (player.matchesPlayed || 0) - (player.matchesWon || 0)}
								{@const _ccColor = player.circuit ? getCircuit(player.circuit)?.color : null}
								{@const _rankColor = rank === 1 ? '#C8922E' : rank === 2 ? '#928B79' : rank === 3 ? '#C0461F' : rank <= 16 ? '#16489E' : 'var(--ed-fade)'}
								<div
									class="border-line2 bg-paper grid grid-cols-[44px_1fr_auto] items-start gap-3 border border-t-[3px] px-4 py-4"
									style="border-top-color: {_ccColor || 'var(--ed-line2)'};"
								>
									<span
										class="font-newsreader text-[34px] font-semibold leading-[0.85] tabular-nums"
										style="color: {_rankColor};"
									>
										{rank}
									</span>
									<div class="min-w-0">
										<div class="text-ink truncate text-[16px] font-extrabold">
											{player.playerName}
										</div>
										{#if player.circuit && _ccColor}
											<div class="mt-1 inline-flex items-center gap-[6px] text-[10px] font-extrabold tracking-[0.08em] uppercase" style="color: {_ccColor};">
												<span class="block h-[7px] w-[7px]" style="background-color: {_ccColor};"></span>
												{player.circuit}
											</div>
										{:else if player.circuitsPlayed && player.circuitsPlayed.length > 0}
											<div class="text-fade mt-1 text-[10px] font-bold tracking-[0.04em] uppercase">
												{player.circuitsPlayed.join(' · ')}
											</div>
										{/if}
									</div>
									<div class="text-right">
										<div class="font-newsreader text-prem text-[24px] font-semibold leading-none tabular-nums">
											{player.totalPoints || 0}
										</div>
										<div class="text-fade mt-[2px] text-[9px] font-extrabold tracking-[0.12em] uppercase">
											Points
										</div>
									</div>
									<div class="border-line col-span-3 mt-3 grid grid-cols-4 gap-2 border-t pt-3 text-center">
										<div>
											<div class="text-[13px] font-bold">
												<span class="text-prem">{player.matchesWon || 0}</span>
												<span class="text-fade">–</span>
												<span class="text-warm">{losses}</span>
											</div>
											<div class="text-fade mt-[2px] text-[9px] font-extrabold tracking-[0.1em] uppercase">
												Record
											</div>
										</div>
										<div>
											{#if player.winPercentage}
												<div class="text-[13px] font-bold tabular-nums" style="color: {player.winPercentage >= 60 ? 'var(--ed-prem)' : player.winPercentage >= 50 ? '#C8922E' : 'var(--ed-warm)'};">
													{player.winPercentage}%
												</div>
											{:else}
												<div class="text-fade text-[13px]">—</div>
											{/if}
											<div class="text-fade mt-[2px] text-[9px] font-extrabold tracking-[0.1em] uppercase">
												Win %
											</div>
										</div>
										<div>
											<div class="text-ink text-[13px] font-bold tabular-nums">
												{player.eventsPlayed || 0}
											</div>
											<div class="text-fade mt-[2px] text-[9px] font-extrabold tracking-[0.1em] uppercase">
												Events
											</div>
										</div>
										<div>
											<div class="text-warm text-[13px] font-bold tabular-nums">
												{player.top8Finishes || 0}
											</div>
											<div class="text-fade mt-[2px] text-[9px] font-extrabold tracking-[0.1em] uppercase">
												Top 8
											</div>
										</div>
									</div>
									{#if player.gemId}
										<a
											href="/player/{player.gemId}"
											class="text-accent col-span-3 mt-3 text-right text-[10.5px] font-extrabold tracking-[0.07em] uppercase"
										>
											View Profile →
										</a>
									{/if}
								</div>
							{/each}
						</div>

						<!--
							DESKTOP: catalog-style standings table.
							Borrows the visual register of a modern catalog
							(soft container border with rounded corners,
							subtle zebra rows, light hover lift, mono
							column headers, refined sort indicators) while
							keeping the editorial paper palette + every
							existing column / sort handler.
						-->
						<div
							class="border-line2 bg-paper hidden overflow-hidden rounded-[6px] border md:block"
						>
							<table class="w-full">
								<thead>
									<tr class="border-line2 border-b" style="background: color-mix(in srgb, var(--ed-paper-bg) 60%, transparent);">
										<th
											class="text-fade font-mono-system w-[68px] px-5 py-[14px] text-left text-[10px] font-extrabold tracking-[0.16em] uppercase"
										>
											#
										</th>
										<th
											class="text-fade font-mono-system px-5 py-[14px] text-left text-[10px] font-extrabold tracking-[0.16em] uppercase"
										>
											Player
										</th>
										<th
											class="text-fade font-mono-system px-5 py-[14px] text-right text-[10px] font-extrabold tracking-[0.16em] uppercase"
										>
											<button
												type="button"
												onclick={() => toggleSort('points')}
												class="hover:text-ink ml-auto inline-flex cursor-pointer items-center gap-[6px] transition-colors {sortColumn ===
												'points'
													? 'text-ink'
													: ''}"
											>
												Points
												<span
													class="text-[9px] leading-none tracking-normal {sortColumn === 'points' ? 'opacity-100' : 'opacity-30'}"
													aria-hidden="true"
												>
													{sortColumn === 'points' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
												</span>
											</button>
										</th>
										<th
											class="text-fade font-mono-system px-5 py-[14px] text-center text-[10px] font-extrabold tracking-[0.16em] uppercase"
										>
											<button
												type="button"
												onclick={() => toggleSort('record')}
												class="hover:text-ink mx-auto inline-flex cursor-pointer items-center gap-[6px] transition-colors {sortColumn ===
												'record'
													? 'text-ink'
													: ''}"
											>
												Record
												<span
													class="text-[9px] leading-none tracking-normal {sortColumn === 'record' ? 'opacity-100' : 'opacity-30'}"
													aria-hidden="true"
												>
													{sortColumn === 'record' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
												</span>
											</button>
										</th>
										<th
											class="text-fade font-mono-system px-5 py-[14px] text-center text-[10px] font-extrabold tracking-[0.16em] uppercase"
										>
											<button
												type="button"
												onclick={() => toggleSort('winPct')}
												class="hover:text-ink mx-auto inline-flex cursor-pointer items-center gap-[6px] transition-colors {sortColumn ===
												'winPct'
													? 'text-ink'
													: ''}"
											>
												Win %
												<span
													class="text-[9px] leading-none tracking-normal {sortColumn === 'winPct' ? 'opacity-100' : 'opacity-30'}"
													aria-hidden="true"
												>
													{sortColumn === 'winPct' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
												</span>
											</button>
										</th>
										<th
											class="text-fade font-mono-system px-5 py-[14px] text-center text-[10px] font-extrabold tracking-[0.16em] uppercase"
										>
											<button
												type="button"
												onclick={() => toggleSort('events')}
												class="hover:text-ink mx-auto inline-flex cursor-pointer items-center gap-[6px] transition-colors {sortColumn ===
												'events'
													? 'text-ink'
													: ''}"
											>
												Events
												<span
													class="text-[9px] leading-none tracking-normal {sortColumn === 'events' ? 'opacity-100' : 'opacity-30'}"
													aria-hidden="true"
												>
													{sortColumn === 'events' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
												</span>
											</button>
										</th>
										<th
											class="text-fade font-mono-system px-5 py-[14px] text-center text-[10px] font-extrabold tracking-[0.16em] uppercase"
										>
											<button
												type="button"
												onclick={() => toggleSort('top8')}
												class="hover:text-ink mx-auto inline-flex cursor-pointer items-center gap-[6px] transition-colors {sortColumn ===
												'top8'
													? 'text-ink'
													: ''}"
											>
												Top 8
												<span
													class="text-[9px] leading-none tracking-normal {sortColumn === 'top8' ? 'opacity-100' : 'opacity-30'}"
													aria-hidden="true"
												>
													{sortColumn === 'top8' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
												</span>
											</button>
										</th>
										<th
											class="text-fade font-mono-system px-5 py-[14px] text-center text-[10px] font-extrabold tracking-[0.16em] uppercase"
										>
											<button
												type="button"
												onclick={() => toggleSort('ageRating')}
												class="hover:text-ink mx-auto inline-flex cursor-pointer items-center gap-[6px] transition-colors {sortColumn ===
												'ageRating'
													? 'text-ink'
													: ''}"
											>
												Rating
												<span
													class="text-[9px] leading-none tracking-normal {sortColumn === 'ageRating' ? 'opacity-100' : 'opacity-30'}"
													aria-hidden="true"
												>
													{sortColumn === 'ageRating' ? (sortDirection === 'asc' ? '↑' : '↓') : '↕'}
												</span>
											</button>
										</th>
										<th
											class="w-[44px] px-3 py-[14px]"
											aria-hidden="true"
										></th>
									</tr>
								</thead>
								<tbody>
									{#each paginatedStandings as player, i (player.id || player.playerName)}
										{@const rank = player.calculatedRank || player.rank}
										{@const losses = (player.matchesPlayed || 0) - (player.matchesWon || 0)}
										{@const _ccColor = player.circuit ? getCircuit(player.circuit)?.color : null}
										{@const _rankColor = rank === 1 ? '#C8922E' : rank === 2 ? '#928B79' : rank === 3 ? '#C0461F' : rank <= 16 ? '#16489E' : 'var(--ed-fade)'}
										{@const _initials = (player.playerName || '').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
										{@const _isTop3 = rank <= 3}
										<tr
											class="group border-line2 transition-colors {i === paginatedStandings.length - 1 ? '' : 'border-b'} odd:bg-paper even:bg-paper-bg/40 hover:!bg-paper-bg"
										>
											<!-- Rank cell -->
											<td class="px-5 py-[16px]">
												{#if _isTop3}
													<span
														class="font-newsreader inline-flex h-[34px] w-[34px] items-center justify-center rounded-full text-[15px] font-semibold leading-none tracking-[-0.01em] tabular-nums"
														style="background: color-mix(in srgb, {_rankColor} 14%, transparent); color: {_rankColor};"
													>
														{rank}
													</span>
												{:else}
													<span
														class="font-mono-system inline-flex h-[34px] w-[34px] items-center justify-center text-[14px] font-bold leading-none tabular-nums"
														style="color: {_rankColor};"
													>
														{rank}
													</span>
												{/if}
											</td>
											<!-- Player cell -->
											<td class="px-5 py-[16px]">
												<div class="flex items-center gap-3">
													<span
														class="border-line2 bg-paper-bg flex h-[36px] w-[36px] flex-shrink-0 items-center justify-center rounded-full border text-[10px] font-extrabold"
														style={_ccColor
															? `border-color: color-mix(in srgb, ${_ccColor} 55%, transparent); color: ${_ccColor}; background-color: color-mix(in srgb, ${_ccColor} 9%, var(--ed-paper-bg));`
															: ''}
													>
														{_initials}
													</span>
													<div class="min-w-0">
														<div
															class="text-ink group-hover:text-warm text-[15px] font-bold transition-colors"
														>
															{player.playerName}
														</div>
														{#if player.circuit && _ccColor}
															<div
																class="mt-[3px] inline-flex items-center gap-[6px] text-[10px] font-extrabold tracking-[0.08em] uppercase"
																style="color: {_ccColor};"
															>
																<span
																	class="block h-[6px] w-[6px] rounded-full"
																	style="background-color: {_ccColor};"
																></span>
																{player.circuit}
															</div>
														{:else if player.circuitsPlayed && player.circuitsPlayed.length > 0}
															<div
																class="text-fade mt-[3px] text-[10px] font-bold tracking-[0.04em] uppercase"
															>
																{player.circuitsPlayed.join(' · ')}
															</div>
														{/if}
													</div>
												</div>
											</td>
											<!-- Points -->
											<td class="px-5 py-[16px] text-right">
												<span
													class="text-ink text-[18px] font-bold leading-none tabular-nums"
												>
													{player.totalPoints || 0}
												</span>
												<div
													class="text-fade font-mono-system mt-[2px] text-[9px] font-bold tracking-[0.1em] uppercase"
												>
													pts
												</div>
											</td>
											<!-- Record -->
											<td class="px-5 py-[16px] text-center">
												<span class="font-mono-system text-[13.5px] font-bold tabular-nums">
													<span class="text-prem">{player.matchesWon || 0}</span>
													<span class="text-fade mx-[2px]">–</span>
													<span class="text-warm">{losses}</span>
												</span>
											</td>
											<!-- Win % -->
											<td class="px-5 py-[16px] text-center">
												{#if player.winPercentage}
													<span
														class="text-[13.5px] font-bold tabular-nums"
														style="color: {player.winPercentage >= 60
															? 'var(--ed-prem)'
															: player.winPercentage >= 50
																? '#C8922E'
																: 'var(--ed-warm)'};"
													>
														{player.winPercentage}%
													</span>
												{:else}
													<span class="text-fade">—</span>
												{/if}
											</td>
											<!-- Events -->
											<td class="px-5 py-[16px] text-center">
												<span class="text-ink text-[13.5px] font-bold tabular-nums">
													{player.eventsPlayed || 0}
												</span>
											</td>
											<!-- Top 8 -->
											<td class="px-5 py-[16px] text-center">
												<span class="text-warm text-[13.5px] font-bold tabular-nums">
													{player.top8Finishes || 0}
												</span>
											</td>
											<!-- Rating -->
											<td class="px-5 py-[16px] text-center">
												{#if player.ageRating !== null && player.ageRating !== undefined}
													{@const _tierHex = player.isProvisional ? '#928B79' : ({ yellow: '#C8922E', purple: '#6A4A86', cyan: '#2C5BA8', teal: '#1C7A4B', amber: '#E5703E', orange: '#C0461F' }[player.ratingTier?.color] || '#56503F')}
													<!--
														Fixed-width chip so every rating badge holds the
														same footprint regardless of tier-label length.
														Rounded corners + tinted fill match the catalog's
														chip language; numeric rating stays tabular-nums.
													-->
													<div
														class="mx-auto inline-flex w-[104px] flex-col items-center rounded-[4px] border px-2 py-[10px]"
														style="border-color: color-mix(in srgb, {_tierHex} 38%, transparent); background-color: color-mix(in srgb, {_tierHex} 8%, transparent);"
													>
														<span
															class="font-newsreader text-[15px] font-semibold leading-none tabular-nums"
															style="color: {_tierHex};"
														>
															{player.ageRating}
														</span>
														<span
															class="font-mono-system mt-[3px] block w-full truncate text-center text-[9px] font-extrabold tracking-[0.08em] whitespace-nowrap uppercase"
															style="color: {_tierHex};"
														>
															{player.isProvisional
																? 'Provisional'
																: player.ratingTier?.label || 'Unranked'}
														</span>
													</div>
												{:else}
													<span class="text-fade">—</span>
												{/if}
											</td>
											<!-- Profile chevron — subtle, always reserves space,
												 darkens on hover. Same affordance as a Linear-style
												 row-action button without needing to fade in. -->
											<td class="px-3 py-[16px] text-right">
												{#if player.gemId}
													<a
														href="/player/{player.gemId}"
														class="text-fade hover:text-ink inline-flex h-[28px] w-[28px] items-center justify-center text-[15px] font-bold transition-colors"
														aria-label="View {player.playerName} profile"
													>
														→
													</a>
												{/if}
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{/if}

					<!-- ============ PAGINATION ============ -->
					{#if totalStandingsPages > 1}
						<div class="mt-8 flex flex-wrap items-center justify-center gap-[18px]">
							<button
								type="button"
								onclick={() => (standingsPage = Math.max(1, standingsPage - 1))}
								disabled={standingsPage === 1}
								class="border-ink text-ink hover:bg-ink hover:text-paper-bg cursor-pointer border-[1.5px] bg-transparent px-[22px] py-[11px] text-[12px] font-extrabold tracking-[0.06em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-30"
							>
								← Prev
							</button>
							<div class="flex flex-wrap justify-center gap-[6px]">
								{#each Array(Math.min(5, totalStandingsPages)) as _, i (i)}
									{@const pageNum =
										standingsPage <= 3
											? i + 1
											: standingsPage >= totalStandingsPages - 2
												? totalStandingsPages - 4 + i
												: standingsPage - 2 + i}
									{#if pageNum > 0 && pageNum <= totalStandingsPages}
										<button
											type="button"
											onclick={() => (standingsPage = pageNum)}
											class="flex h-[38px] min-w-[38px] cursor-pointer items-center justify-center border-[1.5px] px-[6px] text-[13px] font-extrabold transition-colors {standingsPage ===
											pageNum
												? 'border-ink bg-ink text-paper-bg'
												: 'text-ink border-transparent hover:border-line2'}"
										>
											{pageNum}
										</button>
									{/if}
								{/each}
							</div>
							<button
								type="button"
								onclick={() => (standingsPage = Math.min(totalStandingsPages, standingsPage + 1))}
								disabled={standingsPage === totalStandingsPages}
								class="border-ink text-ink hover:bg-ink hover:text-paper-bg cursor-pointer border-[1.5px] bg-transparent px-[22px] py-[11px] text-[12px] font-extrabold tracking-[0.06em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-30"
							>
								Next →
							</button>
						</div>
					{/if}
				</section>

				<!-- ============ LEGEND ============ -->
				<section class="bg-paper border-ink border-b-[3px] border-double px-14 py-[44px]">
					<div class="mb-5">
						<div class="text-accent mb-3 text-[10.5px] font-extrabold tracking-[0.2em] uppercase">
							How to read this
						</div>
						<h3 class="font-newsreader m-0 text-[28px] font-semibold leading-none tracking-[-0.01em]">
							Standings Glossary
						</h3>
					</div>
					<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
						{#each [{ label: 'AGE Points', body: 'Points earned by tournament placement. The top 16 players in each circuit qualify for the Player’s Championship.' }, { label: 'W – L Record', body: 'Total wins and losses across every event in the selected season.' }, { label: 'Win %', body: 'Match win rate. Green for 60%+, gold for 50–59%, rust for under 50%.' }, { label: 'Events', body: 'Number of AGE Opens the player has attended this season.' }, { label: 'Top 8', body: 'Times the player has finished in the Top 8 and taken home cash prize money.' }, { label: 'Rating', body: 'AGE Rating tier derived from event performance. Provisional until enough events are played.' }] as item (item.label)}
							<div class="border-line2 border-l-warm border-l-[3px] pl-4">
								<div class="text-ink mb-1 text-[12px] font-extrabold tracking-[0.08em] uppercase">
									{item.label}
								</div>
								<p class="text-soft m-0 text-[13px] leading-[1.55]">{item.body}</p>
							</div>
						{/each}
					</div>
				</section>
			{/if}

			<!-- Tournament Archive Tab -->
			{#if activeTab === 'results'}
				<div class="space-y-8">
					<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<h2 class="mb-2 text-3xl font-bold text-white">Tournament Archive</h2>
							<p class="text-gray-400">
								Live standings from in-progress events and results from completed tournaments
							</p>
						</div>
						<div class="flex items-center gap-3">
							{#if hasLiveEvents}
								<span
									class="inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-1 text-sm font-medium text-blue-400"
								>
									<span class="h-2 w-2 animate-pulse rounded-full bg-blue-400"></span>
									Auto-refreshing
								</span>
							{/if}
							<button
								onclick={refreshStandings}
								disabled={isRefreshing}
								class="inline-flex items-center gap-2 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
							>
								<svg
									class="h-4 w-4 {isRefreshing ? 'animate-spin' : ''}"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
									/>
								</svg>
								{isRefreshing ? 'Refreshing...' : 'Refresh'}
							</button>
						</div>
					</div>

					{#if (data.eventResults || []).length === 0}
						<div class="rounded-lg border border-gray-800 bg-gray-900 p-12 text-center">
							<div
								class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800"
							>
								<svg
									class="h-8 w-8 text-gray-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
									/>
								</svg>
							</div>
							<h3 class="mb-2 text-xl font-semibold text-white">No Results Yet</h3>
							<p class="text-gray-400">Results from completed events will appear here.</p>
						</div>
					{:else}
						<!-- Mobile Card View -->
						<div class="space-y-3 md:hidden">
							{#each data.eventResults as eventData}
								{@const winner = eventData.results.find((r) => r.placement === 1)}
								{@const colors = getCircuitColor(eventData.event.circuit)}
								<a
									href="/age-open/{eventData.event.id}/results"
									class="block overflow-hidden rounded-xl border border-gray-800 bg-gray-900 hover:bg-gray-800/50"
								>
									<div class="flex">
										<!-- Circuit Color Accent -->
										<div class="w-1 shrink-0 {colors.bg}"></div>
										<div class="flex-1 p-4">
											<!-- Top Row: Status + Circuit -->
											<div class="mb-3 flex items-center justify-between">
												<div class="flex items-center gap-2">
													{#if eventData.event.circuit}
														<span
															class="rounded-full {colors.bg} px-2.5 py-0.5 text-xs font-medium text-white"
														>
															{eventData.event.circuit}
														</span>
													{/if}
													{#if eventData.event.format}
														<span
															class="rounded-full bg-gray-700 px-2.5 py-0.5 text-xs font-medium text-gray-200"
														>
															{eventData.event.format}
														</span>
													{/if}
												</div>
												{#if eventData.event.status === 'in_progress'}
													<span
														class="animate-pulse rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-medium text-blue-400"
													>
														LIVE
													</span>
												{:else}
													<span
														class="rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs font-medium text-green-400"
													>
														Completed
													</span>
												{/if}
											</div>

											<!-- Event Title -->
											<h3 class="mb-1 text-base font-semibold text-white">
												{eventData.event.title}
											</h3>

											<!-- Date & Location -->
											<div class="mb-3 text-sm text-gray-400">
												{#if eventData.event.eventDate}
													{formatDateShort(eventData.event.eventDate)}
												{/if}
												{#if eventData.event.location}
													<span class="text-gray-600"> · </span>{eventData.event.location}
												{/if}
											</div>

											<!-- Winner & Players -->
											<div class="flex items-center justify-between">
												{#if winner}
													<div class="flex items-center gap-2">
														<span
															class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500/20 text-yellow-400"
														>
															<svg class="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24">
																<path
																	d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
																/>
															</svg>
														</span>
														<span class="text-sm font-medium text-white">{winner.playerName}</span>
													</div>
												{:else}
													<span></span>
												{/if}
												<div class="flex items-center gap-1 text-sm text-gray-500">
													<svg
														class="h-4 w-4"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															stroke-width="2"
															d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
														/>
													</svg>
													{eventData.results.length}
												</div>
											</div>
										</div>
									</div>
								</a>
							{/each}
						</div>

						<!-- Desktop Table View -->
						<div
							class="hidden overflow-hidden rounded-xl border border-gray-800 bg-gray-900 md:block"
						>
							<div class="overflow-x-auto">
								<table class="w-full min-w-[900px]">
									<thead>
										<tr class="border-b border-gray-700 bg-gray-800">
											<th
												class="min-w-[200px] px-4 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
												>Event</th
											>
											<th
												class="min-w-[100px] px-4 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
												>Date</th
											>
											<th
												class="px-4 py-4 text-center text-xs font-semibold tracking-wider text-gray-400 uppercase"
												>Circuit</th
											>
											<th
												class="px-4 py-4 text-center text-xs font-semibold tracking-wider text-gray-400 uppercase"
												>Format</th
											>
											<th
												class="w-16 px-4 py-4 text-center text-xs font-semibold tracking-wider text-gray-400 uppercase"
												>Players</th
											>
											<th
												class="min-w-[140px] px-4 py-4 text-left text-xs font-semibold tracking-wider text-gray-400 uppercase"
												>Winner</th
											>
											<th
												class="px-4 py-4 text-center text-xs font-semibold tracking-wider text-gray-400 uppercase"
												>Status</th
											>
											<th
												class="w-32 px-4 py-4 text-right text-xs font-semibold tracking-wider text-gray-400 uppercase"
											></th>
										</tr>
									</thead>
									<tbody class="divide-y divide-gray-800">
										{#each data.eventResults as eventData}
											{@const winner = eventData.results.find((r) => r.placement === 1)}
											{@const colors = getCircuitColor(eventData.event.circuit)}
											<tr class="border-l-4 hover:bg-gray-800/50 {colors.borderLeft}">
												<td class="px-4 py-4">
													<div class="font-medium text-white">{eventData.event.title}</div>
													{#if eventData.event.location}
														<div class="mt-0.5 text-xs text-gray-500">
															{eventData.event.location}
														</div>
													{/if}
												</td>
												<td class="px-4 py-4 text-sm whitespace-nowrap text-gray-300">
													{#if eventData.event.eventDate}
														{formatDateShort(eventData.event.eventDate)}
													{:else}
														<span class="text-gray-500">-</span>
													{/if}
												</td>
												<td class="px-4 py-4 text-center">
													{#if eventData.event.circuit}
														<span
															class="inline-block rounded-full whitespace-nowrap {colors.bg} px-2.5 py-1 text-xs font-medium text-white"
														>
															{eventData.event.circuit}
														</span>
													{:else}
														<span class="text-gray-500">-</span>
													{/if}
												</td>
												<td class="px-4 py-4 text-center">
													{#if eventData.event.format}
														<span
															class="inline-block rounded-full bg-gray-700 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-gray-200"
														>
															{eventData.event.format}
														</span>
													{:else}
														<span class="text-gray-500">-</span>
													{/if}
												</td>
												<td class="px-4 py-4 text-center text-sm font-medium text-gray-300">
													{eventData.results.length}
												</td>
												<td class="px-4 py-4">
													{#if winner}
														<div class="flex items-center gap-2">
															<span
																class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-yellow-500/20 text-yellow-400"
															>
																<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 24 24">
																	<path
																		d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
																	/>
																</svg>
															</span>
															<span class="truncate text-sm font-medium text-white"
																>{winner.playerName}</span
															>
														</div>
													{:else}
														<span class="text-gray-500">-</span>
													{/if}
												</td>
												<td class="px-4 py-4 text-center">
													{#if eventData.event.status === 'in_progress'}
														<span
															class="inline-block animate-pulse rounded-full bg-blue-500/20 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-blue-400"
														>
															LIVE
														</span>
													{:else}
														<span
															class="inline-block rounded-full bg-green-500/20 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-green-400"
														>
															Completed
														</span>
													{/if}
												</td>
												<td class="px-4 py-4 text-right">
													<a
														href="/age-open/{eventData.event.id}/results"
														class="inline-flex items-center gap-1.5 rounded-lg bg-blue-500/10 px-3 py-1.5 text-sm font-medium whitespace-nowrap text-blue-400 hover:bg-blue-500/20"
													>
														View
														<svg
															class="h-4 w-4"
															fill="none"
															stroke="currentColor"
															viewBox="0 0 24 24"
														>
															<path
																stroke-linecap="round"
																stroke-linejoin="round"
																stroke-width="2"
																d="M9 5l7 7-7 7"
															/>
														</svg>
													</a>
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Rules & Info Tab -->
			{#if activeTab === 'rules'}
				<!-- ============ ABOUT THE CIRCUIT ============ -->
				<section class="border-ink border-b-[3px] border-double px-14 py-[60px]">
					<div class="grid grid-cols-1 items-start gap-12 lg:grid-cols-[1fr_1fr]">
						<div>
							<div class="text-accent mb-3 text-[10.5px] font-extrabold tracking-[0.2em] uppercase">
								The Series
							</div>
							<h2 class="font-newsreader m-0 text-[42px] font-semibold leading-none tracking-[-0.02em]">
								About the AGE Open Circuit.
							</h2>
							<p class="text-soft mt-5 max-w-[560px] text-[16px] leading-[1.62]">
								The AGE Open Circuit is a year-long competitive Flesh and Blood tournament series
								across multiple regions. Compete in $1,000 Opens throughout the year to earn cash
								prizes and AGE Points. At the end of the season, the top 16 players by AGE Open
								points in each circuit are invited to compete in their circuit's Player's
								Championship.
							</p>
							<p class="text-soft mt-4 max-w-[560px] text-[15px] leading-[1.6]">
								In 2026, the series expands to 24 Opens, a $30,000 total prize pool, and 3 AGE
								Championships.
							</p>
						</div>

						<div class="border-line2 grid grid-cols-2 border">
							<div class="border-line2 border-t-[3px] border-r border-b p-6" style="border-top-color: var(--ed-accent, #16489E);">
								<div class="font-newsreader text-accent text-[42px] font-semibold leading-none">
									$30K
								</div>
								<div class="text-fade mt-3 text-[10.5px] font-extrabold tracking-[0.14em] uppercase">
									Total Prize Pool
								</div>
							</div>
							<div class="border-line2 border-t-[3px] border-b p-6" style="border-top-color: var(--ed-prem, #1C7A4B);">
								<div class="font-newsreader text-prem text-[42px] font-semibold leading-none">
									24
								</div>
								<div class="text-fade mt-3 text-[10.5px] font-extrabold tracking-[0.14em] uppercase">
									Opens This Year
								</div>
							</div>
							<div class="border-line2 border-t-[3px] border-r p-6" style="border-top-color: #C8922E;">
								<div class="font-newsreader text-[42px] font-semibold leading-none" style="color:#C8922E;">
									3
								</div>
								<div class="text-fade mt-3 text-[10.5px] font-extrabold tracking-[0.14em] uppercase">
									Championships
								</div>
							</div>
							<div class="border-line2 border-t-[3px] p-6" style="border-top-color: var(--ed-warm, #C0461F);">
								<div class="font-newsreader text-warm text-[42px] font-semibold leading-none">
									T16
								</div>
								<div class="text-fade mt-3 text-[10.5px] font-extrabold tracking-[0.14em] uppercase">
									Per Circuit
								</div>
							</div>
						</div>
					</div>
				</section>

				<!-- ============ RULEBOOK ============ -->
				<section class="bg-paper border-ink border-b-[3px] border-double px-14 py-[60px]">
					<div class="mb-7 flex flex-wrap items-end justify-between gap-6">
						<div>
							<div class="text-accent mb-3 text-[10.5px] font-extrabold tracking-[0.2em] uppercase">
								Official Rulebook
							</div>
							<h2 class="font-newsreader m-0 text-[42px] font-semibold leading-none tracking-[-0.02em]">
								Tournament Rules &amp; Policies.
							</h2>
							<p class="text-soft mt-[9px] max-w-[620px] text-[15px] leading-[1.55]">
								Every rule, policy, and procedure for AGE Open events. Tap a section to expand.
							</p>
						</div>
					</div>

					<div>
						{#each rulebookSections as section, sIdx (section.id)}
							{@const _isOpen = openRulebookSection === section.id}
							<div class="border-line2 border-t {sIdx === rulebookSections.length - 1 ? 'border-b' : ''}">
								<button
									type="button"
									onclick={() => toggleRulebookSection(section.id)}
									class="hover:bg-paper-bg flex w-full cursor-pointer items-center justify-between gap-4 border-none bg-transparent px-2 py-[18px] text-left transition-colors"
								>
									<div class="flex items-center gap-4">
										<span
											class="font-newsreader text-ink text-[26px] font-semibold leading-none w-[42px] tabular-nums"
										>
											{String(sIdx + 1).padStart(2, '0')}
										</span>
										<div>
											<div class="font-newsreader text-[22px] font-semibold leading-[1.1] tracking-[-0.01em]">
												{section.title}
											</div>
											<div class="text-fade mt-1 text-[10.5px] font-extrabold tracking-[0.14em] uppercase">
												{section.items.length} topic{section.items.length === 1 ? '' : 's'}
											</div>
										</div>
									</div>
									<svg
										class="text-soft h-4 w-4 flex-shrink-0 transition-transform {_isOpen
											? 'rotate-180'
											: ''}"
										fill="none"
										stroke="currentColor"
										stroke-width="1.7"
										viewBox="0 0 24 24"
									>
										<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
									</svg>
								</button>

								{#if _isOpen}
									<div class="border-line border-t pl-[58px] pr-2 pb-5">
										{#each section.items as item, itemIndex (itemIndex)}
											{@const _itemOpen = openRulebookItem === itemIndex}
											<div class="border-line border-b last:border-b-0">
												<button
													type="button"
													onclick={() => toggleRulebookItem(itemIndex)}
													class="hover:text-warm flex w-full cursor-pointer items-center justify-between gap-4 border-none bg-transparent py-[14px] pr-1 text-left transition-colors"
												>
													<span class="font-newsreader text-[16px] font-medium leading-snug">
														{item.question}
													</span>
													<svg
														class="text-fade h-3.5 w-3.5 flex-shrink-0 transition-transform {_itemOpen
															? 'rotate-180'
															: ''}"
														fill="none"
														stroke="currentColor"
														stroke-width="1.7"
														viewBox="0 0 24 24"
													>
														<path
															stroke-linecap="round"
															stroke-linejoin="round"
															d="M19 9l-7 7-7-7"
														/>
													</svg>
												</button>
												{#if _itemOpen}
													<div class="pb-5">
														<p
															class="border-warm font-newsreader text-soft m-0 max-w-[760px] border-l-[3px] pl-5 text-[15px] leading-[1.7]"
														>
															{item.answer}
														</p>
													</div>
												{/if}
											</div>
										{/each}
									</div>
								{/if}
							</div>
						{/each}
					</div>

					<!-- important notice -->
					<div class="border-warm/40 bg-warm/10 mt-7 flex items-start gap-4 border-[1.5px] px-5 py-4">
						<svg
							class="text-warm mt-[2px] h-5 w-5 flex-shrink-0"
							fill="none"
							stroke="currentColor"
							stroke-width="1.7"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
						</svg>
						<div>
							<div class="text-warm mb-1 text-[10.5px] font-extrabold tracking-[0.14em] uppercase">
								Important notice
							</div>
							<p class="text-soft m-0 text-[13.5px] leading-[1.55]">
								These rules supplement the official Flesh and Blood Tournament Rules and Policy by
								Legend Story Studios. In case of conflict, LSS official rules take precedence
								unless specifically stated otherwise by AGE. The Head Judge has final authority on
								all rulings during events.
							</p>
						</div>
					</div>
				</section>

				<!-- ============ PRIZE STRUCTURE ============ -->
				<section class="border-ink border-b-[3px] border-double px-14 py-[60px]">
					<div class="mb-7">
						<div class="text-accent mb-3 text-[10.5px] font-extrabold tracking-[0.2em] uppercase">
							Payouts &amp; Points
						</div>
						<h2 class="font-newsreader m-0 text-[42px] font-semibold leading-none tracking-[-0.02em]">
							Prize Structure
							<span class="font-newsreader text-soft text-[22px] italic font-medium">— per Open</span>
						</h2>
					</div>

					<div class="border-ink border bg-paper-bg overflow-x-auto">
						<table class="w-full">
							<thead>
								<tr class="border-ink border-b-2 bg-paper">
									<th class="font-mono-system text-fade px-6 py-[14px] text-left text-[10.5px] font-extrabold tracking-[0.14em] uppercase">
										Place
									</th>
									<th class="font-mono-system text-fade px-6 py-[14px] text-left text-[10.5px] font-extrabold tracking-[0.14em] uppercase">
										Cash Prize
									</th>
									<th class="font-mono-system text-fade px-6 py-[14px] text-left text-[10.5px] font-extrabold tracking-[0.14em] uppercase">
										AGE Points
									</th>
								</tr>
							</thead>
							<tbody>
								{#each [{ place: '1st Place', cash: '$400', pts: '30', tone: 'gold' }, { place: '2nd Place', cash: '$200', pts: '25', tone: 'gold' }, { place: '3rd – 4th', cash: '$100', pts: '20', tone: 'soft' }, { place: '5th – 8th', cash: '$50', pts: '15', tone: 'soft' }, { place: '9th – 12th', cash: '—', pts: '12', tone: 'soft' }, { place: '13th – 16th', cash: '—', pts: '8', tone: 'soft' }, { place: 'All participants', cash: '—', pts: '1', tone: 'soft' }] as row, i (i)}
									<tr class="border-line border-b last:border-b-0 hover:bg-paper">
										<td class="px-6 py-[13px] text-[14.5px] font-bold">
											{row.place}
										</td>
										<td class="px-6 py-[13px]">
											{#if row.cash === '—'}
												<span class="text-fade">—</span>
											{:else}
												<span class="font-newsreader text-prem text-[18px] font-semibold tabular-nums">
													{row.cash}
												</span>
											{/if}
										</td>
										<td class="px-6 py-[13px]">
											<span class="font-newsreader text-accent text-[18px] font-semibold tabular-nums">
												{row.pts}
											</span>
											<span class="text-fade ml-1 text-[11.5px] font-bold tracking-[0.04em] uppercase">
												pts
											</span>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					<div class="border-accent/30 bg-accent/10 mt-5 flex items-start gap-3 border-[1.5px] px-5 py-4">
						<svg
							class="text-accent mt-[1px] h-4 w-4 flex-shrink-0"
							fill="none"
							stroke="currentColor"
							stroke-width="1.7"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<p class="text-soft m-0 text-[13.5px] leading-[1.55]">
							<b class="text-ink">$1,000 total per Open</b> in cash prizes distributed to Top 8
							finishers, plus AGE Points for Top 16 and all participants.
						</p>
					</div>
				</section>

				<!-- ============ PLAYER'S CHAMPIONSHIP ============ -->
				<section class="bg-paper border-ink border-b-[3px] border-double px-14 py-[60px]">
					<div class="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1fr]">
						<div>
							<div class="text-accent mb-3 text-[10.5px] font-extrabold tracking-[0.2em] uppercase">
								End of Season
							</div>
							<h2 class="font-newsreader m-0 text-[42px] font-semibold leading-none tracking-[-0.02em]">
								Player's <em class="text-warm italic font-medium">Championship</em>.
							</h2>
							<p class="text-soft mt-5 max-w-[520px] text-[16px] leading-[1.6]">
								At the end of the season, the top 16 players by AGE Open points in each circuit
								are invited to compete in the Player's Championship for a $3,000 prize pool. The
								event crowns the AGE Open Series champion and celebrates the season's strongest
								competitors.
							</p>
						</div>

						<div class="grid grid-cols-1 gap-0">
							<div class="border-line2 border-warm border-t-[3px] flex flex-col gap-2 border bg-paper-bg p-6">
								<div class="text-warm text-[10.5px] font-extrabold tracking-[0.14em] uppercase">
									Qualification
								</div>
								<h3 class="font-newsreader text-[24px] font-semibold leading-none tracking-[-0.01em]">
									Top 16 by AGE Points.
								</h3>
								<p class="text-soft m-0 text-[14px] leading-[1.55]">
									The top 16 players in each circuit by total AGE Points accumulated throughout
									the season receive automatic invitations.
								</p>
							</div>
							<div class="border-line2 border-prem border-t-[3px] flex flex-col gap-2 border border-t-[3px] bg-paper-bg p-6 -mt-px">
								<div class="text-prem text-[10.5px] font-extrabold tracking-[0.14em] uppercase">
									Prize Pool
								</div>
								<h3 class="font-newsreader text-[24px] font-semibold leading-none tracking-[-0.01em]">
									$3,000 to the table.
								</h3>
								<p class="text-soft m-0 text-[14px] leading-[1.55]">
									Distributed to top finishers, with the champion earning the title of AGE Open
									Series Champion for the season.
								</p>
							</div>
						</div>
					</div>
				</section>

				<!-- ============ FAQ ============ -->
				<section class="border-ink border-b-[3px] border-double px-14 py-[60px]">
					<div class="mb-7">
						<div class="text-accent mb-3 text-[10.5px] font-extrabold tracking-[0.2em] uppercase">
							Frequently Asked
						</div>
						<h2 class="font-newsreader m-0 text-[42px] font-semibold leading-none tracking-[-0.02em]">
							Questions players ask.
						</h2>
					</div>

					<div>
						{#each faqItems as item, index (index)}
							{@const _open = openFaqIndex === index}
							<div class="border-line2 border-t {index === faqItems.length - 1 ? 'border-b' : ''}">
								<button
									type="button"
									onclick={() => toggleFaq(index)}
									class="hover:text-warm flex w-full cursor-pointer items-center justify-between gap-4 border-none bg-transparent py-[18px] pr-1 text-left transition-colors"
								>
									<span class="font-newsreader text-[19px] font-medium leading-snug">
										{item.question}
									</span>
									<svg
										class="text-soft h-4 w-4 flex-shrink-0 transition-transform {_open
											? 'rotate-180'
											: ''}"
										fill="none"
										stroke="currentColor"
										stroke-width="1.7"
										viewBox="0 0 24 24"
									>
										<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
									</svg>
								</button>
								{#if _open}
									<div class="pb-5">
										<p class="font-newsreader text-soft m-0 max-w-[760px] text-[16px] leading-[1.7]">
											{item.answer}
										</p>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</section>

				<!-- ============ CONTACT CTA ============ -->
				<section class="bg-ink text-paper-bg px-14 py-[60px]">
					<div class="mx-auto max-w-[760px] text-center">
						<div class="mb-3 text-[10.5px] font-extrabold tracking-[0.2em] uppercase" style="color: #f4c66a;">
							Need a hand?
						</div>
						<h2 class="font-newsreader m-0 text-[42px] font-semibold leading-[1.05] tracking-[-0.02em] text-white">
							Still have questions?
						</h2>
						<p class="mx-auto mt-5 max-w-[520px] text-[15.5px] leading-[1.6] text-white/75">
							Reach out about registration, formats, or anything else — we'll get back to you
							quickly.
						</p>
						<div class="mt-7 flex flex-wrap items-center justify-center gap-3">
							<a
								href="mailto:info@arcanegamesandevents.com"
								class="border-warm bg-warm hover:brightness-110 inline-flex items-center gap-2 border-[1.5px] px-6 py-3 text-[12px] font-bold tracking-[0.06em] text-white uppercase transition-[filter]"
							>
								Contact Us
							</a>
							<a
								href="https://discord.gg/aUF552mPUq"
								target="_blank"
								rel="noopener noreferrer"
								class="hover:bg-paper-bg hover:text-ink inline-flex items-center gap-2 border-[1.5px] border-white/80 bg-transparent px-6 py-3 text-[12px] font-bold tracking-[0.06em] text-white uppercase transition-colors"
							>
								Join Discord
							</a>
						</div>
					</div>
				</section>

			{/if}
		</div>
	</div>
</AgeShell>
