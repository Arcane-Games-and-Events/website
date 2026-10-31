/**
 * The discussion filter: what gets held for review, and the ordinary
 * card-game talk that must never be.
 */
import { describe, expect, test } from 'vitest';
import { checkText, spamReasons, tokens } from '../../src/lib/server/courses/moderation/check.js';

const held = (text) => checkText(text, { siteHost: 'agegg.test' }).length > 0;

describe('held for review', () => {
	test.each([
		['a slur', 'what a faggot'],
		['a slur in disguise', 'shut it n1gg@'],
		['a slur spaced out', 'you r e t a r d'],
		['swearing', 'this deck is fucking broken'],
		['stretched swearing', 'fuuuuuck this matchup'],
		['sexual content', 'check my onlyfans'],
		['a threat', 'I will find where you live'],
		['a threat at a person', 'I am going to kill you'],
		['self-harm', 'honestly I want to die after that loss'],
		['harassment', 'just kys already'],
		['harassment, contracted', "you're worthless at this game"],
		['a link to an unlisted site', 'free packs at bit.ly/xyz'],
		['a link with a scheme', 'go to https://cheapcards.ru/deal'],
		['an email address', 'email me at someone@example.com'],
		['a phone number', 'text me 555-123-4567']
	])('%s', (_, text) => {
		expect(held(text)).toBe(true);
	});

	test('reasons say what matched', () => {
		expect(checkText('this is shit')).toEqual(['profanity:shit']);
		expect(checkText('see bit.ly/x')).toEqual(['link:bit.ly']);
	});
});

describe('ordinary posts are left alone', () => {
	test.each([
		'Should I block with my Scunthorpe or pitch it?',
		'The assassin deck kills fast on turn three.',
		'I killed my opponent at 2 life with a Command and Conquer.',
		'Classic tempo play: attack, destroy the arsenal, pass.',
		'Is this a bomb in limited? Feels like a must-pick.',
		'Dickens would have loved this storyline.',
		'Ordered a cocktail after round 5, earned it.',
		'Here is the video: https://www.youtube.com/watch?v=abc123',
		'Decklist on fabrary.net/decks/123 if anyone wants it',
		'Our own page agegg.test/academy/blocking-101 covers it',
		'Pitch 1 for 3 resources, then 2 more on turn 4.',
		'I went 5-1 at the Calling, 4 wins in a row.',
		'Is that card worth it? I think it is.',
		'Thanks! This topic finally made pitch math click for me.'
	])('%s', (text) => {
		expect(checkText(text, { siteHost: 'agegg.test' })).toEqual([]);
	});
});

describe('spam', () => {
	const now = new Date();
	test('shouting, repeating, duplicates and posting too fast', () => {
		expect(spamReasons('THIS DECK IS THE WORST THING I HAVE EVER SEEN')).toContain('spam:caps');
		expect(spamReasons('buy buy buy buy buy now')).toContain('spam:repeated');
		expect(spamReasons('!!!!!!!!!!!!!!')).toContain('spam:repeated');
		expect(
			spamReasons('Great topic', { recent: [{ body: 'great   topic', createdAt: now }], now })
		).toContain('spam:duplicate');
		const five = Array.from({ length: 5 }, (_, i) => ({ body: `post ${i}`, createdAt: now }));
		expect(spamReasons('one more', { recent: five, now })).toContain('spam:too-fast');
	});
	test('a short acronym in capitals isn’t shouting', () => {
		expect(spamReasons('Is CnC good vs the AGE Open meta?')).toEqual([]);
	});
});

test('tokens join spaced-out letters and map look-alikes', () => {
	expect(tokens('f.u.c.k this')).toEqual(['fuck', 'this']);
	expect(tokens('5h1t')).toEqual(['shit']);
});
