/** Words, tones and money formatting shared by the Classroom pages. */

export const STATUS = {
	draft: 'Draft',
	in_review: 'In review',
	published: 'Live',
	archived: 'Unlisted'
};

export const STATUS_TONE = {
	draft: 'border-ink/60 text-ink',
	in_review: 'border-gold bg-gold/10 text-[#8a6116]',
	published: 'border-prem bg-prem text-white',
	archived: 'border-line2 text-fade'
};

/** "$1,234.50" from cents. */
export function money(cents) {
	const n = Number(cents || 0) / 100;
	return n.toLocaleString('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: n % 1 === 0 ? 0 : 2
	});
}

export function shortDate(d) {
	if (!d) return '—';
	return new Date(d).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
}

/** How long something has been waiting: "today", "3 days", "5 weeks". */
export function waited(at, now = new Date()) {
	if (!at) return '';
	const days = Math.floor((now.getTime() - new Date(at).getTime()) / 864e5);
	if (days < 1) return 'today';
	if (days === 1) return '1 day';
	if (days < 14) return `${days} days`;
	return `${Math.floor(days / 7)} weeks`;
}

/** Where a course stands (see standing() in courses/oversight.js): chip tones. */
export const STAGE_TONE = {
	in_review: 'border-gold bg-gold/15 text-[#8a6116]',
	returned: 'border-hero-rb text-hero-rb',
	draft: 'border-ink/60 text-ink',
	live: 'border-prem bg-prem text-white',
	unlisted: 'border-line2 text-fade'
};

/** Whose move it is. */
export const WHOSE = {
	admin: 'Waiting on an admin',
	teacher: 'Waiting on the teacher',
	none: 'Nothing waiting'
};
