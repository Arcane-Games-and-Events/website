/**
 * While videos on a page are processing on Mux, ask the server to check
 * each one every few seconds (it mirrors Mux onto the row), and call
 * `onchange` when any status moves. Works whether or not Mux's webhook can
 * reach this server. Stops after `forMs`. Returns a cleanup function.
 *
 * @param {{ target: string, id: string, status: string | null }[]} items
 * @param {() => void} onchange
 */
export function pollProcessing(items, onchange, { everyMs = 5000, forMs = 30 * 60 * 1000 } = {}) {
	const pending = items.filter((i) => i.status === 'preparing');
	if (!pending.length) return () => {};
	const started = Date.now();
	let stopped = false;
	let timer;
	const tick = async () => {
		let moved = false;
		for (const i of pending) {
			try {
				const res = await fetch(`/api/desk/videos/${i.target}/${i.id}/sync`, { method: 'POST' });
				if (!res.ok) continue;
				const { video } = await res.json();
				if (video?.status && video.status !== i.status) {
					i.status = video.status;
					moved = true;
				}
			} catch {
				/* next time */
			}
		}
		if (stopped) return;
		if (moved) onchange();
		if (pending.some((i) => i.status === 'preparing') && Date.now() - started < forMs) {
			timer = setTimeout(tick, everyMs);
		}
	};
	timer = setTimeout(tick, everyMs);
	return () => {
		stopped = true;
		clearTimeout(timer);
	};
}
