/**
 * Words and phrases that hold a discussion post for review. Matching is on
 * whole words after normalizing (lower case, look-alike characters mapped,
 * spaced-out letters joined), plus common endings (-s, -ed, -ing, -er…), so
 * "Scunthorpe", "assassin" or "cocktail" never match.
 *
 * Game words are deliberately absent: "kill", "destroy", "attack", "bomb"
 * and the like are ordinary in card-game talk. Threats are caught as
 * phrases aimed at a person instead ("kill you", "hope you die").
 *
 * Add to these lists freely; tests/unit/moderation.test.js checks a few
 * of each category and a set of ordinary posts that must never be held.
 */

/** Slurs: racial, ethnic, homophobic, transphobic and ableist. */
export const SLURS = [
	'nigger',
	'nigga',
	'chink',
	'gook',
	'spic',
	'wetback',
	'kike',
	'beaner',
	'raghead',
	'towelhead',
	'paki',
	'coon',
	'jigaboo',
	'porchmonkey',
	'faggot',
	'fag',
	'dyke',
	'tranny',
	'shemale',
	'retard',
	'retarded',
	'spastic',
	'mongoloid'
];

export const PROFANITY = [
	'fuck',
	'fuk',
	'fck',
	'motherfucker',
	'shit',
	'bullshit',
	'cunt',
	'bitch',
	'asshole',
	'arsehole',
	'bastard',
	'dick',
	'dickhead',
	'cock',
	'cocksucker',
	'pussy',
	'twat',
	'wanker',
	'whore',
	'slut',
	'douchebag',
	'jackass',
	'dumbass',
	'piss',
	'prick'
];

export const SEXUAL = [
	'porn',
	'porno',
	'pornhub',
	'onlyfans',
	'nudes',
	'xxx',
	'blowjob',
	'handjob',
	'dildo',
	'hentai',
	'cum',
	'jizz',
	'boobs',
	'tits',
	'horny'
];

/** Phrases (normalized, space separated). */
export const THREATS = [
	'kill you',
	'gonna kill you',
	'i will kill',
	'shoot you',
	'stab you',
	'beat you up',
	'hope you die',
	'you should die',
	'find where you live',
	'i know where you live',
	'rape',
	'raped'
];

export const SELF_HARM = [
	'kill myself',
	'killing myself',
	'want to die',
	'wanna die',
	'end my life',
	'suicide',
	'suicidal',
	'cut myself',
	'hurt myself'
];

export const HARASSMENT = [
	'kill yourself',
	'kys',
	'you are worthless',
	'youre worthless',
	'you are trash',
	'youre trash',
	'you are garbage',
	'youre garbage',
	'nobody likes you',
	'shut up',
	'idiot',
	'moron',
	'loser',
	'go die'
];

/** Domains anyone may link to. The site's own domain is added at runtime. */
export const LINK_ALLOWLIST = [
	'youtube.com',
	'youtu.be',
	'twitch.tv',
	'fabtcg.com',
	'fabrary.net',
	'talishar.net',
	'fabdb.net'
];
