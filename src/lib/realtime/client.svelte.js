/**
 * The browser's live connection (Supabase Realtime): one per tab, opened
 * only for signed-in people when the site has live updates switched on
 * (the root layout passes `data.realtime`). Pages join channels through
 * `joinChannel`; see $lib/server/realtime.js for what's sent on each.
 *
 * - The connection signs in with a short-lived token from
 *   /api/realtime/token, renewed before it runs out.
 * - A tab hidden for a few minutes lets go of its connection (it costs a
 *   connection while open) and joins everything again when it's back;
 *   pages hear 'live' again and catch up then.
 * - Each channel reports 'live' or 'down'. While a channel is down, pages
 *   fall back to what they did before (polling, or nothing).
 */

/** @typedef {'live' | 'down'} ChannelStatus */
/**
 * @typedef {{
 *   topic: string,
 *   events?: Record<string, (payload: any) => void>,
 *   presence?: { key: string, meta: Record<string, any>, onSync: (state: Record<string, any[]>) => void },
 *   onStatus?: (status: ChannelStatus) => void,
 *   channel?: any
 * }} Spec
 */

const HIDDEN_RELEASE_MS = 3 * 60 * 1000;
const TOKEN_EARLY_MS = 5 * 60 * 1000;

/** @type {{ url: string, key: string } | null} */
let config = null;
let userId = '';
/** @type {any} */
let client = null;
/** @type {Promise<any> | null} */
let starting = null;
/** @type {Set<Spec>} */
const specs = new Set();
let token = '';
let tokenExpires = 0;
/** @type {ReturnType<typeof setTimeout> | undefined} */
let renewTimer;
/** @type {ReturnType<typeof setTimeout> | undefined} */
let hiddenTimer;
let released = false;

const conn = $state({ on: false });

/** Whether live updates are available in this tab at all. */
export const realtime = {
	get on() {
		return conn.on;
	}
};

async function fetchToken() {
	if (token && Date.now() < tokenExpires - TOKEN_EARLY_MS) return token;
	const res = await fetch('/api/realtime/token', { cache: 'no-store' });
	if (!res.ok) throw new Error(`token ${res.status}`);
	const out = await res.json();
	token = out.token;
	tokenExpires = out.expiresAt;
	clearTimeout(renewTimer);
	renewTimer = setTimeout(
		() => client?.setAuth().catch(() => {}),
		Math.max(60_000, tokenExpires - Date.now() - TOKEN_EARLY_MS)
	);
	return token;
}

async function ensureClient() {
	if (client) return client;
	if (!config) return null;
	if (!starting) {
		const { url, key } = config;
		starting = import('@supabase/supabase-js').then(async ({ RealtimeClient }) => {
			const c = new RealtimeClient(`${url}/realtime/v1`, {
				params: { apikey: key },
				accessToken: fetchToken
			});
			// Sign in before joining anything: the library doesn't wait for its
			// token on the first join, and private channels refuse a join that
			// arrives without one.
			await c.setAuth();
			client = c;
			return client;
		});
	}
	return starting;
}

/** @param {Spec} spec */
async function attach(spec) {
	const c = await ensureClient();
	if (!c || !specs.has(spec) || spec.channel) return;
	const ch = c.channel(spec.topic, {
		config: {
			private: true,
			broadcast: { self: false },
			...(spec.presence ? { presence: { key: spec.presence.key } } : {})
		}
	});
	for (const event of Object.keys(spec.events ?? {}))
		ch.on('broadcast', { event }, (/** @type {any} */ m) =>
			spec.events?.[event]?.(m?.payload ?? {})
		);
	if (spec.presence) {
		const p = spec.presence;
		ch.on('presence', { event: 'sync' }, () => p.onSync(ch.presenceState()));
	}
	spec.channel = ch;
	ch.subscribe((/** @type {string} */ status) => {
		if (status === 'SUBSCRIBED') {
			if (spec.presence) ch.track(spec.presence.meta).catch(() => {});
			spec.onStatus?.('live');
		} else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
			spec.onStatus?.('down');
		}
	});
}

/** @param {Spec} spec */
function detach(spec) {
	const ch = spec.channel;
	spec.channel = undefined;
	if (ch && client) client.removeChannel(ch).catch(() => {});
}

function onVisibility() {
	clearTimeout(hiddenTimer);
	if (document.hidden) {
		hiddenTimer = setTimeout(() => {
			released = true;
			for (const s of specs) {
				detach(s);
				s.onStatus?.('down');
			}
			client?.disconnect();
		}, HIDDEN_RELEASE_MS);
	} else if (released) {
		released = false;
		for (const s of specs) attach(s);
	}
}

/**
 * Switch live updates on or off for this tab (the root layout calls this
 * whenever the signed-in user or the site's settings change).
 * @param {{ url: string, key: string } | null} next
 * @param {string | null | undefined} nextUser
 */
export function configureRealtime(next, nextUser) {
	const same =
		config?.url === next?.url && config?.key === next?.key && userId === (nextUser ?? '');
	if (same) return;
	for (const s of specs) detach(s);
	client?.disconnect();
	client = null;
	starting = null;
	token = '';
	tokenExpires = 0;
	clearTimeout(renewTimer);
	config = next && nextUser ? next : null;
	userId = nextUser ?? '';
	conn.on = !!config;
	if (typeof document !== 'undefined') {
		document.removeEventListener('visibilitychange', onVisibility);
		if (config) document.addEventListener('visibilitychange', onVisibility);
	}
	for (const s of specs) {
		if (config) attach(s);
		else s.onStatus?.('down');
	}
}

/**
 * Join a live channel. Returns how to send on it and how to leave.
 * Without live updates it reports 'down' at once and does nothing else.
 * @param {Omit<Spec, 'channel'>} opts
 */
export function joinChannel(opts) {
	/** @type {Spec} */
	const spec = { ...opts };
	specs.add(spec);
	if (config) attach(spec);
	else queueMicrotask(() => spec.onStatus?.('down'));
	return {
		/** Send a broadcast to everyone else on the channel. */
		send(/** @type {string} */ event, /** @type {any} */ payload) {
			spec.channel?.send({ type: 'broadcast', event, payload }).catch(() => {});
		},
		leave() {
			specs.delete(spec);
			// A channel that's been left says nothing more.
			spec.onStatus = undefined;
			spec.events = {};
			detach(spec);
		}
	};
}
