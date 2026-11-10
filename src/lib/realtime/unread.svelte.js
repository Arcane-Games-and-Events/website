/**
 * The header's unread counts: My courses (`learning`), the Classroom,
 * replies to your messages to AGE (`messages`) and, for admins, unread
 * conversations in the contact inbox (`inbox`).
 * Seeded from the root layout, then kept right by LiveUpdates.svelte:
 * updated as pages are opened (opening a notification's page reads it) and
 * when a live update says the user's notifications changed.
 */
export const unread = $state({ learning: 0, classroom: 0, messages: 0, inbox: 0 });

/** Ask the server for the current counts. */
export async function refreshUnread() {
	try {
		const res = await fetch('/api/notifications/unread', { cache: 'no-store' });
		if (!res.ok) return;
		const out = await res.json();
		unread.learning = Number(out.learning) || 0;
		unread.classroom = Number(out.classroom) || 0;
		unread.messages = Number(out.messages) || 0;
		unread.inbox = Number(out.inbox) || 0;
	} catch {
		// Offline for a moment: the next page load catches up.
	}
}
