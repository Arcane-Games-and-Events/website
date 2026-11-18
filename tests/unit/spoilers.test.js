/**
 * Spoilers: plain-text ||bars||, how Lexical spoilers render, and that
 * excerpts and heading links never give them away.
 */
import { describe, expect, test } from 'vitest';
import { spoilerBlockHtml, splitSpoilers, stripSpoilers } from '../../src/lib/spoilers.js';
import { renderLexicalToSegments } from '../../src/lib/desk/render/render-lexical.js';
import { extractHeadings, lexicalToText } from '../../src/lib/desk/render/lexical-utils.js';
import { deriveExcerpt } from '../../src/lib/server/desk/entries.js';

const text = (t) => ({ type: 'text', text: t, format: 0 });
const para = (...children) => ({ type: 'paragraph', children });
const doc = (...children) => ({ root: { type: 'root', children } });

const BODY = doc(
	para(text('The winner was '), { type: 'spoiler', children: [text('Briar')] }, text(' again.')),
	{
		type: 'heading',
		tag: 'h2',
		children: [text('Top 8: '), { type: 'spoiler', children: [text('Dash')] }]
	},
	{
		type: 'spoiler_block',
		title: 'Top 8 <results>',
		children: [
			{ type: 'heading', tag: 'h3', children: [text('Final standings')] },
			para(text('Full list '), {
				type: 'link',
				url: 'https://example.com',
				children: [text('here')]
			})
		]
	},
	para(text('After the block.'))
);

describe('plain-text spoilers', () => {
	test('splits ||bars|| into runs', () => {
		expect(splitSpoilers('Won by ||Briar|| in ||round 6||.')).toEqual([
			{ text: 'Won by ', spoiler: false },
			{ text: 'Briar', spoiler: true },
			{ text: ' in ', spoiler: false },
			{ text: 'round 6', spoiler: true },
			{ text: '.', spoiler: false }
		]);
	});

	test('a spoiler can run over lines; lone or empty bars stay text', () => {
		expect(splitSpoilers('a ||one\ntwo|| b')[1]).toEqual({ text: 'one\ntwo', spoiler: true });
		expect(splitSpoilers('x || y')).toEqual([{ text: 'x || y', spoiler: false }]);
		expect(splitSpoilers('|| ||')).toEqual([{ text: '|| ||', spoiler: false }]);
	});

	test('stripping leaves a marker for meta descriptions and cards', () => {
		expect(stripSpoilers('Won by ||Briar||.')).toBe('Won by [spoiler].');
		expect(stripSpoilers(null)).toBe(null);
	});
});

describe('Lexical spoilers', () => {
	test('inline spoilers render hidden, with links out of the tab order', () => {
		const [first] = renderLexicalToSegments(BODY);
		expect(first.html).toContain('class="spoiler" role="button" tabindex="0"');
		expect(first.html).toContain('aria-label="Spoiler, hidden. Press to reveal."');
		expect(first.html).toContain('<span class="spoiler-text">Briar</span>');
	});

	test('a spoiler block becomes its own segment holding its contents', () => {
		const segs = renderLexicalToSegments(BODY);
		expect(segs.map((s) => s.kind)).toEqual(['html', 'spoiler', 'html']);
		expect(segs[1].segments[0].html).toContain('Final standings');
		expect(segs[1].title).toBe('Top 8 <results>');
		expect(segs[2].html).toContain('After the block.');
	});

	test('a block with a title shows it; without one, a note', () => {
		expect(spoilerBlockHtml('<p>x</p>', 'Top 8')).toContain(
			'<span class="spoiler-block-title">Top 8</span>'
		);
		expect(spoilerBlockHtml('<p>x</p>')).toContain('class="spoiler-block-note"');
	});

	test('links inside spoilers wait to be tabbable', () => {
		const inline = doc(
			para({
				type: 'spoiler',
				children: [{ type: 'link', url: 'https://example.com', children: [text('x')] }]
			})
		);
		expect(renderLexicalToSegments(inline)[0].html).toContain('noreferrer" tabindex="-1">x</a>');
	});

	test('heading links and the contents leave spoilers out', () => {
		const html = renderLexicalToSegments(BODY)[0].html;
		expect(html).toContain('<h2 id="top-8-spoiler">');
		expect(extractHeadings(BODY)).toEqual([
			{ text: 'Top 8: spoiler', id: 'top-8-spoiler', level: 2 }
		]);
	});

	test('excerpts never give a spoiler away; reading time still counts it', () => {
		const excerpt = deriveExcerpt(BODY);
		expect(excerpt).not.toContain('Briar');
		expect(excerpt).not.toContain('Final standings');
		expect(excerpt).toContain('[spoiler]');
		expect(lexicalToText(BODY)).toContain('Briar');
	});
});
