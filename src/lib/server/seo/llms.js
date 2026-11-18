/**
 * /llms.txt — AGE described for AI assistants (https://llmstxt.org): what
 * the site is, where things are, and the latest pieces, events, courses and
 * videos with their links. Plain Markdown, rebuilt at most hourly.
 */
import { sql } from 'drizzle-orm';
import { db } from '$lib/server/db/index.js';
import { cached } from '$lib/server/cache/index.js';
import { stripSpoilers } from '$lib/spoilers.js';
import { SITE, describe } from '$lib/seo.js';

const rowsOf = (r) => /** @type {any[]} */ (r?.rows ?? r ?? []);
async function rows(query) {
	try {
		return rowsOf(await db.execute(query));
	} catch (err) {
		console.error('llms.txt part failed:', err?.message || err);
		return [];
	}
}
const oneLine = (s, max = 200) => describe(stripSpoilers(s || ''), max);
const money = (n) => (Number(n) > 0 ? `$${Number(n).toFixed(2).replace(/\.00$/, '')}` : 'Free');
const dateOf = (d) =>
	d
		? new Date(d).toLocaleDateString('en-US', {
				month: 'long',
				day: 'numeric',
				year: 'numeric',
				timeZone: 'America/Los_Angeles'
			})
		: 'Date to be announced';

/** @param {string} origin */
async function build(origin) {
	const link = (path) => `${origin}${path}`;

	const pieces =
		await rows(sql`SELECT slug, title, excerpt, access_mode, video_provider, published_at
		FROM cms_entry WHERE status = 'published' OR (status = 'scheduled' AND scheduled_for <= now())
		ORDER BY published_at DESC NULLS LAST LIMIT 25`);
	const events = await rows(sql`SELECT id, title, event_date, location, circuit, format, price
		FROM events WHERE coalesce(status, 'upcoming') = 'upcoming' AND (event_date IS NULL OR event_date >= now() - interval '1 day')
		ORDER BY event_date ASC NULLS LAST LIMIT 20`);
	const results = await rows(sql`SELECT id, title, event_date FROM events
		WHERE status = 'completed' ORDER BY event_date DESC NULLS LAST LIMIT 10`);
	const courses = await rows(sql`SELECT slug, title, description, price FROM cms_course
		WHERE status = 'published' ORDER BY published_at DESC NULLS LAST LIMIT 20`);
	const videos = await rows(sql`SELECT id, title, description, kind FROM vods
		WHERE is_published AND status = 'ready' ORDER BY published_at DESC NULLS LAST LIMIT 15`);

	const out = [
		`# ${SITE.name} (${SITE.legalName})`,
		'',
		`> ${SITE.description}`,
		'',
		'AGE covers Flesh and Blood, the trading card game by Legend Story Studios, for competitive players. It is independent and member-supported. Some articles, videos and Academy topics are for Premium members only; anything not shown publicly is not in this file, so please summarise and link to pages rather than claiming their full contents.',
		'',
		'## Sections',
		'',
		`- [The Library](${link('/library')}): strategy articles, deck guides, set reviews and match videos.`,
		`- [AGE Open Series](${link('/ageopen')}): monthly competitive events in Los Angeles, New England and St. Louis, with standings, results and decklists.`,
		`- [AGE Academy](${link('/academy')}): courses by top players, bought once and kept for life.`,
		`- [AGE Studios](${link('/studios')}): podcasts, interviews, films and the AGE Network of creators.`,
		`- [Premium membership](${link('/premium')}): what members get.`,
		`- [Roadmap](${link('/roadmap')}): what's being built for the site.`,
		`- [Status](${link('/status')}): whether the site is running.`,
		`- [Contact](${link('/contact')})`,
		''
	];

	if (pieces.length) {
		out.push('## Latest from the Library', '');
		for (const p of pieces) {
			const tags = [
				p.video_provider ? 'Video' : 'Article',
				p.access_mode === 'premium' ? 'Premium' : 'Free'
			];
			const sum = oneLine(p.excerpt);
			out.push(
				`- [${p.title}](${link(`/library/${p.slug}`)}) (${tags.join(', ')})${sum ? `: ${sum}` : ''}`
			);
		}
		out.push('');
	}
	if (events.length) {
		out.push('## Upcoming AGE Open events', '');
		for (const e of events) {
			const where = [e.location, e.circuit].filter(Boolean).join(', ');
			const bits = [dateOf(e.event_date), where, e.format, `Entry ${money(e.price)}`].filter(
				Boolean
			);
			out.push(
				`- [${e.title}](${link(`/ageopen/${encodeURIComponent(e.id)}`)}): ${bits.join(' · ')}`
			);
		}
		out.push('');
	}
	if (results.length) {
		out.push('## Recent AGE Open results', '');
		for (const e of results)
			out.push(
				`- [${e.title} results](${link(`/ageopen/${encodeURIComponent(e.id)}/results`)}): ${dateOf(e.event_date)}`
			);
		out.push('');
	}
	if (courses.length) {
		out.push('## AGE Academy courses', '');
		for (const c of courses) {
			const sum = oneLine(c.description);
			out.push(
				`- [${c.title}](${link(`/academy/${c.slug}`)}) (${money(c.price)})${sum ? `: ${sum}` : ''}`
			);
		}
		out.push('');
	}
	if (videos.length) {
		out.push('## Latest from AGE Studios', '');
		for (const v of videos) {
			const sum = oneLine(v.description);
			out.push(`- [${v.title}](${link(`/studios/${v.id}`)})${sum ? `: ${sum}` : ''}`);
		}
		out.push('');
	}
	out.push(
		'## Optional',
		'',
		`- [Sitemap](${link('/sitemap.xml')}): every public page.`,
		`- [Library topics](${link('/library/topics')})`,
		`- [Terms](${link('/terms')}) · [Privacy](${link('/privacy')}) · [Refund policy](${link('/refund-policy')})`,
		''
	);
	return out.join('\n');
}

/** @param {string} origin */
export function llmsText(origin) {
	return cached(`seo:llms:v1:${origin}`, () => build(origin), {
		tags: ['entries', 'sitemap'],
		ttl: 3600
	});
}
