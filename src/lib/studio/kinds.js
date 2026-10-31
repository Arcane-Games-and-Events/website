/** Words for the Studio's kinds of media, shared by the Studio and the public pages. */

export const KINDS = [
	{
		id: 'gameplay',
		label: 'Bonus gameplay',
		short: 'Gameplay',
		one: 'match',
		newLabel: 'New gameplay'
	},
	{ id: 'podcast', label: 'Podcasts', short: 'Podcast', one: 'episode', newLabel: 'New episode' },
	{
		id: 'interview',
		label: 'Interviews',
		short: 'Interview',
		one: 'interview',
		newLabel: 'New interview'
	},
	{ id: 'video', label: 'Video', short: 'Video', one: 'video', newLabel: 'New video' }
];
export const KIND = Object.fromEntries(KINDS.map((k) => [k.id, k]));

/** "Ana Lopez (Dorinthea) vs Sam Chu (Fai)" */
export function matchup(v) {
	return [
		[v.player1Name, v.player1Hero && `(${v.player1Hero})`].filter(Boolean).join(' '),
		[v.player2Name, v.player2Hero && `(${v.player2Hero})`].filter(Boolean).join(' ')
	]
		.filter(Boolean)
		.join(' vs ');
}

/** "S2 · E14" */
export function episodeLabel(v) {
	const parts = [];
	if (v.season) parts.push(`S${v.season}`);
	if (v.episodeNumber) parts.push(`E${v.episodeNumber}`);
	return parts.join(' · ');
}

/** The line under a title: the matchup for gameplay, otherwise show, episode and guests. */
export function byline(v) {
	if (v.kind === 'gameplay') return matchup(v);
	return [v.show?.name, episodeLabel(v), v.guests && `with ${v.guests}`]
		.filter(Boolean)
		.join(' · ');
}

export const STAGE = {
	live: { word: 'Live', tone: 'border-ink bg-ink text-paper-bg' },
	draft: { word: 'Ready, not published', tone: 'border-prem/50 text-prem' },
	processing: { word: 'Processing', tone: 'border-[#8a6116]/50 text-[#8a6116]' },
	'no-file': { word: 'No file yet', tone: 'border-line2 text-fade' },
	failed: { word: 'Failed', tone: 'border-hero-rb/50 text-hero-rb' }
};

/** Mirrors stageOf() in $lib/server/studio/list.js. */
export function stageOf(item) {
	const status = item.video?.status;
	if (status === 'errored') return 'failed';
	if (!item.video?.provider) return 'no-file';
	if (status !== 'ready') return 'processing';
	return item.isPublished ? 'live' : 'draft';
}
