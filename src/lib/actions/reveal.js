/**
 * `use:reveal` — adds `.fp-reveal` and flips to `.is-in` the first time
 * the node scrolls into view, so departments rise in as the reader
 * moves down the page. No-op (content stays visible) without
 * IntersectionObserver or when the OS asks for reduced motion.
 *
 * @param {HTMLElement} node
 * @param {{ delay?: number, disabled?: boolean }} [opts]
 */
export function reveal(node, opts = {}) {
	if (opts.disabled) return;
	if (typeof IntersectionObserver === 'undefined') return;
	if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

	node.classList.add('fp-reveal');
	if (opts.delay) node.style.transitionDelay = `${opts.delay}ms`;

	const io = new IntersectionObserver(
		(entries) => {
			for (const e of entries) {
				if (e.isIntersecting) {
					node.classList.add('is-in');
					io.disconnect();
				}
			}
		},
		{ rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
	);
	io.observe(node);

	return {
		destroy() {
			io.disconnect();
		}
	};
}
