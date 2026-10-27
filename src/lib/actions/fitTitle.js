/**
 * Shrink a headline until it sits on at most `lines` lines, the way the
 * homepage hero does. The element's CSS should set `--title-max` (the
 * largest size for the breakpoint); the action measures and writes an exact
 * pixel size, re-fitting on resize, once web fonts load, and when the
 * parameter (usually the title text) changes.
 *
 * @param {HTMLElement} node
 * `phoneLines` allows a different line count below 768px.
 *
 * @param {{ lines?: number, phoneLines?: number, min?: number, key?: unknown }} [opts]
 */
export function fitTitle(node, opts = {}) {
	let o = opts;

	function fit() {
		const wide = window.matchMedia('(min-width: 768px)').matches;
		const lines = (wide ? o.lines : (o.phoneLines ?? o.lines)) ?? 2;
		const minRatio = o.min ?? 0.55;
		node.style.fontSize = 'var(--title-max)';
		const cs = getComputedStyle(node);
		const max = parseFloat(cs.fontSize);
		const lh = parseFloat(cs.lineHeight) / max;
		if (!max || !lh) return;
		const fits = (px) => {
			node.style.fontSize = `${px}px`;
			return node.getBoundingClientRect().height <= px * lh * lines + 1;
		};
		if (fits(max)) return;
		let lo = max * minRatio;
		let hi = max;
		if (!fits(lo)) return;
		for (let i = 0; i < 7; i++) {
			const mid = (lo + hi) / 2;
			if (fits(mid)) lo = mid;
			else hi = mid;
		}
		fits(Math.floor(lo));
	}

	fit();
	document.fonts?.ready.then(fit);
	window.addEventListener('resize', fit);
	return {
		/** @param {{ lines?: number, phoneLines?: number, min?: number, key?: unknown }} [next] */
		update(next = {}) {
			o = next;
			fit();
		},
		destroy() {
			window.removeEventListener('resize', fit);
		}
	};
}
