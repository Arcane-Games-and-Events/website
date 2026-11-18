/**
 * The status page's words and colours, shared by /status, the admin Status
 * tab and the site banner.
 */

export const OVERALL = {
	ok: { word: 'Everything’s running', tone: 'var(--color-prem)' },
	minor: { word: 'Some things are slow or failing', tone: 'var(--color-gold)' },
	major: { word: 'Part of the site is down', tone: 'var(--color-hero-rb)' },
	maintenance: { word: 'Maintenance in progress', tone: 'var(--color-warm)' }
};

export const IMPACT = {
	minor: { word: 'Minor', tone: 'var(--color-gold)' },
	major: { word: 'Major', tone: 'var(--color-hero-rb)' },
	maintenance: { word: 'Maintenance', tone: 'var(--color-warm)' }
};

export const STATUS_WORD = {
	investigating: 'Investigating',
	identified: 'Found the cause',
	monitoring: 'Watching the fix',
	resolved: 'Resolved',
	scheduled: 'Scheduled',
	in_progress: 'In progress',
	completed: 'Completed'
};

/** A day's bar colour from the share of checks that passed. */
export function barTone(b) {
	if (!b.total) return 'var(--color-line2)';
	const share = b.ok / b.total;
	if (share >= 0.995) return 'var(--color-prem)';
	if (share >= 0.95) return 'var(--color-gold)';
	return 'var(--color-hero-rb)';
}

export const pct = (u) =>
	u == null ? '—' : `${(Math.floor(u * 10000) / 100).toFixed(u === 1 ? 0 : 2)}%`;

export const stampOf = (d) =>
	new Date(d).toLocaleString('en-US', {
		timeZone: 'America/Los_Angeles',
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
		timeZoneName: 'short'
	});
