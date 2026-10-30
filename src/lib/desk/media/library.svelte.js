/**
 * Shared state for a view of the image library (the Desk Images page and the
 * image picker): the current search and filters, the loaded pages, uploads
 * in progress, and helpers to keep the list in step after edits.
 */
import { listLibrary } from './api.js';
import { uploadImage } from './upload.js';

export function createLibrary() {
	const lib = $state({
		items: /** @type {any[]} */ ([]),
		uploads: /** @type {{ key: string, name: string, progress: number, error: string }[]} */ ([]),
		nextOffset: /** @type {number | null} */ (null),
		all: false,
		loading: false,
		loaded: false,
		error: '',
		q: '',
		scope: /** @type {'all' | 'mine'} */ ('all'),
		uploader: '',
		sort: 'new'
	});

	let request = 0;

	/** Load the first page for the current filters. */
	async function load() {
		const mine = ++request;
		lib.loading = true;
		lib.error = '';
		try {
			const r = await listLibrary({
				q: lib.q,
				scope: lib.scope,
				uploader: lib.uploader,
				sort: lib.sort
			});
			if (mine !== request) return;
			lib.items = r.items;
			lib.nextOffset = r.nextOffset;
			lib.all = r.all;
			lib.loaded = true;
		} catch (err) {
			if (mine === request) lib.error = err?.message || 'Could not load images.';
		} finally {
			if (mine === request) lib.loading = false;
		}
	}

	/** Append the next page. */
	async function more() {
		if (lib.nextOffset == null || lib.loading) return;
		lib.loading = true;
		try {
			const r = await listLibrary({
				q: lib.q,
				scope: lib.scope,
				uploader: lib.uploader,
				sort: lib.sort,
				offset: lib.nextOffset
			});
			const seen = new Set(lib.items.map((i) => i.id));
			lib.items = [...lib.items, ...r.items.filter((i) => !seen.has(i.id))];
			lib.nextOffset = r.nextOffset;
		} catch (err) {
			lib.error = err?.message || 'Could not load more images.';
		} finally {
			lib.loading = false;
		}
	}

	/**
	 * Upload files one after another, showing progress tiles. Resolves with
	 * the images that made it, newest first.
	 * @param {File[]} files
	 */
	async function upload(files) {
		const done = [];
		const queued = files.map((file) => ({
			file,
			key: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
		}));
		lib.uploads = [
			...queued.map(({ file, key }) => ({ key, name: file.name, progress: 0, error: '' })),
			...lib.uploads
		];
		for (const { file, key } of queued) {
			const tile = () => lib.uploads.find((u) => u.key === key);
			try {
				const item = await uploadImage(file, {
					onProgress: (p) => {
						const t = tile();
						if (t) t.progress = p;
					}
				});
				lib.uploads = lib.uploads.filter((u) => u.key !== key);
				prepend(item);
				done.push(item);
			} catch (err) {
				const t = tile();
				if (t) t.error = err?.message || 'Upload failed';
				// failed tiles clear themselves after a while
				setTimeout(() => (lib.uploads = lib.uploads.filter((u) => u.key !== key)), 8000);
			}
		}
		return done.reverse();
	}

	function prepend(item) {
		lib.items = [item, ...lib.items.filter((i) => i.id !== item.id)];
	}
	function replace(item) {
		lib.items = lib.items.map((i) =>
			i.id === item.id ? { ...i, ...item, uploaderName: item.uploaderName ?? i.uploaderName } : i
		);
	}
	function remove(id) {
		lib.items = lib.items.filter((i) => i.id !== id);
	}

	return { lib, load, more, upload, prepend, replace, remove };
}

/** Image files from a drop or a file input, ignoring anything else. */
export function imageFiles(list) {
	return [...(list || [])].filter(
		(f) => f.type?.startsWith('image/') || /\.(hei[cf]|avif|webp)$/i.test(f.name || '')
	);
}
