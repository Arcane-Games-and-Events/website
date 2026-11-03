/**
 * Keeps an open discussion up to date without a reload.
 *
 * Live (Supabase Realtime, see $lib/realtime/client.svelte.js): the page
 * joins the course's channel and fetches the discussion again (`onchange`)
 * the moment the server says something changed. Typing travels straight
 * between browsers on the channel, and presence counts who's here.
 *
 * Fallback, while live updates are off or the channel is down: it asks the
 * server every few seconds whether anything changed (a cheap check) and
 * runs `onchange` only when it has. Polling is quick while a conversation
 * is busy, slows down after two quiet minutes, and stops while the tab is
 * hidden (catching up when it's back).
 */
import { joinChannel } from '$lib/realtime/client.svelte.js';

const BUSY_MS = 2500;
const QUIET_MS = 6000;
const QUIET_AFTER = 2 * 60 * 1000;
const PING_EVERY = 2500;
/** How long someone counts as typing after their last ping (matches the server's). */
const TYPING_MS = 6000;

/**
 * @param {() => string} course the course's slug (read each time, as the page may move to another course)
 * @param {{ onchange: () => Promise<unknown> }} opts
 */
export function createLive(course, { onchange }) {
	/** Typing, from the poll (fallback). */
	let polledTyping = $state(/** @type {{ thread: string, name: string }[]} */ ([]));
	/** Typing, from the live channel: who → where and when. */
	let liveTyping = $state(
		/** @type {Record<string, { thread: string, name: string, at: number }>} */ ({})
	);
	let here = $state(0);
	let isLive = $state(false);

	let version = -1;
	let lastActivity = Date.now();
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let timer;
	/** @type {ReturnType<typeof setInterval> | undefined} */
	let pruneTimer;
	let running = false;
	let inFlight = false;
	let refetching = false;
	let refetchAgain = false;
	let lastPing = 0;
	let pingThread = '';
	let watching = '';
	/** @type {{ courseId: string, me: { id: string, name: string }, post: boolean } | null} */
	let info = null;
	/** @type {ReturnType<typeof joinChannel> | null} */
	let channel = null;

	const typing = $derived(
		isLive ? Object.values(liveTyping).map(({ thread, name }) => ({ thread, name })) : polledTyping
	);

	/** Fetch the discussion again; changes that land meanwhile get one more fetch. */
	async function refetch() {
		if (refetching) {
			refetchAgain = true;
			return;
		}
		refetching = true;
		try {
			do {
				refetchAgain = false;
				await onchange();
			} while (refetchAgain);
		} finally {
			refetching = false;
		}
	}

	async function poll() {
		if (inFlight) return;
		inFlight = true;
		const slug = course();
		// A different course starts from its own version (and channel).
		if (slug !== watching) {
			watching = slug;
			version = -1;
			leaveChannel();
		}
		try {
			const res = await fetch(`/api/academy/${slug}/discussion/live`, { cache: 'no-store' });
			if (!res.ok) {
				// Not (or no longer) in the course: stop listening.
				if (res.status === 401 || res.status === 403) leaveChannel();
				return;
			}
			const out = await res.json();
			polledTyping = out.typing ?? [];
			if (polledTyping.length) lastActivity = Date.now();
			if (out.v >= 0 && version >= 0 && out.v !== version) {
				lastActivity = Date.now();
				version = out.v;
				await refetch();
			} else if (out.v >= 0) version = out.v;
			if (out.courseId && !channel && running) {
				info = { courseId: out.courseId, me: out.me, post: !!out.post };
				joinCourseChannel();
			}
		} catch {
			// Offline for a moment: try again next time.
		} finally {
			inFlight = false;
		}
	}

	function joinCourseChannel() {
		if (!info) return;
		const me = info.me;
		channel = joinChannel({
			topic: `course:${info.courseId}`,
			events: {
				changed: (p) => {
					// Removed from the course or muted: check again where we stand.
					if (p.userId === me.id && (p.kind === 'removed' || p.kind === 'muted')) {
						leaveChannel();
						poll().then(schedule);
					}
					lastActivity = Date.now();
					refetch();
				},
				typing: (p) => {
					if (!p?.u || p.u === me.id) return;
					const next = { ...liveTyping };
					if (p.on)
						next[p.u] = { thread: String(p.t), name: String(p.n || 'Someone'), at: Date.now() };
					else delete next[p.u];
					liveTyping = next;
					startPruning();
				}
			},
			presence: {
				key: me.id,
				meta: { n: me.name },
				onSync: (state) => (here = Object.keys(state).length)
			},
			onStatus: (status) => {
				const was = isLive;
				isLive = status === 'live';
				if (isLive) {
					clearTimeout(timer);
					// Catch up on anything missed while connecting.
					if (!was) poll();
				} else {
					here = 0;
					liveTyping = {};
					schedule();
				}
			}
		});
	}

	function leaveChannel() {
		channel?.leave();
		channel = null;
		isLive = false;
		here = 0;
		liveTyping = {};
	}

	/** Forget typers who've gone quiet. */
	function startPruning() {
		if (pruneTimer) return;
		pruneTimer = setInterval(() => {
			const now = Date.now();
			const keep = Object.entries(liveTyping).filter(([, x]) => now - x.at < TYPING_MS);
			if (keep.length !== Object.keys(liveTyping).length) liveTyping = Object.fromEntries(keep);
			if (!keep.length) {
				clearInterval(pruneTimer);
				pruneTimer = undefined;
			}
		}, 1000);
	}

	function schedule() {
		clearTimeout(timer);
		if (!running || isLive || document.hidden) return;
		const wait = Date.now() - lastActivity > QUIET_AFTER ? QUIET_MS : BUSY_MS;
		timer = setTimeout(async () => {
			await poll();
			schedule();
		}, wait);
	}

	function onVisibility() {
		if (document.hidden) clearTimeout(timer);
		else if (!isLive) poll().then(schedule);
	}

	return {
		/** Who's typing, other than this person: `{ thread, name }`. */
		get typing() {
			return typing;
		},
		/** How many people have the discussion open (0 when not live). */
		get here() {
			return here;
		},
		/** Whether updates are arriving live (not polled). */
		get live() {
			return isLive;
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
			clearInterval(pruneTimer);
			pruneTimer = undefined;
			leaveChannel();
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
		if (isLive && channel && info) {
			if (info.post) channel.send('typing', { u: info.me.id, n: info.me.name, t: threadId, on });
			return;
		}
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
