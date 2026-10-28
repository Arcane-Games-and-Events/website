/**
 * Author profile links — the platforms a writer can list on their profile.
 * Client-safe (no server imports): used by the Desk profile form, its live
 * preview and the article author card.
 */
export const LINK_PLATFORMS = [
	['website', 'Website'],
	['twitter', 'Twitter / X'],
	['bluesky', 'Bluesky'],
	['youtube', 'YouTube'],
	['twitch', 'Twitch'],
	['discord', 'Discord'],
	['instagram', 'Instagram'],
	['tiktok', 'TikTok'],
	['patreon', 'Patreon'],
	['metafy', 'Metafy'],
	['kofi', 'Ko-fi'],
	['other', 'Other']
];

const LABELS = Object.fromEntries(LINK_PLATFORMS);

/** @param {{ platform?: string, customLabel?: string }} link */
export function linkLabel(link) {
	if (link?.platform === 'other' && link.customLabel) return link.customLabel;
	return LABELS[link?.platform] || 'Link';
}

const HOSTS = [
	[/(^|\.)twitch\.tv$/, 'twitch'],
	[/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube'],
	[/(^|\.)(x\.com|twitter\.com)$/, 'twitter'],
	[/(^|\.)bsky\.app$/, 'bluesky'],
	[/(^|\.)(discord\.gg|discord\.com)$/, 'discord'],
	[/(^|\.)instagram\.com$/, 'instagram'],
	[/(^|\.)tiktok\.com$/, 'tiktok'],
	[/(^|\.)patreon\.com$/, 'patreon'],
	[/(^|\.)metafy\.gg$/, 'metafy'],
	[/(^|\.)ko-fi\.com$/, 'kofi']
];

/** Guess the platform from a pasted address ("twitch.tv/me" → "twitch"). */
export function detectPlatform(url) {
	try {
		const host = new URL(normalizeUrl(url)).hostname.toLowerCase();
		return HOSTS.find(([re]) => re.test(host))?.[1] || null;
	} catch {
		return null;
	}
}

/** Add https:// to bare domains so links work when people paste "twitch.tv/me". */
export function normalizeUrl(url) {
	const u = String(url || '').trim();
	if (!u) return '';
	if (/^https?:\/\//i.test(u)) return u;
	return `https://${u}`;
}

/** Plain-text bio → safe HTML paragraphs (the article page renders it as HTML). */
export function bioToHtml(text) {
	if (!text) return '';
	const esc = String(text)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
	return esc
		.split(/\n{2,}/)
		.map((p) => `<p>${p.replace(/\n/g, '<br />')}</p>`)
		.join('');
}
