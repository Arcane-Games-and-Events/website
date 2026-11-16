/**
 * Toasts — short confirmations that come and go ("Saved", "Copied").
 * Call toast('Saved') from anywhere; <Toaster /> (once, in a layout) shows them.
 */
export const toasts = $state(/** @type {{ id: number, message: string, tone: string }[]} */ ([]));

let next = 0;

/**
 * @param {string} message
 * @param {{ tone?: 'neutral' | 'success' | 'danger', duration?: number }} [opts]
 */
export function toast(message, { tone = 'neutral', duration = 4000 } = {}) {
	const id = ++next;
	toasts.push({ id, message, tone });
	setTimeout(() => dismiss(id), duration);
	return id;
}

/** @param {number} id */
export function dismiss(id) {
	const i = toasts.findIndex((t) => t.id === id);
	if (i >= 0) toasts.splice(i, 1);
}
