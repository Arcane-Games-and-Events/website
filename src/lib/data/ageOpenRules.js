/**
 * AGE Open rulebook and FAQ copy, shown on the Rules & Info tab.
 * Edit the text here; the page renders whatever this file exports.
 */

export const rulebookSections = [
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

export const faqItems = [
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

/** Cash and AGE Points awarded at every Open. */
export const prizeTable = [
	{ place: '1st', cash: 400, pts: 30 },
	{ place: '2nd', cash: 200, pts: 25 },
	{ place: '3rd – 4th', cash: 100, pts: 20 },
	{ place: '5th – 8th', cash: 50, pts: 15 },
	{ place: '9th – 12th', cash: 0, pts: 12 },
	{ place: '13th – 16th', cash: 0, pts: 8 },
	{ place: 'Every player', cash: 0, pts: 1 }
];
