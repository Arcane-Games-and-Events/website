/**
 * Keeps an open discussion up to date without a reload. It asks the server
 * every few seconds whether anything changed (a cheap check) and runs
 * `onchange` (which fetches the discussion again) only when it has. It also
 * reports who's typing where, and tells the server when this person types.
 *
 * Polling is quick while a conversation is busy, slows down after two quiet
 * minutes, and stops while the tab is hidden (catching up when it's back).
 */
const BUSY_MS = 2500;
const QUIET_MS = 6000;
const QUIET_AFTER = 2 * 60 * 1000;
const PING_EVERY = 2500;

/**
 * @param {() => string} course the course's slug (read each time, as the page may move to another course)
 * @param {{ onchange: () => Promise<unknown> }} opts
 */
export function createLive(course, { onchange }) {
	let typing = $state(/** @type {{ thread: string, name: string }[]} */ ([]));
	let version = -1;
	let lastActivity = Date.now();
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let timer;
	let running = false;
	let inFlight = false;
	let lastPing = 0;
	let pingThread = '';
	let watching = '';

	async function poll() {
		if (inFlight) return;
		inFlight = true;
		const slug = course();
		// A different course starts from its own version.
		if (slug !== watching) {
			watching = slug;
			version = -1;
		}
		try {
			const res = await fetch(`/api/academy/${slug}/discussion/live`, { cache: 'no-store' });
			if (!res.ok) return;
			const out = await res.json();
			typing = out.typing ?? [];
			if (typing.length) lastActivity = Date.now();
			if (out.v >= 0 && version >= 0 && out.v !== version) {
				lastActivity = Date.now();
				version = out.v;
				await onchange();
			} else if (out.v >= 0) version = out.v;
		} catch {
			// Offline for a moment: try again next time.
		} finally {
			inFlight = false;
		}
	}

	function schedule() {
		clearTimeout(timer);
		if (!running || document.hidden) return;
		const wait = Date.now() - lastActivity > QUIET_AFTER ? QUIET_MS : BUSY_MS;
		timer = setTimeout(async () => {
			await poll();
			schedule();
		}, wait);
	}

	function onVisibility() {
		if (document.hidden) clearTimeout(timer);
		else poll().then(schedule);
	}

	return {
		/** Who's typing, other than this person: `{ thread, name }`. */
		get typing() {
			return typing;
		},
		/** Names typing in one conversation. */
		typingIn: (/** @type {string} */ threadId) =>
			typing.filter((x) => x.thread === threadId).map((x) => x.name),
		start() {
			if (running) return;
			running = true;
			document.addEventListener('visibilitychange', onVisibility);
			poll().then(schedule);
		},
		stop() {
			running = false;
			clearTimeout(timer);
			document.removeEventListener('visibilitychange', onVisibility);
		},
		/** This person did something (sent, opened a conversation): poll quickly again. */
		nudge() {
			lastActivity = Date.now();
			schedule();
		},
		/** This person is typing in `threadId` (sent at most every few seconds). */
		ping(/** @type {string} */ threadId) {
			lastActivity = Date.now();
			if (threadId === pingThread && Date.now() - lastPing < PING_EVERY) return;
			lastPing = Date.now();
			pingThread = threadId;
			send(threadId, true);
		},
		/** This person stopped typing (sent, cleared the box, left). */
		stopTyping(/** @type {string} */ threadId) {
			if (!lastPing) return;
			lastPing = 0;
			pingThread = '';
			send(threadId, false);
		}
	};

	/** @param {string} threadId @param {boolean} on */
	function send(threadId, on) {
		fetch(`/api/academy/${course()}/discussion/typing`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ threadId, on }),
			keepalive: true
		}).catch(() => {});
	}
}

/** "Sam", "Sam and Kai", "Sam, Kai and 2 others". */
export function typingWho(/** @type {string[]} */ names) {
	const n = [...new Set(names)];
	if (n.length <= 2) return n.join(' and ');
	const rest = n.length - 2;
	return `${n[0]}, ${n[1]} and ${rest} ${rest === 1 ? 'other' : 'others'}`;
}

/** "Sam is typing", "Sam and Kai are typing". */
export function typingLine(/** @type {string[]} */ names) {
	if (!names.length) return '';
	return `${typingWho(names)} ${new Set(names).size === 1 ? 'is' : 'are'} typing`;
}
