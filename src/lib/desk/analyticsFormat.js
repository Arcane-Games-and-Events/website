/** Shared formatting + vocabulary for the Desk content analytics pages. */

export const fmt = (n) => Number(n || 0).toLocaleString('en-US');

export const compact = (n) =>
	n >= 1e6
		? `${(n / 1e6).toFixed(1)}M`
		: n >= 1e4
			? `${Math.round(n / 1e3)}K`
			: n >= 1e3
				? `${(n / 1e3).toFixed(1)}K`
				: fmt(n);

export function dur(sec) {
	if (sec == null) return '—';
	const s = Math.round(sec);
	if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m`;
	const m = Math.floor(s / 60);
	const r = s % 60;
	return m ? `${m}m ${String(r).padStart(2, '0')}s` : `${r}s`;
}

export const hours = (sec) => {
	const h = (sec || 0) / 3600;
	return h >= 10 ? `${Math.round(h)}h` : h >= 1 ? `${h.toFixed(1)}h` : `${Math.round((sec || 0) / 60)}m`;
};

export const pctLabel = (v) => (v == null ? '—' : `${Math.round(v)}%`);

export const SOURCES = {
	internal: 'Elsewhere on the site',
	search: 'Search',
	social: 'Social media',
	community: 'Communities (Reddit, Discord)',
	email: 'Email',
	referral: 'Other websites',
	direct: 'Direct / unknown'
};

export const AUDIENCES = {
	anonymous: 'Not signed in',
	free: 'Free members',
	premium: 'Premium members',
	'anonymous (paywall)': 'Not signed in · hit the paywall',
	'free (paywall)': 'Free members · hit the paywall'
};

export const DEVICES = { desktop: 'Desktop', mobile: 'Mobile', tablet: 'Tablet' };

export const label = (map, key) => map[key] || key;

/** One vocabulary, shown under every dashboard. */
export const GLOSSARY = [
	['View', 'Someone had the piece open and on screen for at least 3 seconds. Staff and bots never count.'],
	['Reader', 'A unique browser. The same person on a phone and a laptop counts twice.'],
	['Engaged time', 'Seconds the piece was on screen and the reader was active (scrolling, tapping, moving) in the last 30 seconds, or a video was playing.'],
	['Reached', 'How far through the article body a reader got, by what has appeared on their screen.'],
	['Finished', 'Reached 90% of the body with enough engaged time to have read it, or watched 90% of the video.'],
	['Bounced', 'Left with less than 10 seconds of engaged time.'],
	['Conversions', 'Sign-ups and Premium upgrades by readers who viewed the piece in the 7 days before. Each conversion credits every piece they read; "last" is the one read most recently.']
];
