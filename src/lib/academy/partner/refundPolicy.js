/**
 * The guide refund policy as rules: who can ask, what's approved without a
 * person, and who may decide the rest. Pure, so the server enforces it and
 * pages show the same thing. Windows come from terms.js.
 *
 * Guides are non-refundable once opened. A refund is allowed when:
 *   duplicate         charged twice for the guide: automatic, at any time
 *   unopened          never opened, within UNOPENED_REFUND_DAYS: automatic
 *   broken            it won't load and we can't fix it within BROKEN_FIX_DAYS: admin
 *   not_as_described  substantially different from its description: admin
 *   (any reason)      the guide's teacher approves it: teacher, within the window
 * Every request except a duplicate must come within REFUND_REQUEST_WINDOW_DAYS.
 */
import { REFUND_REQUEST_WINDOW_DAYS, UNOPENED_REFUND_DAYS } from './terms.js';

const DAY = 86400000;

/** The reasons a buyer can give, in the order the form lists them. */
export const REFUND_REASONS = [
	{ key: 'duplicate', label: 'I was charged twice or by mistake' },
	{ key: 'broken', label: 'The guide won’t load or display' },
	{ key: 'not_as_described', label: 'It’s not as described' },
	{ key: 'unopened', label: 'I haven’t opened it' },
	{ key: 'other', label: 'Other' }
];
export const isReason = (r) => REFUND_REASONS.some((x) => x.key === r);

const daysSince = (t, now) => (now - new Date(t).getTime()) / DAY;

/** Is the 14-day request window still open for a purchase? */
export function withinRequestWindow(purchasedAt, now = new Date()) {
	return daysSince(purchasedAt, now) <= REFUND_REQUEST_WINDOW_DAYS;
}

/**
 * Can the buyer ask for a refund of this guide now?
 * @param {{ purchasedAt: Date|string, hasDuplicate?: boolean, refunded?: boolean, openRequest?: boolean }} p
 */
export function canRequestRefund(
	{ purchasedAt, hasDuplicate = false, refunded = false, openRequest = false },
	now = new Date()
) {
	if (refunded || openRequest) return false;
	return hasDuplicate || withinRequestWindow(purchasedAt, now);
}

/**
 * Is a request approved without a person? 'duplicate' when the buyer has
 * another paid purchase of the same guide; 'unopened' when they've never
 * opened it and it's within UNOPENED_REFUND_DAYS; otherwise null.
 * @param {{ purchasedAt: Date|string, firstOpenedAt?: Date|string|null, hasDuplicate?: boolean }} p
 */
export function autoApproval(
	{ purchasedAt, firstOpenedAt = null, hasDuplicate = false },
	now = new Date()
) {
	if (hasDuplicate) return 'duplicate';
	if (!firstOpenedAt && daysSince(purchasedAt, now) <= UNOPENED_REFUND_DAYS) return 'unopened';
	return null;
}

/**
 * Who may decide a pending request: admins approve or deny; the guide's own
 * teacher may approve (never deny, which is AGE's call).
 * @param {'approve'|'deny'} action
 * @param {{ isAdmin: boolean, isGuideTeacher: boolean }} who
 */
export function mayDecide(action, { isAdmin, isGuideTeacher }) {
	if (isAdmin) return true;
	return action === 'approve' && isGuideTeacher;
}
