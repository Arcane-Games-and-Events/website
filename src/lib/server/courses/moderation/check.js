/**
 * The rules a discussion post must pass to go up without review. Pure
 * functions (no database): `checkText` looks at the words; `spamReasons`
 * at what the author posted recently, which the caller supplies.
 *
 * Every reason is `category:detail`, e.g. `profanity:fuck`, `link:bit.ly`,
 * `personal:email`, `spam:caps`. Moderators see these in the review queue.
 */
import {
	HARASSMENT,
	LINK_ALLOWLIST,
	PROFANITY,
	SELF_HARM,
	SEXUAL,
	SLURS,
	THREATS
} from './words.js';

const LEET = {
	0: 'o',
	1: 'i',
	'!': 'i',
	'|': 'i',
	3: 'e',
	4: 'a',
	'@': 'a',
	5: 's',
	$: 's',
	7: 't'
};
const SUFFIXES = ['', 's', 'es', 'ed', 'er', 'ers', 'ing', 'in', 'y', 'z', 'head', 'heads'];

/** Lower-case, map look-alike characters, and split into words. */
export function tokens(text) {
	const mapped = String(text || '')
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[01!|3@4$57]/g, (ch) => LEET[ch] || ch)
		// Apostrophes join words ("you're" → "youre").
		.replace(/['’]/g, '');
	const raw = mapped.split(/[^a-z0-9]+/).filter(Boolean);
	// Spaced-out letters ("f u c k", "f.u.c.k") become one word.
	const out = [];
	let run = '';
	for (const t of raw) {
		if (t.length === 1) {
			run += t;
			continue;
		}
		if (run) out.push(run);
		run = '';
		out.push(t);
	}
	if (run) out.push(run);
	return out;
}

/** "fuuuuck" → "fuck"; only used for words of 4+ letters, so "ass" ≠ "as". */
const collapse = (w) => w.replace(/(.)\1+/g, '$1');

function makeMatcher(words) {
	const exact = new Set();
	const collapsed = new Set();
	for (const w of words) {
		for (const s of SUFFIXES) exact.add(w + s);
		if (collapse(w).length >= 4) collapsed.add(collapse(w));
	}
	return (token) => {
		if (exact.has(token)) return true;
		const c = collapse(token);
		if (c.length < 4) return false;
		if (collapsed.has(c)) return true;
		for (const s of SUFFIXES)
			if (s && c.endsWith(s) && collapsed.has(c.slice(0, -s.length))) return true;
		return false;
	};
}

const WORD_RULES = [
	['slur', makeMatcher(SLURS)],
	['profanity', makeMatcher(PROFANITY)],
	['sexual', makeMatcher(SEXUAL.filter((w) => !w.includes(' ')))]
];
const PHRASE_RULES = [
	['threat', THREATS],
	['self-harm', SELF_HARM],
	['harassment', HARASSMENT]
];

const URL_RE =
	/\b(?:https?:\/\/)?(?:www\.)?((?:[a-z0-9-]+\.)+(?:com|net|org|io|gg|co|xyz|me|tv|ly|info|biz|ru|cn|app|dev|link|site|club|online|shop|top|us|uk|ca))\b(?:\/\S*)?/gi;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const PHONE_RE = /(?:\+?\d[\s().-]*){10,}/;

function allowedDomain(host, siteHost) {
	const h = host.toLowerCase().replace(/^www\./, '');
	const list = siteHost ? [...LINK_ALLOWLIST, siteHost.replace(/^www\./, '')] : LINK_ALLOWLIST;
	return list.some((d) => h === d || h.endsWith(`.${d}`));
}

/**
 * Words, phrases, links and personal details.
 * @param {string} text
 * @param {{ siteHost?: string }} [opts]
 * @returns {string[]} reasons, empty when the text is fine
 */
export function checkText(text, { siteHost = '' } = {}) {
	const reasons = new Set();
	const words = tokens(text);
	for (const w of words) {
		for (const [cat, match] of WORD_RULES) if (match(w)) reasons.add(`${cat}:${w}`);
	}
	const joined = ` ${words.join(' ')} `;
	for (const [cat, phrases] of PHRASE_RULES) {
		for (const p of phrases) if (joined.includes(` ${p} `)) reasons.add(`${cat}:${p}`);
	}

	const raw = String(text || '');
	if (EMAIL_RE.test(raw)) reasons.add('personal:email');
	else {
		for (const m of raw.matchAll(URL_RE)) {
			if (!allowedDomain(m[1], siteHost)) reasons.add(`link:${m[1].toLowerCase()}`);
		}
	}
	const digits = raw.match(PHONE_RE)?.[0]?.replace(/\D/g, '') || '';
	if (digits.length >= 10 && digits.length <= 15) reasons.add('personal:phone');
	return [...reasons];
}

/**
 * Spam by shape and by habit.
 * @param {string} text
 * @param {{ recent?: { body: string, createdAt: Date }[], now?: Date }} [history]
 *   the author's posts from the last hour, anywhere
 */
export function spamReasons(text, { recent = [], now = new Date() } = {}) {
	const reasons = [];
	const raw = String(text || '');
	const letters = raw.replace(/[^a-zA-Z]/g, '');
	if (letters.length > 20 && letters.replace(/[^A-Z]/g, '').length / letters.length > 0.7)
		reasons.push('spam:caps');
	if (/(.)\1{9,}/.test(raw) || /\b(\w+)(?:\W+\1\b){4,}/i.test(raw)) reasons.push('spam:repeated');
	const norm = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();
	if (raw.trim().length >= 3 && recent.some((p) => norm(p.body) === norm(raw)))
		reasons.push('spam:duplicate');
	const tenMinutes = now.getTime() - 10 * 60000;
	if (recent.filter((p) => new Date(p.createdAt).getTime() > tenMinutes).length >= 5)
		reasons.push('spam:too-fast');
	return reasons;
}

export { describeReason } from '$lib/academy/reasons.js';
