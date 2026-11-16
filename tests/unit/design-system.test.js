/**
 * The design system's rules, checked: components in src/lib/ds use only
 * Tailwind's scales and the system's tokens (no one-off values, no raw
 * colours), and every text colour is readable on the surfaces it's used on
 * — 4.5:1 — in both looks, light and dark.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CONTRAST_PAIRS, LOOKS, MODES } from '../../src/lib/ds/tokens.js';

const DS = join(process.cwd(), 'src/lib/ds');
const css = readFileSync(join(DS, 'tokens.css'), 'utf8');

/** The --ds-* values set in the block that starts with `selector {`. */
function block(selector) {
	const start = css.indexOf(`${selector} {`);
	if (start < 0) throw new Error(`no block for ${selector}`);
	const body = css.slice(start, css.indexOf('}', start));
	return Object.fromEntries(
		[...body.matchAll(/--ds-([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()])
	);
}

const SELECTORS = {
	editorial: {
		light: ":root,\n[data-look='editorial']",
		dark: "[data-look='editorial']:where(.dark, .dark *)"
	},
	app: { light: "[data-look='app']", dark: "[data-look='app']:where(.dark, .dark *)" }
};

/** Every token's value in one look and mode (dark builds on light). */
function tokens(look, mode) {
	const light = block(SELECTORS[look].light);
	return mode === 'dark' ? { ...light, ...block(SELECTORS[look].dark) } : light;
}

function luminance(hex) {
	const h = hex.replace('#', '');
	const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
	return [0, 2, 4]
		.map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
		.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
		.reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
}
const contrast = (a, b) => {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
};

describe('design system tokens', () => {
	for (const look of LOOKS) {
		for (const mode of MODES) {
			it(`${look} · ${mode}: every text colour reaches 4.5:1`, () => {
				const t = tokens(look, mode);
				const failures = CONTRAST_PAIRS.map(([fg, bg]) => {
					expect(t[fg], `${fg} in ${look} ${mode}`).toMatch(/^#[0-9a-f]{3,6}$/i);
					expect(t[bg], `${bg} in ${look} ${mode}`).toMatch(/^#[0-9a-f]{3,6}$/i);
					const ratio = contrast(t[fg], t[bg]);
					return ratio < 4.5 ? `${fg} on ${bg}: ${ratio.toFixed(2)}` : null;
				}).filter(Boolean);
				expect(failures).toEqual([]);
			});
		}
	}

	it('dark mode sets every colour the light look does', () => {
		for (const look of LOOKS) {
			const light = Object.keys(block(SELECTORS[look].light)).filter(
				(k) => !k.startsWith('radius') && !k.startsWith('font') && !k.startsWith('shadow-raised')
			);
			const dark = block(SELECTORS[look].dark);
			expect(
				light.filter((k) => !(k in dark)),
				look
			).toEqual([]);
		}
	});
});

describe('design system components', () => {
	const files = readdirSync(DS)
		.filter((f) => /\.(svelte|js)$/.test(f) && f !== 'tokens.js' && f !== 'icons.js')
		.map((f) => [f, readFileSync(join(DS, f), 'utf8')]);

	it('use only Tailwind scales: no one-off values or properties', () => {
		const found = files.flatMap(([f, src]) =>
			[...src.matchAll(/(?:[\w:-]+-\[[^\]]+\]|\s\[[a-z-]+:[^\]\s]+\])/g)].map(
				(m) => `${f}: ${m[0].trim()}`
			)
		);
		expect(found).toEqual([]);
	});

	it('use the tokens for colour: no raw hex or palette colours', () => {
		const palette =
			/\b(?:text|bg|border|ring|fill|stroke|outline|divide|from|to)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)\b/g;
		const found = files.flatMap(([f, src]) => [
			...[...src.matchAll(/#[0-9a-f]{3,8}\b/gi)].map((m) => `${f}: ${m[0]}`),
			...[...src.matchAll(palette)].map((m) => `${f}: ${m[0]}`)
		]);
		expect(found).toEqual([]);
	});
});
