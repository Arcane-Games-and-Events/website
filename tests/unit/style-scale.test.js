/**
 * The site's styling stays on Tailwind's stock scale (see the note in
 * src/app.css): no one-off font sizes, letter-spacing, line heights,
 * spacing, z-index layers or raw hex colours in class names. Grid
 * templates, percentages, viewport units, calc()/var() and em values
 * relative to the parent are still allowed, as are a few deliberate
 * exceptions: decorative numerals larger than text-9xl and the Library
 * wordmark's letter-spacing.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC = join(process.cwd(), 'src');

function files(dir) {
	return readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
		d.isDirectory()
			? files(join(dir, d.name))
			: /\.(svelte|js)$/.test(d.name) && !d.name.includes('.test.')
				? [join(dir, d.name)]
				: []
	);
}

const SPACING =
	'p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y|w|h|min-w|min-h|max-w|max-h|size|top|left|right|bottom|inset|inset-x|inset-y|translate-x|translate-y|scroll-mt|basis';
const B = String.raw`(?:^|[\s"'\x60{:!(])-?`;

const RULES = [
	[
		'font size',
		new RegExp(`${B}text-\\[(\\d*\\.?\\d+)(px|rem)\\]`, 'g'),
		(m) => +m[1] * (m[2] === 'rem' ? 16 : 1) <= 150
	],
	['letter-spacing', new RegExp(`${B}tracking-\\[(-?\\d*\\.?\\d+)em\\]`, 'g'), (m) => +m[1] <= 0.3],
	['line height', new RegExp(`${B}leading-\\[[^\\]]+\\]`, 'g')],
	['spacing', new RegExp(`${B}(?:${SPACING})-\\[-?\\d*\\.?\\d+(px|rem)\\]`, 'g')],
	['border width', new RegExp(`${B}border(?:-[trblxy])?-\\[\\d*\\.?\\d+px\\]`, 'g')],
	['z-index', new RegExp(`${B}z-\\[\\d+\\]`, 'g')],
	['raw hex colour', new RegExp(`-\\[#[0-9a-fA-F]{3,8}\\]`, 'g')]
];

describe('style scale', () => {
	const sources = files(SRC).map((f) => [relative(process.cwd(), f), readFileSync(f, 'utf8')]);

	for (const [name, re, banned = () => true] of RULES) {
		it(`no one-off ${name} values`, () => {
			const found = sources.flatMap(([file, text]) =>
				[...text.matchAll(re)].filter(banned).map((m) => `${file}: ${m[0].trim()}`)
			);
			expect(found, found.join('\n')).toEqual([]);
		});
	}
});
