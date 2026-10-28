<!--
  Desk entry editor — writer + admin authoring surface for a single entry.

  Autosave (1500ms debounce) writes title / slug / excerpt / accessMode /
  body to PATCH /api/desk/entries/[id]. The `sentX` snapshot inside `save()`
  prevents an in-flight autosave from clobbering keystrokes made after the
  request started — a real bug fix (dropped slug characters + caret jumps).

  Widget insertion (Decklist / StatsTable / CardLink), cover image picker,
  author reassignment picker, and video slot picker are deferred to steps
  4-5. The core authoring loop — type text, format it, save, come back and
  keep editing, admin publishes — works end-to-end.
-->
<script>
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import { onDestroy, onMount } from 'svelte';
	import { fly } from 'svelte/transition';
	import Editor from '$lib/desk/editor/Editor.svelte';
	import CoverImagePicker from '$lib/desk/editor/CoverImagePicker.svelte';
	import VideoSlotPicker from '$lib/desk/editor/VideoSlotPicker.svelte';
	import { coerceLexicalDoc } from '$lib/desk/editor/utils.js';
	import { diffWords, diffArrays } from 'diff';

	export let data;

	let entry = data?.entry || null;
	$: entry = data?.entry || null;

	function liveOrDraft(e, field) {
		if (!e) return undefined;
		const draftKey = `draft${field[0].toUpperCase()}${field.slice(1)}`;
		if (e.draftUpdatedAt && e[draftKey] !== null && e[draftKey] !== undefined) {
			return e[draftKey];
		}
		return e[field];
	}

	// Local form state seeded from server data. If a pending-change buffer
	// exists on a live entry, we surface the buffered values so the writer sees
	// what they'd typed before, not the older approved values.
	let title = liveOrDraft(data?.entry, 'title') || 'Untitled';
	let slug = data?.entry?.slug || '';
	let excerpt = liveOrDraft(data?.entry, 'excerpt') || '';
	let accessMode = data?.entry?.accessMode || 'free';
	let status = data?.entry?.status || 'draft';
	let body = coerceLexicalDoc(liveOrDraft(data?.entry, 'body'));

	let isAdmin = !!data?.isAdmin;
	let scheduleInput = data?.entry?.scheduledFor
		? toLocalInput(new Date(data.entry.scheduledFor))
		: '';

	// Explicit publish-date input — admin can set to any datetime (past,
	// present, or future) to control library ordering. Blank = clear.
	let publishDateInput = data?.entry?.publishedAt
		? toLocalInput(new Date(data.entry.publishedAt))
		: '';

	function toLocalInput(d) {
		const pad = (n) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}

	// Media pickers hold their own local state so the sidebar previews update
	// immediately on upload without waiting for a full form save cycle.
	let coverImage = data?.coverImage || null;
	let thumbnailImage = data?.thumbnailImage || null;

	// Author picker state (admin-only). The list of authors is fetched lazily
	// on first focus so a non-admin editor never spends a request on it, and
	// the initial page render doesn't wait for another DB query.
	let author = data?.author || null;
	let authorId = data?.entry?.authorId || null;
	let authorOptions = null;
	let loadingAuthors = false;

	async function ensureAuthorsLoaded() {
		if (authorOptions || loadingAuthors) return;
		loadingAuthors = true;
		try {
			const res = await fetch('/api/desk/users/authors');
			if (!res.ok) return;
			const body = await res.json();
			authorOptions = body.authors || [];
		} finally {
			loadingAuthors = false;
		}
	}

	async function changeAuthor(newAuthorId) {
		if (!newAuthorId || newAuthorId === authorId) return;
		const updated = await patchEntry({ authorId: newAuthorId });
		if (!updated) return;
		authorId = updated.authorId;
		const picked = (authorOptions || []).find((a) => a.id === authorId);
		if (picked) {
			author = {
				id: picked.id,
				firstName: picked.firstName,
				lastName: picked.lastName,
				email: picked.email
			};
		}
	}

	async function patchEntry(fields) {
		const res = await fetch(`/api/desk/entries/${entry.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(fields)
		});
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			alert(err?.message || 'Save failed');
			return null;
		}
		const j = await res.json();
		entry = j.entry;
		status = entry.status;
		// Re-sync the local publish-date input whenever the server returns
		// a fresh entry, so a Publish action that auto-set publishedAt is
		// reflected in the picker without a page refresh.
		publishDateInput = entry.publishedAt ? toLocalInput(new Date(entry.publishedAt)) : '';
		return j.entry;
	}

	async function handleCoverChange(e) {
		const media = e.detail;
		// Capture the old media id BEFORE we replace it so we can clean it
		// up on the server once the entry no longer references it. If the
		// user is replacing with the same image (same id) we don't delete.
		const prevId = coverImage?.id || null;
		const nextId = media?.id || null;
		coverImage = media;
		const result = await patchEntry({ coverImageId: nextId });
		if (result && prevId && prevId !== nextId) {
			deleteMedia(prevId);
		}
	}
	async function handleThumbnailChange(e) {
		const media = e.detail;
		const prevId = thumbnailImage?.id || null;
		const nextId = media?.id || null;
		thumbnailImage = media;
		const result = await patchEntry({ thumbnailImageId: nextId });
		if (result && prevId && prevId !== nextId) {
			deleteMedia(prevId);
		}
	}
	async function handleVideoPatch(e) {
		const fields = e.detail || {};
		await patchEntry(fields);
	}

	// Fire-and-forget: DB row + Supabase Storage object are cleaned up if
	// nothing else still references the media. Silent on the client side —
	// the endpoint refuses gracefully when a shared image is still needed.
	function deleteMedia(id) {
		fetch(`/api/desk/media/${id}`, { method: 'DELETE' }).catch(() => {});
	}

	// A scheduled entry whose time has passed reads as published everywhere
	// else on the site, so flip the display without needing a DB write.
	$: displayStatus =
		status === 'scheduled' &&
		entry?.scheduledFor &&
		new Date(entry.scheduledFor).getTime() <= Date.now()
			? 'published'
			: status;

	$: hasPendingChanges = !!entry?.draftUpdatedAt;

	// Toggle between editing the draft and reviewing the diff against live.
	// When there are no pending changes, the toggle is hidden and the
	// editor is the only mode.
	let reviewMode = false;
	// Publishing, approving or discarding clears the pending edits, and the
	// toggle goes with them, so leave review mode too or it can't be exited.
	$: if (!hasPendingChanges) reviewMode = false;

	// Title + excerpt diff (single-string values, so just a diffWords call).
	$: titleDiffParts =
		hasPendingChanges && entry?.draftTitle != null && entry.draftTitle !== entry.title
			? diffWords(entry.title || '', entry.draftTitle)
			: [];
	$: excerptDiffParts =
		hasPendingChanges &&
		entry?.draftExcerpt !== undefined &&
		entry?.draftExcerpt !== null &&
		entry.draftExcerpt !== entry.excerpt
			? diffWords(entry.excerpt || '', entry.draftExcerpt)
			: [];

	// -----------------------------------------------------------------
	// Rich body diff — walks the top-level Lexical children of live and
	// draft in parallel and produces an array of "items" the template
	// renders with correct block-level tags. Each item is either:
	//
	//   { kind: 'unchanged', node }        — render as normal block
	//   { kind: 'unchanged-widget', node } — widget with no changes
	//   { kind: 'added', node }            — new block in draft only
	//   { kind: 'removed', node }          — block removed from live
	//   { kind: 'widget-change', node }    — widget content changed
	//   { kind: 'diff', tag, parts, node } — block with word-level diff
	//
	// Pairing is index-based, which is a simplification. If a writer
	// inserts a paragraph in the middle of a doc, every subsequent
	// paragraph will diff against a different-original — producing more
	// visual noise than a proper tree diff would. But index pairing is
	// simple, fast, and correct enough for the common case (append
	// paragraphs at the end, edit inline).
	// -----------------------------------------------------------------
	const WIDGET_TYPES = new Set(['decklist', 'stats_table', 'inline_video', 'upload']);

	function isWidget(node) {
		return !!(node && WIDGET_TYPES.has(node.type));
	}

	function extractNodeText(node) {
		if (!node) return '';
		if (node.text != null) return node.text;
		if (Array.isArray(node.children)) {
			return node.children.map(extractNodeText).join(node.type === 'list' ? '\n' : '');
		}
		return '';
	}

	// Text used for word-level diff inside edited blocks. Same as
	// extractNodeText, but includes link URLs so a card-link swap
	// (identical visible text, different target) is a diffable change.
	// Format is `label (→ url)` — the reviewer sees the display text
	// and the destination side-by-side, and jsdiff can highlight the
	// URL portion when it changes.
	function extractNodeDiffText(node) {
		if (!node) return '';
		if (node.text != null) return node.text;
		if (node.type === 'link' || node.type === 'autolink') {
			const url = node.fields?.url || node.url || '';
			const inner = Array.isArray(node.children)
				? node.children.map(extractNodeDiffText).join('')
				: '';
			return url ? `${inner} (→ ${url})` : inner;
		}
		if (Array.isArray(node.children)) {
			return node.children.map(extractNodeDiffText).join(node.type === 'list' ? '\n' : '');
		}
		return '';
	}

	// Structural signature — captures visible text, inline formatting bits,
	// link URLs, and container structure. Used by nodesEqual so ANY change
	// that would render differently on the public page counts as an edit.
	function contentSignature(node) {
		if (!node) return '';
		if (node.text != null) return `T:${node.text}|F:${node.format || 0}`;
		if (node.type === 'link' || node.type === 'autolink') {
			const url = node.fields?.url || node.url || '';
			const inner = Array.isArray(node.children)
				? node.children.map(contentSignature).join('')
				: '';
			return `L(${url})[${inner}]`;
		}
		const children = Array.isArray(node.children)
			? node.children.map(contentSignature).join('')
			: '';
		return `${node.type}[${children}]`;
	}

	function nodeTag(node) {
		if (!node) return 'p';
		if (node.type === 'heading') return node.tag || 'h2';
		if (node.type === 'quote') return 'blockquote';
		if (node.type === 'list') return node.listType === 'number' ? 'ol' : 'ul';
		return 'p';
	}

	function widgetLabel(node) {
		if (!node) return 'Widget';
		if (node.type === 'decklist') return `Decklist${node.deckName ? ` — ${node.deckName}` : ''}`;
		if (node.type === 'stats_table')
			return `Stats table${node.caption ? ` — ${node.caption}` : ''}`;
		if (node.type === 'inline_video')
			return `Inline video${node.youtubeTitle ? ` — ${node.youtubeTitle}` : ''}`;
		if (node.type === 'upload') {
			const v = node.value || node;
			return `Image${v.alt ? ` — ${v.alt}` : ''}`;
		}
		return `Widget: ${node.type}`;
	}

	function widgetsEqual(a, b) {
		if (!a || !b) return false;
		if (a.type !== b.type) return false;
		return JSON.stringify(a) === JSON.stringify(b);
	}

	// Whether two top-level nodes should be treated as the SAME block for
	// LCS pairing. Uses a structural signature — so a card-link URL swap,
	// a bold-to-italic tweak, or any other change that alters what
	// visitors will see counts as an edit even when the extracted plain
	// text matches.
	function nodesEqual(a, b) {
		if (!a || !b) return false;
		if (a.type !== b.type) return false;
		if (isWidget(a) || isWidget(b)) return widgetsEqual(a, b);
		if (nodeTag(a) !== nodeTag(b)) return false;
		return contentSignature(a) === contentSignature(b);
	}

	// Pair a live block with a draft block that survived LCS as a
	// probable "edit" — either a widget of the same type or a
	// text-content block. Returns the appropriate diff item.
	function pairBlocksAsEdit(l, d) {
		if (isWidget(l) || isWidget(d)) {
			if (widgetsEqual(l, d)) return { kind: 'unchanged-widget', node: d };
			if (l.type === d.type) return { kind: 'widget-change', node: d };
			return null;
		}
		if (nodeTag(l) !== nodeTag(d)) return null;
		return {
			kind: 'diff',
			tag: nodeTag(d),
			parts: diffWords(extractNodeDiffText(l), extractNodeDiffText(d)),
			node: d
		};
	}

	// LCS-based pairing at the top-level Lexical block level. diffArrays
	// finds the longest common subsequence using our nodesEqual comparator,
	// which keeps unchanged blocks anchored no matter where insertions
	// or deletions happen around them.
	//
	// Post-process: adjacent removed+added chunks are candidates for
	// "block was edited in place". We pair up items by index (up to the
	// shorter of the two chunks), running a word-level diff on each pair
	// when the tags line up. Leftovers are treated as pure add/remove.
	// This turns a lightly-edited paragraph from "one removed, one added"
	// into a single block with inline word markers, while a full swap
	// still shows as remove+add.
	$: richDiffItems = (() => {
		if (!hasPendingChanges || entry?.draftBody == null) return null;
		const live = entry.body?.root?.children || [];
		const draft = entry.draftBody?.root?.children || [];

		const chunks = diffArrays(live, draft, { comparator: nodesEqual });
		const items = [];

		for (let i = 0; i < chunks.length; i++) {
			const chunk = chunks[i];
			const next = chunks[i + 1];

			// Adjacent removed → added: try to pair as edits.
			if (chunk.removed && next?.added) {
				const paired = Math.min(chunk.value.length, next.value.length);
				let consumed = 0;
				for (let j = 0; j < paired; j++) {
					const l = chunk.value[j];
					const d = next.value[j];
					const edit = pairBlocksAsEdit(l, d);
					if (edit) {
						items.push(edit);
						consumed++;
					} else {
						// Types didn't align — fall back to sequential remove/add
						items.push({ kind: 'removed', node: l });
						items.push({ kind: 'added', node: d });
						consumed++;
					}
				}
				// Trailing removed items (chunk was longer than next.value)
				for (let j = consumed; j < chunk.value.length; j++) {
					items.push({ kind: 'removed', node: chunk.value[j] });
				}
				// Trailing added items (next.value was longer than chunk)
				for (let j = consumed; j < next.value.length; j++) {
					items.push({ kind: 'added', node: next.value[j] });
				}
				i++; // skip `next` since we consumed it
				continue;
			}

			if (chunk.added) {
				for (const node of chunk.value) items.push({ kind: 'added', node });
				continue;
			}
			if (chunk.removed) {
				for (const node of chunk.value) items.push({ kind: 'removed', node });
				continue;
			}
			// Unchanged run — every block passes through as-is.
			for (const node of chunk.value) {
				items.push({ kind: isWidget(node) ? 'unchanged-widget' : 'unchanged', node });
			}
		}
		return items;
	})();
	$: editsAreBuffered = status === 'published' || status === 'scheduled';

	let saveState = 'idle'; // 'idle' | 'saving' | 'saved' | 'error'
	let lastError = '';
	let saveTimer = null;
	// Only start autosaving after the editor has done its synthetic first-mount
	// change emit — otherwise we'd immediately fire a save on page load.
	let ready = false;

	let serverSnapshot = JSON.stringify({ title, slug, excerpt, accessMode, body });
	$: dirty = JSON.stringify({ title, slug, excerpt, accessMode, body }) !== serverSnapshot;

	function scheduleSave() {
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => save(), 1500);
	}

	$: if (ready && dirty) scheduleSave();

	function handleEditorReady() {
		serverSnapshot = JSON.stringify({ title, slug, excerpt, accessMode, body });
		ready = true;
	}

	async function save(extra = {}) {
		if (saveState === 'saving') return;
		saveState = 'saving';
		// Snapshot what we're actually sending. If the user keeps typing while
		// this request is in flight, we don't re-sync those local fields from
		// the server response — that's what was clobbering slug keystrokes.
		const sentTitle = title;
		const sentSlug = slug;
		const sentExcerpt = excerpt;
		const sentAccessMode = accessMode;
		try {
			const res = await fetch(`/api/desk/entries/${entry.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: sentTitle,
					slug: sentSlug,
					excerpt: sentExcerpt,
					accessMode: sentAccessMode,
					body,
					...extra
				})
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				saveState = 'error';
				lastError = err?.message || `HTTP ${res.status}`;
				return;
			}
			const json = await res.json();
			entry = json.entry;
			// Status is server-authoritative for publish/schedule flows, safe to sync.
			status = entry.status;
			// Re-baseline dirty against current LOCAL values so any typing that
			// happened during the request stays flagged as unsaved until the next
			// autosave cycle picks it up.
			serverSnapshot = JSON.stringify({ title, slug, excerpt, accessMode, body });
			saveState = 'saved';
			lastError = '';
		} catch (e) {
			saveState = 'error';
			lastError = e?.message || 'Network error';
		}
	}

	async function publish() {
		await save({ status: 'published' });
	}
	async function archive() {
		await save({ status: 'archived' });
	}
	async function unpublish() {
		await save({ status: 'draft' });
	}

	async function savePublishDate() {
		// Empty input = clear the publish date.
		if (!publishDateInput) {
			const updated = await patchEntry({ publishedAt: null });
			if (updated) publishDateInput = '';
			return;
		}
		const when = new Date(publishDateInput);
		if (isNaN(when.getTime())) return alert('Invalid publish date.');
		await patchEntry({ publishedAt: when.toISOString() });
	}

	async function scheduleEntry() {
		if (!scheduleInput) return alert('Pick a date and time to schedule.');
		const when = new Date(scheduleInput);
		if (isNaN(when.getTime())) return alert('Invalid date.');
		if (when.getTime() <= Date.now()) return alert('Schedule time must be in the future.');
		await save({ status: 'scheduled', scheduledFor: when.toISOString() });
	}

	async function approveDraft(opts = {}) {
		const res = await fetch(`/api/desk/entries/${entry.id}/approve-draft`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(opts)
		});
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			return alert(err?.message || 'Failed to approve changes');
		}
		const j = await res.json();
		entry = j.entry;
		title = entry.title || 'Untitled';
		excerpt = entry.excerpt || '';
		body = coerceLexicalDoc(entry.body);
		status = entry.status;
		serverSnapshot = JSON.stringify({ title, slug, excerpt, accessMode, body });
	}

	async function discardDraft() {
		if (!confirm('Discard pending changes? This cannot be undone.')) return;
		const res = await fetch(`/api/desk/entries/${entry.id}/discard-draft`, { method: 'POST' });
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			return alert(err?.message || 'Failed to discard changes');
		}
		const j = await res.json();
		entry = j.entry;
		title = entry.title || 'Untitled';
		excerpt = entry.excerpt || '';
		body = coerceLexicalDoc(entry.body);
		serverSnapshot = JSON.stringify({ title, slug, excerpt, accessMode, body });
	}

	async function deleteEntry() {
		if (!confirm(`Delete "${entry.title}"? This cannot be undone.`)) return;
		const res = await fetch(`/api/desk/entries/${entry.id}`, { method: 'DELETE' });
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			return alert(err?.message || 'Failed to delete');
		}
		window.location.href = '/desk/entries';
	}

	onDestroy(() => {
		if (saveTimer) clearTimeout(saveTimer);
	});

	// ---------- layout: side column on wide screens, a sheet on phones ----------
	let isWide = true;
	let mounted = false;
	let sheetOpen = false;
	onMount(() => {
		const mq = window.matchMedia('(min-width: 1024px)');
		const sync = () => {
			isWide = mq.matches;
			if (isWide) sheetOpen = false;
		};
		sync();
		mounted = true;
		// the Desk's "Review" buttons link here with ?review
		if (hasPendingChanges && new URL(location.href).searchParams.has('review')) reviewMode = true;
		mq.addEventListener('change', sync);
		return () => mq.removeEventListener('change', sync);
	});
	$: if (typeof document !== 'undefined') document.body.style.overflow = sheetOpen ? 'hidden' : '';
	onDestroy(() => {
		if (typeof document !== 'undefined') document.body.style.overflow = '';
	});

	/** Grow a textarea with its content (title + summary never scroll). */
	function autogrow(node) {
		const fit = () => {
			node.style.height = 'auto';
			node.style.height = `${node.scrollHeight}px`;
		};
		fit();
		node.addEventListener('input', fit);
		window.addEventListener('resize', fit);
		document.fonts?.ready.then(fit);
		return {
			update: fit,
			destroy() {
				node.removeEventListener('input', fit);
				window.removeEventListener('resize', fit);
			}
		};
	}

	// writing fields: a white sheet with a hairline that darkens on focus
	const fieldLabel =
		'mb-1.5 block text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase';
	const fieldBox = 'block border border-line2 bg-white transition-colors focus-within:border-ink';

	// settings panels: white sheets with an ink top rule, rows split by hairlines
	const panel = 'border border-line2 border-t-[3px] border-t-ink bg-white';
	const rowLabel = 'block text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase';
	const control =
		'h-[40px] w-full border border-line2 bg-paper px-2.5 text-[14px] focus:border-ink focus:ring-0';
	const textAction =
		'text-[9.5px] font-extrabold tracking-[0.14em] uppercase transition-colors disabled:opacity-45';

	$: statusLine =
		displayStatus === 'published'
			? 'Live on the site.'
			: displayStatus === 'scheduled' && entry?.scheduledFor
				? `Goes live ${fmtWhen(entry.scheduledFor)}.`
				: displayStatus === 'archived'
					? 'Archived. Not on the site.'
					: 'Not on the site yet.';
	const VIDEO_STATUS = {
		ready: 'Ready',
		preparing: 'Processing',
		waiting: 'Uploading',
		errored: 'Error'
	};
	$: videoMeta =
		entry?.videoProvider === 'mux'
			? `File · ${VIDEO_STATUS[entry.videoStatus] || 'Pending'}`
			: entry?.videoProvider === 'youtube'
				? 'YouTube'
				: 'None';

	const STATUS_TONE = {
		draft: 'border-ink/60 text-ink',
		scheduled: 'border-gold bg-gold/10 text-[#8a6116]',
		published: 'border-prem bg-prem text-white',
		archived: 'border-line2 text-fade'
	};
	const fmtWhen = (d) =>
		new Date(d).toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		});

	let editorChangeCount = 0;
	function handleEditorChange(e) {
		body = e.detail;
		editorChangeCount++;
		// Lexical fires one synthetic change on mount as it hydrates. Treat that
		// as the editor reaching ready — subsequent changes are user input.
		if (!ready && editorChangeCount === 1) handleEditorReady();
	}
</script>

<svelte:head>
	<title>{title || 'Untitled'} · Desk</title>
</svelte:head>

{#snippet saveBadge(compact)}
	{#if saveState === 'saving'}
		<span class="flex items-center gap-1.5 text-fade" role="status"
			><span class="h-2 w-2 animate-pulse bg-gold" aria-hidden="true"></span>{compact
				? ''
				: 'Saving…'}</span
		>
	{:else if saveState === 'error'}
		<span
			class="flex items-center gap-1.5 font-semibold text-hero-rb"
			role="alert"
			title={lastError}
			><span class="h-2 w-2 bg-hero-rb" aria-hidden="true"></span>{compact
				? ''
				: `Couldn’t save`}</span
		>
	{:else if dirty}
		<span class="flex items-center gap-1.5 text-fade" role="status"
			><span class="h-2 w-2 border border-fade" aria-hidden="true"></span>{compact
				? ''
				: 'Unsaved'}</span
		>
	{:else if saveState === 'saved'}
		<span class="flex items-center gap-1.5 text-prem" role="status"
			><span class="h-2 w-2 bg-prem" aria-hidden="true"></span>{compact ? '' : 'Saved'}</span
		>
	{/if}
{/snippet}

{#snippet toolbarEnd()}
	<span class="px-1 text-[11px] lg:hidden">{@render saveBadge(true)}</span>
	<button
		type="button"
		on:click={() => (sheetOpen = true)}
		class="inline-flex h-9 min-w-9 items-center justify-center gap-1.5 bg-ink font-libre text-[10px] font-extrabold tracking-[0.12em] text-paper-bg uppercase sm:px-3 lg:hidden"
		aria-haspopup="dialog"
		aria-label="Settings"
		title="Settings"
	>
		<svg
			viewBox="0 0 20 20"
			class="h-3.5 w-3.5"
			fill="none"
			stroke="currentColor"
			stroke-width="1.8"
			aria-hidden="true"
			><path d="M3 5.5h8M15 5.5h2M3 14.5h2M9 14.5h8" /><circle cx="13" cy="5.5" r="2" /><circle
				cx="7"
				cy="14.5"
				r="2"
			/></svg
		>
		<span class="hidden sm:inline">Settings</span>
	</button>
{/snippet}

{#snippet head(label, tone = 'text-warm', meta = '', metaClass = '')}
	<div class="flex min-h-[44px] items-center justify-between gap-3 border-b border-line px-4">
		<h3 class="flex items-center gap-2.5 text-[10.5px] font-extrabold tracking-[0.2em] uppercase">
			<span class="text-[8px] {tone}" aria-hidden="true">◆</span>{label}
		</h3>
		{#if meta}
			<span class="min-w-0 truncate {metaClass || 'text-[12px] text-fade'}">{meta}</span>
		{/if}
	</div>
{/snippet}

{#snippet panels()}
	<div class="space-y-5 font-libre">
		{#if hasPendingChanges}
			<section class="border border-t-[3px] border-line2 border-t-hero-rb bg-white">
				{@render head(
					'Pending edits',
					'text-hero-rb',
					entry.draftUpdatedAt ? fmtWhen(entry.draftUpdatedAt) : ''
				)}
				<div class="px-4 py-4">
					<p class="text-[13.5px] leading-snug text-soft">
						{#if isAdmin}
							These edits aren’t public yet. Use <b class="text-ink">Review changes</b> above the editor
							to compare them with the live version.
						{:else}
							Your edits are saved. An admin approves them before they go live.
						{/if}
					</p>
					{#if isAdmin}
						<div class="mt-3.5 grid gap-2">
							<button
								type="button"
								on:click={() => approveDraft()}
								class="min-h-[42px] bg-prem px-3 text-[10.5px] font-extrabold tracking-[0.14em] text-white uppercase transition-[filter] hover:brightness-110"
								>Approve · keep {displayStatus}</button
							>
							{#if status === 'published' || status === 'scheduled'}
								<button
									type="button"
									on:click={() => approveDraft({ asStatus: 'draft' })}
									class="min-h-[42px] border-[1.5px] border-ink px-3 text-[10.5px] font-extrabold tracking-[0.14em] uppercase transition-colors hover:bg-ink hover:text-paper-bg"
									>Approve and unpublish</button
								>
							{/if}
							<button
								type="button"
								on:click={discardDraft}
								class="mt-1 {textAction} justify-self-start text-hero-rb hover:text-ink"
								>Discard these edits</button
							>
						</div>
					{/if}
				</div>
			</section>
		{/if}

		<!-- ============ publishing ============ -->
		<section class={panel}>
			{@render head(
				'Publishing',
				'text-prem',
				displayStatus,
				`border px-1.5 py-[2px] text-[9px] font-extrabold tracking-[0.14em] uppercase ${STATUS_TONE[displayStatus] || STATUS_TONE.draft}`
			)}
			<div class="divide-y divide-line">
				<div class="px-4 py-4">
					<p class="text-[15px] font-semibold">{statusLine}</p>
					{#if isAdmin}
						{#if displayStatus !== 'published'}
							<button
								type="button"
								on:click={publish}
								class="mt-3 min-h-[44px] w-full bg-ink px-3 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-prem"
								>Publish now</button
							>
						{:else}
							<button
								type="button"
								on:click={unpublish}
								class="mt-3 min-h-[44px] w-full border-[1.5px] border-ink px-3 text-[10.5px] font-extrabold tracking-[0.16em] uppercase transition-colors hover:bg-ink hover:text-paper-bg"
								>Unpublish to draft</button
							>
						{/if}
					{:else}
						<p class="mt-1 text-[13px] leading-snug text-soft">
							{#if editsAreBuffered}
								Your edits are saved as a pending change. An admin approves them before they go
								live.
							{:else}
								Your work saves automatically. An admin publishes it when it’s ready.
							{/if}
						</p>
					{/if}
				</div>

				{#if isAdmin && displayStatus !== 'published'}
					<div class="px-4 py-4">
						<label class="block">
							<span class={rowLabel}>Schedule for later</span>
							<input type="datetime-local" bind:value={scheduleInput} class="mt-1.5 {control}" />
						</label>
						<button
							type="button"
							on:click={scheduleEntry}
							disabled={!scheduleInput}
							class="mt-2 min-h-[40px] w-full border-[1.5px] border-gold bg-gold/15 px-3 text-[10px] font-extrabold tracking-[0.14em] text-[#6d4c10] uppercase transition-colors hover:bg-gold hover:text-ink disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-gold/15"
							>{displayStatus === 'scheduled' ? 'Reschedule' : 'Schedule'}</button
						>
					</div>
				{/if}

				{#if isAdmin}
					<label class="block px-4 py-4">
						<span class={rowLabel}>Library date</span>
						<input
							type="datetime-local"
							bind:value={publishDateInput}
							on:change={savePublishDate}
							class="mt-1.5 {control}"
						/>
						<span class="mt-1.5 block text-[11.5px] leading-snug text-fade"
							>Sets the order in the Library, newest first. Backdate to file a piece in the archive.</span
						>
					</label>
				{/if}

				{#if (isAdmin && displayStatus !== 'archived') || status === 'draft'}
					<div class="flex items-center justify-between gap-4 bg-paper-bg/60 px-4 py-2.5">
						{#if isAdmin && displayStatus !== 'archived'}
							<button type="button" on:click={archive} class="{textAction} text-fade hover:text-ink"
								>Archive</button
							>
						{/if}
						{#if status === 'draft'}
							<button
								type="button"
								on:click={deleteEntry}
								class="ml-auto {textAction} text-hero-rb hover:text-ink">Delete draft</button
							>
						{/if}
					</div>
				{/if}
			</div>
		</section>

		<!-- ============ details ============ -->
		<section class={panel}>
			{@render head('Details')}
			<div class="divide-y divide-line">
				{#if isAdmin}
					<label class="block px-4 py-4">
						<span class={rowLabel}>Author</span>
						<select
							value={authorId}
							on:focus={ensureAuthorsLoaded}
							on:pointerdown={ensureAuthorsLoaded}
							on:change={(e) => changeAuthor(e.currentTarget.value)}
							class="mt-1.5 {control}"
						>
							{#if loadingAuthors && !authorOptions}
								<option>Loading…</option>
							{:else if !authorOptions}
								{#if author}
									<option value={author.id}>{author.firstName} {author.lastName || ''}</option>
								{:else}
									<option value="">No author</option>
								{/if}
							{:else}
								{#each authorOptions as opt (opt.id)}
									<option value={opt.id}>{opt.firstName} {opt.lastName || ''}</option>
								{/each}
							{/if}
						</select>
					</label>
				{/if}

				<div class="px-4 py-4">
					<span class={rowLabel} id="access-label">Who can read it</span>
					<div
						class="mt-1.5 grid grid-cols-2 gap-px border border-line2 bg-line2"
						role="radiogroup"
						aria-labelledby="access-label"
					>
						{#each [['free', 'Free', 'Anyone'], ['premium', 'Premium', 'Members only']] as [v, l, note] (v)}
							<button
								type="button"
								role="radio"
								aria-checked={accessMode === v}
								on:click={() => (accessMode = v)}
								class="flex flex-col items-start px-3 py-2 text-left transition-colors {accessMode ===
								v
									? v === 'premium'
										? 'bg-prem text-white'
										: 'bg-ink text-paper-bg'
									: 'bg-white text-soft hover:text-ink'}"
							>
								<span class="text-[10.5px] font-extrabold tracking-[0.14em] uppercase">{l}</span>
								<span class="mt-0.5 text-[11.5px] opacity-75">{note}</span>
							</button>
						{/each}
					</div>
				</div>

				<label class="block px-4 py-4">
					<span class={rowLabel}>Web address</span>
					<span
						class="mt-1.5 flex h-[40px] items-center border border-line2 bg-paper focus-within:border-ink"
					>
						<span class="shrink-0 pl-2.5 text-[13px] text-fade">/library/</span>
						<input
							type="text"
							bind:value={slug}
							autocapitalize="off"
							autocorrect="off"
							spellcheck="false"
							class="h-full min-w-0 flex-1 border-0 bg-transparent px-0.5 text-[14px] focus:ring-0 focus:outline-none"
						/>
					</span>
				</label>
			</div>
		</section>

		<!-- ============ images ============ -->
		<section class={panel}>
			{@render head('Images')}
			<div class="px-4 py-4">
				<div class="grid grid-cols-2 gap-3">
					<CoverImagePicker label="Cover" value={coverImage} on:change={handleCoverChange} />
					<CoverImagePicker
						label="Thumbnail"
						value={thumbnailImage}
						on:change={handleThumbnailChange}
					/>
				</div>
				<p class="mt-2.5 text-[11.5px] leading-snug text-fade">
					The thumbnail falls back to the cover when empty.
				</p>
			</div>
		</section>

		<!-- ============ video ============ -->
		<section class={panel}>
			{@render head('Video', 'text-warm', videoMeta)}
			<div class="px-4 py-4">
				<VideoSlotPicker target="entry" id={entry.id} {entry} on:patch={handleVideoPatch} />
			</div>
		</section>
	</div>
{/snippet}

<DeskTabs label sticky={false} />

{#if !entry}
	<div class="mx-auto max-w-2xl px-5 py-16 text-center">
		<p class="font-newsreader text-[24px] font-semibold">Couldn’t load this entry.</p>
		<a
			href="/desk/entries"
			class="mt-4 inline-block text-[10.5px] font-extrabold tracking-[0.14em] text-warm uppercase hover:text-ink"
			>← Back to entries</a
		>
	</div>
{:else}
	<div
		class="font-libre [--editor-top:var(--desk-header)] lg:[--editor-top:calc(var(--desk-header)+52px)]"
	>
		<!-- ============ editor bar ============ -->
		<div
			class="z-30 border-b border-line2 bg-paper-bg/95 backdrop-blur-sm lg:sticky lg:top-[var(--desk-header)]"
		>
			<div class="mx-auto flex h-[52px] max-w-[1200px] items-center gap-3 px-5 md:px-8">
				<a
					href="/desk/entries"
					class="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-extrabold tracking-[0.16em] text-soft uppercase transition-[color,gap] hover:gap-2.5 hover:text-ink"
					><span aria-hidden="true">←</span> Entries</a
				>
				<span class="h-4 w-px bg-line2" aria-hidden="true"></span>
				<span
					class="shrink-0 border px-1.5 py-[2px] text-[9px] font-extrabold tracking-[0.14em] uppercase {STATUS_TONE[
						displayStatus
					] || STATUS_TONE.draft}">{displayStatus}</span
				>
				{#if hasPendingChanges}
					<span
						class="hidden shrink-0 bg-hero-rb px-1.5 py-[2px] text-[9px] font-extrabold tracking-[0.14em] text-white uppercase sm:inline"
						>Pending edits</span
					>
				{/if}
				{#if entry.accessMode === 'premium'}
					<span
						class="hidden shrink-0 border border-prem px-1.5 py-[1px] text-[9px] font-extrabold tracking-[0.14em] text-prem uppercase sm:inline"
						>◆ Premium</span
					>
				{/if}
				<span class="ml-auto hidden text-[12px] lg:inline">{@render saveBadge(false)}</span>
				<a
					href="/desk/entries/{entry.id}/preview"
					target="_blank"
					rel="noopener"
					class="ml-auto inline-flex min-h-[36px] shrink-0 items-center gap-1.5 border border-line2 px-3 text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors hover:border-ink lg:ml-0"
					>Preview <span aria-hidden="true">↗</span></a
				>
				{#if isAdmin && displayStatus !== 'published'}
					<button
						type="button"
						on:click={publish}
						class="hidden min-h-[36px] shrink-0 items-center bg-ink px-4 text-[10px] font-extrabold tracking-[0.14em] text-paper-bg uppercase transition-colors hover:bg-prem lg:inline-flex"
						>Publish</button
					>
				{/if}
			</div>
		</div>

		<div
			class="mx-auto grid max-w-[1200px] gap-12 px-5 pt-6 pb-16 md:px-8 md:pt-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-14"
		>
			<!-- ============ writing column ============ -->
			<div class="min-w-0">
				<div class="mx-auto max-w-[760px]">
					{#if reviewMode && titleDiffParts.length > 0}
						<span class={fieldLabel}>Title</span>
						<p
							class="{fieldBox} px-4 py-3 font-newsreader text-[30px] leading-[1.08] font-semibold tracking-[-0.02em] md:px-7 md:py-5 md:text-[40px]"
						>
							{#each titleDiffParts as part, i (i)}
								{#if part.added}
									<span class="diff-word-added">{part.value}</span>
								{:else if part.removed}
									<span class="diff-word-removed">{part.value}</span>
								{:else}
									<span>{part.value}</span>
								{/if}
							{/each}
						</p>
					{:else}
						<label class="block">
							<span class={fieldLabel}>Title</span>
							<span class="{fieldBox} px-4 py-3 md:px-7 md:py-5">
								<textarea
									bind:value={title}
									use:autogrow={title}
									rows="1"
									placeholder="Title"
									aria-label="Title"
									on:keydown={(e) => e.key === 'Enter' && e.preventDefault()}
									class="block w-full resize-none overflow-hidden border-0 bg-transparent p-0 font-newsreader text-[30px] leading-[1.08] font-semibold tracking-[-0.02em] text-ink placeholder:text-fade/60 focus:ring-0 focus:outline-none md:text-[40px]"
								></textarea>
							</span>
						</label>
					{/if}
					<label class="mt-5 block">
						<span class="{fieldLabel} flex items-baseline justify-between gap-3"
							>Summary<span class="font-semibold tracking-normal normal-case"
								>Shown on cards and in listings</span
							></span
						>
						<span class="{fieldBox} px-4 py-2.5 md:px-7 md:py-3.5">
							<textarea
								bind:value={excerpt}
								use:autogrow={excerpt}
								rows="1"
								placeholder="Add a one-line summary…"
								aria-label="Summary"
								class="block w-full resize-none overflow-hidden border-0 bg-transparent p-0 font-newsreader text-[17px] leading-[1.5] text-soft italic placeholder:text-fade/70 focus:ring-0 focus:outline-none md:text-[19px]"
							></textarea>
						</span>
					</label>

					{#if hasPendingChanges}
						<div
							class="mt-5 flex flex-wrap items-center gap-3 border-l-[3px] border-hero-rb bg-hero-rb/[0.06] px-3.5 py-2.5"
						>
							<span class="text-[12.5px] text-soft"
								><b class="text-ink">Edits waiting for approval.</b>
								{#if entry.draftUpdatedAt}Last edited {fmtWhen(entry.draftUpdatedAt)}.{/if}</span
							>
							<span class="ml-auto inline-grid grid-cols-2 gap-px border border-line2 bg-line2">
								{#each [[false, 'Edit'], [true, 'Review changes']] as [v, l] (l)}
									<button
										type="button"
										on:click={() => (reviewMode = v)}
										aria-pressed={reviewMode === v}
										class="min-h-[32px] px-3 text-[9.5px] font-extrabold tracking-[0.12em] uppercase transition-colors {reviewMode ===
										v
											? 'bg-ink text-paper-bg'
											: 'bg-paper-bg text-soft hover:text-ink'}">{l}</button
									>
								{/each}
							</span>
						</div>
					{/if}

					<div class="mt-6">
						<span class={fieldLabel}>Body</span>
						{#if reviewMode}
							<div class="desk-diff-view border-t-[3px] border-ink">
								<p class="border-b border-line2 py-2 text-[11.5px] text-fade">
									Compared with the live version ·
									<span class="diff-word-added">added</span> ·
									<span class="diff-word-removed">removed</span>
								</p>
								<div class="py-4 font-newsreader text-[18px] text-ink">
									{#if !richDiffItems || richDiffItems.length === 0}
										<p class="text-fade italic">No body changes; only details were edited.</p>
									{:else}
										{#each richDiffItems as item, i (i)}
											{#if item.kind === 'unchanged'}
												<svelte:element this={nodeTag(item.node)} class="diff-block">
													{extractNodeText(item.node)}
												</svelte:element>
											{:else if item.kind === 'unchanged-widget'}
												<div class="diff-widget diff-widget-unchanged">
													<span class="diff-widget-label">{widgetLabel(item.node)}</span>
													<span class="diff-widget-status">unchanged</span>
												</div>
											{:else if item.kind === 'added'}
												{#if isWidget(item.node)}
													<div class="diff-widget diff-widget-added">
														<span class="diff-widget-label">{widgetLabel(item.node)}</span>
														<span class="diff-widget-status">added</span>
													</div>
												{:else}
													<svelte:element this={nodeTag(item.node)} class="diff-block diff-added">
														{extractNodeText(item.node)}
													</svelte:element>
												{/if}
											{:else if item.kind === 'removed'}
												{#if isWidget(item.node)}
													<div class="diff-widget diff-widget-removed">
														<span class="diff-widget-label">{widgetLabel(item.node)}</span>
														<span class="diff-widget-status">removed</span>
													</div>
												{:else}
													<svelte:element this={nodeTag(item.node)} class="diff-block diff-removed">
														{extractNodeText(item.node)}
													</svelte:element>
												{/if}
											{:else if item.kind === 'widget-change'}
												<div class="diff-widget diff-widget-changed">
													<span class="diff-widget-label">{widgetLabel(item.node)}</span>
													<span class="diff-widget-status">edited</span>
												</div>
											{:else if item.kind === 'diff'}
												<svelte:element this={item.tag} class="diff-block">
													{#each item.parts as part, j (j)}
														{#if part.added}
															<span class="diff-word-added">{part.value}</span>
														{:else if part.removed}
															<span class="diff-word-removed">{part.value}</span>
														{:else}
															<span>{part.value}</span>
														{/if}
													{/each}
												</svelte:element>
											{/if}
										{/each}
									{/if}
								</div>
								{#if excerptDiffParts.length > 0}
									<div
										class="border-t border-line2 py-3 font-newsreader text-[15px] text-soft italic"
									>
										<span
											class="mb-1 block font-libre text-[9.5px] font-extrabold tracking-[0.16em] uppercase not-italic"
											>Summary</span
										>
										{#each excerptDiffParts as part, j (j)}
											{#if part.added}
												<span class="diff-word-added">{part.value}</span>
											{:else if part.removed}
												<span class="diff-word-removed">{part.value}</span>
											{:else}
												<span>{part.value}</span>
											{/if}
										{/each}
									</div>
								{/if}
							</div>
						{:else}
							<Editor
								bind:value={body}
								placeholder="Start writing…"
								on:change={handleEditorChange}
								toolbarEnd={isWide ? null : toolbarEnd}
							/>
						{/if}
					</div>
				</div>
			</div>

			<!-- ============ settings: side column on wide screens ============ -->
			{#if !mounted || isWide}
				<aside class="hidden lg:block">{@render panels()}</aside>
			{/if}
		</div>
	</div>

	<!-- ============ settings sheet on phones and tablets ============ -->
	{#if sheetOpen && !isWide}
		<div
			class="fixed inset-0 z-[60] flex flex-col bg-paper-bg"
			role="dialog"
			aria-modal="true"
			aria-label="Entry settings"
			transition:fly={{ y: 24, duration: 200 }}
		>
			<div
				class="flex h-[56px] shrink-0 items-center justify-between gap-3 border-b-[3px] border-ink px-5"
			>
				<span class="flex items-center gap-3">
					<span class="font-newsreader text-[19px] font-semibold">Settings</span>
					<span class="text-[11px]">{@render saveBadge(false)}</span>
				</span>
				<button
					type="button"
					on:click={() => (sheetOpen = false)}
					class="min-h-[40px] bg-ink px-4 text-[10.5px] font-extrabold tracking-[0.14em] text-paper-bg uppercase"
					>Done</button
				>
			</div>
			<div class="flex-1 overflow-y-auto px-5 pt-6 pb-10">{@render panels()}</div>
		</div>
	{/if}
{/if}

<style>
	/* Rich body-diff view — headings, quotes, and list containers use the
	   editor's Newsreader serif at prose-like sizes so the diff reads like
	   the actual article. Added/removed word-level marks stay compact so
	   long swaps don't blow the block heights. */
	.desk-diff-view :global(.diff-block) {
		margin: 0.75rem 0;
		line-height: 1.7;
	}
	.desk-diff-view :global(h2.diff-block) {
		font-size: 1.75rem;
		font-weight: 600;
		line-height: 1.2;
		margin: 1.5rem 0 0.5rem;
		color: var(--color-warm, #1e40af);
	}
	.desk-diff-view :global(h3.diff-block) {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 1.25rem 0 0.5rem;
	}
	.desk-diff-view :global(h4.diff-block) {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 1rem 0 0.5rem;
	}
	.desk-diff-view :global(blockquote.diff-block) {
		border-left: 3px solid var(--color-warm, #1e40af);
		padding-left: 1rem;
		font-style: italic;
		margin: 1rem 0;
	}
	.desk-diff-view :global(ul.diff-block),
	.desk-diff-view :global(ol.diff-block) {
		white-space: pre-wrap;
		padding-left: 1.5rem;
	}

	/* Block-level add/remove — whole paragraphs, headings, or list blocks
	   that came or went in the draft. Light-tinted background + colored
	   left rail so the change surface is obvious without hiding the text. */
	.desk-diff-view :global(.diff-added) {
		background: rgb(220 252 231);
		border-left: 3px solid rgb(21 128 61);
		padding: 0.25rem 0.5rem 0.25rem 0.75rem;
	}
	.desk-diff-view :global(.diff-removed) {
		background: rgb(254 226 226);
		border-left: 3px solid rgb(185 28 28);
		padding: 0.25rem 0.5rem 0.25rem 0.75rem;
		text-decoration: line-through;
	}

	/* Word-level add/remove — inline highlights inside a block whose
	   surrounding prose kept its structure. */
	:global(.diff-word-added) {
		background: rgb(220 252 231);
		color: rgb(20 83 45);
		padding: 0 0.15rem;
	}
	:global(.diff-word-removed) {
		background: rgb(254 226 226);
		color: rgb(127 29 29);
		padding: 0 0.15rem;
		text-decoration: line-through;
	}

	/* Widget summary rows — decklist / stats-table / video / image — since
	   the diff view is a plain-text-with-structure surface, widgets show
	   as compact chips labeled with the widget type + a status. */
	.desk-diff-view :global(.diff-widget) {
		margin: 0.75rem 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.5rem 0.75rem;
		font-size: 0.8125rem;
		font-family: var(--font-libre);
	}
	.desk-diff-view :global(.diff-widget-label) {
		font-weight: 500;
	}
	.desk-diff-view :global(.diff-widget-status) {
		font-size: 0.625rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-weight: 700;
	}
	.desk-diff-view :global(.diff-widget-unchanged) {
		background: rgb(245 245 244);
		color: rgb(87 83 78);
	}
	.desk-diff-view :global(.diff-widget-added) {
		background: rgb(220 252 231);
		color: rgb(20 83 45);
	}
	.desk-diff-view :global(.diff-widget-removed) {
		background: rgb(254 226 226);
		color: rgb(127 29 29);
		text-decoration: line-through;
	}
	.desk-diff-view :global(.diff-widget-changed) {
		background: rgb(255 251 235);
		color: rgb(120 53 15);
	}
</style>
