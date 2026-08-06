/**
 * Date utilities for timezone-agnostic event times
 *
 * Events are stored and displayed as "wall clock time" - the time
 * you'd see on a clock at the venue. We treat all times as UTC
 * to preserve the exact time value regardless of server/user timezone.
 *
 * Example: Admin enters "11:00 AM" for a St. Louis event
 * - Stored as: 11:00 UTC
 * - Displayed as: 11:00 (using UTC timezone)
 * - Users see: "11:00 AM" = the event starts at 11am local venue time
 */

/**
 * Parse a datetime-local input value as UTC
 *
 * datetime-local inputs return strings like "2024-01-15T11:00" without timezone.
 * We append 'Z' to treat it as UTC, preserving the exact time entered.
 *
 * @param {string} datetimeLocalValue - Value from datetime-local input (e.g., "2024-01-15T11:00")
 * @returns {Date} Date object with the time treated as UTC
 */
export function parseDatetimeLocal(datetimeLocalValue) {
	if (!datetimeLocalValue) return null;

	// Append 'Z' to interpret as UTC, preserving the wall clock time
	return new Date(datetimeLocalValue + ':00Z');
}

