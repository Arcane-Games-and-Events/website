/**
 * The header's unread counts: My courses (`learning`) and the Classroom.
 * Seeded from the root layout, then kept right by LiveUpdates.svelte:
 * updated as pages are opened (opening a notification's page reads it) and
 * when a live update says the user's notifications changed.
 */
export const unread = $state({ learning: 0, classroom: 0 });

/** Ask the server for the current counts. */
export async function refreshUnread() {
	try {
		const res = await fetch('/api/notifications/unread', { cache: 'no-store' });
		if (!res.ok) return;
		const out = await res.json();
		unread.learning = Number(out.learning) || 0;
		unread.classroom = Number(out.classroom) || 0;
	} catch {
		// Offline for a moment: the next page load catches up.
	}
}
