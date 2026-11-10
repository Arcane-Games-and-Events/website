/** Dates in conversations: the time today, the day this year, else the full date. */
export function when(d) {
	if (!d) return '';
	const date = new Date(d);
	const now = new Date();
	if (date.toDateString() === now.toDateString())
		return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' })
	});
}

/** The full date and time, for a message's header. */
export const stamp = (d) =>
	d
		? new Date(d).toLocaleString('en-US', {
				month: 'short',
				day: 'numeric',
				year: 'numeric',
				hour: 'numeric',
				minute: '2-digit'
			})
		: '';

/** Two initials from a name. */
export const initialsOf = (name = '') =>
	name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((w) => w[0].toUpperCase())
		.join('') || '?';
