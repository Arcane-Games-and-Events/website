// v3: class constructor
import { Lucia } from 'lucia';
import { DrizzlePostgreSQLAdapter } from '@lucia-auth/adapter-drizzle';
import { db } from '$lib/server/db';
import { user, session } from '$lib/server/db/schema';

const adapter = new DrizzlePostgreSQLAdapter(db, session, user);

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
		role: data.role
	})
});
