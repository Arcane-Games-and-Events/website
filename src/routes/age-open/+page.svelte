<script>
	import { browser } from '$app/environment';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	export let data;

	const tabs = [
		{ id: 'overview', name: 'Overview', icon: 'home' },
		{ id: 'events', name: 'Events', icon: 'ticket' },
		{ id: 'calendar', name: 'Calendar', icon: 'calendar-days' },
		{ id: 'standings', name: 'Standings', icon: 'trophy' },
		{ id: 'decklists', name: 'Decklists', icon: 'cards' },
		{ id: 'results', name: 'Tournament Archive', icon: 'chart' },
		{ id: 'rules', name: 'Rules & Info', icon: 'info' }
	];

	// Get active tab from URL, defaulting to 'overview'
	$: activeTab = $page.url.searchParams.get('tab') || 'overview';

	// Function to switch tabs and update URL
	function switchTab(tabId) {
		const url = new URL($page.url);
		if (tabId === 'overview') {
			url.searchParams.delete('tab');
		} else {
			url.searchParams.set('tab', tabId);
		}
		goto(url.toString(), { replaceState: false });
		// Scroll to top when switching tabs
		if (browser) {
			window.scrollTo({ top: 0, behavior: 'instant' });
		}
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
	$: monthName = new Date(calendarYear, calendarMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

	function getCalendarDays(year, month) {
		const firstDay = new Date(year, month, 1);
		const lastDay = new Date(year, month + 1, 0);
		const startPadding = firstDay.getDay();
		const daysInMonth = lastDay.getDate();

		const days = [];

		// Previous month padding
		const prevMonth = new Date(year, month, 0);
		for (let i = startPadding - 1; i >= 0; i--) {
			days.push({ day: prevMonth.getDate() - i, isCurrentMonth: false, date: new Date(year, month - 1, prevMonth.getDate() - i) });
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
	function getEventsForDate(date) {
		return (data.events || []).filter(event => {
			if (!event.eventDate) return false;
			const eventDate = new Date(event.eventDate);
			return eventDate.getFullYear() === date.getFullYear() &&
				eventDate.getMonth() === date.getMonth() &&
				eventDate.getDate() === date.getDate();
		});
	}

	// Get LSS seasons for a specific date
	function getSeasonsForDate(date) {
		return (data.lssSeasons || []).filter(season => {
			const start = new Date(season.startDate);
			const end = new Date(season.endDate);
			return date >= start && date <= end;
		});
	}

	// Color palette for season bars
	const seasonColors = [
		{ bg: 'bg-amber-500/30', border: 'border-amber-500/50', text: 'text-amber-300' },
		{ bg: 'bg-purple-500/30', border: 'border-purple-500/50', text: 'text-purple-300' },
		{ bg: 'bg-emerald-500/30', border: 'border-emerald-500/50', text: 'text-emerald-300' },
		{ bg: 'bg-blue-500/30', border: 'border-blue-500/50', text: 'text-blue-300' },
		{ bg: 'bg-rose-500/30', border: 'border-rose-500/50', text: 'text-rose-300' },
		{ bg: 'bg-cyan-500/30', border: 'border-cyan-500/50', text: 'text-cyan-300' },
	];

	function getSeasonColor(index) {
		return seasonColors[index % seasonColors.length];
	}

	// Get season bars for a week row (returns array of {season, startCol, span, isStart, isEnd})
	function getSeasonBarsForWeek(weekDays, seasonIndex) {
		const seasons = data.lssSeasons || [];
		if (seasonIndex >= seasons.length) return [];

		const season = seasons[seasonIndex];
		const seasonStart = new Date(season.startDate);
		const seasonEnd = new Date(season.endDate);

		// Normalize dates for comparison (remove time component)
		seasonStart.setHours(0, 0, 0, 0);
		seasonEnd.setHours(23, 59, 59, 999);

		const weekStart = new Date(weekDays[0].date);
		const weekEnd = new Date(weekDays[6].date);
		weekStart.setHours(0, 0, 0, 0);
		weekEnd.setHours(23, 59, 59, 999);

		// Check if season overlaps with this week
		if (seasonEnd < weekStart || seasonStart > weekEnd) {
			return null;
		}

		// Calculate start column (0-6)
		let startCol = 0;
		if (seasonStart > weekStart) {
			for (let i = 0; i < 7; i++) {
				const dayDate = new Date(weekDays[i].date);
				dayDate.setHours(0, 0, 0, 0);
				if (dayDate >= seasonStart) {
					startCol = i;
					break;
				}
			}
		}

		// Calculate end column (0-6)
		let endCol = 6;
		if (seasonEnd < weekEnd) {
			for (let i = 6; i >= 0; i--) {
				const dayDate = new Date(weekDays[i].date);
				dayDate.setHours(0, 0, 0, 0);
				if (dayDate <= seasonEnd) {
					endCol = i;
					break;
				}
			}
		}

		const span = endCol - startCol + 1;
		const isStart = seasonStart >= weekStart && seasonStart <= weekEnd;
		const isEnd = seasonEnd >= weekStart && seasonEnd <= weekEnd;

		return { season, startCol, span, isStart, isEnd };
	}

	// Split calendar days into weeks
	$: calendarWeeks = calendarDays ? [
		calendarDays.slice(0, 7),
		calendarDays.slice(7, 14),
		calendarDays.slice(14, 21),
		calendarDays.slice(21, 28),
		calendarDays.slice(28, 35),
		calendarDays.slice(35, 42)
	] : [];

	// Check if date is today
	function isToday(date) {
		const today = new Date();
		return date.getFullYear() === today.getFullYear() &&
			date.getMonth() === today.getMonth() &&
			date.getDate() === today.getDate();
	}

	// Circuit colors for badges
	const circuitColors = {
		'Los Angeles': {
			bg: 'bg-blue-500',
			text: 'text-blue-400',
			bgLight: 'bg-blue-500/10',
			// Calendar-specific classes
			ping: 'bg-blue-400',
			dot: 'bg-blue-500',
			ring: 'ring-blue-500/30',
			cellBg: 'bg-blue-950/30',
			cellBorder: 'border-blue-500/20',
			eventGradient: 'from-blue-600/30 to-blue-500/20',
			eventGradientHover: 'hover:from-blue-600/50 hover:to-blue-500/40',
			eventText: 'text-blue-300',
			eventBorder: 'border-blue-500/30',
			eventBorderHover: 'hover:border-blue-400/50',
			eventShadow: 'hover:shadow-blue-500/20'
		},
		'St. Louis': {
			bg: 'bg-green-500',
			text: 'text-green-400',
			bgLight: 'bg-green-500/10',
			ping: 'bg-green-400',
			dot: 'bg-green-500',
			ring: 'ring-green-500/30',
			cellBg: 'bg-green-950/30',
			cellBorder: 'border-green-500/20',
			eventGradient: 'from-green-600/30 to-green-500/20',
			eventGradientHover: 'hover:from-green-600/50 hover:to-green-500/40',
			eventText: 'text-green-300',
			eventBorder: 'border-green-500/30',
			eventBorderHover: 'hover:border-green-400/50',
			eventShadow: 'hover:shadow-green-500/20'
		},
		'New England': {
			bg: 'bg-purple-500',
			text: 'text-purple-400',
			bgLight: 'bg-purple-500/10',
			ping: 'bg-purple-400',
			dot: 'bg-purple-500',
			ring: 'ring-purple-500/30',
			cellBg: 'bg-purple-950/30',
			cellBorder: 'border-purple-500/20',
			eventGradient: 'from-purple-600/30 to-purple-500/20',
			eventGradientHover: 'hover:from-purple-600/50 hover:to-purple-500/40',
			eventText: 'text-purple-300',
			eventBorder: 'border-purple-500/30',
			eventBorderHover: 'hover:border-purple-400/50',
			eventShadow: 'hover:shadow-purple-500/20'
		}
	};

	// Default colors for events without a circuit
	const defaultCircuitColor = {
		bg: 'bg-gray-500',
		text: 'text-gray-400',
		bgLight: 'bg-gray-500/10',
		ping: 'bg-gray-400',
		dot: 'bg-gray-500',
		ring: 'ring-gray-500/30',
		cellBg: 'bg-gray-950/30',
		cellBorder: 'border-gray-500/20',
		eventGradient: 'from-gray-600/30 to-gray-500/20',
		eventGradientHover: 'hover:from-gray-600/50 hover:to-gray-500/40',
		eventText: 'text-gray-300',
		eventBorder: 'border-gray-500/30',
		eventBorderHover: 'hover:border-gray-400/50',
		eventShadow: 'hover:shadow-gray-500/20'
	};

	// Standings search and filter
	let searchQuery = '';
	let standingsCircuit = 'all';
	let standingsSeason = data.selectedSeason || data.currentYear;

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
		const diff = sortColumn === 'rank'
			? (sortDirection === 'asc' ? aVal - bVal : bVal - aVal)
			: (sortDirection === 'desc' ? bVal - aVal : aVal - bVal);

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
					answer: 'Register online through our website by selecting your desired event from the Events tab and completing payment. On-site registration may be available if capacity permits, but online pre-registration is strongly recommended as events can sell out. Premium members receive a 10% discount on all event registrations.'
				},
				{
					question: 'Is a GEM ID required?',
					answer: 'Yes, a valid GEM ID is required to participate in all AGE Open events. Your GEM ID ensures accurate tracking of match results, standings, and AGE Points. You can register for a free GEM ID through Legend Story Studios at fabtcg.com. Please have your GEM ID ready at check-in.'
				},
				{
					question: 'What is the refund policy?',
					answer: 'Full refunds are available up until 24 hours before the event start time. Refunds are processed back to the original credit card used for purchase. No refunds are available within 24 hours of the event. Exceptions may be made for documented emergencies at the Tournament Organizer\'s discretion. Contact us directly for refund requests.'
				},
				{
					question: 'Can I transfer my registration to another player?',
					answer: 'Registration transfers are permitted up to 24 hours before the event start time. Contact the Tournament Organizer with both the original registrant\'s and new player\'s information. The new player must meet all registration requirements including having a valid GEM ID.'
				},
				{
					question: 'What time should I arrive?',
					answer: 'Players should arrive at least 30 minutes before the posted start time to complete check-in. Late arrivals may receive a Round 1 game loss or match loss at the Head Judge\'s discretion. Players who are not checked in by the start of Round 1 pairings may be dropped from the event.'
				},
				{
					question: 'What do I need to bring?',
					answer: 'Required: Your registered and sleeved deck, hero card, equipment, weapons, tokens/counters, a method to track life totals, your GEM ID, and valid photo ID. Recommended: Playmat, dice, pen and paper, water bottle, and snacks. All cards must be in tournament-legal condition (not marked, bent, or identifiable from the back).'
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
					answer: 'Yes, all players must submit a decklist before the start of Round 1. Decklists can be submitted online during registration or on paper at check-in. Players who fail to submit a decklist by the deadline will receive a game loss in Round 1. Decklists are confidential during the event and may be published afterward at the Tournament Organizer\'s discretion.'
				},
				{
					question: 'Can I change my deck after submitting?',
					answer: 'No changes to your registered decklist are permitted once submitted, except to correct illegal configurations discovered before Round 1. If an illegal deck is discovered after the event begins, penalties will be assessed. Players are responsible for verifying their deck matches their submitted list.'
				},
				{
					question: 'What happens if my deck is illegal?',
					answer: 'If an illegal deck (wrong card count, banned cards, unregistered cards, etc.) is discovered before Round 1, you may correct it without penalty. If discovered during the tournament, penalties range from a game loss to disqualification depending on severity and whether advantage was gained. Deck checks may occur at any time during the event.'
				},
				{
					question: 'What card conditions are allowed?',
					answer: 'All cards must be genuine Flesh and Blood cards in Near Mint to Lightly Played condition. Cards must be sleeved in opaque sleeves that make card backs indistinguishable. Marked, bent, or damaged cards that could allow identification must be replaced. Judges may require sleeve or card replacement at any time.'
				},
				{
					question: 'Are proxy cards allowed?',
					answer: 'No proxy cards are permitted in AGE Open events. All cards must be genuine Flesh and Blood cards. Players may request to borrow cards from other participants or spectators before the event, but all cards must be authentic during play.'
				},
				{
					question: 'What format is played at AGE Opens?',
					answer: 'AGE Opens use Classic Constructed format unless otherwise specified. The current banned and restricted list as published by Legend Story Studios applies. Check the specific event listing for format details and any additional restrictions.'
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
					answer: 'Swiss rounds are determined by attendance: 8 players = 3 rounds, 9-16 players = 4 rounds, 17-32 players = 5 rounds, 33-64 players = 6 rounds, 65-128 players = 7 rounds, 129-226 players = 8 rounds, 227-409 players = 9 rounds, 410+ players = 10 rounds. The Head Judge reserves the right to adjust round count based on time constraints.'
				},
				{
					question: 'Is there a Top 8 cut?',
					answer: 'Yes, after Swiss rounds, the Top 8 players by standings advance to a single-elimination playoff bracket. Quarterfinals and Semifinals are best-of-one matches. The Finals may be best-of-three at the Tournament Organizer\'s discretion. Draws are not permitted in Top 8 matches.'
				},
				{
					question: 'How are tiebreakers calculated?',
					answer: 'Following official FAB tournament policy, standings are determined by: 1) Match Points (3 for win, 0 for draw/loss), 2) CTB (Cumulative Tiebreaker) - the player whose wins came later in the tournament has the advantage, 3) PML (Player Match Loss) - fewer match losses is better, 4) OML% (Opponent Match Loss %) - lower percentage is better, 5) OCTB (Opponent Cumulative Tiebreaker) - higher is better, 6) Random if still tied. In Top 8, the player with better tiebreakers receives the higher seed.'
				},
				{
					question: 'What happens if there is an odd number of players?',
					answer: 'The lowest-ranked player without a bye receives a bye each round. A bye counts as a 2-0 match win (3 match points). Players cannot receive more than one bye during Swiss rounds unless all other players have already received one. Byes earned through other means (e.g., promotional byes) are applied first.'
				},
				{
					question: 'Can I intentionally draw with my opponent?',
					answer: 'Per FAB Tournament Rules and Policy: Players may intentionally draw games and/or matches by mutual agreement at any time, EXCEPT during elimination rounds (Top 8). Draws award 0 match points. For concessions: Players may concede at any time during Swiss rounds, but in timed rounds, once you take an in-game action after time is called, you may no longer concede and must play to conclusion. IMPORTANT: Players may NOT ask their opponent for a concession at any time - doing so results in a match loss in the next round. Players may not concede in exchange for any consideration (prizes, money, etc.) as this constitutes bribery.'
				},
				{
					question: 'What if I need to drop from the tournament?',
					answer: 'Players may drop from the tournament at any time through GEM (the tournament software) or by notifying a judge. Dropped players receive a match loss for the current round if in progress. Players who drop during Top 8 forfeit all prizes associated with their finishing position. Re-entry is not permitted after dropping.'
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
					answer: 'Swiss rounds are 55 minutes. All rounds are Best of 1 (single game). Per FAB Tournament Rules and Policy End-of-Game Procedure: When time is called, if the turn player has no decisions remaining or clearly indicates they intend to end their turn, the opponent gets a full turn, then 1 additional turn occurs. If neither player has won after extra turns, the player with the higher life total wins the game. If life totals are tied after extra turns, the game is a draw. Top 8 matches have no time limit but are subject to slow play enforcement.'
				},
				{
					question: 'Who goes first?',
					answer: 'All AGE Open rounds are Best of 1 (single game per round). At the start of each game, players roll dice or use another random method to determine who chooses to go first or second. In Top 8, the higher-seeded player chooses whether to go first or second.'
				},
				{
					question: 'Can I take notes during a match?',
					answer: 'Yes, you may take notes during your match about the current game state, life totals, and publicly known information. You may NOT reference outside notes or information brought into the match. Notes must be taken in view of your opponent and judges may request to see your notes at any time. Per FAB rules, electronic devices may be used for note-taking as long as they are visible and accessible to all players, and you are not receiving outside assistance.'
				},
				{
					question: 'What about electronic devices during matches?',
					answer: 'Per FAB Tournament Rules and Policy, electronic devices may be used during matches if they are visible and accessible to all players in the match. However, electronic devices cannot be used to receive strategic advice from external sources during a match. Players may use devices for life tracking or timers. Using electronic devices to receive outside assistance during a match (coaching, strategy tips, etc.) is considered Outside Assistance and may result in penalties. Feature match players may have additional restrictions on device use.'
				},
				{
					question: 'Can I get an extension for a judge call?',
					answer: 'Yes, time extensions are granted for judge calls that significantly interrupt play. Extensions are typically 2-3 minutes per call and are added to the end of the round. The table judge or Head Judge determines appropriate extensions. Players should not exploit judge calls to gain extra time.'
				},
				{
					question: 'What happens if I need a bathroom break?',
					answer: 'Players may request a bathroom break once per match by calling a judge. The match clock continues during breaks. Breaks longer than 5 minutes may result in slow play penalties. Plan accordingly and use breaks between rounds when possible. Top 8 players may request judge supervision during breaks.'
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
					answer: 'Penalties escalate in severity: Caution (verbal reminder, no penalty), Warning (documented, no game impact), Game Loss (lose current or next game), Match Loss (lose the match), Disqualification (removed from event, forfeits prizes). Repeated warnings of the same type upgrade to game losses. Severe or intentional infractions may skip directly to harsher penalties.'
				},
				{
					question: 'What counts as slow play?',
					answer: 'Per FAB Tournament Rules and Policy, slow play is taking more time than reasonably necessary to make game decisions. The start-of-game procedure (including hero reveal, equipment selection, and shuffling) should take no more than 5 minutes for the first game and 3 minutes for subsequent games. During gameplay, factors considered include: game complexity, time remaining, and whether the pace is unreasonable. First offense is typically a Warning. Continued slow play results in a Game Loss. Stalling (intentionally playing slowly to benefit from time) is Unsporting Conduct - Cheating and results in Disqualification.'
				},
				{
					question: 'What is considered cheating?',
					answer: 'Cheating includes: marked cards or sleeves, drawing extra cards, misrepresenting game state, stacking decks, bribery, improperly determining match outcome, and any intentional rule violation to gain advantage. Cheating results in immediate Disqualification and may include bans from future events. Suspected cheating should be reported to a judge immediately.'
				},
				{
					question: 'What happens if I make a game error?',
					answer: 'Game Rule Violations (GRV) occur when rules are broken unintentionally. Judges will correct the game state if possible and issue a Warning. Repeated GRVs upgrade to Game Loss. If both players commit errors, both receive penalties. Players are expected to know the game rules; ignorance is not an excuse.'
				},
				{
					question: 'Can I be penalized for my opponent\'s mistake?',
					answer: 'Failure to Maintain Game State (FTMGS) occurs when you allow your opponent to commit an error without catching it. This includes missing mandatory triggers and not correcting illegal plays. FTMGS results in a Warning. You are expected to help maintain correct game state at all times.'
				},
				{
					question: 'What is Unsporting Conduct?',
					answer: 'Unsporting Conduct includes: profanity, aggressive behavior, harassment, arguing with officials, damaging property, theft, or any behavior that creates a hostile environment. Minor offenses result in Warnings. Major offenses result in Game/Match Loss or Disqualification. Harassment or discrimination results in immediate Disqualification and potential ban from future events.'
				},
				{
					question: 'What happens if I\'m late to a round?',
					answer: 'Per FAB Procedure and Penalty Guide, tardiness occurs when a player is not at their assigned table when the round timer begins. Penalties: Less than 1 minute late = Warning (downgrade), 1-10 minutes late = IP2 (Intellect Penalty - Minor), More than 10 minutes late = Game Loss (upgrade). The table\'s round time is extended by the total time delayed. If a player is more than 10 minutes tardy, they should be dropped before the next round unless they report to the scorekeeper. Time is measured from when the round timer begins (or scheduled end of previous round if matches finished early). Tardiness infractions do not escalate - each is handled individually.'
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
					answer: 'Raise your hand and clearly say "Judge!" to summon a floor judge. Pause the game while waiting (do not continue play). Either player may call a judge at any time for any reason. Do not attempt to resolve disputes without a judge. Judge calls are free and encouraged - never hesitate to call a judge.'
				},
				{
					question: 'Can I appeal a ruling?',
					answer: 'Per FAB Tournament Rules and Policy: After a judge makes a ruling, but before the procedure or penalty is applied, either player may appeal by stating "I would like to appeal." The floor judge will explain their ruling to the Head Judge, who makes the final decision. If the Head Judge is the first responder, you may still request an appeal - the Head Judge will consult with another judge before affirming or modifying their ruling. At events with only one judge present, that judge\'s ruling is final. Players may appeal to the Tournament Organizer, who will discuss the ruling privately and issue a final decision. After the event, players may contact the TO to leave feedback about rulings, judges, or situations.'
				},
				{
					question: 'What if I disagree with the Head Judge?',
					answer: 'Head Judge rulings are final during the event. After the event, you may submit feedback to the Tournament Organizer. Arguing with officials after a ruling is made is Unsporting Conduct and may result in penalties. Maintain professionalism even when you disagree with a ruling.'
				},
				{
					question: 'Can judges give strategic advice?',
					answer: 'No, judges cannot provide strategic advice or suggest plays. They can only answer rules questions, clarify card interactions, and resolve disputes. Judges will not tell you the "correct" play in a situation. If you ask "what should I do?", a judge can only explain your legal options.'
				},
				{
					question: 'What if there\'s a language barrier?',
					answer: 'Players who speak different languages may request a judge to facilitate communication. English is the official tournament language for card text and rules disputes. Players may bring a translator (who is not a current participant) with Head Judge approval. All official announcements will be made in English.'
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
					answer: 'Players are expected to: treat opponents, judges, and staff with respect; maintain good hygiene; keep play areas clean; play in a timely manner; represent the game state accurately; and accept judge rulings gracefully. AGE Opens are competitive but friendly events - good sportsmanship is paramount.'
				},
				{
					question: 'What about hygiene standards?',
					answer: 'Players must maintain reasonable hygiene standards. This includes wearing clean clothing, using deodorant, and washing hands. Players with hygiene issues that impact opponents may be asked to address the issue, and failure to comply may result in removal from the event. This policy ensures a comfortable environment for all participants.'
				},
				{
					question: 'Can I eat or drink during matches?',
					answer: 'Non-alcoholic beverages in spill-proof containers are permitted at tables. Light snacks are acceptable but should not delay play or create mess. Keep food and drink away from cards and play areas. Clean up after yourself. Alcohol is not permitted during competition regardless of venue policies.'
				},
				{
					question: 'What about spectators and coaching?',
					answer: 'Spectators must remain silent during matches and may not communicate with players by any means. Coaching from spectators is strictly prohibited during matches and in Top 8. Between rounds, players may discuss games with others. Spectators who interfere with matches may be asked to leave the event.'
				},
				{
					question: 'What if I observe cheating or misconduct?',
					answer: 'Report suspected cheating or misconduct to a judge immediately. You may request to speak privately if sensitive. Provide as much detail as possible: what you saw, when, and who was involved. Reports are taken seriously and investigated confidentially. Retaliation against reporters is prohibited.'
				},
				{
					question: 'Can I concede a match to help a friend?',
					answer: 'Per FAB Tournament Rules and Policy: Players may concede games and/or matches at any time during Swiss rounds. However, in timed rounds, once you take an in-game action after time is called (or acknowledge your opponent\'s action), you may no longer concede and must play to conclusion. IMPORTANT: You may NOT ask your opponent for a concession at any time - doing so results in a match loss in the next round. You may NOT concede in exchange for any consideration (prizes, money, etc.) as this constitutes bribery. If players discuss considerations dependent on match outcome, they may no longer concede. Coordinating concessions to manipulate standings is collusion and results in Disqualification.'
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
					answer: 'Yes, by registering for an AGE Open, you consent to being selected for feature matches and live stream coverage. Matches may be recorded, photographed, and broadcast on official AGE channels. This footage may be used for promotional purposes. Players who are uncomfortable appearing on camera should notify the Tournament Organizer before the event.'
				},
				{
					question: 'Can I refuse to be on stream?',
					answer: 'Players may request not to be featured on stream by notifying the Tournament Organizer before the event. However, in Top 8, being featured on stream may be mandatory. If you refuse to participate in Top 8 coverage after being selected, you may be required to forfeit your match. Accommodations for legitimate concerns (safety, privacy) will be considered on a case-by-case basis.'
				},
				{
					question: 'Is there a stream delay?',
					answer: 'Our official broadcast has a minimal stream delay. Players in feature matches may not access electronic devices except in extraneous circumstances (emergency situations, being on call for work or other obligations). Using electronic devices to view the stream during a match is considered cheating and will be dealt with appropriately. Communication with spectators is prohibited during matches. Attempting to receive outside information during a feature match results in Disqualification.'
				},
				{
					question: 'What about content creation and recording?',
					answer: 'Personal recording of your own matches is generally permitted with opponent consent. Recording other players\' matches requires their permission. Commercial recording or streaming requires Tournament Organizer approval. Decklists, standings, and official coverage are property of Arcane Games & Events.'
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
					answer: 'Cash prizes are distributed at the end of the event to Top 8 finishers. Bring valid photo ID matching your registration. Prizes not claimed within 30 days of the event may be forfeited. For players who must leave early, contact the Tournament Organizer to arrange pickup or alternative arrangements.'
				},
				{
					question: 'Can prize payouts be split?',
					answer: 'Prize splits among Top 8 finishers are permitted if agreed upon before matches begin. Players must still play out matches to determine standings and AGE Points. Split agreements cannot involve players outside Top 8, and the tournament structure must still be followed. Report all splits to the Head Judge.'
				},
				{
					question: 'Are prizes taxable?',
					answer: 'Prizes may be subject to local tax laws. Players who win $600 or more in a calendar year will receive appropriate tax documentation. International players should consult their local tax regulations. AGE is not responsible for tax obligations of prize winners.'
				},
				{
					question: 'How are AGE Points awarded?',
					answer: 'AGE Points are awarded based on final standings: 1st = 30 pts, 2nd = 25 pts, 3rd-4th = 20 pts, 5th-8th = 15 pts, 9th-12th = 12 pts, 13th-16th = 8 pts, All participants = 1 pt. Points are tracked per circuit and accumulate throughout the season. Disqualified players do not receive AGE Points.'
				},
				{
					question: 'How are Player\'s Championship invites determined?',
					answer: 'The top 16 players by total AGE Points in each circuit at the end of the season receive invitations. Tiebreakers for qualification are: 1) Most Top 8 finishes, 2) Most match wins, 3) Most events attended. Players must accept their invitation within 14 days or the next eligible player is invited.'
				},
				{
					question: 'What happens if a qualified player can\'t attend the Championship?',
					answer: 'Players who decline or cannot attend the Player\'s Championship should notify AGE as soon as possible. Their spot will pass down to the next qualified player. Invitations are non-transferable to specific players. Players who withdraw with proper notice will not face any penalties or future restrictions. However, failure to show up to the Player\'s Championship without warning or notice may result in penalties or restrictions from future AGE events.'
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
					answer: 'Automatic DQ offenses include: Cheating of any kind, bribery or collusion, aggressive or threatening behavior, theft, harassment or discrimination, severe Unsporting Conduct, physical altercation, or impersonating another player. DQ\'d players must leave the venue immediately and forfeit all prizes. DQs are reported to and may be investigated by Legend Story Studios.'
				},
				{
					question: 'What happens after a Disqualification?',
					answer: 'The disqualified player will be dropped from the tournament immediately. No prizing will be awarded. All information will be documented and submitted to Legend Story Studios (LSS). AGE will conduct its own investigation and hand out appropriate penalties as we see fit. Players may be asked to leave the venue entirely. Further action (suspension or ban from future AGE events) may follow investigation.'
				},
				{
					question: 'How do event bans work?',
					answer: 'Players may be banned from future AGE events for serious infractions. Ban lengths range from a single event to lifetime depending on severity. Bans may be issued immediately at an event or following investigation. Banned players who attempt to register or attend events may be removed without refund and reported to authorities if trespassing.'
				},
				{
					question: 'Can I appeal a Disqualification or ban?',
					answer: 'You may submit a written appeal to Arcane Games & Events within 30 days of the DQ or ban. Include your full account of events and any supporting evidence. Appeals are reviewed by TO staff not involved in the original decision. You will receive a written response within 14 days. Appeal decisions are final.'
				},
				{
					question: 'What about LSS suspensions?',
					answer: 'Players suspended by Legend Story Studios are not permitted to participate in AGE Open events for the duration of their suspension. AGE reserves the right to independently ban players regardless of LSS status. Participation in events while suspended results in immediate removal and extended ban.'
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
		ticket: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z',
		cards: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
		bracket: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z',
		clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
		warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
		gavel: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3',
		user: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
		camera: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
		trophy: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
		ban: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636'
	};

	const faqItems = [
		{
			question: 'What is the AGE Open Series?',
			answer: 'The AGE Open Series is a year-long competitive Flesh and Blood tournament circuit featuring monthly $1,000 Opens across multiple circuits. Players earn AGE Points based on their performance, with the top 16 players in each circuit qualifying for the Player\'s Championship. In 2026, the series expands to 24 Opens, a $30,000 total prize pool, and 3 AGE Championships across our circuits.'
		},
		{
			question: 'How do I register for an event?',
			answer: 'Register online through this website by selecting your desired event from the Events tab. Pre-registration is strongly recommended as events can sell out. Premium members receive a 10% discount on all registrations. A valid GEM ID is required for all events.'
		},
		{
			question: 'What format is played at AGE Opens?',
			answer: 'AGE Opens use Classic Constructed format unless otherwise specified in the event listing. The current LSS banned and restricted list applies. Check individual event pages for format-specific details.'
		},
		{
			question: 'How do AGE Points work?',
			answer: 'AGE Points are earned based on final placement: 1st = 30 pts, 2nd = 25 pts, 3rd-4th = 20 pts, 5th-8th = 15 pts, 9th-12th = 12 pts, 13th-16th = 8 pts, all participants = 1 pt. Points accumulate throughout the season to determine Player\'s Championship qualifiers.'
		},
		{
			question: 'How do I qualify for the Player\'s Championship?',
			answer: 'The top 16 players by AGE Points in each circuit receive automatic invitations. Tiebreakers are: 1) Most Top 8 finishes, 2) Most match wins, 3) Most events attended. Check the Standings tab to view current rankings.'
		},
		{
			question: 'Can I get a refund if I can\'t attend?',
			answer: 'Full refunds are available up until 24 hours before the event. Refunds are processed back to the original credit card used for purchase. No refunds within 24 hours of the event. Contact us for special circumstances or emergencies.'
		}
	];

	function toggleFaq(index) {
		openFaqIndex = openFaqIndex === index ? null : index;
	}

	// Get unique heroes from decklists
	$: uniqueHeroes = [...new Set((data.decklists || []).map(d => d.hero).filter(Boolean))].sort();

	// Filter decklists
	$: filteredDecklists = (data.decklists || [])
		.filter(d => decklistCircuit === 'all' || d.circuit === decklistCircuit)
		.filter(d => decklistHero === 'all' || d.hero === decklistHero)
		.filter(d => {
			if (!decklistSearch) return true;
			const search = decklistSearch.toLowerCase();
			return d.playerName.toLowerCase().includes(search) ||
				(d.deckName && d.deckName.toLowerCase().includes(search)) ||
				(d.hero && d.hero.toLowerCase().includes(search));
		});

	// Filter events by circuit
	$: laEvents = (data.events || []).filter((e) => e.circuit === 'Los Angeles');
	$: stlEvents = (data.events || []).filter((e) => e.circuit === 'St. Louis');
	$: neEvents = (data.events || []).filter((e) => e.circuit === 'New England');

	// Count events per circuit
	$: laCount = laEvents.length;
	$: stlCount = stlEvents.length;
	$: neCount = neEvents.length;

	// All upcoming events sorted by date
	$: upcomingEvents = (data.events || []).filter((e) => new Date(e.eventDate) >= new Date());

	// Circuit slots configuration (8 guaranteed opens per circuit)
	const SLOTS_PER_CIRCUIT = 8;

	// Get circuit slots - sorted by date, fill slots 1-8
	function getCircuitSlots(events, circuit) {
		const circuitEvents = events
			.filter(e => e.circuit === circuit)
			.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));

		const slots = [];
		for (let i = 0; i < SLOTS_PER_CIRCUIT; i++) {
			slots.push(circuitEvents[i] || null);
		}
		return slots;
	}

	$: laSlots = getCircuitSlots(data.events || [], 'Los Angeles');
	$: neSlots = getCircuitSlots(data.events || [], 'New England');
	$: stlSlots = getCircuitSlots(data.events || [], 'St. Louis');

	// Circuit filter state
	let selectedCircuit = 'all';

	// Filtered events based on circuit selection
	$: filteredEvents = selectedCircuit === 'all'
		? (data.events || [])
		: (data.events || []).filter((e) => e.circuit === selectedCircuit);

	// Get circuit color classes
	function getCircuitColor(circuit) {
		return circuitColors[circuit] || defaultCircuitColor;
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
			hour12: true
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

<div class="min-h-screen bg-gray-950">
	<!-- Hero Section -->
	<section class="relative overflow-hidden bg-gradient-to-b from-gray-900 to-gray-950 py-8">
		<!-- Animated background -->
		<div class="absolute inset-0">
			<div class="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-green-500/10"></div>
			<div class="absolute top-1/2 left-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
			<div class="absolute top-1/2 right-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl"></div>
		</div>

		<div class="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="text-center">
				<!-- Season Badge -->
				<div class="mb-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-sm font-medium text-amber-300">
					<span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
					2026 Season Now Open
				</div>

				<!-- Title -->
				<h1 class="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-2 tracking-tight">
					AGE Open Series
				</h1>

				<!-- Tagline -->
				<p class="text-xl sm:text-2xl font-semibold text-white mb-3">
					Compete. Climb. <span class="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500">Win.</span>
				</p>

				<!-- Description -->
				<p class="text-gray-300 max-w-2xl mx-auto mb-4 text-sm sm:text-base">
					Join the premier <span class="text-white font-medium">independent</span> Flesh and Blood tournament circuit.
					<span class="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 font-semibold">$1,000 prize pools</span>,
					<span class="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 font-semibold">AGE Points</span>, and your shot at the
					<span class="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400 font-semibold">Player's Championship</span>.
				</p>

				<!-- Stats -->
				<div class="flex flex-wrap items-center justify-center gap-x-2 sm:gap-x-3 gap-y-1 text-sm sm:text-base mb-5">
					<span><span class="font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">$30K</span> <span class="text-gray-400">Prize Pool</span></span>
					<span class="text-gray-600">·</span>
					<span><span class="font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">24</span> <span class="text-gray-400">Events</span></span>
					<span class="text-gray-600">·</span>
					<span><span class="font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">3</span> <span class="text-gray-400">AGE Champions</span></span>
				</div>

				<!-- CTA Button -->
				<button
					onclick={() => switchTab('events')}
					class="group inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-6 py-3 font-semibold text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105 transition-all"
				>
					Play in an AGE Open
					<svg class="h-4 w-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
					</svg>
				</button>
			</div>
		</div>
	</section>

	<!-- Tab Navigation -->
	<nav class="sticky top-0 z-10 border-b border-gray-800 bg-gray-900/95 backdrop-blur-sm">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="relative">
				<div class="flex space-x-1 overflow-x-auto py-2 scrollbar-hide">
					{#each tabs as tab}
						<button
							onclick={() => switchTab(tab.id)}
							class="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all {activeTab === tab.id
								? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/50'
								: 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'}"
						>
							{#if tab.icon === 'home'}
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
								</svg>
							{:else if tab.icon === 'calendar'}
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
								</svg>
							{:else if tab.icon === 'ticket'}
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
								</svg>
							{:else if tab.icon === 'calendar-days'}
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
								</svg>
							{:else if tab.icon === 'trophy'}
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
								</svg>
							{:else if tab.icon === 'cards'}
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
								</svg>
							{:else if tab.icon === 'chart'}
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
								</svg>
							{:else if tab.icon === 'info'}
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							{/if}
							{tab.name}
						</button>
					{/each}
				</div>
				<!-- Mobile scroll indicator - gradient fade on right -->
				<div class="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-gray-900 to-transparent pointer-events-none sm:hidden flex items-center justify-end pr-1">
					<svg class="h-4 w-4 text-gray-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
					</svg>
				</div>
			</div>
		</div>
	</nav>

	<!-- Tab Content -->
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
		<!-- Overview Tab -->
		{#if activeTab === 'overview'}
			<div class="space-y-12">

				<!-- Featured Next Event - Compact Hero Card -->
				{#if upcomingEvents.length > 0}
					{@const nextEvent = upcomingEvents[0]}
					{@const nextColors = getCircuitColor(nextEvent.circuit)}
					{@const circuitImages = {
						'Los Angeles': '/images/circuits/los-angeles.jpg',
						'New England': '/images/circuits/new-england.jpg',
						'St. Louis': '/images/circuits/st-louis.jpg'
					}}
					{@const bgImage = circuitImages[nextEvent.circuit] || '/images/circuits/los-angeles.jpg'}

					<a href="/age-open/{nextEvent.id}" class="group block">
						<div class="relative overflow-hidden rounded-2xl border {nextColors.eventBorder} {nextColors.eventBorderHover} transition-all hover:shadow-2xl {nextColors.eventShadow}">
							<!-- Background Image -->
							<div class="absolute inset-0">
								<img src={bgImage} alt="" class="w-full h-full object-cover opacity-80 group-hover:opacity-90 group-hover:scale-105 transition-all duration-700" />
								<div class="absolute inset-0 bg-gradient-to-r from-gray-950/90 via-gray-950/70 to-gray-950/30"></div>
							</div>

							<!-- Circuit Accent Bar -->
							<div class="{nextColors.bg} px-4 py-1.5 relative z-10 flex items-center justify-between">
								<div class="flex items-center gap-3">
									<span class="text-white/90 text-xs font-semibold uppercase tracking-widest">{nextEvent.circuit} Circuit</span>
									<span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-white/20 text-white">
										<span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
										Next Event
									</span>
								</div>
								{#if nextEvent.format}
									<span class="text-white/70 text-xs font-medium hidden sm:block">{nextEvent.format}</span>
								{/if}
							</div>

							<!-- Card Content -->
							<div class="relative px-5 py-4 sm:px-6 sm:py-5">
								<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
									<!-- Left: Event Info -->
									<div class="flex-1 min-w-0">
										<h2 class="text-xl sm:text-2xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
											{nextEvent.title}
										</h2>
										<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400">
											{#if nextEvent.eventDate}
												<span class="flex items-center gap-1.5">
													<svg class="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
													</svg>
													{new Date(nextEvent.eventDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
												</span>
											{/if}
											{#if nextEvent.location}
												<span class="flex items-center gap-1.5">
													<svg class="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
													</svg>
													<span class="truncate max-w-[200px]">{nextEvent.location}</span>
												</span>
											{/if}
										</div>
									</div>

									<!-- Right: Price & CTA -->
									<div class="flex items-center gap-4 sm:gap-6">
										<div class="text-right">
											<div class="text-2xl sm:text-3xl font-bold text-white">${formatPrice(nextEvent.price)}</div>
											<div class="text-xs text-gray-500">Entry Fee</div>
										</div>
										<div class="flex items-center gap-2 rounded-xl {nextColors.bg} px-5 py-3 font-semibold text-white shadow-lg group-hover:scale-105 transition-transform">
											<span class="hidden sm:inline">Register</span>
											<svg class="h-5 w-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
											</svg>
										</div>
									</div>
								</div>
							</div>
						</div>
					</a>
				{/if}

				<!-- Your Path to Championship - Premium Section -->
				<div class="relative overflow-hidden rounded-2xl border border-gray-800 bg-gradient-to-b from-gray-900/80 to-gray-950 p-5 sm:p-6">
					<!-- Decorative background elements -->
					<div class="absolute inset-0 overflow-hidden">
						<div class="absolute -top-24 -left-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
						<div class="absolute -bottom-24 -right-24 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl"></div>
					</div>

					<!-- Section Header -->
					<div class="relative text-center mb-6">
						<div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-xs font-medium text-blue-300 mb-3">
							<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
							</svg>
							The Journey
						</div>
						<h2 class="text-2xl sm:text-3xl font-bold text-white mb-2">
							Your Path to Becoming an <span class="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500">AGE Champion</span>
						</h2>
						<p class="text-gray-400 max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
							Every legend has an origin story — yours starts here. Battle your way through local events,
							rack up <span class="text-blue-400 font-medium">AGE Points</span>, and rise through the ranks.
							The top players earn their spot at <span class="text-amber-400 font-medium">The Player's Championship</span>.
						</p>
					</div>

					<!-- Journey Steps with Connecting Line -->
					<div class="relative">
						<!-- Connecting line (desktop) -->
						<div class="hidden md:block absolute top-8 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 via-green-500 to-amber-500 opacity-30"></div>

						<div class="grid gap-4 md:gap-3 md:grid-cols-4">
							<!-- Step 1: Register -->
							<div class="relative group">
								<div class="relative flex flex-col items-center text-center">
									<!-- Icon Circle -->
									<div class="relative mb-3">
										<div class="absolute inset-0 bg-blue-500/20 rounded-full blur-lg group-hover:bg-blue-500/40 transition-all duration-500"></div>
										<div class="relative w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-all duration-300">
											<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
											</svg>
										</div>
										<div class="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-gray-900 border-2 border-blue-500 flex items-center justify-center">
											<span class="text-[10px] font-bold text-blue-400">1</span>
										</div>
									</div>
									<!-- Content -->
									<h3 class="text-sm font-bold text-white mb-1 group-hover:text-blue-400 transition-colors">Register</h3>
									<p class="text-xs text-gray-500 leading-relaxed max-w-[160px]">Sign up for any AGE Open event in your region</p>
								</div>
							</div>

							<!-- Step 2: Compete -->
							<div class="relative group">
								<div class="relative flex flex-col items-center text-center">
									<!-- Icon Circle -->
									<div class="relative mb-3">
										<div class="absolute inset-0 bg-purple-500/20 rounded-full blur-lg group-hover:bg-purple-500/40 transition-all duration-500"></div>
										<div class="relative w-14 h-14 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30 group-hover:scale-110 transition-all duration-300">
											<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
											</svg>
										</div>
										<div class="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-gray-900 border-2 border-purple-500 flex items-center justify-center">
											<span class="text-[10px] font-bold text-purple-400">2</span>
										</div>
									</div>
									<!-- Content -->
									<h3 class="text-sm font-bold text-white mb-1 group-hover:text-purple-400 transition-colors">Compete</h3>
									<p class="text-xs text-gray-500 leading-relaxed max-w-[160px]">Battle through Swiss rounds and Top 8 playoffs</p>
								</div>
							</div>

							<!-- Step 3: Earn Points -->
							<div class="relative group">
								<div class="relative flex flex-col items-center text-center">
									<!-- Icon Circle -->
									<div class="relative mb-3">
										<div class="absolute inset-0 bg-green-500/20 rounded-full blur-lg group-hover:bg-green-500/40 transition-all duration-500"></div>
										<div class="relative w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30 group-hover:scale-110 transition-all duration-300">
											<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
											</svg>
										</div>
										<div class="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-gray-900 border-2 border-green-500 flex items-center justify-center">
											<span class="text-[10px] font-bold text-green-400">3</span>
										</div>
									</div>
									<!-- Content -->
									<h3 class="text-sm font-bold text-white mb-1 group-hover:text-green-400 transition-colors">Earn Points</h3>
									<p class="text-xs text-gray-500 leading-relaxed max-w-[160px]">Accumulate AGE Points and climb the rankings</p>
								</div>
							</div>

							<!-- Step 4: Become Champion -->
							<div class="relative group">
								<div class="relative flex flex-col items-center text-center">
									<!-- Icon Circle -->
									<div class="relative mb-3">
										<div class="absolute inset-0 bg-amber-500/20 rounded-full blur-lg group-hover:bg-amber-500/40 transition-all duration-500"></div>
										<div class="relative w-14 h-14 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-all duration-300">
											<svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
												<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
											</svg>
										</div>
										<div class="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-gray-900 border-2 border-amber-500 flex items-center justify-center">
											<span class="text-[10px] font-bold text-amber-400">4</span>
										</div>
									</div>
									<!-- Content -->
									<h3 class="text-sm font-bold text-white mb-1 group-hover:text-amber-400 transition-colors">Become Champion</h3>
									<p class="text-xs text-gray-500 leading-relaxed max-w-[160px]">Top the leaderboard and qualify for the Championship</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Bottom CTA -->
					<div class="relative mt-5 pt-4 border-t border-gray-800/50 flex flex-col sm:flex-row items-center justify-center gap-3">
						<p class="text-gray-400 text-sm">Ready to begin?</p>
						<button onclick={() => switchTab('events')} class="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-purple-500/30 hover:scale-105 transition-all">
							Find Your First Event
							<svg class="h-4 w-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
							</svg>
						</button>
					</div>
				</div>

				<!-- Three Circuits Section -->
				<div class="relative overflow-hidden rounded-2xl border border-gray-800 bg-gradient-to-b from-gray-900/80 to-gray-950 p-5 sm:p-6">
					<!-- Background decoration -->
					<div class="absolute inset-0 overflow-hidden">
						<div class="absolute top-0 left-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl"></div>
						<div class="absolute top-0 left-1/2 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl"></div>
						<div class="absolute top-0 right-1/4 w-64 h-64 bg-green-500/5 rounded-full blur-3xl"></div>
					</div>

					<div class="relative text-center mb-6">
						<div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-green-500/20 border border-gray-700 text-xs font-medium text-gray-300 mb-3">
							<span class="w-2 h-2 rounded-full bg-blue-400"></span>
							<span class="w-2 h-2 rounded-full bg-purple-400"></span>
							<span class="w-2 h-2 rounded-full bg-green-400"></span>
							Regional Competition
						</div>
						<h2 class="text-2xl sm:text-3xl font-bold text-white mb-2">Three Circuits. <span class="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Three Champions.</span></h2>
						<p class="text-gray-400 max-w-xl mx-auto text-sm sm:text-base">Each circuit crowns its own AGE Champion at the end of the season. Dominate your region and etch your name into AGE Open history.</p>
					</div>

					<div class="relative grid gap-4 md:grid-cols-3">
						<!-- Los Angeles -->
						<button onclick={() => switchTab('events')} class="group relative overflow-hidden rounded-xl border border-blue-500/30 p-5 text-left hover:border-blue-500/60 transition-all h-full">
							<!-- Background Image -->
							<img
								src="/images/circuits/los-angeles.jpg"
								alt="Los Angeles skyline"
								class="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-50 group-hover:scale-105 transition-all duration-500"
							/>
							<!-- Dark overlay with blue tint -->
							<div class="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-gray-900/60"></div>
							<div class="absolute inset-0 bg-blue-500/10 group-hover:bg-blue-500/15 transition-colors"></div>
							<div class="relative" style="text-shadow: 0 1px 3px rgba(0,0,0,0.5);">
								<!-- Header -->
								<div class="flex items-center gap-3 mb-3">
									<div class="h-11 w-11 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-blue-500/30">LA</div>
									<div>
										<h3 class="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">Los Angeles</h3>
										<p class="text-xs text-blue-400/80">West Coast Circuit</p>
									</div>
								</div>
								<!-- Description -->
								<p class="text-sm text-gray-300 mb-3 leading-relaxed">The original AGE Open circuit and birthplace of our competitive series. Home to some of the most skilled FaB players on the West Coast, LA events are known for their fierce competition and electric atmosphere.</p>
								<!-- Highlights -->
								<div class="flex flex-wrap gap-2 mb-3">
									<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-xs text-blue-300 backdrop-blur-sm">
										<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
										Flagship Circuit
									</span>
									<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-xs text-blue-300 backdrop-blur-sm">
										Est. 2023
									</span>
								</div>
								<span class="inline-flex items-center gap-1 text-sm text-blue-400 font-medium group-hover:gap-2 transition-all">
									Explore LA Events <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
								</span>
							</div>
						</button>

						<!-- New England -->
						<button onclick={() => switchTab('events')} class="group relative overflow-hidden rounded-xl border border-purple-500/30 p-5 text-left hover:border-purple-500/60 transition-all h-full">
							<!-- Background Image -->
							<img
								src="/images/circuits/new-england.jpg"
								alt="Boston skyline"
								class="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-50 group-hover:scale-105 transition-all duration-500"
							/>
							<!-- Dark overlay with purple tint -->
							<div class="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-gray-900/60"></div>
							<div class="absolute inset-0 bg-purple-500/10 group-hover:bg-purple-500/15 transition-colors"></div>
							<div class="relative" style="text-shadow: 0 1px 3px rgba(0,0,0,0.5);">
								<!-- Header -->
								<div class="flex items-center gap-3 mb-3">
									<div class="h-11 w-11 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-lg shadow-purple-500/30">NE</div>
									<div>
										<h3 class="text-lg font-bold text-white group-hover:text-purple-400 transition-colors">New England</h3>
										<p class="text-xs text-purple-400/80">East Coast Circuit</p>
									</div>
								</div>
								<!-- Description -->
								<p class="text-sm text-gray-300 mb-3 leading-relaxed">Bringing high-stakes competitive Flesh and Blood to the East Coast. New England's passionate community has quickly established itself as a force to be reckoned with, producing rising stars and memorable matches.</p>
								<!-- Highlights -->
								<div class="flex flex-wrap gap-2 mb-3">
									<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-xs text-purple-300 backdrop-blur-sm">
										<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clip-rule="evenodd"/></svg>
										Rising Scene
									</span>
									<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-xs text-purple-300 backdrop-blur-sm">
										Est. 2025
									</span>
								</div>
								<span class="inline-flex items-center gap-1 text-sm text-purple-400 font-medium group-hover:gap-2 transition-all">
									Explore NE Events <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
								</span>
							</div>
						</button>

						<!-- St. Louis -->
						<button onclick={() => switchTab('events')} class="group relative overflow-hidden rounded-xl border border-green-500/30 p-5 text-left hover:border-green-500/60 transition-all h-full">
							<!-- Background Image -->
							<img
								src="/images/circuits/st-louis.jpg"
								alt="St. Louis Gateway Arch"
								class="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-50 group-hover:scale-105 transition-all duration-500"
							/>
							<!-- Dark overlay with green tint -->
							<div class="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-gray-900/60"></div>
							<div class="absolute inset-0 bg-green-500/10 group-hover:bg-green-500/15 transition-colors"></div>
							<div class="relative" style="text-shadow: 0 1px 3px rgba(0,0,0,0.5);">
								<!-- Header -->
								<div class="flex items-center gap-3 mb-3">
									<div class="h-11 w-11 rounded-lg bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-green-500/30">STL</div>
									<div>
										<h3 class="text-lg font-bold text-white group-hover:text-green-400 transition-colors">St. Louis</h3>
										<p class="text-xs text-green-400/80">Midwest Circuit</p>
									</div>
								</div>
								<!-- Description -->
								<p class="text-sm text-gray-300 mb-3 leading-relaxed">The newest addition to the AGE Open family, bringing premier competitive play to the heart of America. St. Louis represents the Midwest's growing FaB community and hunger for high-level competition.</p>
								<!-- Highlights -->
								<div class="flex flex-wrap gap-2 mb-3">
									<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-xs text-green-300 backdrop-blur-sm">
										<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clip-rule="evenodd"/></svg>
										Newest Circuit
									</span>
									<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-xs text-green-300 backdrop-blur-sm">
										Est. 2026
									</span>
								</div>
								<span class="inline-flex items-center gap-1 text-sm text-green-400 font-medium group-hover:gap-2 transition-all">
									Explore STL Events <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
								</span>
							</div>
						</button>
					</div>
				</div>

				<!-- Two Column: Events + Leaderboard -->
				<div class="grid gap-8 lg:grid-cols-3">
					<!-- Upcoming Events List -->
					<div class="lg:col-span-2">
						<div class="flex items-center justify-between mb-4">
							<h2 class="text-xl font-bold text-white">Upcoming Events</h2>
							<button onclick={() => switchTab('events')} class="text-sm text-blue-400 hover:text-blue-300 transition-colors">
								View All →
							</button>
						</div>

						{#if upcomingEvents.length > 0}
							<div class="space-y-3">
								{#each upcomingEvents as evt}
									{@const colors = getCircuitColor(evt.circuit)}
									{@const circuitImages = {
										'Los Angeles': '/images/circuits/los-angeles.jpg',
										'New England': '/images/circuits/new-england.jpg',
										'St. Louis': '/images/circuits/st-louis.jpg'
									}}
									{@const bgImage = circuitImages[evt.circuit] || '/images/circuits/los-angeles.jpg'}

									<a href="/age-open/{evt.id}" class="block group">
										<div class="relative overflow-hidden rounded-xl border {colors.eventBorder} bg-gray-900/90 hover:bg-gray-800/90 transition-all hover:shadow-xl hover:shadow-black/30 {colors.eventBorderHover}">
											<!-- Background Image -->
											<div class="absolute inset-0">
												<img src={bgImage} alt="" class="w-full h-full object-cover opacity-60 group-hover:opacity-70 group-hover:scale-105 transition-all duration-500" />
												<div class="absolute inset-0 bg-gradient-to-r from-gray-900/95 via-gray-900/90 to-gray-900/70"></div>
											</div>

											<!-- Circuit Accent Bar -->
											<div class="{colors.bg} px-3 py-1 relative z-10">
												<span class="text-white/90 text-[10px] font-semibold uppercase tracking-widest">{evt.circuit || 'AGE Open'}</span>
											</div>

											<!-- Card Content -->
											<div class="relative px-4 py-3 flex items-center justify-between gap-4">
												<!-- Left: Event Info -->
												<div class="flex-1 min-w-0">
													<!-- Title -->
													<h4 class="text-base font-bold text-white group-hover:text-blue-400 transition-colors truncate">
														{evt.title}
													</h4>

													<!-- Meta Row -->
													<div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs">
														<!-- Date -->
														{#if evt.eventDate}
															<div class="flex items-center gap-1 text-gray-400">
																<svg class="w-3.5 h-3.5 {colors.text}" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
																</svg>
																{new Date(evt.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
															</div>
														{/if}

														<!-- Location -->
														{#if evt.location}
															<div class="flex items-center gap-1 text-gray-500">
																<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
																	<path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
																	<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
																</svg>
																<span class="truncate max-w-[150px]">{evt.location}</span>
															</div>
														{/if}

														<!-- Format Badge -->
														{#if evt.format}
															<span class="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-medium text-gray-400">{evt.format}</span>
														{/if}
													</div>
												</div>

												<!-- Right: Price & CTA -->
												<div class="flex items-center gap-3 shrink-0">
													<div class="text-right hidden sm:block">
														<p class="text-lg font-bold text-white">${formatPrice(evt.price)}</p>
													</div>
													<div class="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-semibold group-hover:from-blue-600 group-hover:to-purple-700 transition-all whitespace-nowrap shadow-lg shadow-blue-500/20">
														Sign Up →
													</div>
												</div>
											</div>
										</div>
									</a>
								{/each}
							</div>
						{:else}
							<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center">
								<p class="text-gray-400">More events coming soon!</p>
							</div>
						{/if}
					</div>

					<!-- Leaderboard & Why Play -->
					<div class="space-y-6">
						<!-- Standings Preview -->
						<div class="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-900/20 via-gray-900 to-gray-900 p-5">
							<div class="flex items-center justify-between mb-3">
								<div class="flex items-center gap-2">
									<svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 002.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 012.916.52 6.003 6.003 0 01-5.395 4.972m0 0a6.726 6.726 0 01-2.749 1.35m0 0a6.772 6.772 0 01-3.044 0" />
									</svg>
									<h3 class="font-semibold text-white">Standings</h3>
								</div>
								<button onclick={() => switchTab('standings')} class="text-xs text-amber-400 hover:text-amber-300">View all</button>
							</div>

							<!-- Filters -->
							<div class="flex gap-2 mb-3">
								<select
									class="flex-1 px-2 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50"
									value={data.selectedSeason}
									onchange={(e) => updateStandingsFilter('season', e.target.value)}
								>
									{#each data.availableSeasons as season}
										<option value={season}>
											{season === 'all' ? 'All Time' : season}
										</option>
									{/each}
								</select>
								<select
									class="flex-1 px-2 py-1.5 text-xs rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50"
									value={data.selectedCircuit || ''}
									onchange={(e) => updateStandingsFilter('circuit', e.target.value)}
								>
									<option value="">All Circuits</option>
									{#each standingsAvailableCircuits as circuit}
										<option value={circuit}>{circuit}</option>
									{/each}
								</select>
							</div>

							{#if (data.standings || []).length > 0}
								<div class="space-y-1.5">
									{#each (data.standings || []).slice(0, 8) as player, i}
										{@const rank = i + 1}
										<a
											href={player.gemId ? `/player/${player.gemId}` : '#'}
											onclick={(e) => { if (!player.gemId) { e.preventDefault(); switchTab('standings'); }}}
											class="flex items-center gap-2 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
										>
											<!-- Rank Badge -->
											<div class="flex h-6 w-6 items-center justify-center rounded-full shrink-0 {rank === 1 ? 'bg-yellow-500/20 text-yellow-500' : rank === 2 ? 'bg-gray-400/20 text-gray-400' : rank === 3 ? 'bg-orange-900/20 text-orange-600' : 'bg-gray-700/20 text-gray-400'} text-[10px] font-bold">
												{rank}
											</div>
											<!-- Avatar + Name -->
											<div class="flex items-center gap-1.5 flex-1 min-w-0">
												<div class="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-blue-400 text-[8px] font-semibold shrink-0">
													{player.playerName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
												</div>
												<span class="text-xs text-white truncate group-hover:text-blue-400 transition-colors">
													{player.playerName}
												</span>
											</div>
											<!-- Points -->
											<div class="text-right shrink-0">
												<span class="text-xs font-bold text-emerald-400">{player.totalPoints || 0}</span>
												<span class="text-[9px] text-gray-500 ml-0.5">pts</span>
											</div>
										</a>
									{/each}
								</div>
							{:else}
								<div class="flex flex-col items-center gap-2 py-6">
									<svg class="h-10 w-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
									</svg>
									<p class="text-sm text-gray-400">No standings data yet</p>
									<p class="text-xs text-gray-500">Check back after events complete</p>
								</div>
							{/if}
						</div>

						<!-- Why Play Card -->
						<div class="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/10 to-gray-900 p-5">
							<h3 class="font-semibold text-white mb-4 flex items-center gap-2">
								<svg class="h-5 w-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
									<path fill-rule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
								</svg>
								Why AGE Open?
							</h3>
							<div class="space-y-3 text-sm">
								<div class="flex items-center gap-3">
									<div class="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
										<span class="text-amber-400 font-bold">$</span>
									</div>
									<span class="text-gray-300"><span class="text-white font-medium">$1,000</span> prize pool at every event</span>
								</div>
								<div class="flex items-center gap-3">
									<div class="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
										<svg class="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
											<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
										</svg>
									</div>
									<span class="text-gray-300">Earn <span class="text-white font-medium">AGE Points</span> toward championship</span>
								</div>
								<div class="flex items-center gap-3">
									<div class="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
										<svg class="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
											<path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
										</svg>
									</div>
									<span class="text-gray-300">Join a <span class="text-white font-medium">competitive community</span></span>
								</div>
								<div class="flex items-center gap-3">
									<div class="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
										<svg class="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
											<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
										</svg>
									</div>
									<span class="text-gray-300"><span class="text-white font-medium">Independent</span> & player-focused</span>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Final CTA -->
				<div class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 p-8 text-center">
					<div class="absolute inset-0 bg-[url('/grid.svg')] opacity-20"></div>
					<div class="relative">
						<h2 class="text-2xl sm:text-3xl font-bold text-white mb-3">Ready to Start Your Journey?</h2>
						<p class="text-blue-100 mb-6 max-w-xl mx-auto">Join hundreds of players competing in the AGE Open Series. Your path to becoming an AGE Champion starts with a single event.</p>
						<button onclick={() => switchTab('events')} class="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 font-semibold text-gray-900 shadow-xl hover:bg-gray-100 transition-all hover:scale-105">
							Find an Event Near You
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
							</svg>
						</button>
					</div>
				</div>
			</div>

		<!-- Events Tab -->
		{:else if activeTab === 'events'}
			<div class="space-y-8">
				<!-- Circuit Season Tracker -->
				<div class="rounded-2xl border border-gray-800 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 p-6 overflow-hidden">
					<div class="flex items-center justify-between mb-6">
						<div>
							<h2 class="text-xl font-bold text-white mb-1">2026 Season Circuit Tracker</h2>
							<p class="text-sm text-gray-400">8 guaranteed opens per circuit · Events fill slots by date</p>
						</div>
						<div class="hidden sm:flex items-center gap-4 text-sm">
							<div class="flex items-center gap-2">
								<div class="w-3 h-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500"></div>
								<span class="text-gray-400">Scheduled</span>
							</div>
							<div class="flex items-center gap-2">
								<div class="w-3 h-3 rounded-full bg-gray-700 border border-dashed border-gray-600"></div>
								<span class="text-gray-400">TBA</span>
							</div>
						</div>
					</div>

					<div class="space-y-6">
						<!-- Los Angeles Circuit -->
						<div class="group">
							<div class="flex items-center gap-3 mb-3">
								<div class="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-blue-500/20">LA</div>
								<div class="flex-1">
									<div class="flex items-center justify-between">
										<span class="font-semibold text-white">Los Angeles</span>
										<span class="text-xs text-blue-400">{laCount}/8 Opens</span>
									</div>
									<div class="h-1.5 mt-1.5 bg-gray-800 rounded-full overflow-hidden">
										<div class="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500" style="width: {(laCount / 8) * 100}%"></div>
									</div>
								</div>
							</div>
							<div class="grid grid-cols-4 sm:grid-cols-8 gap-2">
								{#each laSlots as slot, i}
									{#if slot}
										<a href="/age-open/{slot.id}" class="group/slot relative flex flex-col items-center p-2 rounded-lg bg-blue-500/10 border border-blue-500/30 hover:border-blue-400 hover:bg-blue-500/20 transition-all">
											<div class="text-lg font-bold text-blue-400">{i + 1}</div>
											<div class="text-[10px] text-gray-400 text-center truncate w-full">{new Date(slot.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
											<div class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30"></div>
										</a>
									{:else}
										<div class="flex flex-col items-center p-2 rounded-lg bg-gray-800/50 border border-dashed border-gray-700">
											<div class="text-lg font-bold text-gray-600">{i + 1}</div>
											<div class="text-[10px] text-gray-600">TBA</div>
										</div>
									{/if}
								{/each}
							</div>
						</div>

						<!-- New England Circuit -->
						<div class="group">
							<div class="flex items-center gap-3 mb-3">
								<div class="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-purple-500/20">NE</div>
								<div class="flex-1">
									<div class="flex items-center justify-between">
										<span class="font-semibold text-white">New England</span>
										<span class="text-xs text-purple-400">{neCount}/8 Opens</span>
									</div>
									<div class="h-1.5 mt-1.5 bg-gray-800 rounded-full overflow-hidden">
										<div class="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all duration-500" style="width: {(neCount / 8) * 100}%"></div>
									</div>
								</div>
							</div>
							<div class="grid grid-cols-4 sm:grid-cols-8 gap-2">
								{#each neSlots as slot, i}
									{#if slot}
										<a href="/age-open/{slot.id}" class="group/slot relative flex flex-col items-center p-2 rounded-lg bg-purple-500/10 border border-purple-500/30 hover:border-purple-400 hover:bg-purple-500/20 transition-all">
											<div class="text-lg font-bold text-purple-400">{i + 1}</div>
											<div class="text-[10px] text-gray-400 text-center truncate w-full">{new Date(slot.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
											<div class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30"></div>
										</a>
									{:else}
										<div class="flex flex-col items-center p-2 rounded-lg bg-gray-800/50 border border-dashed border-gray-700">
											<div class="text-lg font-bold text-gray-600">{i + 1}</div>
											<div class="text-[10px] text-gray-600">TBA</div>
										</div>
									{/if}
								{/each}
							</div>
						</div>

						<!-- St. Louis Circuit -->
						<div class="group">
							<div class="flex items-center gap-3 mb-3">
								<div class="h-8 w-8 rounded-lg bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-xs font-bold shadow-lg shadow-green-500/20">STL</div>
								<div class="flex-1">
									<div class="flex items-center justify-between">
										<span class="font-semibold text-white">St. Louis</span>
										<span class="text-xs text-green-400">{stlCount}/8 Opens</span>
									</div>
									<div class="h-1.5 mt-1.5 bg-gray-800 rounded-full overflow-hidden">
										<div class="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all duration-500" style="width: {(stlCount / 8) * 100}%"></div>
									</div>
								</div>
							</div>
							<div class="grid grid-cols-4 sm:grid-cols-8 gap-2">
								{#each stlSlots as slot, i}
									{#if slot}
										<a href="/age-open/{slot.id}" class="group/slot relative flex flex-col items-center p-2 rounded-lg bg-green-500/10 border border-green-500/30 hover:border-green-400 hover:bg-green-500/20 transition-all">
											<div class="text-lg font-bold text-green-400">{i + 1}</div>
											<div class="text-[10px] text-gray-400 text-center truncate w-full">{new Date(slot.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
											<div class="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 shadow-lg shadow-amber-500/30"></div>
										</a>
									{:else}
										<div class="flex flex-col items-center p-2 rounded-lg bg-gray-800/50 border border-dashed border-gray-700">
											<div class="text-lg font-bold text-gray-600">{i + 1}</div>
											<div class="text-[10px] text-gray-600">TBA</div>
										</div>
									{/if}
								{/each}
							</div>
						</div>
					</div>
				</div>

				<!-- Defending Champions Section -->
				<div class="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-gray-900 to-gray-950 p-4 sm:p-6 overflow-hidden">
					<div class="flex items-center gap-3 mb-4 sm:mb-6">
						<div class="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
							<svg class="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clip-rule="evenodd"/>
							</svg>
						</div>
						<div>
							<h2 class="text-lg sm:text-xl font-bold text-white">2025 Defending Champions</h2>
							<p class="text-xs sm:text-sm text-gray-400">Can you dethrone them in 2026?</p>
						</div>
					</div>

					<div class="grid gap-4 sm:grid-cols-2">
						<!-- LA Champion -->
						<div class="relative overflow-hidden rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-gray-900 p-4 sm:p-5">
							<div class="absolute top-0 right-0 w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-blue-400/20 to-transparent rounded-bl-full"></div>
							<div class="relative">
								<div class="flex items-center gap-3 mb-3">
									<div class="h-11 w-11 sm:h-12 sm:w-12 shrink-0 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30 ring-2 ring-amber-400 ring-offset-2 ring-offset-gray-900">
										<svg class="h-5 w-5 sm:h-6 sm:w-6" fill="currentColor" viewBox="0 0 20 20">
											<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
										</svg>
									</div>
									<div class="min-w-0">
										<div class="text-[10px] sm:text-xs text-blue-400 font-semibold uppercase tracking-wide">Los Angeles Champion</div>
										<h3 class="text-base sm:text-lg font-bold text-white truncate">Peter Buddensiek</h3>
									</div>
								</div>
								<div class="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-3">
									<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-[10px] sm:text-xs text-blue-300">
										2025 Season
									</span>
									<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-[10px] sm:text-xs text-amber-300">
										<svg class="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
										Champion
									</span>
								</div>
								<a href="/player/61767867" class="flex items-center justify-center gap-2 w-full py-2 sm:py-2.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 border border-blue-500/20 hover:border-blue-500/40 transition-all text-xs sm:text-sm font-medium">
									<svg class="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
									</svg>
									View Profile
								</a>
							</div>
						</div>

						<!-- NE Champion -->
						<div class="relative overflow-hidden rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-gray-900 p-4 sm:p-5">
							<div class="absolute top-0 right-0 w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-purple-400/20 to-transparent rounded-bl-full"></div>
							<div class="relative">
								<div class="flex items-center gap-3 mb-3">
									<div class="h-11 w-11 sm:h-12 sm:w-12 shrink-0 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-purple-500/30 ring-2 ring-amber-400 ring-offset-2 ring-offset-gray-900">
										<svg class="h-5 w-5 sm:h-6 sm:w-6" fill="currentColor" viewBox="0 0 20 20">
											<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
										</svg>
									</div>
									<div class="min-w-0">
										<div class="text-[10px] sm:text-xs text-purple-400 font-semibold uppercase tracking-wide">New England Champion</div>
										<h3 class="text-base sm:text-lg font-bold text-white truncate">Noah Beygelman</h3>
									</div>
								</div>
								<div class="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-3">
									<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-[10px] sm:text-xs text-purple-300">
										2025 Season
									</span>
									<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-[10px] sm:text-xs text-amber-300">
										<svg class="w-2.5 h-2.5 sm:w-3 sm:h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
										Champion
									</span>
								</div>
								<a href="/player/56952555" class="flex items-center justify-center gap-2 w-full py-2 sm:py-2.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 hover:text-purple-300 border border-purple-500/20 hover:border-purple-500/40 transition-all text-xs sm:text-sm font-medium">
									<svg class="h-3.5 w-3.5 sm:h-4 sm:w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
									</svg>
									View Profile
								</a>
							</div>
						</div>
					</div>
				</div>

				<!-- Circuit Filter Pills -->
				<div class="flex flex-wrap items-center gap-3">
					<span class="text-sm font-medium text-gray-400">Browse Events:</span>
					<div class="flex flex-wrap gap-2">
						<button
							onclick={() => (selectedCircuit = 'all')}
							class="rounded-full px-4 py-2 text-sm font-medium transition-all {selectedCircuit === 'all'
								? 'bg-white text-gray-900 shadow-lg'
								: 'bg-gray-800 text-gray-300 hover:bg-gray-700'}"
						>
							All Circuits
						</button>
						<button
							onclick={() => (selectedCircuit = 'Los Angeles')}
							class="rounded-full px-4 py-2 text-sm font-medium transition-all {selectedCircuit === 'Los Angeles'
								? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30'
								: 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/30'}"
						>
							<span class="flex items-center gap-1.5">
								<span class="w-2 h-2 rounded-full bg-blue-400"></span>
								Los Angeles
							</span>
						</button>
						<button
							onclick={() => (selectedCircuit = 'New England')}
							class="rounded-full px-4 py-2 text-sm font-medium transition-all {selectedCircuit === 'New England'
								? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30'
								: 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/30'}"
						>
							<span class="flex items-center gap-1.5">
								<span class="w-2 h-2 rounded-full bg-purple-400"></span>
								New England
							</span>
						</button>
						<button
							onclick={() => (selectedCircuit = 'St. Louis')}
							class="rounded-full px-4 py-2 text-sm font-medium transition-all {selectedCircuit === 'St. Louis'
								? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
								: 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/30'}"
						>
							<span class="flex items-center gap-1.5">
								<span class="w-2 h-2 rounded-full bg-green-400"></span>
								St. Louis
							</span>
						</button>
					</div>
				</div>

				<!-- Events List -->
				{#if filteredEvents.length > 0}
					<div class="space-y-4">
						{#each filteredEvents as evt}
							{@const colors = getCircuitColor(evt.circuit)}
							{@const circuitImages = {
								'Los Angeles': '/images/circuits/los-angeles.jpg',
								'New England': '/images/circuits/new-england.jpg',
								'St. Louis': '/images/circuits/st-louis.jpg'
							}}
							{@const bgImage = circuitImages[evt.circuit] || '/images/circuits/los-angeles.jpg'}

							<a href="/age-open/{evt.id}" class="block group">
								<div class="relative overflow-hidden rounded-xl border {colors.eventBorder} bg-gray-900/90 hover:bg-gray-800/90 transition-all hover:shadow-xl hover:shadow-black/30 hover:border-white/20">
									<!-- Background Image -->
									<div class="absolute inset-0">
										<img src={bgImage} alt="" class="w-full h-full object-cover opacity-60 group-hover:opacity-70 group-hover:scale-105 transition-all duration-500" />
										<div class="absolute inset-0 bg-gradient-to-r from-gray-900/95 via-gray-900/90 to-gray-900/70"></div>
									</div>

									<!-- Circuit Accent Bar -->
									<div class="{colors.bg} px-3 py-1 relative z-10">
										<span class="text-white/90 text-[10px] font-semibold uppercase tracking-widest">{evt.circuit || 'AGE Open'}</span>
									</div>

									<!-- Card Content -->
									<div class="relative px-4 py-3 flex items-center justify-between gap-4">
										<!-- Left: Event Info -->
										<div class="flex-1 min-w-0">
											<!-- Title -->
											<h4 class="text-base font-bold text-white group-hover:text-blue-400 transition-colors truncate">
												{evt.title}
											</h4>

											<!-- Meta Row -->
											<div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs">
												<!-- Date -->
												<div class="flex items-center gap-1 text-gray-400">
													<svg class="w-3.5 h-3.5 {colors.text}" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
													</svg>
													{formatDate(evt.eventDate)}
												</div>

												<!-- Location -->
												{#if evt.location}
													<div class="flex items-center gap-1 text-gray-500">
														<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
															<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
														</svg>
														<span class="truncate max-w-[200px]">{evt.location}</span>
													</div>
												{/if}

												<!-- Format Badge -->
												{#if evt.format}
													<span class="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-medium text-gray-400">{evt.format}</span>
												{/if}

												<!-- Premium Badge -->
												{#if evt.premiumDiscount}
													<span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-[10px] font-medium text-amber-300 border border-amber-500/30">
														Premium -10%
													</span>
												{/if}
											</div>
										</div>

										<!-- Right: Price & CTA -->
										<div class="flex items-center gap-3 shrink-0">
											<div class="text-right hidden sm:block">
												<p class="text-lg font-bold text-white">${Number(evt.price).toFixed(0)}</p>
											</div>
											<div class="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-semibold group-hover:from-blue-600 group-hover:to-purple-700 transition-all whitespace-nowrap shadow-lg shadow-blue-500/20">
												Sign Up →
											</div>
										</div>
									</div>
								</div>
							</a>
						{/each}
					</div>
				{:else}
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
									d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
								/>
							</svg>
						</div>
						<h3 class="mb-2 text-xl font-semibold text-white">No Events Found</h3>
						<p class="text-gray-400">
							{#if selectedCircuit !== 'all'}
								No events found for the {selectedCircuit} circuit. Try selecting a different circuit.
							{:else}
								Check back soon for new tournament announcements!
							{/if}
						</p>
					</div>
				{/if}

				<!-- Quick Info Card -->
				<div class="rounded-lg border border-gray-800 bg-gradient-to-br from-gray-900 to-gray-950 p-6">
					<div class="grid gap-6 md:grid-cols-3">
						<div class="flex gap-4">
							<div
								class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-500/10"
							>
								<svg class="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
								</svg>
							</div>
							<div>
								<h3 class="font-semibold text-white">$1,000 Opens</h3>
								<p class="text-sm text-gray-400">Cash prizes for Top 8 finishers</p>
							</div>
						</div>
						<div class="flex gap-4">
							<div
								class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/10"
							>
								<svg class="h-5 w-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
								</svg>
							</div>
							<div>
								<h3 class="font-semibold text-white">AGE Points</h3>
								<p class="text-sm text-gray-400">Earn points toward the Championship</p>
							</div>
						</div>
						<div class="flex gap-4">
							<div
								class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/10"
							>
								<svg class="h-5 w-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
								</svg>
							</div>
							<div>
								<h3 class="font-semibold text-white">Premium Discount</h3>
								<p class="text-sm text-gray-400">Members save 10% on all events</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Calendar Tab -->
		{#if activeTab === 'calendar'}
			<div class="space-y-6">
				<!-- Header -->
				<div class="flex items-center justify-between">
					<h2 class="text-xl font-bold text-white">Event Calendar</h2>
				</div>

				<!-- Legend -->
				<div class="flex flex-wrap items-center gap-4 text-sm">
					<span class="text-gray-500 font-medium">AGE Opens:</span>
					<div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30">
						<div class="relative flex h-3 w-3">
							<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
							<span class="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
						</div>
						<span class="text-blue-300 font-medium">Los Angeles</span>
					</div>
					<div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30">
						<div class="relative flex h-3 w-3">
							<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
							<span class="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
						</div>
						<span class="text-purple-300 font-medium">New England</span>
					</div>
					<div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/30">
						<div class="relative flex h-3 w-3">
							<span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
							<span class="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
						</div>
						<span class="text-green-300 font-medium">St. Louis</span>
					</div>
					<div class="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
						<div class="h-3 w-3 rounded-full bg-amber-500"></div>
						<span class="text-amber-300/80">LSS Event</span>
					</div>
				</div>

				<!-- Calendar -->
				<div class="rounded-xl border border-gray-800 bg-gray-900/80 overflow-hidden">
					<!-- Calendar Header -->
					<div class="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900">
						<button
							onclick={previousMonth}
							class="flex items-center justify-center h-10 w-10 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
							aria-label="Previous month"
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
							</svg>
						</button>
						<div class="flex items-center gap-4">
							<h3 class="text-xl font-bold text-white">{monthName}</h3>
							<button
								onclick={goToToday}
								class="px-3 py-1 text-sm rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
							>
								Today
							</button>
						</div>
						<button
							onclick={nextMonth}
							class="flex items-center justify-center h-10 w-10 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
							aria-label="Next month"
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
							</svg>
						</button>
					</div>

					<!-- Day Headers -->
					<div class="grid grid-cols-7 border-b border-gray-800 bg-gray-950/50">
						{#each ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as day}
							<div class="py-3 text-center text-sm font-medium text-gray-500">{day}</div>
						{/each}
					</div>

					<!-- Calendar Grid - Week by Week -->
					<div>
						{#each calendarWeeks as week, weekIndex}
							<div class="relative">
								<!-- Season bars layer -->
								<div class="absolute inset-0 pointer-events-none" style="z-index: 10;">
									{#each (data.lssSeasons || []) as season, seasonIndex}
										{@const bar = getSeasonBarsForWeek(week, seasonIndex)}
										{#if bar}
											{@const colors = getSeasonColor(seasonIndex)}
											{@const leftPercent = (bar.startCol / 7) * 100}
											{@const widthPercent = (bar.span / 7) * 100}
											<div
												class="absolute h-5 flex items-center pointer-events-auto cursor-pointer {colors.bg} {colors.text} border-y {colors.border}
													{bar.isStart ? 'rounded-l-md border-l ml-1' : ''}
													{bar.isEnd ? 'rounded-r-md border-r mr-1' : ''}"
												style="left: {leftPercent}%; width: calc({widthPercent}% - {bar.isStart ? 4 : 0}px - {bar.isEnd ? 4 : 0}px); top: 28px;"
												title="{season.name}{season.eventType ? ` (${season.eventType})` : ''}"
											>
												{#if bar.isStart || bar.startCol === 0}
													<span class="text-[10px] font-medium truncate px-2 whitespace-nowrap">
														{season.name}
													</span>
												{/if}
											</div>
										{/if}
									{/each}
								</div>

								<!-- Days grid -->
								<div class="grid grid-cols-7">
									{#each week as day, dayIndex}
										{@const dayEvents = getEventsForDate(day.date)}
										{@const hasEvents = dayEvents.length > 0}
										{@const hasSeasons = getSeasonsForDate(day.date).length > 0}
										{@const firstEventColor = hasEvents ? getCircuitColor(dayEvents[0].circuit) : null}
										<div
											class="min-h-[100px] border-b border-r border-gray-800 p-2 transition-colors
												{day.isCurrentMonth ? 'bg-gray-900/50' : 'bg-gray-950/50'}
												{isToday(day.date) ? 'ring-2 ring-inset ring-emerald-500/50' : ''}
												{hasEvents ? firstEventColor.cellBg + ' ' + firstEventColor.cellBorder : ''}
												{dayIndex === 6 ? 'border-r-0' : ''}"
										>
											<div class="flex items-start justify-between mb-1">
												<span class="text-sm font-medium {day.isCurrentMonth ? (isToday(day.date) ? 'text-emerald-400' : 'text-white') : 'text-gray-600'}">
													{day.day}
												</span>
												{#if hasEvents}
													{@const dotColor = getCircuitColor(dayEvents[0].circuit)}
													<span class="relative flex h-3 w-3">
														<span class="animate-ping absolute inline-flex h-full w-full rounded-full {dotColor.ping} opacity-75"></span>
														<span class="relative inline-flex rounded-full h-3 w-3 {dotColor.dot} ring-2 {dotColor.ring}"></span>
													</span>
												{/if}
											</div>

											<!-- Spacer for season bars -->
											{#if hasSeasons}
												<div class="h-6"></div>
											{/if}

											<!-- Event indicators -->
											{#each dayEvents.slice(0, hasSeasons ? 1 : 2) as event}
												{@const eventColor = getCircuitColor(event.circuit)}
												<a
													href="/age-open/{event.id}"
													class="group block mb-1 px-2 py-1 rounded-md text-[11px] font-semibold bg-gradient-to-r {eventColor.eventGradient} {eventColor.eventText} {eventColor.eventGradientHover} hover:text-white border {eventColor.eventBorder} {eventColor.eventBorderHover} truncate transition-all shadow-sm {eventColor.eventShadow}"
													title="{event.title} ({event.circuit || 'TBA'})"
												>
													<span class="flex items-center gap-1">
														<span class="w-1.5 h-1.5 rounded-full {eventColor.dot} flex-shrink-0"></span>
														<span class="truncate">{event.title}</span>
													</span>
												</a>
											{/each}
											{#if dayEvents.length > (hasSeasons ? 1 : 2)}
												<div class="text-[10px] text-gray-500 px-1">+{dayEvents.length - (hasSeasons ? 1 : 2)} more</div>
											{/if}
										</div>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>

				<!-- Upcoming AGE Opens -->
				<div>
					<h3 class="text-lg font-bold text-white mb-4">Upcoming Events</h3>

					{#if (data.events || []).filter(e => e.eventDate && new Date(e.eventDate) >= new Date()).length > 0}
						<div class="space-y-3">
							{#each (data.events || []).filter(e => e.eventDate && new Date(e.eventDate) >= new Date()).slice(0, 5) as event}
								{@const colors = getCircuitColor(event.circuit)}
								{@const circuitImages = {
									'Los Angeles': '/images/circuits/los-angeles.jpg',
									'New England': '/images/circuits/new-england.jpg',
									'St. Louis': '/images/circuits/st-louis.jpg'
								}}
								{@const bgImage = circuitImages[event.circuit] || '/images/circuits/los-angeles.jpg'}

								<a href="/age-open/{event.id}" class="block group">
									<div class="relative overflow-hidden rounded-xl border {colors.eventBorder} bg-gray-900/90 hover:bg-gray-800/90 transition-all hover:shadow-xl hover:shadow-black/30 {colors.eventBorderHover}">
										<!-- Background Image -->
										<div class="absolute inset-0">
											<img src={bgImage} alt="" class="w-full h-full object-cover opacity-60 group-hover:opacity-70 group-hover:scale-105 transition-all duration-500" />
											<div class="absolute inset-0 bg-gradient-to-r from-gray-900/95 via-gray-900/90 to-gray-900/70"></div>
										</div>

										<!-- Circuit Accent Bar -->
										<div class="{colors.bg} px-3 py-1 relative z-10">
											<span class="text-white/90 text-[10px] font-semibold uppercase tracking-widest">{event.circuit || 'AGE Open'}</span>
										</div>

										<!-- Card Content -->
										<div class="relative px-4 py-3 flex items-center justify-between gap-4">
											<!-- Left: Event Info -->
											<div class="flex-1 min-w-0">
												<!-- Title -->
												<h4 class="text-base font-bold text-white group-hover:text-blue-400 transition-colors truncate">
													{event.title}
												</h4>

												<!-- Meta Row -->
												<div class="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs">
													<!-- Date -->
													{#if event.eventDate}
														<div class="flex items-center gap-1 text-gray-400">
															<svg class="w-3.5 h-3.5 {colors.text}" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
															</svg>
															{new Date(event.eventDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
														</div>
													{/if}

													<!-- Location -->
													{#if event.location}
														<div class="flex items-center gap-1 text-gray-500">
															<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
																<path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
																<path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
															</svg>
															<span class="truncate max-w-[150px]">{event.location}</span>
														</div>
													{/if}

													<!-- Format -->
													{#if event.format}
														<span class="text-gray-500">{event.format}</span>
													{/if}
												</div>
											</div>

											<!-- Right: Price & Sign Up -->
											<div class="flex items-center gap-3 shrink-0">
												{#if event.price}
													<div class="text-right hidden sm:block">
														<div class="text-lg font-bold text-white">${parseFloat(event.price).toFixed(0)}</div>
													</div>
												{/if}
												<div class="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white text-xs font-semibold group-hover:from-blue-600 group-hover:to-purple-700 transition-all whitespace-nowrap shadow-lg shadow-blue-500/20">
													Sign Up →
												</div>
											</div>
										</div>
									</div>
								</a>
							{/each}
						</div>
					{:else}
						<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-10 text-center">
							<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-500/20">
								<svg class="h-8 w-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
								</svg>
							</div>
							<p class="text-gray-400">No upcoming events scheduled</p>
							<p class="text-sm text-gray-500 mt-1">Check back soon for new tournaments!</p>
						</div>
					{/if}
				</div>

				<!-- LSS Events Section - Minimalistic with subtle accent -->
				{#if data.lssSeasons && data.lssSeasons.length > 0}
					<div class="mt-8 rounded-lg border border-amber-500/20 bg-gradient-to-r from-amber-950/20 to-transparent p-3 sm:p-4">
						<div class="flex items-center gap-2 mb-3">
							<svg class="h-4 w-4 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
								<path fill-rule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clip-rule="evenodd" />
							</svg>
							<h3 class="text-xs sm:text-sm font-medium text-amber-400/80 uppercase tracking-wider">Official LSS Events</h3>
							<div class="flex-1 h-px bg-amber-500/20"></div>
						</div>
						<div class="space-y-1">
							{#each data.lssSeasons as season}
								{@const startDate = new Date(season.startDate)}
								{@const endDate = new Date(season.endDate)}
								{@const now = new Date()}
								{@const isActive = now >= startDate && now <= endDate}
								{@const isPast = now > endDate}
								<!-- Mobile Layout -->
								<div class="sm:hidden py-2.5 px-2 rounded-md hover:bg-amber-500/10 transition-colors group">
									<div class="flex items-start justify-between gap-2 mb-1.5">
										<div class="flex items-center gap-2 min-w-0">
											{#if isActive}
												<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
											{:else if !isPast}
												<span class="w-2 h-2 rounded-full bg-amber-400/60 shrink-0"></span>
											{/if}
											<span class="text-sm text-gray-200 group-hover:text-white transition-colors line-clamp-2">{season.name}</span>
										</div>
										{#if season.link}
											<a href={season.link} target="_blank" rel="noopener noreferrer" class="text-gray-500 hover:text-amber-400 transition-colors shrink-0 p-1" aria-label="View official page">
												<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
												</svg>
											</a>
										{/if}
									</div>
									<div class="flex items-center justify-between gap-2">
										<div class="flex items-center gap-1.5 flex-wrap">
											{#if season.eventType}
												<span class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-300/80">{season.eventType}</span>
											{/if}
											{#if season.format}
												<span class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-700/50 text-gray-400">{season.format}</span>
											{/if}
										</div>
										<div class="text-[11px] text-gray-500 shrink-0">
											{startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
										</div>
									</div>
								</div>
								<!-- Desktop Layout -->
								<div class="hidden sm:flex items-center justify-between gap-4 py-2.5 px-3 rounded-md hover:bg-amber-500/10 transition-colors group">
									<div class="flex items-center gap-3 min-w-0 flex-1">
										<div class="flex items-center gap-2 flex-wrap min-w-0">
											<span class="text-sm text-gray-200 group-hover:text-white truncate transition-colors">{season.name}</span>
											{#if season.link}
												<a href={season.link} target="_blank" rel="noopener noreferrer" class="text-gray-500 hover:text-amber-400 transition-colors" aria-label="View official page">
													<svg class="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
													</svg>
												</a>
											{/if}
										</div>
										<div class="flex items-center gap-1.5 flex-shrink-0">
											{#if season.eventType}
												<span class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-300/80">{season.eventType}</span>
											{/if}
											{#if season.format}
												<span class="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-700/50 text-gray-400">{season.format}</span>
											{/if}
											{#if isActive}
												<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
											{:else if !isPast}
												<span class="w-2 h-2 rounded-full bg-amber-400/60"></span>
											{/if}
										</div>
									</div>
									<div class="text-xs text-gray-500 flex-shrink-0">
										{startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
									</div>
								</div>
							{/each}
						</div>
					</div>
				{/if}
			</div>
		{/if}

		<!-- Decklists Tab -->
		{#if activeTab === 'decklists'}
			<div class="space-y-6">
				<div>
					<h2 class="mb-2 text-3xl font-bold text-white">Decklists</h2>
					<p class="text-gray-400">Browse decklists from AGE Open Series events</p>
				</div>

				<!-- Search and Filters -->
				<div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					<div class="relative flex-1 max-w-md">
						<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
							<svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
						</div>
						<input
							type="text"
							bind:value={decklistSearch}
							placeholder="Search by player, deck name, or hero..."
							class="w-full rounded-lg border border-gray-700 bg-gray-900 py-2 pl-10 pr-4 text-sm text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						/>
					</div>

					<div class="flex flex-wrap gap-3">
						<!-- Hero Filter -->
						<select
							bind:value={decklistHero}
							class="rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						>
							<option value="all">All Heroes</option>
							{#each uniqueHeroes as hero}
								<option value={hero}>{hero}</option>
							{/each}
						</select>

						<!-- Circuit Filter -->
						<div class="flex flex-wrap gap-2">
							<button
								onclick={() => (decklistCircuit = 'all')}
								class="rounded-full px-3 py-1.5 text-sm font-medium transition-colors {decklistCircuit === 'all'
									? 'bg-white text-gray-900'
									: 'bg-gray-800 text-gray-300 hover:bg-gray-700'}"
							>
								All
							</button>
							<button
								onclick={() => (decklistCircuit = 'Los Angeles')}
								class="rounded-full px-3 py-1.5 text-sm font-medium transition-colors {decklistCircuit === 'Los Angeles'
									? 'bg-blue-500 text-white'
									: 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'}"
							>
								LA
							</button>
							<button
								onclick={() => (decklistCircuit = 'St. Louis')}
								class="rounded-full px-3 py-1.5 text-sm font-medium transition-colors {decklistCircuit === 'St. Louis'
									? 'bg-green-500 text-white'
									: 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}"
							>
								STL
							</button>
							<button
								onclick={() => (decklistCircuit = 'New England')}
								class="rounded-full px-3 py-1.5 text-sm font-medium transition-colors {decklistCircuit === 'New England'
									? 'bg-purple-500 text-white'
									: 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'}"
							>
								NE
							</button>
						</div>
					</div>
				</div>

				{#if (data.decklists || []).length === 0}
					<div class="rounded-lg border border-gray-800 bg-gray-900 p-12 text-center">
						<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
							<svg class="h-8 w-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
							</svg>
						</div>
						<h3 class="mb-2 text-xl font-semibold text-white">No Decklists Yet</h3>
						<p class="text-gray-400">Decklists from completed events will appear here.</p>
					</div>
				{:else if filteredDecklists.length === 0}
					<div class="rounded-lg border border-gray-800 bg-gray-900 p-12 text-center">
						<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
							<svg class="h-8 w-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
						</div>
						<h3 class="mb-2 text-xl font-semibold text-white">No Matches Found</h3>
						<p class="text-gray-400">Try adjusting your search or filters.</p>
						<button
							onclick={() => { decklistSearch = ''; decklistCircuit = 'all'; decklistHero = 'all'; }}
							class="mt-4 rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
						>
							Clear Filters
						</button>
					</div>
				{:else}
					<!-- Results count -->
					<div class="text-sm text-gray-400">
						Showing {filteredDecklists.length} decklist{filteredDecklists.length !== 1 ? 's' : ''}
					</div>

					<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{#each filteredDecklists as decklist}
							<a href="/age-open/{decklist.eventId}/decklist/{decklist.id}" class="group block rounded-lg border border-gray-800 bg-gray-900 p-6 hover:border-gray-700 transition-colors">
								<div class="flex items-start justify-between mb-3">
									<div>
										<h3 class="font-semibold text-white group-hover:text-blue-400 transition-colors">{decklist.playerName}</h3>
										{#if decklist.hero}
											<p class="text-sm text-blue-400">{decklist.hero}</p>
										{/if}
									</div>
									{#if decklist.circuit}
										{@const colors = getCircuitColor(decklist.circuit)}
										<span class="rounded-full {colors.bg} px-2 py-0.5 text-xs font-medium text-white">
											{decklist.circuit}
										</span>
									{/if}
								</div>
								{#if decklist.deckName}
									<p class="text-sm text-gray-300 mb-2">{decklist.deckName}</p>
								{/if}
								<div class="flex items-center justify-between text-xs text-gray-500">
									<span>{decklist.eventTitle}</span>
									<span>{decklist.cards?.length || 0} cards</span>
								</div>
							</a>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		<!-- Standings Tab -->
		{#if activeTab === 'standings'}
			<div class="space-y-4 md:space-y-6">
				<div>
					<h2 class="mb-1 md:mb-2 text-2xl md:text-3xl font-bold text-white">Circuit Standings</h2>
					<p class="text-sm md:text-base text-gray-400">
						Track player performance across AGE Open Series seasons
					</p>
				</div>

				<!-- Season Selector -->
				<div class="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1">
					<span class="text-xs md:text-sm font-medium text-gray-400 shrink-0">Season:</span>
					{#each data.availableSeasons || ['all', '2025', '2024', '2023'] as season}
						<button
							onclick={() => changeSeason(season)}
							class="shrink-0 rounded-lg px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium transition-colors {standingsSeason === season
								? 'bg-yellow-500 text-gray-900'
								: 'bg-gray-800 text-gray-300 hover:bg-gray-700'}"
						>
							{season === 'all' ? 'All Time' : season}
						</button>
					{/each}
				</div>

				<!-- Search and Filters -->
				<div class="space-y-3 md:space-y-0 md:flex md:items-center md:justify-between md:gap-4">
					<div class="relative flex-1 md:max-w-md">
						<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
							<svg class="h-4 w-4 md:h-5 md:w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
						</div>
						<input
							type="text"
							bind:value={searchQuery}
							placeholder="Search players..."
							class="w-full rounded-lg border border-gray-700 bg-gray-900 py-2 pl-9 md:pl-10 pr-4 text-sm text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						/>
					</div>

					<div class="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 md:mx-0 md:px-0 md:pb-0">
						<button
							onclick={() => (standingsCircuit = 'all')}
							class="shrink-0 rounded-full px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium transition-colors {standingsCircuit === 'all'
								? 'bg-white text-gray-900'
								: 'bg-gray-800 text-gray-300 hover:bg-gray-700'}"
						>
							All Circuits
						</button>
						{#if availableCircuits.includes('Los Angeles')}
							<button
								onclick={() => (standingsCircuit = 'Los Angeles')}
								class="shrink-0 rounded-full px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium transition-colors {standingsCircuit === 'Los Angeles'
									? 'bg-blue-500 text-white'
									: 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'}"
							>
								Los Angeles
							</button>
						{/if}
						{#if availableCircuits.includes('St. Louis')}
							<button
								onclick={() => (standingsCircuit = 'St. Louis')}
								class="shrink-0 rounded-full px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium transition-colors {standingsCircuit === 'St. Louis'
									? 'bg-green-500 text-white'
									: 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}"
							>
								St. Louis
							</button>
						{/if}
						{#if availableCircuits.includes('New England')}
							<button
								onclick={() => (standingsCircuit = 'New England')}
								class="shrink-0 rounded-full px-3 md:px-4 py-1.5 md:py-2 text-xs md:text-sm font-medium transition-colors {standingsCircuit === 'New England'
									? 'bg-purple-500 text-white'
									: 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20'}"
							>
								New England
							</button>
						{/if}
					</div>
				</div>

				<!-- Mobile Standings Cards -->
				<div class="md:hidden space-y-3">
					<!-- Mobile Sort Controls -->
					<div class="flex items-center gap-2 overflow-x-auto pb-2">
						<span class="text-xs text-gray-500 shrink-0">Sort:</span>
						<button
							onclick={() => toggleSort('rank')}
							class="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors {sortColumn === 'rank' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400'}"
						>
							Rank
						</button>
						<button
							onclick={() => toggleSort('points')}
							class="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors {sortColumn === 'points' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400'}"
						>
							Points
						</button>
						<button
							onclick={() => toggleSort('winPct')}
							class="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors {sortColumn === 'winPct' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400'}"
						>
							Win %
						</button>
						<button
							onclick={() => toggleSort('events')}
							class="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors {sortColumn === 'events' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400'}"
						>
							Events
						</button>
						<button
							onclick={() => toggleSort('ageRating')}
							class="shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors {sortColumn === 'ageRating' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400'}"
						>
							Rating
						</button>
					</div>

					{#each paginatedStandings as player}
						{@const rank = player.calculatedRank || player.rank}
						{@const losses = (player.matchesPlayed || 0) - (player.matchesWon || 0)}
						{@const colors = player.circuit ? getCircuitColor(player.circuit) : null}
						<div class="rounded-xl border border-gray-800 bg-gray-900/80 p-4 {rank <= 3 ? 'border-yellow-500/30' : rank <= 16 ? 'border-blue-500/20' : ''}">
							<div class="flex items-start gap-3">
								<!-- Rank Badge -->
								<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full {rank === 1 ? 'bg-yellow-500/20 text-yellow-500 ring-2 ring-yellow-500/30' : rank === 2 ? 'bg-gray-400/20 text-gray-300 ring-2 ring-gray-400/30' : rank === 3 ? 'bg-orange-600/20 text-orange-500 ring-2 ring-orange-500/30' : rank <= 16 ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-800 text-gray-400'} text-sm font-bold">
									{rank}
								</div>

								<!-- Player Info -->
								<div class="flex-1 min-w-0">
									<span class="font-semibold text-white truncate block">{player.playerName}</span>
									{#if colors}
										<span class="inline-block rounded-full {colors.bgLight} {colors.text} px-2 py-0.5 text-[10px] font-medium mt-1">
											{player.circuit}
										</span>
									{:else if player.circuitsPlayed && player.circuitsPlayed.length > 0}
										<span class="text-[10px] text-gray-500 mt-1 block">{player.circuitsPlayed.join(', ')}</span>
									{/if}
								</div>

								<!-- Points (prominent) -->
								<div class="text-right shrink-0">
									<div class="text-2xl font-bold text-emerald-400">{player.totalPoints || 0}</div>
									<div class="text-[10px] text-gray-500 uppercase">Points</div>
								</div>
							</div>

							<!-- Stats Row -->
							<div class="mt-3 pt-3 border-t border-gray-800 grid grid-cols-5 gap-2 text-center">
								<div>
									<div class="text-sm font-medium">
										<span class="text-green-400">{player.matchesWon || 0}</span>
										<span class="text-gray-600">-</span>
										<span class="text-red-400">{losses}</span>
									</div>
									<div class="text-[10px] text-gray-500">Record</div>
								</div>
								<div>
									{#if player.winPercentage}
										<div class="text-sm font-medium {player.winPercentage >= 60 ? 'text-green-400' : player.winPercentage >= 50 ? 'text-yellow-400' : 'text-red-400'}">
											{player.winPercentage}%
										</div>
									{:else}
										<div class="text-sm text-gray-600">-</div>
									{/if}
									<div class="text-[10px] text-gray-500">Win %</div>
								</div>
								<div>
									<div class="text-sm font-medium text-gray-300">{player.eventsPlayed || 0}</div>
									<div class="text-[10px] text-gray-500">Events</div>
								</div>
								<div>
									<div class="text-sm font-medium text-purple-400">{player.top8Finishes || 0}</div>
									<div class="text-[10px] text-gray-500">Top 8</div>
								</div>
								<div class="flex flex-col items-center">
									{#if player.ageRating !== null && player.ageRating !== undefined}
										<div class="flex flex-col items-center min-w-[60px] px-2 py-1 rounded border {player.isProvisional ? 'border-slate-500/40 bg-slate-700/20' : player.ratingTier?.color === 'yellow' ? 'border-yellow-500/40 bg-yellow-500/10' : player.ratingTier?.color === 'purple' ? 'border-purple-500/40 bg-purple-500/10' : player.ratingTier?.color === 'cyan' ? 'border-cyan-500/40 bg-cyan-500/10' : player.ratingTier?.color === 'teal' ? 'border-teal-500/40 bg-teal-500/10' : player.ratingTier?.color === 'amber' ? 'border-amber-500/40 bg-amber-500/10' : player.ratingTier?.color === 'orange' ? 'border-orange-500/40 bg-orange-500/10' : 'border-gray-600/40 bg-gray-700/20'}">
											<div class="text-sm font-bold leading-tight {player.isProvisional ? 'text-slate-400' : player.ratingTier?.color === 'yellow' ? 'text-yellow-400' : player.ratingTier?.color === 'purple' ? 'text-purple-400' : player.ratingTier?.color === 'cyan' ? 'text-cyan-400' : player.ratingTier?.color === 'teal' ? 'text-teal-400' : player.ratingTier?.color === 'amber' ? 'text-amber-400' : player.ratingTier?.color === 'orange' ? 'text-orange-400' : 'text-gray-400'}">
												{player.ageRating}
											</div>
											<div class="text-[9px] font-medium truncate {player.isProvisional ? 'text-slate-500' : player.ratingTier?.color === 'yellow' ? 'text-yellow-300/80' : player.ratingTier?.color === 'purple' ? 'text-purple-300/80' : player.ratingTier?.color === 'cyan' ? 'text-cyan-300/80' : player.ratingTier?.color === 'teal' ? 'text-teal-300/80' : player.ratingTier?.color === 'amber' ? 'text-amber-300/80' : player.ratingTier?.color === 'orange' ? 'text-orange-300/80' : 'text-gray-500'}">
												{player.isProvisional ? 'Provisional' : (player.ratingTier?.label || 'Unranked')}
											</div>
										</div>
									{:else}
										<div class="text-sm text-gray-600">-</div>
										<div class="text-[10px] text-gray-500">Rating</div>
									{/if}
								</div>
							</div>

							<!-- View Profile Button -->
							{#if player.gemId}
								<a
									href="/player/{player.gemId}"
									class="mt-3 flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 border border-blue-500/20 hover:border-blue-500/40 transition-all text-sm font-medium"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
									</svg>
									View Profile
								</a>
							{/if}
						</div>
					{/each}

					{#if filteredStandings.length === 0}
						<div class="rounded-xl border border-gray-800 bg-gray-900/80 p-8 text-center">
							<svg class="h-12 w-12 text-gray-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
							</svg>
							<p class="text-gray-400">No standings data yet</p>
							<p class="text-sm text-gray-500 mt-1">Standings will appear once events are completed</p>
						</div>
					{/if}
				</div>

				<!-- Desktop Standings Table -->
				<div class="hidden md:block rounded-lg border border-gray-800 bg-gray-900 overflow-hidden">
					<div class="overflow-x-auto">
						<table class="w-full">
							<thead class="bg-gray-800">
								<tr>
									<th class="px-4 py-4 text-left">
										<button
											onclick={() => toggleSort('rank')}
											class="inline-flex items-center gap-1 text-xs font-semibold uppercase transition-colors {sortColumn === 'rank' ? 'text-blue-400' : 'text-gray-100 hover:text-gray-300'}"
										>
											Rank
											{#if sortColumn === 'rank'}
												<svg class="w-3 h-3 {sortDirection === 'desc' ? 'rotate-180' : ''}" fill="currentColor" viewBox="0 0 20 20">
													<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
												</svg>
											{/if}
										</button>
									</th>
									<th class="px-4 py-4 text-left text-xs font-semibold text-gray-100 uppercase">Player</th>
									<th class="px-4 py-4 text-center">
										<button
											onclick={() => toggleSort('points')}
											class="inline-flex items-center gap-1 text-xs font-semibold uppercase transition-colors {sortColumn === 'points' ? 'text-blue-400' : 'text-gray-100 hover:text-gray-300'}"
										>
											Points
											{#if sortColumn === 'points'}
												<svg class="w-3 h-3 {sortDirection === 'asc' ? 'rotate-180' : ''}" fill="currentColor" viewBox="0 0 20 20">
													<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
												</svg>
											{/if}
										</button>
									</th>
									<th class="px-4 py-4 text-center">
										<button
											onclick={() => toggleSort('record')}
											class="inline-flex items-center gap-1 text-xs font-semibold uppercase transition-colors {sortColumn === 'record' ? 'text-blue-400' : 'text-gray-100 hover:text-gray-300'}"
										>
											Record
											{#if sortColumn === 'record'}
												<svg class="w-3 h-3 {sortDirection === 'asc' ? 'rotate-180' : ''}" fill="currentColor" viewBox="0 0 20 20">
													<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
												</svg>
											{/if}
										</button>
									</th>
									<th class="px-4 py-4 text-center">
										<button
											onclick={() => toggleSort('winPct')}
											class="inline-flex items-center gap-1 text-xs font-semibold uppercase transition-colors {sortColumn === 'winPct' ? 'text-blue-400' : 'text-gray-100 hover:text-gray-300'}"
										>
											Win %
											{#if sortColumn === 'winPct'}
												<svg class="w-3 h-3 {sortDirection === 'asc' ? 'rotate-180' : ''}" fill="currentColor" viewBox="0 0 20 20">
													<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
												</svg>
											{/if}
										</button>
									</th>
									<th class="px-4 py-4 text-center">
										<button
											onclick={() => toggleSort('events')}
											class="inline-flex items-center gap-1 text-xs font-semibold uppercase transition-colors {sortColumn === 'events' ? 'text-blue-400' : 'text-gray-100 hover:text-gray-300'}"
										>
											Events
											{#if sortColumn === 'events'}
												<svg class="w-3 h-3 {sortDirection === 'asc' ? 'rotate-180' : ''}" fill="currentColor" viewBox="0 0 20 20">
													<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
												</svg>
											{/if}
										</button>
									</th>
									<th class="px-4 py-4 text-center">
										<button
											onclick={() => toggleSort('top8')}
											class="inline-flex items-center gap-1 text-xs font-semibold uppercase transition-colors {sortColumn === 'top8' ? 'text-blue-400' : 'text-gray-100 hover:text-gray-300'}"
										>
											Top 8
											{#if sortColumn === 'top8'}
												<svg class="w-3 h-3 {sortDirection === 'asc' ? 'rotate-180' : ''}" fill="currentColor" viewBox="0 0 20 20">
													<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
												</svg>
											{/if}
										</button>
									</th>
									<th class="px-4 py-4 text-center">
										<button
											onclick={() => toggleSort('ageRating')}
											class="inline-flex items-center gap-1 text-xs font-semibold uppercase transition-colors {sortColumn === 'ageRating' ? 'text-blue-400' : 'text-gray-100 hover:text-gray-300'}"
										>
											Rating
											{#if sortColumn === 'ageRating'}
												<svg class="w-3 h-3 {sortDirection === 'asc' ? 'rotate-180' : ''}" fill="currentColor" viewBox="0 0 20 20">
													<path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
												</svg>
											{/if}
										</button>
									</th>
									<th class="px-4 py-4 text-center text-xs font-semibold text-gray-100 uppercase"></th>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-800">
								{#each paginatedStandings as player}
									{@const rank = player.calculatedRank || player.rank}
									{@const losses = (player.matchesPlayed || 0) - (player.matchesWon || 0)}
									<tr class="hover:bg-gray-800/50 transition-colors">
										<td class="px-4 py-4">
											<div class="flex h-8 w-8 items-center justify-center rounded-full {rank === 1 ? 'bg-yellow-500/20 text-yellow-500' : rank === 2 ? 'bg-gray-400/20 text-gray-400' : rank === 3 ? 'bg-orange-900/20 text-orange-600' : rank <= 16 ? 'bg-blue-500/10 text-blue-400' : 'bg-gray-700/20 text-gray-400'} text-sm font-bold">
												{rank}
											</div>
										</td>
										<td class="px-4 py-4">
											<div class="flex items-center gap-3">
												<div class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-blue-400 font-semibold">
													{player.playerName.split(' ').map((n) => n[0]).join('')}
												</div>
												<div>
													<div class="font-medium text-white">{player.playerName}</div>
													{#if player.circuit}
														{@const colors = getCircuitColor(player.circuit)}
														<span class="inline-block rounded-full {colors.bgLight} {colors.text} px-2 py-0.5 text-xs font-medium mt-0.5">
															{player.circuit}
														</span>
													{:else if player.circuitsPlayed && player.circuitsPlayed.length > 0}
														<span class="text-xs text-gray-500">{player.circuitsPlayed.join(', ')}</span>
													{/if}
												</div>
											</div>
										</td>
										<td class="px-4 py-4 text-center">
											<span class="text-lg font-bold text-emerald-400">{player.totalPoints || 0}</span>
										</td>
										<td class="px-4 py-4 text-center">
											<span class="font-medium">
												<span class="text-green-400">{player.matchesWon || 0}</span>
												<span class="text-gray-600">-</span>
												<span class="text-red-400">{losses}</span>
											</span>
										</td>
										<td class="px-4 py-4 text-center">
											{#if player.winPercentage}
												<span class="font-medium {player.winPercentage >= 60 ? 'text-green-400' : player.winPercentage >= 50 ? 'text-yellow-400' : 'text-red-400'}">
													{player.winPercentage}%
												</span>
											{:else}
												<span class="text-gray-600">-</span>
											{/if}
										</td>
										<td class="px-4 py-4 text-center">
											<span class="text-sm text-gray-300">{player.eventsPlayed || 0}</span>
										</td>
										<td class="px-4 py-4 text-center">
											<span class="text-sm font-medium text-purple-400">{player.top8Finishes || 0}</span>
										</td>
										<td class="px-4 py-4 text-center">
											{#if player.ageRating !== null && player.ageRating !== undefined}
												<div class="inline-flex flex-col items-center min-w-[85px] px-3 py-1.5 rounded-lg border {player.isProvisional ? 'border-slate-500/40 bg-slate-700/20' : player.ratingTier?.color === 'yellow' ? 'border-yellow-500/40 bg-yellow-500/10' : player.ratingTier?.color === 'purple' ? 'border-purple-500/40 bg-purple-500/10' : player.ratingTier?.color === 'cyan' ? 'border-cyan-500/40 bg-cyan-500/10' : player.ratingTier?.color === 'teal' ? 'border-teal-500/40 bg-teal-500/10' : player.ratingTier?.color === 'amber' ? 'border-amber-500/40 bg-amber-500/10' : player.ratingTier?.color === 'orange' ? 'border-orange-500/40 bg-orange-500/10' : 'border-gray-600/40 bg-gray-700/20'}">
													<span class="text-lg font-bold leading-tight {player.isProvisional ? 'text-slate-400' : player.ratingTier?.color === 'yellow' ? 'text-yellow-400' : player.ratingTier?.color === 'purple' ? 'text-purple-400' : player.ratingTier?.color === 'cyan' ? 'text-cyan-400' : player.ratingTier?.color === 'teal' ? 'text-teal-400' : player.ratingTier?.color === 'amber' ? 'text-amber-400' : player.ratingTier?.color === 'orange' ? 'text-orange-400' : 'text-gray-400'}">
														{player.ageRating}
													</span>
													<span class="text-[10px] font-medium {player.isProvisional ? 'text-slate-500' : player.ratingTier?.color === 'yellow' ? 'text-yellow-300/80' : player.ratingTier?.color === 'purple' ? 'text-purple-300/80' : player.ratingTier?.color === 'cyan' ? 'text-cyan-300/80' : player.ratingTier?.color === 'teal' ? 'text-teal-300/80' : player.ratingTier?.color === 'amber' ? 'text-amber-300/80' : player.ratingTier?.color === 'orange' ? 'text-orange-300/80' : 'text-gray-500'}">
														{player.isProvisional ? 'Provisional' : (player.ratingTier?.label || 'Unranked')}
													</span>
												</div>
											{:else}
												<span class="text-gray-600 text-sm">-</span>
											{/if}
										</td>
										<td class="px-4 py-4 text-center">
											{#if player.gemId}
												<a
													href="/player/{player.gemId}"
													class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 border border-blue-500/20 hover:border-blue-500/40 transition-all text-xs font-medium"
												>
													<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
													</svg>
													Profile
												</a>
											{:else}
												<span class="text-gray-600 text-xs">-</span>
											{/if}
										</td>
									</tr>
								{/each}
								{#if filteredStandings.length === 0}
									<tr>
										<td colspan="9" class="px-6 py-12 text-center">
											<div class="flex flex-col items-center gap-2">
												<svg class="h-12 w-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
												</svg>
												<p class="text-gray-400">No standings data yet</p>
												<p class="text-sm text-gray-500">Standings will appear once events are completed</p>
											</div>
										</td>
									</tr>
								{/if}
							</tbody>
						</table>
					</div>
				</div>

				<!-- Pagination Controls (shared for mobile and desktop) -->
				{#if totalStandingsPages > 1}
					<!-- Mobile Pagination -->
					<div class="md:hidden flex items-center justify-between gap-3 mt-4 px-1">
						<button
							onclick={() => standingsPage = Math.max(1, standingsPage - 1)}
							disabled={standingsPage === 1}
							class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-700 text-sm font-medium transition-all {standingsPage === 1 ? 'bg-gray-800/30 text-gray-600 cursor-not-allowed' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'}"
							aria-label="Previous page"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
							</svg>
							Prev
						</button>
						<div class="text-sm text-gray-400 text-center">
							<span class="font-medium text-white">{standingsPage}</span>
							<span class="mx-1">/</span>
							<span>{totalStandingsPages}</span>
						</div>
						<button
							onclick={() => standingsPage = Math.min(totalStandingsPages, standingsPage + 1)}
							disabled={standingsPage === totalStandingsPages}
							class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-700 text-sm font-medium transition-all {standingsPage === totalStandingsPages ? 'bg-gray-800/30 text-gray-600 cursor-not-allowed' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'}"
							aria-label="Next page"
						>
							Next
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
							</svg>
						</button>
					</div>

					<!-- Desktop Pagination -->
					<div class="hidden md:flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-4 py-3 rounded-lg border border-gray-800 bg-gray-900">
						<div class="text-sm text-gray-400">
							Showing {(standingsPage - 1) * standingsPerPage + 1} to {Math.min(standingsPage * standingsPerPage, filteredStandings.length)} of {filteredStandings.length} players
						</div>
						<div class="flex items-center gap-2">
							<button
								onclick={() => standingsPage = 1}
								disabled={standingsPage === 1}
								class="px-3 py-1.5 rounded-lg border border-gray-700 text-sm font-medium transition-all {standingsPage === 1 ? 'bg-gray-800/30 text-gray-600 cursor-not-allowed' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'}"
							>
								First
							</button>
							<button
								onclick={() => standingsPage = Math.max(1, standingsPage - 1)}
								disabled={standingsPage === 1}
								class="px-3 py-1.5 rounded-lg border border-gray-700 text-sm font-medium transition-all {standingsPage === 1 ? 'bg-gray-800/30 text-gray-600 cursor-not-allowed' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'}"
								aria-label="Previous page"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
								</svg>
							</button>
							<div class="flex items-center gap-1">
								{#each Array(Math.min(5, totalStandingsPages)) as _, i}
									{@const pageNum = standingsPage <= 3
										? i + 1
										: standingsPage >= totalStandingsPages - 2
											? totalStandingsPages - 4 + i
											: standingsPage - 2 + i}
									{#if pageNum > 0 && pageNum <= totalStandingsPages}
										<button
											onclick={() => standingsPage = pageNum}
											class="w-8 h-8 rounded-lg text-sm font-medium transition-all {standingsPage === pageNum
												? 'bg-blue-500 text-white'
												: 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-700'}"
										>
											{pageNum}
										</button>
									{/if}
								{/each}
							</div>
							<button
								onclick={() => standingsPage = Math.min(totalStandingsPages, standingsPage + 1)}
								disabled={standingsPage === totalStandingsPages}
								class="px-3 py-1.5 rounded-lg border border-gray-700 text-sm font-medium transition-all {standingsPage === totalStandingsPages ? 'bg-gray-800/30 text-gray-600 cursor-not-allowed' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'}"
								aria-label="Next page"
							>
								<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
								</svg>
							</button>
							<button
								onclick={() => standingsPage = totalStandingsPages}
								disabled={standingsPage === totalStandingsPages}
								class="px-3 py-1.5 rounded-lg border border-gray-700 text-sm font-medium transition-all {standingsPage === totalStandingsPages ? 'bg-gray-800/30 text-gray-600 cursor-not-allowed' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'}"
							>
								Last
							</button>
						</div>
					</div>
				{/if}

				<!-- Stats Legend -->
				<div class="rounded-lg border border-gray-800 bg-gray-900 p-6">
					<h3 class="mb-4 text-lg font-semibold text-white">Standings Information</h3>
					<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						<div>
							<div class="mb-1 text-sm font-medium text-gray-400">AGE Points</div>
							<p class="text-xs text-gray-500">
								Points earned based on tournament placement. Top 16 players qualify for the
								Player's Championship.
							</p>
						</div>
						<div>
							<div class="mb-1 text-sm font-medium text-gray-400">W-L Record</div>
							<p class="text-xs text-gray-500">
								Total wins and losses across all events in the selected season.
							</p>
						</div>
						<div>
							<div class="mb-1 text-sm font-medium text-gray-400">Win Rate</div>
							<p class="text-xs text-gray-500">
								Percentage of matches won. Green (70%+), Yellow (50-69%), Red (&lt;50%).
							</p>
						</div>
						<div>
							<div class="mb-1 text-sm font-medium text-gray-400">Events Played</div>
							<p class="text-xs text-gray-500">
								Number of AGE Opens participated in during the season.
							</p>
						</div>
						<div>
							<div class="mb-1 text-sm font-medium text-gray-400">Top 8 Finishes</div>
							<p class="text-xs text-gray-500">
								Number of times the player finished in the Top 8 and earned cash prizes.
							</p>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Results Tab -->
		{#if activeTab === 'results'}
			<div class="space-y-8">
				<div>
					<h2 class="mb-2 text-3xl font-bold text-white">Event Results</h2>
					<p class="text-gray-400">View standings and results from completed AGE Open Series events</p>
				</div>

				{#if (data.eventResults || []).length === 0}
					<div class="rounded-lg border border-gray-800 bg-gray-900 p-12 text-center">
						<div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
							<svg class="h-8 w-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
							</svg>
						</div>
						<h3 class="mb-2 text-xl font-semibold text-white">No Results Yet</h3>
						<p class="text-gray-400">Results from completed events will appear here.</p>
					</div>
				{:else}
					{#each data.eventResults as eventData}
						<div class="rounded-lg border border-gray-800 bg-gray-900 overflow-hidden">
							<!-- Event Header -->
							<div class="bg-gray-800 p-6">
								<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
									<div>
										<h3 class="text-xl font-bold text-white">{eventData.event.title}</h3>
										<div class="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-400">
											{#if eventData.event.eventDate}
												<span>{formatDate(eventData.event.eventDate)}</span>
											{/if}
											{#if eventData.event.location}
												<span>• {eventData.event.location}</span>
											{/if}
										</div>
									</div>
									<div class="flex flex-wrap gap-2">
										{#if eventData.event.format}
											<span class="rounded-full bg-gray-700 px-3 py-1 text-sm font-medium text-gray-200">
												{eventData.event.format}
											</span>
										{/if}
										{#if eventData.event.circuit}
											{@const colors = getCircuitColor(eventData.event.circuit)}
											<span class="rounded-full {colors.bg} px-3 py-1 text-sm font-medium text-white">
												{eventData.event.circuit}
											</span>
										{/if}
									</div>
								</div>
							</div>

							<!-- Results Table -->
							<div class="overflow-x-auto">
								<table class="w-full">
									<thead class="bg-gray-850">
										<tr class="border-b border-gray-700">
											<th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Place</th>
											<th class="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Player</th>
											<th class="px-6 py-3 text-center text-xs font-semibold text-gray-400 uppercase">Record</th>
											<th class="px-6 py-3 text-center text-xs font-semibold text-gray-400 uppercase">AGE Pts</th>
											<th class="px-6 py-3 text-center text-xs font-semibold text-gray-400 uppercase">Prize</th>
										</tr>
									</thead>
									<tbody class="divide-y divide-gray-800">
										{#each eventData.results.slice(0, 8) as result}
											<tr class="hover:bg-gray-800/50 {result.placement <= 3 ? 'bg-gray-800/30' : ''}">
												<td class="px-6 py-4">
													<span class="inline-flex items-center justify-center w-8 h-8 rounded-full {result.placement === 1 ? 'bg-yellow-500/20 text-yellow-400' : result.placement === 2 ? 'bg-gray-400/20 text-gray-300' : result.placement === 3 ? 'bg-amber-600/20 text-amber-500' : 'bg-gray-800 text-gray-400'} font-bold text-sm">
														{result.placement}
													</span>
												</td>
												<td class="px-6 py-4">
													<div class="font-medium text-white">{result.playerName}</div>
													{#if result.gemId}
														<div class="text-xs text-gray-500">{result.gemId}</div>
													{/if}
												</td>
												<td class="px-6 py-4 text-center text-gray-300">
													{result.wins}-{result.losses}{result.draws > 0 ? `-${result.draws}` : ''}
												</td>
												<td class="px-6 py-4 text-center">
													<span class="font-medium text-blue-400">{result.agePoints || 0}</span>
												</td>
												<td class="px-6 py-4 text-center">
													{#if result.prizeAmount}
														<span class="font-medium text-green-400">${result.prizeAmount}</span>
													{:else}
														<span class="text-gray-500">-</span>
													{/if}
												</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>

							{#if eventData.results.length > 8}
								<div class="px-6 py-3 bg-gray-800/50 text-center">
									<a href="/age-open/{eventData.event.id}/results" class="text-sm font-medium text-blue-400 hover:text-blue-300">
										View all {eventData.results.length} results →
									</a>
								</div>
							{/if}
						</div>
					{/each}
				{/if}
			</div>
		{/if}

		<!-- Rules & Info Tab -->
		{#if activeTab === 'rules'}
			<div class="space-y-12">
				<!-- Circuit Overview -->
				<section>
					<h2 class="mb-6 text-3xl font-bold text-white">About the AGE Open Circuit</h2>
					<div class="rounded-lg border border-gray-800 bg-gray-900 p-8">
						<p class="mb-4 text-lg text-gray-300">
							The AGE Open Circuit is a year-long competitive Flesh and Blood tournament series
							across multiple circuits. Compete in AGE $1,000 Opens throughout the year to earn
							cash prizes and AGE Points. At the end of the season, the top 16 players by AGE Open
							points in each circuit will be invited to compete in their circuit's Player's Championship.
							In 2026, the series expands to 24 Opens, a $30,000 total prize pool, and 3 AGE Championships.
						</p>
						<div class="grid gap-6 md:grid-cols-4">
							<div class="rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 p-6">
								<div class="mb-2 text-3xl font-bold text-blue-500">$30,000</div>
								<div class="text-sm text-gray-400">2026 Total Prize Pool</div>
							</div>
							<div class="rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 p-6">
								<div class="mb-2 text-3xl font-bold text-green-500">24 Opens</div>
								<div class="text-sm text-gray-400">2026 Tournaments</div>
							</div>
							<div class="rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5 p-6">
								<div class="mb-2 text-3xl font-bold text-purple-500">3</div>
								<div class="text-sm text-gray-400">AGE Championships</div>
							</div>
							<div class="rounded-lg bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-6">
								<div class="mb-2 text-3xl font-bold text-amber-500">Top 16</div>
								<div class="text-sm text-gray-400">Championship Invites</div>
							</div>
						</div>
					</div>
				</section>

				<!-- Comprehensive Tournament Rules -->
				<section>
					<div class="mb-6 flex items-center gap-3">
						<h2 class="text-3xl font-bold text-white">Tournament Rules & Policies</h2>
						<span class="rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-400">Official Rulebook</span>
					</div>
					<p class="mb-6 text-gray-400">
						This comprehensive guide covers all rules, policies, and procedures for AGE Open events.
						Click on any section to expand and view detailed information.
					</p>

					<div class="space-y-3">
						{#each rulebookSections as section}
							<div class="rounded-lg border border-gray-800 bg-gray-900 overflow-hidden">
								<!-- Section Header -->
								<button
									onclick={() => toggleRulebookSection(section.id)}
									class="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-800/50 transition-colors"
								>
									<div class="flex items-center gap-3">
										<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20">
											<svg class="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={sectionIcons[section.icon]} />
											</svg>
										</div>
										<div>
											<span class="font-semibold text-white">{section.title}</span>
											<span class="ml-2 text-xs text-gray-500">({section.items.length} topics)</span>
										</div>
									</div>
									<svg
										class="h-5 w-5 flex-shrink-0 text-gray-400 transition-transform duration-200 {openRulebookSection === section.id ? 'rotate-180' : ''}"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
									</svg>
								</button>

								<!-- Section Items -->
								{#if openRulebookSection === section.id}
									<div class="border-t border-gray-800 bg-gray-950/50">
										{#each section.items as item, itemIndex}
											<div class="border-b border-gray-800/50 last:border-b-0">
												<button
													onclick={() => toggleRulebookItem(itemIndex)}
													class="w-full flex items-center justify-between px-6 py-3 text-left hover:bg-gray-800/30 transition-colors"
												>
													<span class="text-sm text-gray-300 pr-4">{item.question}</span>
													<svg
														class="h-4 w-4 flex-shrink-0 text-gray-500 transition-transform duration-200 {openRulebookItem === itemIndex ? 'rotate-180' : ''}"
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
													</svg>
												</button>
												{#if openRulebookItem === itemIndex}
													<div class="px-6 pb-4">
														<p class="text-sm text-gray-400 leading-relaxed bg-gray-900/50 rounded-lg p-4 border-l-2 border-blue-500/50">
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

					<!-- Rules Summary Note -->
					<div class="mt-6 rounded-lg border border-yellow-800/50 bg-yellow-500/10 p-4">
						<div class="flex items-start gap-3">
							<svg class="h-5 w-5 flex-shrink-0 text-yellow-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<div>
								<p class="text-sm font-medium text-yellow-400">Important Notice</p>
								<p class="text-sm text-yellow-300/80 mt-1">
									These rules supplement the official Flesh and Blood Tournament Rules and Policy by Legend Story Studios.
									In case of conflict, LSS official rules take precedence unless specifically stated otherwise by AGE.
									The Head Judge has final authority on all rulings during events.
								</p>
							</div>
						</div>
					</div>
				</section>

				<!-- Prize Structure -->
				<section>
					<h2 class="mb-6 text-3xl font-bold text-white">Prize Structure (Per Open)</h2>
					<div class="rounded-lg border border-gray-800 bg-gray-900 overflow-hidden">
						<div class="overflow-x-auto">
							<table class="w-full">
								<thead class="bg-gray-800">
									<tr>
										<th class="px-6 py-4 text-left text-sm font-semibold text-gray-100">
											Place
										</th>
										<th class="px-6 py-4 text-left text-sm font-semibold text-gray-100">
											Cash Prize
										</th>
										<th class="px-6 py-4 text-left text-sm font-semibold text-gray-100">
											AGE Points
										</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-gray-800">
									<tr class="bg-yellow-500/10 hover:bg-yellow-500/20">
										<td class="px-6 py-4 text-sm font-semibold text-white">1st Place</td>
										<td class="px-6 py-4 text-sm font-bold text-green-400">$400</td>
										<td class="px-6 py-4 text-sm font-bold text-blue-400">30 points</td>
									</tr>
									<tr class="bg-gray-400/5 hover:bg-gray-800/50">
										<td class="px-6 py-4 text-sm font-semibold text-white">2nd Place</td>
										<td class="px-6 py-4 text-sm font-bold text-green-400">$200</td>
										<td class="px-6 py-4 text-sm font-bold text-blue-400">25 points</td>
									</tr>
									<tr class="bg-orange-900/10 hover:bg-gray-800/50">
										<td class="px-6 py-4 text-sm font-semibold text-white">3rd-4th Place</td>
										<td class="px-6 py-4 text-sm font-bold text-green-400">$100</td>
										<td class="px-6 py-4 text-sm font-bold text-blue-400">20 points</td>
									</tr>
									<tr class="hover:bg-gray-800/50">
										<td class="px-6 py-4 text-sm text-white">5th-8th Place</td>
										<td class="px-6 py-4 text-sm font-bold text-green-400">$50</td>
										<td class="px-6 py-4 text-sm font-bold text-blue-400">15 points</td>
									</tr>
									<tr class="hover:bg-gray-800/50">
										<td class="px-6 py-4 text-sm text-white">9th-12th Place</td>
										<td class="px-6 py-4 text-sm text-gray-400">-</td>
										<td class="px-6 py-4 text-sm font-bold text-blue-400">12 points</td>
									</tr>
									<tr class="hover:bg-gray-800/50">
										<td class="px-6 py-4 text-sm text-white">13th-16th Place</td>
										<td class="px-6 py-4 text-sm text-gray-400">-</td>
										<td class="px-6 py-4 text-sm font-bold text-blue-400">8 points</td>
									</tr>
									<tr class="hover:bg-gray-800/50">
										<td class="px-6 py-4 text-sm text-white">Participation</td>
										<td class="px-6 py-4 text-sm text-gray-400">-</td>
										<td class="px-6 py-4 text-sm text-blue-400">1 point</td>
									</tr>
								</tbody>
							</table>
						</div>
					</div>
					<div class="mt-4 rounded-lg border border-blue-800 bg-blue-500/10 p-4">
						<p class="text-sm text-blue-300">
							<span class="font-semibold">Total Per Open:</span> $1,000 in cash prizes distributed
							to Top 8 finishers, plus AGE Points for Top 16 and all participants
						</p>
					</div>
				</section>

				<!-- Player's Championship -->
				<section>
					<h2 class="mb-6 text-3xl font-bold text-white">Player's Championship</h2>
					<div class="rounded-lg border border-gray-800 bg-gray-900 p-8">
						<p class="mb-6 text-lg text-gray-300">
							At the end of the season, the top 16 players by AGE Open points will be invited to
							compete in the Player's Championship for a $3,000 prize pool. This prestigious event
							crowns the AGE Open Series champion and celebrates our top competitive players.
						</p>
						<div class="grid gap-6 md:grid-cols-2">
							<div class="rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5 p-6">
								<h3 class="mb-2 text-xl font-semibold text-white">Qualification</h3>
								<p class="text-sm text-gray-400">
									Top 16 players by total AGE Points accumulated throughout the season receive
									automatic invitations to the championship.
								</p>
							</div>
							<div class="rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 p-6">
								<h3 class="mb-2 text-xl font-semibold text-white">Prize Pool</h3>
								<p class="text-sm text-gray-400">
									$3,000 prize pool distributed to top finishers, with the champion earning the
									title of AGE Open Series Champion.
								</p>
							</div>
						</div>
					</div>
				</section>

				<!-- FAQ Section -->
				<section>
					<h2 class="mb-6 text-3xl font-bold text-white">Frequently Asked Questions</h2>
					<div class="space-y-3">
						{#each faqItems as item, index}
							<div class="rounded-lg border border-gray-800 bg-gray-900 overflow-hidden">
								<button
									onclick={() => toggleFaq(index)}
									class="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-800/50 transition-colors"
								>
									<span class="font-medium text-white pr-4">{item.question}</span>
									<svg
										class="h-5 w-5 flex-shrink-0 text-gray-400 transition-transform duration-200 {openFaqIndex === index ? 'rotate-180' : ''}"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
									</svg>
								</button>
								{#if openFaqIndex === index}
									<div class="px-6 pb-4 pt-0">
										<div class="border-t border-gray-800 pt-4">
											<p class="text-gray-300 leading-relaxed">{item.answer}</p>
										</div>
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</section>

				<!-- Contact Section -->
				<section class="rounded-lg border border-gray-800 bg-gray-900 p-8">
					<div class="text-center">
						<h2 class="mb-4 text-2xl font-bold text-white">Have More Questions?</h2>
						<p class="mb-6 text-gray-400 max-w-2xl mx-auto">
							If you have additional questions about the AGE Open Series, registration, or anything else,
							feel free to reach out to us. We're here to help!
						</p>
						<div class="flex flex-wrap justify-center gap-4">
							<a
								href="/contact"
								class="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-6 py-3 font-medium text-white hover:bg-blue-600 transition-colors"
							>
								<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
								</svg>
								Contact Us
							</a>
							<a
								href="https://discord.gg/agesoftware"
								target="_blank"
								rel="noopener noreferrer"
								class="inline-flex items-center gap-2 rounded-lg bg-gray-800 px-6 py-3 font-medium text-white hover:bg-gray-700 transition-colors"
							>
								<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
									<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
								</svg>
								Join Discord
							</a>
						</div>
					</div>
				</section>
			</div>
		{/if}
	</div>
</div>
