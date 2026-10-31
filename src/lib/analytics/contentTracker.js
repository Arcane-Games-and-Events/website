/**
 * Content tracker — measures how a reader reads or watches one Library piece.
 *
 * Definitions (the Desk dashboards use the same words):
 *   - Visible time: the tab is in the foreground.
 *   - Engaged time: visible AND the reader did something (scroll, move,
 *     tap, key) in the last 30 seconds — or a video is playing.
 *   - Depth: how far through the ARTICLE BODY the reader got (bottom of
 *     the screen), not the page — the footer and comments don't count.
 *   - Time by position: each engaged second is credited to the 5% slice of
 *     the body sitting on the reading line (35% down the screen), and to
 *     the section (H2/H3) above it.
 *   - Completed: reached 90% of the body with enough engaged time to have
 *     read it (40% of the estimated read time, at least 15s), or watched
 *     90% of the video.
 *
 * First-party only: nothing is sold or shared, so Global Privacy Control /
 * Do Not Track (which opt out of sale and sharing) don't switch it off —
 * a deliberate product decision (2026-10-27) so the numbers are complete.
 * Identifiers are random and anonymous; a signed-in reader's account id is
 * attached server-side for conversion credit only.
 */

const ENDPOINT = '/api/ca';
const BINS = 20;
const ACTIVE_WINDOW_MS = 30_000;
const BEAT_MS = 15_000;
const READ_LINE = 0.35;
const SESSION_IDLE_MS = 30 * 60_000;

// Development-only console notes, so it's easy to see the tracker working.
const DEV = typeof import.meta !== 'undefined' && !!import.meta.env?.DEV;
const note = (...a) => DEV && console.info('[analytics]', ...a);

// ---------------------------------------------------------------- ids

export function uuid() {
	if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
	});
}

function store(kind) {
	try {
		return kind === 'local' ? window.localStorage : window.sessionStorage;
	} catch {
		return null;
	}
}

/** Anonymous per-browser id. Mirrored to a cookie so sign-ups can be credited. */
export function visitorId() {
	const ls = store('local');
	let id = ls?.getItem('age_vid');
	if (!id) {
		const m = document.cookie.match(/(?:^|;\s*)age_vid=([0-9a-f-]{36})/i);
		id = m ? m[1] : uuid();
		ls?.setItem('age_vid', id);
	}
	const secure = location.protocol === 'https:' ? '; Secure' : '';
	document.cookie = `age_vid=${id}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
	return id;
}

/** Per-tab session that renews after 30 minutes of inactivity. */
export function sessionId() {
	const ss = store('session');
	const now = Date.now();
	let id = ss?.getItem('age_sid');
	const last = Number(ss?.getItem('age_sid_t') || 0);
	if (!id || now - last > SESSION_IDLE_MS) id = uuid();
	ss?.setItem('age_sid', id);
	ss?.setItem('age_sid_t', String(now));
	return id;
}

export function trackingAllowed() {
	return typeof navigator !== 'undefined' && typeof window !== 'undefined';
}

// ---------------------------------------------------------------- previous page

let currentPath = null;
/** Called by the root layout after every navigation, so a view knows the page before it. */
export function notePath(path) {
	currentPath = path;
}

// ---------------------------------------------------------------- transport

export function send(payload, { beacon = false } = {}) {
	const body = JSON.stringify(payload);
	try {
		if (beacon && navigator.sendBeacon) {
			navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'text/plain' }));
			return Promise.resolve();
		}
		return fetch(ENDPOINT, {
			method: 'POST',
			headers: { 'content-type': 'text/plain' },
			body,
			keepalive: true
		}).catch(() => {});
	} catch {
		return Promise.resolve();
	}
}

// ---------------------------------------------------------------- tracker

/**
 * Start measuring one piece. Returns `{ stop }`; call `stop()` when the
 * reader leaves it (component destroy or navigation to another piece).
 *
 * @param {{ entryId?: string, vodId?: string, courseId?: string, lessonId?: string,
 *           gated?: boolean, readTimeMinutes?: number | null,
 *           getBody?: () => Element | null, root?: Element | Document }} opts
 */
export function createContentTracker(opts) {
	const noop = { stop() {} };
	if (
		typeof window === 'undefined' ||
		!(opts?.entryId || opts?.vodId || opts?.courseId) ||
		!trackingAllowed()
	)
		return noop;

	const root = opts.root || document;
	const getBody = opts.getBody || (() => null);
	const readSeconds = Math.max(0, (opts.readTimeMinutes || 0) * 60);
	const id = uuid();
	const vid = visitorId();
	const sid = sessionId();

	const state = {
		visible: 0,
		engaged: 0,
		maxDepth: 0,
		depthSeconds: new Array(BINS).fill(0),
		sections: /** @type {Record<string, {t: string, s: number, i: number}>} */ ({}),
		completed: false,
		video: {
			seconds: 0,
			duration: 0,
			maxPct: 0,
			bins: new Array(BINS).fill(0),
			plays: 0,
			seeks: 0,
			completed: false
		}
	};
	/** @type {{type: string, label?: string|null, depth?: number|null}[]} */
	let events = [];
	let lastActivity = Date.now();
	let dirty = true;
	let stopped = false;
	/** @type {{type: string, target: string, at: number} | null} */
	let pendingExit = null;

	note('view started', { entryId: opts.entryId, vodId: opts.vodId, viewId: id, visitorId: vid });

	// ---- open the view ----
	const params = new URLSearchParams(location.search);
	const fromPath = currentPath && currentPath !== location.pathname ? currentPath : null;
	const started = send({
		t: 'start',
		id,
		entryId: opts.entryId,
		vodId: opts.vodId,
		courseId: opts.courseId,
		lessonId: opts.lessonId,
		visitorId: vid,
		sessionId: sid,
		gated: !!opts.gated,
		referrer: fromPath ? null : document.referrer || null,
		fromPath,
		utm: {
			source: params.get('utm_source'),
			medium: params.get('utm_medium'),
			campaign: params.get('utm_campaign')
		},
		viewportW: window.innerWidth
	});

	// ---- helpers ----
	const bodyRect = () => getBody()?.getBoundingClientRect() || null;
	function currentDepth() {
		const r = bodyRect();
		if (!r || r.height <= 0) return null;
		return Math.max(
			0,
			Math.min(100, Math.round(((window.innerHeight * READ_LINE - r.top) / r.height) * 100))
		);
	}
	function track(type, label = null) {
		if (stopped) return;
		events.push({ type, label: label ? String(label).slice(0, 200) : null, depth: currentDepth() });
		dirty = true;
	}

	// ---- activity ----
	const markActive = () => {
		lastActivity = Date.now();
	};
	const activityEvents = ['scroll', 'pointermove', 'pointerdown', 'keydown', 'touchstart', 'wheel'];
	activityEvents.forEach((e) => window.addEventListener(e, markActive, { passive: true }));

	// ---- video: native/mux elements ----
	/** @type {Set<any>} */
	const media = new Set();
	const playing = new Set();
	let playedOnce = false;
	function attachMedia(el) {
		if (media.has(el)) return;
		media.add(el);
		el.addEventListener('play', () => {
			playing.add(el);
			state.video.plays++;
			if (!playedOnce) {
				playedOnce = true;
				track('video_play');
			}
			dirty = true;
		});
		el.addEventListener('pause', () => playing.delete(el));
		el.addEventListener('seeking', () => {
			state.video.seeks++;
			dirty = true;
		});
		el.addEventListener('ended', () => {
			playing.delete(el);
			if (!state.video.completed) track('video_complete');
			state.video.completed = true;
			dirty = true;
		});
	}

	// ---- video: YouTube iframes (postMessage API; needs enablejsapi=1) ----
	const yt = new Map(); // iframe -> { id, time, duration, playing }
	let ytSeq = 0;
	function attachYouTube(iframe) {
		if (yt.has(iframe)) return;
		const rec = { id: ++ytSeq, time: 0, duration: 0, playing: false };
		yt.set(iframe, rec);
		const hello = () => {
			try {
				iframe.contentWindow?.postMessage(
					JSON.stringify({ event: 'listening', id: rec.id, channel: 'widget' }),
					'*'
				);
			} catch {
				/* cross-origin frame not ready */
			}
		};
		iframe.addEventListener('load', hello);
		hello();
		setTimeout(hello, 1500);
	}
	function onMessage(e) {
		if (!/^https:\/\/(www\.)?youtube(-nocookie)?\.com$/.test(e.origin || '')) return;
		let msg;
		try {
			msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
		} catch {
			return;
		}
		const rec =
			[...yt.values()].find((r) => r.id === msg?.id) ||
			(yt.size === 1 ? [...yt.values()][0] : null);
		if (!rec) return;
		const info = msg.info || {};
		if (typeof info.currentTime === 'number') rec.time = info.currentTime;
		if (typeof info.duration === 'number' && info.duration > 0) rec.duration = info.duration;
		const ps =
			typeof info.playerState === 'number'
				? info.playerState
				: msg.event === 'onStateChange'
					? msg.info
					: null;
		if (ps === 1 && !rec.playing) {
			rec.playing = true;
			state.video.plays++;
			if (!playedOnce) {
				playedOnce = true;
				track('video_play');
			}
		} else if (ps === 2 || ps === 0) {
			rec.playing = false;
			if (ps === 0) {
				if (!state.video.completed) track('video_complete');
				state.video.completed = true;
			}
		}
		dirty = true;
	}
	window.addEventListener('message', onMessage);

	function scanMedia() {
		root.querySelectorAll?.('mux-player, video').forEach(attachMedia);
		root.querySelectorAll?.('iframe[src*="youtube"]').forEach(attachYouTube);
	}
	scanMedia();
	const mo = new MutationObserver(scanMedia);
	mo.observe(root === document ? document.body : /** @type {Node} */ (root), {
		childList: true,
		subtree: true
	});

	// ---- interactions ----
	const ctaSeen = new Set();
	const io = new IntersectionObserver(
		(entries) => {
			for (const en of entries) {
				if (!en.isIntersecting || ctaSeen.has(en.target)) continue;
				ctaSeen.add(en.target);
				track('cta_view', en.target.getAttribute('data-premium-cta') || null);
			}
		},
		{ threshold: 0.5 }
	);
	document.querySelectorAll('[data-premium-cta]').forEach((el) => io.observe(el));

	const hovered = new Set();
	function onHover(e) {
		const el = /** @type {Element} */ (e.target)?.closest?.(
			'.card-link[data-card-name], [data-card-hover]'
		);
		if (!el) return;
		const name = el.getAttribute('data-card-name') || el.textContent?.trim().slice(0, 80) || 'card';
		if (hovered.has(name) || hovered.size >= 40) return;
		hovered.add(name);
		track('card_hover', name);
	}
	let copies = 0;
	function onCopy() {
		if (copies++ < 10) track('copy');
	}
	function onClick(e) {
		const t = /** @type {Element} */ (e.target);
		if (!t?.closest) return;
		const share = t.closest('[data-share]');
		if (share) track('share', share.getAttribute('data-share'));
		const cta = t.closest('[data-premium-cta]');
		if (cta && t.closest('a, button'))
			track('cta_click', cta.getAttribute('data-premium-cta') || null);
		if (t.closest('[data-decklist-toggle]')) track('decklist_open');
		const a = /** @type {HTMLAnchorElement | null} */ (t.closest('a[href]'));
		if (!a) return;
		const href = a.getAttribute('href') || '';
		if (href.startsWith('#')) {
			// strip the contents menu's numbering ("01 Tempo is…")
			track('toc_click', a.textContent?.trim().replace(/^\d+\s+/, '') || href);
			return;
		}
		let url;
		try {
			url = new URL(a.href, location.href);
		} catch {
			return;
		}
		if (url.origin !== location.origin) {
			track('link_out', url.hostname.replace(/^www\./, ''));
			pendingExit = {
				type: 'external',
				target: url.hostname.replace(/^www\./, ''),
				at: Date.now()
			};
		} else if (url.pathname !== location.pathname) {
			track('link_in', url.pathname);
			pendingExit = { type: 'internal', target: url.pathname, at: Date.now() };
		}
	}
	document.addEventListener('click', onClick, true);
	document.addEventListener('mouseenter', onHover, true);
	document.addEventListener('copy', onCopy);

	// ---- the clock ----
	let headings = [];
	let headingsAt = 0;
	function refreshHeadings() {
		const body = getBody();
		headings = body ? [...body.querySelectorAll('h2[id], h3[id]')] : [];
		headingsAt = Date.now();
	}
	function currentSection() {
		if (Date.now() - headingsAt > 5000) refreshHeadings();
		const line = window.innerHeight * READ_LINE;
		let idx = -1;
		for (let i = 0; i < headings.length; i++) {
			if (headings[i].getBoundingClientRect().top <= line) idx = i;
			else break;
		}
		if (idx === -1) return { key: '_intro', title: 'Opening', i: 0 };
		const h = headings[idx];
		return { key: h.id, title: h.textContent?.trim() || h.id, i: idx + 1 };
	}

	const tick = setInterval(() => {
		const videoPlaying = playing.size > 0 || [...yt.values()].some((r) => r.playing);

		// video watch time counts even with the tab in the background (audio)
		if (videoPlaying) {
			let time = 0;
			let dur = 0;
			const el = [...playing][0];
			if (el) {
				time = Number(el.currentTime) || 0;
				dur = Number(el.duration) || 0;
			} else {
				const r = [...yt.values()].find((x) => x.playing);
				if (r) {
					r.time += 1; // between YouTube updates
					time = r.time;
					dur = r.duration;
				}
			}
			state.video.seconds++;
			if (dur > 0 && isFinite(dur)) {
				state.video.duration = Math.round(dur);
				const pct = Math.min(100, Math.round((time / dur) * 100));
				state.video.maxPct = Math.max(state.video.maxPct, pct);
				state.video.bins[Math.min(BINS - 1, Math.floor((time / dur) * BINS))]++;
				if (pct >= 90) state.video.completed = true;
			}
			dirty = true;
		}

		if (document.visibilityState !== 'visible') return;
		state.visible++;
		dirty = true;

		// depth: how much of the body has been on screen
		const r = bodyRect();
		if (r && r.height > 0) {
			const seen = Math.max(
				0,
				Math.min(100, Math.round(((window.innerHeight - r.top) / r.height) * 100))
			);
			state.maxDepth = Math.max(state.maxDepth, seen);
		}

		const engaged = videoPlaying || Date.now() - lastActivity < ACTIVE_WINDOW_MS;
		if (!engaged) return;
		state.engaged++;

		const d = currentDepth();
		if (
			d != null &&
			r &&
			r.top < window.innerHeight * READ_LINE &&
			r.bottom > window.innerHeight * READ_LINE
		) {
			state.depthSeconds[Math.min(BINS - 1, Math.floor((d / 100) * BINS))]++;
			const sec = currentSection();
			const s = (state.sections[sec.key] ||= { t: sec.title.slice(0, 120), s: 0, i: sec.i });
			s.s++;
		}

		if (
			!state.completed &&
			state.maxDepth >= 90 &&
			state.engaged >= Math.max(15, readSeconds * 0.4)
		) {
			state.completed = true;
		}
		if (state.video.completed) state.completed = true;
	}, 1000);

	// ---- reporting ----
	function payload(exit) {
		const p = {
			t: 'beat',
			id,
			visitorId: vid,
			visible: state.visible,
			engaged: state.engaged,
			maxDepth: state.maxDepth,
			depthSeconds: state.depthSeconds,
			sections: state.sections,
			completed: state.completed,
			video: state.video,
			events,
			exit
		};
		events = [];
		dirty = false;
		return p;
	}
	function beat({ beacon = false, exit = null } = {}) {
		if (!dirty && !exit) return;
		const p = payload(exit);
		note('update sent', {
			visible: p.visible,
			engaged: p.engaged,
			depth: `${p.maxDepth}%`,
			events: p.events.length,
			...(exit ? { exit: exit.type } : {})
		});
		// page going away: send now; otherwise wait until the view is open
		if (beacon) send(p, { beacon: true });
		else started.then(() => send(p));
	}
	const beatTimer = setInterval(() => beat(), BEAT_MS);
	function onVisibility() {
		if (document.visibilityState === 'hidden') beat({ beacon: true });
	}
	function onPageHide() {
		const exit =
			pendingExit && Date.now() - pendingExit.at < 5000
				? { type: pendingExit.type, target: pendingExit.target }
				: { type: 'closed', target: null };
		beat({ beacon: true, exit });
	}
	document.addEventListener('visibilitychange', onVisibility);
	window.addEventListener('pagehide', onPageHide);

	return {
		/** @param {string} [nextPath] the page the reader moved to, if known */
		stop(nextPath) {
			if (stopped) return;
			const exit =
				pendingExit && Date.now() - pendingExit.at < 5000
					? { type: pendingExit.type, target: pendingExit.target }
					: { type: 'internal', target: nextPath || null };
			dirty = true;
			const p = payload(exit);
			stopped = true;
			started.then(() => send(p));
			clearInterval(tick);
			clearInterval(beatTimer);
			mo.disconnect();
			io.disconnect();
			activityEvents.forEach((e) => window.removeEventListener(e, markActive));
			window.removeEventListener('message', onMessage);
			document.removeEventListener('click', onClick, true);
			document.removeEventListener('mouseenter', onHover, true);
			document.removeEventListener('copy', onCopy);
			document.removeEventListener('visibilitychange', onVisibility);
			window.removeEventListener('pagehide', onPageHide);
		}
	};
}
