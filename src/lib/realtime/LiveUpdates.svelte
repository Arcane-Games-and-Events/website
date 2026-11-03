<!--
  LiveUpdates — mounted once in the root layout. Keeps the header's unread
  badge right:

  - Opening a page a notification points to (a reply's conversation, a new
    topic, a course's review page…) marks it read and updates the badge
    straight away, however the page was reached.
  - With live updates on, it joins the user's own channel and re-reads the
    counts whenever their notifications change, in any tab. It also
    switches this tab's live connection on for signed-in people.
  - Without them (off, or not connected), the counts are checked again on
    every page change and when the tab comes back into view.
-->
<script>
	import { page } from '$app/state';
	import { afterNavigate, invalidate } from '$app/navigation';
	import { configureRealtime, joinChannel } from './client.svelte.js';
	import { refreshUnread, unread } from './unread.svelte.js';

	const userId = $derived(page.data?.user?.id ?? null);
	// Plain values, so a navigation that doesn't reload them can't put back
	// counts that are out of date.
	const loadedLearning = $derived(page.data?.unreadNotifications ?? 0);
	const loadedClassroom = $derived(page.data?.classroomUnread ?? 0);

	// Whether the badge holds counts fresher than the ones loaded with the site.
	let fresh = false;

	// The counts the site was loaded (or reloaded) with.
	$effect(() => {
		unread.learning = loadedLearning;
		unread.classroom = loadedClassroom;
		fresh = false;
	});

	// Whether the user's live channel is connected (then new notifications
	// arrive by themselves).
	let live = false;

	// Anything unread that links to this page is read now; without live
	// updates, this is also when new ones show up.
	afterNavigate(async ({ to }) => {
		// What the badge shows now (live updates included), or on the first
		// page, what the site was loaded with.
		const total = Math.max(
			unread.learning + unread.classroom,
			fresh ? 0 : loadedLearning + loadedClassroom
		);
		if (!userId || !to?.url || (total === 0 && live)) return;
		try {
			const res = await fetch('/api/notifications/seen', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ path: to.url.pathname })
			});
			if (!res.ok) return;
			const { counts, marked } = await res.json();
			// Pages that show what's unread (the discussion list) catch up.
			if (marked) invalidate('app:notifications');
			unread.learning = Number(counts?.learning) || 0;
			unread.classroom = Number(counts?.classroom) || 0;
			fresh = true;
		} catch {
			// Offline for a moment: the next page catches up.
		}
	});

	$effect(() => {
		configureRealtime(page.data?.realtime ?? null, userId);
	});

	$effect(() => {
		if (!userId) return;
		const ch = joinChannel({
			topic: `user:${userId}`,
			events: {
				notes: () => {
					refreshUnread();
					invalidate('app:notifications');
				}
			},
			onStatus: (status) => {
				// Back after a gap: catch up on anything that arrived meanwhile.
				if (status === 'live' && !live) refreshUnread();
				live = status === 'live';
			}
		});
		return () => {
			live = false;
			ch.leave();
		};
	});

	// Without live updates, coming back to the tab checks for new ones.
	$effect(() => {
		if (!userId) return;
		const onVisible = () => {
			if (!document.hidden && !live) refreshUnread();
		};
		document.addEventListener('visibilitychange', onVisible);
		return () => document.removeEventListener('visibilitychange', onVisible);
	});
</script>
