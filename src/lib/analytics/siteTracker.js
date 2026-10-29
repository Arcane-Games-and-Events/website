/**
 * Site-wide page view tracking.
 *
 * One `pv` record per page the visitor opens (every public page, not just
 * Library pieces), plus a single `pvbeat` with the seconds the page was
 * visible, sent when it is hidden, closed or left. Library pages also run
 * the detailed content tracker; the two write to different tables.
 *
 * Uses the same visitor and session ids as the content tracker, so a
 * sign-up or upgrade later can be joined to the visit that led to it. The
 * session id is also mirrored to a cookie so the server can stamp
 * conversions it records itself (sign-up, subscribe, ticket).
 */
import { uuid, visitorId, sessionId, send, trackingAllowed } from './contentTracker.js';

const SKIP = /^\/(api|admin|desk|staff|zz-)(\/|$)/;
const TOKEN = /^[0-9a-f]{32,}$|^[A-Za-z0-9_-]{40,}$/;

let current = null;
let prevPath = null;
let bound = false;

/** Strip query strings and token-like segments so paths group well. */
function cleanPath(path) {
	const segments = (path || '/').split('?')[0].split('/');
	return segments.map((s) => (TOKEN.test(s) ? ':token' : s)).join('/') || '/';
}

function utmOf() {
	try {
		const q = new URLSearchParams(location.search);
		const pick = (k) => q.get(k) || undefined;
		return {
			source: pick('utm_source'),
			medium: pick('utm_medium'),
			campaign: pick('utm_campaign')
		};
	} catch {
		return {};
	}
}

/** Send the visible-time beat for the page being left. */
function flush(beacon = true) {
	if (!current) return;
	const c = current;
	current = null;
	if (c.since) c.visible += Date.now() - c.since;
	send({ t: 'pvbeat', id: c.id, visible: Math.round(c.visible / 1000) }, { beacon });
}

function onVisibility() {
	if (!current) return;
	if (document.visibilityState === 'hidden') {
		if (current.since) current.visible += Date.now() - current.since;
		current.since = null;
		// Report now: mobile browsers often never fire pagehide.
		send(
			{ t: 'pvbeat', id: current.id, visible: Math.round(current.visible / 1000) },
			{ beacon: true }
		);
	} else {
		current.since = Date.now();
	}
}

/**
 * Record a page view. Call after every navigation with the new path and the
 * SvelteKit route id.
 *
 * @param {{ path: string, routeId?: string | null }} opts
 */
export function trackPageview({ path, routeId = null }) {
	if (typeof window === 'undefined' || !trackingAllowed()) return;
	if (SKIP.test(path) || navigator.webdriver || document.prerendering) return;

	flush(true);
	if (!bound) {
		document.addEventListener('visibilitychange', onVisibility);
		window.addEventListener('pagehide', () => flush(true));
		bound = true;
	}

	const id = uuid();
	const sid = sessionId();
	const secure = location.protocol === 'https:' ? '; Secure' : '';
	document.cookie = `age_sid=${sid}; Path=/; SameSite=Lax${secure}`;

	const fromPath = prevPath;
	prevPath = path;
	current = { id, visible: 0, since: document.visibilityState === 'visible' ? Date.now() : null };

	send({
		t: 'pv',
		id,
		visitorId: visitorId(),
		sessionId: sid,
		path: cleanPath(path),
		route: routeId,
		referrer: fromPath ? '' : document.referrer,
		fromPath,
		utm: utmOf(),
		viewportW: window.innerWidth
	});
}

/**
 * Record a funnel step from the browser. Only `checkout_started` is
 * accepted server-side; the money steps are recorded by the server.
 */
export function trackConversion(kind, meta = {}) {
	if (typeof window === 'undefined' || !trackingAllowed() || navigator.webdriver) return;
	send({
		t: 'conv',
		kind,
		visitorId: visitorId(),
		sessionId: sessionId(),
		path: cleanPath(location.pathname),
		meta
	});
}
