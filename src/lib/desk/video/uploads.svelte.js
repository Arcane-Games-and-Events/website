/**
 * Video uploads that belong to the app, not to a page.
 *
 * Each upload goes straight from the browser to Mux in chunks (UpChunk):
 * 32 MB to start, growing on a fast connection; each chunk retried up to ten
 * times; paused while offline and resumed after. Because the manager lives
 * in this module rather than in a component, an upload keeps going while
 * you move around the site. Only a full page load (reload, closing the tab,
 * leaving the site) ends it, and `beforeunload` asks first while one runs.
 *
 * Once the file is up, the manager asks the server to check Mux every few
 * seconds until the video is ready, so it doesn't depend on webhooks.
 * The site-wide <UploadDock> shows all of this.
 */
import { browser } from '$app/environment';

/** @typedef {'starting'|'uploading'|'offline'|'retrying'|'processing'|'ready'|'failed'|'cancelled'} UploadState */

/**
 * @typedef {object} Upload
 * @property {string} key
 * @property {string} target   vod | entry | lesson | trailer
 * @property {string} id       the owner row's id
 * @property {string} name     file name
 * @property {number} size     bytes
 * @property {string} label    what it's for, e.g. the piece's title
 * @property {string} [href]   where to see it
 * @property {UploadState} state
 * @property {number} percent
 * @property {number|null} bytesPerSec
 * @property {number|null} secondsLeft
 * @property {string} [error]
 */

const ACTIVE = new Set(['starting', 'uploading', 'offline', 'retrying']);
const POLL_MS = 5000;
const POLL_FOR_MS = 30 * 60 * 1000;

/** UpChunk settings: big adaptive chunks and patient retries. */
export const CHUNK_OPTIONS = {
	chunkSize: 32768, // KB
	dynamicChunkSize: true,
	minChunkSize: 5120,
	maxChunkSize: 262144,
	attempts: 10,
	delayBeforeAttempt: 3,
	useLargeFileWorkaround: true
};

/**
 * Speed over the last few seconds and the time left, from progress samples.
 * @param {{ t: number, bytes: number }[]} samples  oldest first
 * @param {number} total  file size in bytes
 */
export function rate(samples, total) {
	if (samples.length < 2) return { bytesPerSec: null, secondsLeft: null };
	const a = samples[0];
	const b = samples[samples.length - 1];
	const secs = (b.t - a.t) / 1000;
	if (secs <= 0) return { bytesPerSec: null, secondsLeft: null };
	const bytesPerSec = Math.max(0, (b.bytes - a.bytes) / secs);
	const secondsLeft = bytesPerSec > 0 ? Math.max(0, (total - b.bytes) / bytesPerSec) : null;
	return { bytesPerSec, secondsLeft };
}

const api = (target, id, action) => `/api/desk/videos/${target}/${id}/${action}`;

async function readError(res) {
	const body = await res.json().catch(() => ({}));
	return body?.message || `Request failed (${res.status})`;
}

class UploadManager {
	/** @type {Upload[]} */
	items = $state([]);
	/** Bumped whenever an upload finishes processing or fails, so pages can reload. */
	settled = $state(0);

	/** @type {Map<string, { chunk?: any, file: File, samples: {t:number,bytes:number}[], poll?: any }>} */
	#inner = new Map();
	#guarded = false;

	get active() {
		return this.items.some((u) => ACTIVE.has(u.state));
	}

	/** The upload for an owner, if one is in this tab. */
	for(target, id) {
		return this.items.find((u) => u.target === target && u.id === id) ?? null;
	}

	/**
	 * Upload a file as an owner's video. Replaces any upload already running
	 * for the same owner.
	 * @param {{ file: File, target: string, id: string, label: string, href?: string }} opts
	 */
	start({ file, target, id, label, href }) {
		const existing = this.for(target, id);
		if (existing) this.dismiss(existing.key, { abort: true });
		const key = `${target}:${id}:${Date.now()}`;
		/** @type {Upload} */
		const item = {
			key,
			target,
			id,
			name: file.name,
			size: file.size,
			label,
			href,
			state: 'starting',
			percent: 0,
			bytesPerSec: null,
			secondsLeft: null
		};
		this.items.push(item);
		this.#inner.set(key, { file, samples: [] });
		this.#guard();
		this.#run(key);
		return key;
	}

	/** Rename an owner's upload in the dock (e.g. once its title is typed). */
	relabel(target, id, label) {
		const u = this.for(target, id);
		if (u && label) u.label = label;
	}

	retry(key) {
		const u = this.#item(key);
		const inner = this.#inner.get(key);
		if (!u || !inner) return;
		this.start({ file: inner.file, target: u.target, id: u.id, label: u.label, href: u.href });
		this.dismiss(key);
	}

	/** Stop an upload; the owner keeps its previous video, if it had one. */
	async cancel(key) {
		const u = this.#item(key);
		if (!u) return;
		this.#inner.get(key)?.chunk?.abort();
		this.#set(key, { state: 'cancelled' });
		await fetch(api(u.target, u.id, 'upload'), { method: 'DELETE' }).catch(() => {});
		this.settled++;
	}

	dismiss(key, { abort = false } = {}) {
		const inner = this.#inner.get(key);
		if (abort) inner?.chunk?.abort();
		clearTimeout(inner?.poll);
		this.#inner.delete(key);
		this.items = this.items.filter((u) => u.key !== key);
	}

	#item(key) {
		return this.items.find((u) => u.key === key);
	}

	#set(key, patch) {
		const u = this.#item(key);
		if (u) Object.assign(u, patch);
	}

	async #run(key) {
		const u = this.#item(key);
		const inner = this.#inner.get(key);
		if (!u || !inner) return;
		try {
			const res = await fetch(api(u.target, u.id, 'upload'), { method: 'POST' });
			if (!res.ok) throw new Error(await readError(res));
			const { uploadUrl } = await res.json();
			if (!this.#inner.has(key)) return; // dismissed meanwhile

			const { createUpload } = await import('@mux/upchunk');
			const chunk = createUpload({ endpoint: uploadUrl, file: inner.file, ...CHUNK_OPTIONS });
			inner.chunk = chunk;
			this.#set(key, { state: 'uploading' });

			chunk.on('progress', (e) => {
				const percent = Math.min(100, Math.max(0, Number(e.detail) || 0));
				const now = Date.now();
				inner.samples.push({ t: now, bytes: (percent / 100) * u.size });
				// keep about ten seconds of samples
				while (inner.samples.length > 2 && now - inner.samples[0].t > 10000) inner.samples.shift();
				const r = rate(inner.samples, u.size);
				this.#set(key, {
					percent,
					...r,
					state: u.state === 'retrying' || u.state === 'offline' ? 'uploading' : u.state
				});
			});
			chunk.on('chunkSuccess', () => {
				if (u.state === 'retrying') this.#set(key, { state: 'uploading' });
			});
			chunk.on('attemptFailure', () => this.#set(key, { state: 'retrying' }));
			chunk.on('offline', () => this.#set(key, { state: 'offline', bytesPerSec: null }));
			chunk.on('online', () => this.#set(key, { state: 'uploading' }));
			chunk.on('error', (e) => {
				this.#set(key, { state: 'failed', error: e.detail?.message || 'Upload failed' });
				this.settled++;
			});
			chunk.on('success', () => {
				this.#set(key, { state: 'processing', percent: 100, bytesPerSec: null, secondsLeft: 0 });
				this.#poll(key, Date.now());
			});
		} catch (err) {
			this.#set(key, {
				state: 'failed',
				error: err instanceof Error ? err.message : 'Upload failed'
			});
			this.settled++;
		}
	}

	/** Ask the server to check Mux until the video is ready (or gives up). */
	#poll(key, since) {
		const inner = this.#inner.get(key);
		const u = this.#item(key);
		if (!inner || !u) return;
		inner.poll = setTimeout(async () => {
			try {
				const res = await fetch(api(u.target, u.id, 'sync'), { method: 'POST' });
				if (res.ok) {
					const { video } = await res.json();
					if (video?.status === 'ready') {
						this.#set(key, { state: 'ready' });
						this.settled++;
						return;
					}
					if (video?.status === 'errored') {
						this.#set(key, { state: 'failed', error: 'Mux couldn’t process this file' });
						this.settled++;
						return;
					}
				}
			} catch {
				/* try again */
			}
			if (Date.now() - since < POLL_FOR_MS) this.#poll(key, since);
		}, POLL_MS);
	}

	/** One beforeunload guard for the whole app while anything uploads. */
	#guard() {
		if (!browser || this.#guarded) return;
		this.#guarded = true;
		window.addEventListener('beforeunload', (e) => {
			if (!this.active) return;
			e.preventDefault();
			e.returnValue = '';
		});
	}
}

export const uploads = new UploadManager();

/** "1.4 GB" */
export function formatBytes(n) {
	if (!n) return '0 B';
	const u = ['B', 'KB', 'MB', 'GB', 'TB'];
	const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
	return `${(n / 1024 ** i).toFixed(i >= 3 ? 1 : 0)} ${u[i]}`;
}

/** "4 min left", "about 1 hr left" */
export function formatLeft(secs) {
	if (secs == null || !Number.isFinite(secs)) return '';
	if (secs < 60) return `${Math.max(1, Math.round(secs))} sec left`;
	if (secs < 3600) return `${Math.round(secs / 60)} min left`;
	const h = Math.floor(secs / 3600);
	const m = Math.round((secs % 3600) / 60);
	return `${h} hr${m ? ` ${m} min` : ''} left`;
}
