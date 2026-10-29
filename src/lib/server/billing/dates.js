/**
 * Billing-period arithmetic. All in UTC.
 *
 * A membership keeps an anchor day: the day of the month it started. Each
 * period ends on that day of the following month (or year), clamped to the
 * month's length, so a membership that began on the 31st renews on
 * Jan 31 → Feb 28 → Mar 31, never drifting to Mar 3 the way `setMonth`
 * does.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const daysInMonth = (year, monthIndex) => new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

/** The date `months` months after `from`, on `anchorDay` (clamped). */
export function addMonthsAnchored(from, months, anchorDay) {
	const d = new Date(from);
	const total = d.getUTCMonth() + months;
	const year = d.getUTCFullYear() + Math.floor(total / 12);
	const month = ((total % 12) + 12) % 12;
	const day = Math.min(anchorDay || d.getUTCDate(), daysInMonth(year, month));
	return new Date(
		Date.UTC(
			year,
			month,
			day,
			d.getUTCHours(),
			d.getUTCMinutes(),
			d.getUTCSeconds(),
			d.getUTCMilliseconds()
		)
	);
}

/** When a period that starts at `start` ends for a plan. */
export function periodEndFor(start, plan, anchorDay) {
	return addMonthsAnchored(start, plan === 'yearly' ? 12 : 1, anchorDay);
}

/** The anchor day for a membership starting at `start`. */
export const anchorDayOf = (start) => new Date(start).getUTCDate();

/** Days after the first failure that renewals are retried. */
export const RETRY_OFFSET_DAYS = [1, 3, 7];
export const GRACE_DAYS = 7;

export const addDays = (from, days) => new Date(new Date(from).getTime() + days * DAY_MS);
export const addHours = (from, hours) => new Date(new Date(from).getTime() + hours * 3600 * 1000);

/**
 * The dunning schedule after a renewal fails at `firstFailedAt`.
 * `attempt` counts failures so far (1 after the first decline).
 *
 * @returns {{ nextAttemptAt: Date | null, graceUntil: Date, exhausted: boolean }}
 */
export function dunningSchedule(firstFailedAt, attempt) {
	const offset = RETRY_OFFSET_DAYS[attempt - 1];
	return {
		nextAttemptAt: offset == null ? null : addDays(firstFailedAt, offset),
		graceUntil: addHours(addDays(firstFailedAt, GRACE_DAYS), 2),
		exhausted: offset == null
	};
}

/** Whole days from now until `date` (negative when past). */
export const daysUntil = (date, now = new Date()) =>
	Math.ceil((new Date(date).getTime() - now.getTime()) / DAY_MS);

/** "October 28, 2026" */
export function longDate(date) {
	if (!date) return '';
	return new Date(date).toLocaleDateString('en-US', {
		month: 'long',
		day: 'numeric',
		year: 'numeric',
		timeZone: 'UTC'
	});
}

/** "Oct 28, 2026" */
export function shortDate(date) {
	if (!date) return '';
	return new Date(date).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		timeZone: 'UTC'
	});
}
