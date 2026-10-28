// v3: class constructor
import { Lucia } from 'lucia';
import { createHash } from 'node:crypto';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';
import { db } from '$lib/server/db';
import { user, session } from '$lib/server/db/schema';
import { forget } from '$lib/server/cache/index.js';

const adapter = new DrizzlePostgreSQLAdapter(db, session, user);

/**
 * Cache key for a session in the lookup cache in hooks.server.js. The id is
 * the login cookie's value, so the key holds a SHA-256 of it: reading the
 * cache never yields a cookie that would sign someone in.
 */
export const sessionCacheKey = (sid) =>
	`session:${createHash('sha256').update(sid).digest('base64url')}`;

/**
 * Drop a session from the one-minute lookup cache. Call it right after
 * `auth.invalidateSession` so the old cookie stops working on the next
 * request rather than within a minute.
 */
export const forgetSession = (sid) => forget(sessionCacheKey(sid));

export const auth = new Lucia(adapter, {
	env: import.meta.env.DEV ? 'DEV' : 'PROD',
	sessionCookie: {
		name: 'auth_session',
		attributes: {
			secure: !import.meta.env.DEV
		}
	},
	getUserAttributes: (data) => ({
		email: data.email,
		firstName: data.firstName,
		lastName: data.lastName,
		gemId: data.gemId,
		role: data.role,
		// Capability roles — stackable, independent of billing tier. Reader for
		// the Desk + admin guards (`hasCapability`, `canEditEntries`, etc.).
		// See src/lib/server/auth/roles.js.
		additionalRoles: data.additionalRoles,
		subscriptionId: data.subscriptionId,
		subscriptionType: data.subscriptionType,
		subscriptionStatus: data.subscriptionStatus,
		subscriptionStartDate: data.subscriptionStartDate,
		subscriptionEndDate: data.subscriptionEndDate,
		nextBillingDate: data.nextBillingDate,
		theme: data.theme,
		createdAt: data.createdAt
	})
});
