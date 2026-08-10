/**
 * Role + capability guards.
 *
 * Two axes of user role, per the CMS plan:
 *
 *   1. Billing tier — `user.role`, exactly one of 'free' | 'premium' | 'admin'.
 *      Determines paywall access on the reader side.
 *
 *   2. Capability roles — `user.additionalRoles`, zero or more of 'writer',
 *      'creator', 'tournament staff'. Independent of billing tier. A user
 *      can be a free-tier creator, or a premium writer + tournament staff,
 *      etc. Determines what CMS surfaces they can access.
 *
 * `admin` (billing tier) implicitly grants every capability regardless of
 * `additionalRoles`. Nothing else stacks.
 *
 * Import from Svelte load functions:
 *
 *     import { canEditEntries, isAdmin } from '$lib/server/auth/roles.js';
 *     if (!canEditEntries(locals.user)) throw redirect(302, '/login');
 *
 * These are pure functions — they don't throw. Compose with a redirect or
 * `error(403)` at the call site.
 */

const CAPABILITY_WRITER = 'writer';
const CAPABILITY_CREATOR = 'creator';
const CAPABILITY_TOURNAMENT_STAFF = 'tournament staff';

// -------------------- billing tier --------------------

/**
 * True if the user's billing tier is 'admin'. Admins bypass every
 * capability guard below — they can do anything the CMS or ops surfaces
 * allow.
 * @param {any} user
 * @returns {boolean}
 */
export function isAdmin(user) {
	return user?.role === 'admin';
}

/**
 * True if the user's billing tier is 'premium' or 'admin'. This is a
 * coarse role check — for the full "does this user have paid access
 * *right now*" check (which factors in `subscriptionStatus` and grace
 * periods), use `userHasPremiumAccess` from `$lib/server/articles/access.js`.
 * @param {any} user
 * @returns {boolean}
 */
export function isPremium(user) {
	return user?.role === 'premium' || user?.role === 'admin';
}

// -------------------- capability roles --------------------

/**
 * True if the user has the given capability role in `additional_roles`.
 * Case-sensitive. Does NOT auto-grant admins — pair with `isAdmin` at
 * the call site if admins should also pass.
 * @param {any} user
 * @param {string} capability
 * @returns {boolean}
 */
export function hasCapability(user, capability) {
	const roles = user?.additionalRoles;
	return Array.isArray(roles) && roles.includes(capability);
}

/**
 * True if the user can author library entries (articles, videos, or both).
 * Admin or holds the 'writer' capability.
 * @param {any} user
 * @returns {boolean}
 */
export function canEditEntries(user) {
	return isAdmin(user) || hasCapability(user, CAPABILITY_WRITER);
}

/**
 * True if the user can author courses. Admin or holds the 'creator'
 * capability.
 * @param {any} user
 * @returns {boolean}
 */
export function canEditCourses(user) {
	return isAdmin(user) || hasCapability(user, CAPABILITY_CREATOR);
}

/**
 * True if the user can reach the /cms surface at all — needs at least one
 * of writer or creator (or admin).
 * @param {any} user
 * @returns {boolean}
 */
export function canAccessCms(user) {
	return canEditEntries(user) || canEditCourses(user);
}

/**
 * True if the user can publish, schedule, approve drafts, or grant
 * capability roles. Admin-only — writers and creators can save drafts
 * but never publish.
 * @param {any} user
 * @returns {boolean}
 */
export function canPublish(user) {
	return isAdmin(user);
}

/**
 * True if the user can run event operations (check-in, register players,
 * mark GEM entry). Admin or 'tournament staff' capability.
 * @param {any} user
 * @returns {boolean}
 */
export function canRunEvents(user) {
	return isAdmin(user) || hasCapability(user, CAPABILITY_TOURNAMENT_STAFF);
}

// -------------------- ownership helpers --------------------

/**
 * True if the user owns the given record (matches `ownerId`) OR is an
 * admin (admins can edit anything). Use for "can this user edit their
 * own draft?" style checks.
 * @param {any} user
 * @param {string | null | undefined} ownerId
 * @returns {boolean}
 */
export function ownsOrAdmin(user, ownerId) {
	if (isAdmin(user)) return true;
	if (!user?.id || !ownerId) return false;
	return user.id === ownerId;
}
