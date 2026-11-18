/**
 * use:heroAppear on a hero's still: if it hasn't loaded by the time the
 * page is interactive, it eases in when it does instead of popping in
 * (and a HeroMotion over it waits for it). Already loaded: nothing changes.
 * @param {HTMLImageElement} img
 */
export function heroAppear(img) {
	if (img.complete && img.naturalWidth) return;
	img.style.opacity = '0';
	img.style.transition = 'opacity 400ms ease-out';
	const show = () => (img.style.opacity = '');
	img.addEventListener('load', show, { once: true });
	return { destroy: () => img.removeEventListener('load', show) };
}
