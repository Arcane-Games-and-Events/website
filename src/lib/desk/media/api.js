/**
 * Browser calls to the image library API (/api/desk/media). Each throws an
 * Error with the server's message when something goes wrong.
 *
 * There's a library per tool, and the page decides which one a picker
 * shows: Classroom pages use the Classroom's (course images), Studio pages
 * the Studio's (gameplay and episode covers), everything else the Desk's.
 */

/** The library for the page we're on: the Classroom's, the Studio's, or the Desk's. */
export function currentLibrary() {
	const path = typeof location !== 'undefined' ? location.pathname : '';
	if (path.startsWith('/classroom')) return 'classroom';
	if (/^\/studio(\/|$)/.test(path)) return 'studio';
	return 'content';
}

async function call(url, init) {
	const res = await fetch(url, init);
	const body = await res.json().catch(() => null);
	if (!res.ok) {
		const err = new Error(body?.message || `Request failed (${res.status})`);
		/** @type {any} */ (err).status = res.status;
		/** @type {any} */ (err).body = body;
		throw err;
	}
	return body;
}

const json = (method, data) => ({
	method,
	headers: { 'content-type': 'application/json' },
	body: JSON.stringify(data)
});

/**
 * @param {{ library?: string, q?: string, scope?: 'mine' | 'all', uploader?: string, sort?: string, offset?: number }} opts
 * @returns {Promise<{ items: any[], nextOffset: number | null, all: boolean }>}
 */
export function listLibrary(opts = {}) {
	const p = new URLSearchParams({ library: currentLibrary() });
	for (const [k, v] of Object.entries(opts)) if (v) p.set(k, String(v));
	return call(`/api/desk/media?${p}`);
}

/** @returns {Promise<{ media: any, usage: any[] }>} */
export const getMedia = (id) => call(`/api/desk/media/${id}`);

/** @returns {Promise<{ media: any }>} */
export const updateMedia = (id, patch) => call(`/api/desk/media/${id}`, json('PATCH', patch));

/** Resolves { deleted: true }, or throws with `.status === 409` and `.body.usage` when in use. */
export const deleteMedia = (id) => call(`/api/desk/media/${id}`, { method: 'DELETE' });

/** @returns {Promise<{ media: any }>} */
export const deriveMedia = (id, edit) => call(`/api/desk/media/${id}/derive`, json('POST', edit));
