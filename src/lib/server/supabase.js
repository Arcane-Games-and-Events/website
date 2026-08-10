import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';

// Bucket where CMS-uploaded images live. Must exist in Supabase Storage
// and be marked Public so the served URLs work without signing. Create
// it in the Supabase dashboard (Storage → New bucket → name it exactly
// this, toggle "Public bucket" on) before the upload endpoint will work.
export const CMS_MEDIA_BUCKET = 'cms-media';

// Lazy service-role client. We mirror the Redis lazy pattern: never
// instantiate at module load, because SvelteKit + adapter-vercel import
// server modules during the build's static-analysis pass and throwing on
// missing env vars there turns any misconfigured deploy into a hard build
// failure. Instantiating on first use means the module always imports
// cleanly; a missing key surfaces on the first upload call, and the
// endpoint converts it into a graceful 500 instead of a site-wide crash.
//
// The client is cached on globalThis so Vite HMR doesn't create a new one
// on every server-file save.
const g = /** @type {any} */ (globalThis);

export function getSupabase() {
	if (g.__ageSupabaseClient) return g.__ageSupabaseClient;
	if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
		if (!g.__ageSupabaseWarned) {
			console.warn(
				'[supabase] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing — ' +
					'CMS media uploads will 500. See .env.example.'
			);
			g.__ageSupabaseWarned = true;
		}
		return null;
	}
	g.__ageSupabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
		auth: { persistSession: false, autoRefreshToken: false }
	});
	return g.__ageSupabaseClient;
}
