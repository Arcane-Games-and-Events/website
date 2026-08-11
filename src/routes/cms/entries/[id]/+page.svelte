<!--
  CMS entry editor — writer + admin authoring surface for a single entry.

  Autosave (1500ms debounce) writes title / slug / excerpt / accessMode /
  body to PATCH /api/cms/entries/[id]. The `sentX` snapshot inside `save()`
  prevents an in-flight autosave from clobbering keystrokes made after the
  request started — a real bug fix (dropped slug characters + caret jumps).

  Widget insertion (Decklist / StatsTable / CardLink), cover image picker,
  author reassignment picker, and video slot picker are deferred to steps
  4-5. The core authoring loop — type text, format it, save, come back and
  keep editing, admin publishes — works end-to-end.
-->
<script>
	import { onDestroy } from 'svelte';
	import Editor from '$lib/cms/editor/Editor.svelte';
	import CoverImagePicker from '$lib/cms/editor/CoverImagePicker.svelte';
	import VideoSlotPicker from '$lib/cms/editor/VideoSlotPicker.svelte';
	import { coerceLexicalDoc } from '$lib/cms/editor/utils.js';
	import { lexicalToText } from '$lib/cms/render/lexical-utils.js';
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
			const res = await fetch('/api/cms/users/authors');
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
		const res = await fetch(`/api/cms/entries/${entry.id}`, {
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
		fetch(`/api/cms/media/${id}`, { method: 'DELETE' }).catch(() => {});
	}

	// A scheduled entry whose time has passed reads as published everywhere
	// else on the site, so flip the display without needing a DB write.
	$: displayStatus =
		status === 'scheduled' &&
		entry?.scheduledFor &&
		new Date(entry.scheduledFor).getTime() <= Date.now()
			? 'published'
			: status;
	$: scheduleHasPassed = displayStatus === 'published' && status === 'scheduled';

	$: hasPendingChanges = !!entry?.draftUpdatedAt;

	// Toggle between editing the draft and reviewing the diff against live.
	// When there are no pending changes, the toggle is hidden and the
	// editor is the only mode.
	let reviewMode = false;

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
		if (node.type === 'decklist')
			return `Decklist${node.deckName ? ` — ${node.deckName}` : ''}`;
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
			const res = await fetch(`/api/cms/entries/${entry.id}`, {
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
		const res = await fetch(`/api/cms/entries/${entry.id}/approve-draft`, {
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
		const res = await fetch(`/api/cms/entries/${entry.id}/discard-draft`, { method: 'POST' });
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
		const res = await fetch(`/api/cms/entries/${entry.id}`, { method: 'DELETE' });
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			return alert(err?.message || 'Failed to delete');
		}
		window.location.href = '/cms/entries';
	}

	onDestroy(() => {
		if (saveTimer) clearTimeout(saveTimer);
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
	<title>{title || 'Untitled'} · CMS</title>
</svelte:head>

{#if !entry}
	<div class="mx-auto max-w-2xl px-4 py-16 text-center">
		<h1 class="mb-2 text-xl font-semibold text-ink">Couldn't load this entry</h1>
		<a href="/cms/entries" class="mt-4 inline-block text-sm font-medium text-accent hover:underline">
			← Back to entries
		</a>
	</div>
{:else}
	<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
		<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
			<a href="/cms/entries" class="text-sm text-ink/60 hover:text-ink">← Back to entries</a>
			<div class="flex items-center gap-3 text-xs font-mono-system">
				{#if saveState === 'saving'}
					<span class="text-ink/60">Saving…</span>
				{:else if saveState === 'saved' && !dirty}
					<span class="text-emerald-700">Saved</span>
				{:else if saveState === 'error'}
					<span class="text-red-700">Save failed: {lastError}</span>
				{:else if dirty}
					<span class="text-warm">Unsaved changes</span>
				{/if}
				<a
					href="/cms/entries/{entry.id}/preview"
					target="_blank"
					rel="noopener"
					class="rounded-md border border-line2 bg-paper px-3 py-1 text-ink/80 transition-colors hover:bg-ink/5 hover:text-ink"
				>
					Preview ↗
				</a>
			</div>
		</div>

		<div class="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
			<!-- Main column: title + editor -->
			<div class="space-y-4">
				{#if reviewMode && titleDiffParts.length > 0}
					<!-- In review mode, the title also renders as a diff so the
					     admin can see title changes inline instead of as an input.
					     Falls back to the editable input when the title didn't
					     change (nothing to diff). -->
					<div class="w-full rounded-md border border-line2 bg-paper px-4 py-3 font-newsreader text-xl font-semibold text-ink sm:text-2xl">
						{#if titleDiffParts.length > 0}
							{#each titleDiffParts as part}
								{#if part.added}
									<span class="rounded bg-emerald-100 text-emerald-900 px-1">{part.value}</span>
								{:else if part.removed}
									<span class="rounded bg-red-100 text-red-900 line-through px-1">{part.value}</span>
								{:else}
									<span>{part.value}</span>
								{/if}
							{/each}
						{:else}
							{title}
						{/if}
					</div>
				{:else}
					<input
						type="text"
						bind:value={title}
						placeholder="Entry title"
						class="w-full rounded-md border border-line2 bg-paper px-4 py-3 font-newsreader text-xl font-semibold text-ink placeholder:text-ink/40 focus:border-accent focus:outline-none sm:text-2xl"
					/>
				{/if}

				{#if hasPendingChanges}
					<!-- Review toggle — admin flips between editing the draft and
					     seeing the inline diff against live. Non-admin writers can
					     also review their own diff before an admin looks at it. -->
					<div class="flex flex-wrap items-center gap-2 rounded-md border border-warm/40 bg-warm/5 p-2 text-[11px] font-mono-system">
						<span class="rounded-full bg-warm/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warm">
							Draft
						</span>
						{#if entry.draftUpdatedAt}
							<span class="text-ink/50">
								edited {new Date(entry.draftUpdatedAt).toLocaleString()}
							</span>
						{/if}
						<span class="ml-auto flex items-center gap-1 rounded-md border border-line2 bg-paper p-0.5">
							<button
								type="button"
								on:click={() => (reviewMode = false)}
								class="rounded px-2 py-0.5 transition-colors {!reviewMode
									? 'bg-ink text-paper-bg'
									: 'text-ink/60 hover:text-ink'}"
							>
								Edit
							</button>
							<button
								type="button"
								on:click={() => (reviewMode = true)}
								class="rounded px-2 py-0.5 transition-colors {reviewMode
									? 'bg-ink text-paper-bg'
									: 'text-ink/60 hover:text-ink'}"
							>
								Diff vs live
							</button>
						</span>
					</div>
				{/if}

				{#if reviewMode}
					<!-- Rich diff view — renders each top-level Lexical block with
					     its ORIGINAL formatting (heading tag, quote, list, widget
					     summary) and highlights word-level changes inside blocks
					     that changed. Additions in green, removals in red-strike.
					     Toggle back to Edit to modify the actual body. -->
					<div class="cms-diff-view rounded-md border border-line2 bg-paper">
						<div class="border-b border-line2 bg-paper-bg/40 px-4 py-2 text-[11px] font-mono-system text-ink/60">
							Diff — <span class="text-emerald-700">green added</span>
							<span class="mx-1">·</span>
							<span class="text-red-700 line-through">red removed</span>
						</div>
						<div class="px-6 py-5 font-newsreader text-ink">
							{#if !richDiffItems || richDiffItems.length === 0}
								<p class="text-ink/50 italic">No body changes — only metadata was edited.</p>
							{:else}
								{#each richDiffItems as item}
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
											{#each item.parts as part}
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
							<div class="border-t border-line2 bg-paper-bg/40 px-4 py-3 text-[13px] font-newsreader italic text-ink/80">
								<div class="mb-1 text-[10px] not-italic font-mono-system font-bold uppercase tracking-wider text-ink/60">
									Excerpt
								</div>
								{#each excerptDiffParts as part}
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
					<Editor bind:value={body} placeholder="Start writing your entry…" on:change={handleEditorChange} />
				{/if}
			</div>

			<!-- Sidebar -->
			<aside class="space-y-4">
				{#if hasPendingChanges}
					<!-- Pending-changes banner — edits to a live entry are buffered
					     until an admin approves. The inline diff view lives in the
					     main editor column; this sidebar strip just holds the
					     Approve / Discard controls. -->
					<div class="rounded-md border border-warm/40 bg-warm/10 p-4">
						<div class="mb-1 flex items-center gap-2">
							<span class="rounded-full bg-warm/25 px-2 py-0.5 text-[10px] font-bold tracking-wider text-warm uppercase font-mono-system">
								Pending changes
							</span>
						</div>
						<p class="mb-3 text-xs text-ink/80">
							{#if isAdmin}
								Toggle <b>Diff vs live</b> above the editor to review what changed. These
								edits won't appear publicly until you approve them.
							{:else}
								Your edits are saved as a pending change. An admin needs to approve before they go live.
							{/if}
							{#if entry.draftUpdatedAt}
								<span class="mt-1 block text-[11px] text-ink/60">
									Last edited {new Date(entry.draftUpdatedAt).toLocaleString()}
								</span>
							{/if}
						</p>

						{#if isAdmin}
							<div class="space-y-2">
								<!-- Primary: apply the buffer, leave status as-is
								     (published entries stay published; scheduled
								     entries stay scheduled). -->
								<button
									on:click={() => approveDraft()}
									class="w-full rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-paper-bg hover:bg-emerald-800"
								>
									Approve — keep {displayStatus}
								</button>

								<!-- Secondary: apply the buffer AND unpublish. Use
								     when you want to accept a writer's edits into
								     the canonical content but pull the entry from
								     the public site. -->
								{#if status === 'published' || status === 'scheduled'}
									<button
										on:click={() => approveDraft({ asStatus: 'draft' })}
										class="w-full rounded-md border border-line2 bg-paper px-3 py-2 text-xs font-medium text-ink/80 hover:bg-ink/5"
									>
										Approve, unpublish to draft
									</button>
								{/if}

								<button
									on:click={discardDraft}
									class="w-full rounded-md border border-red-300 bg-paper px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
								>
									Discard changes
								</button>
							</div>
						{/if}
					</div>
				{/if}

				<div class="rounded-md border border-line2 bg-paper p-4">
					<h3 class="mb-3 text-xs font-semibold tracking-wider text-ink/60 uppercase font-mono-system">
						Publish
					</h3>

					<div class="mb-3 text-xs text-ink/70">
						<div>
							Status:
							<span class="font-medium text-ink capitalize">{displayStatus}</span>
						</div>
						{#if entry.publishedAt}
							<div class="mt-0.5 text-ink/50">
								Published {new Date(entry.publishedAt).toLocaleString()}
							</div>
						{:else if scheduleHasPassed}
							<div class="mt-0.5 text-ink/50">
								Live since {new Date(entry.scheduledFor).toLocaleString()}
							</div>
						{/if}
						{#if displayStatus === 'scheduled' && entry.scheduledFor}
							<div class="mt-0.5 text-accent">
								Goes live {new Date(entry.scheduledFor).toLocaleString()}
							</div>
						{/if}
					</div>

					{#if isAdmin}
						<!-- Explicit publish-date input. Overrides the auto-set
						     `now()` that fires on the first publish. Set to any
						     date — past values for backdated ordering, future
						     values for previewing library placement. Empty =
						     clear (entry falls off publish-date-sorted lists). -->
						<label class="mb-3 block">
							<span class="mb-1 block text-[10px] font-medium text-ink/60 uppercase tracking-wider font-mono-system">
								Publish date (library order)
							</span>
							<input
								type="datetime-local"
								bind:value={publishDateInput}
								on:change={savePublishDate}
								class="w-full rounded-md border border-line2 bg-paper px-2 py-1 text-xs text-ink focus:border-accent focus:outline-none"
							/>
							<p class="mt-1 text-[10px] text-ink/50">
								Sorts entries in the library newest-first by this date. Backdate to slot an
								entry into the archive; leave alone to use the actual publish time.
							</p>
						</label>

						<div class="space-y-2">
							{#if displayStatus !== 'published'}
								<button
									on:click={publish}
									class="w-full rounded-md bg-ink px-3 py-2 text-sm font-semibold text-paper-bg hover:bg-ink/90"
								>
									Publish now
								</button>
							{:else}
								<button
									on:click={unpublish}
									class="w-full rounded-md border border-line2 bg-paper px-3 py-2 text-sm font-medium text-ink hover:bg-ink/5"
								>
									Unpublish (back to draft)
								</button>
							{/if}

							{#if displayStatus !== 'published'}
								<div class="rounded-md border border-accent/30 bg-accent/5 p-2">
									<label class="block text-[11px] font-medium text-accent">
										Schedule for later
										<input
											type="datetime-local"
											bind:value={scheduleInput}
											class="mt-1 w-full rounded-md border border-line2 bg-paper px-2 py-1 text-xs text-ink focus:border-accent focus:outline-none"
										/>
									</label>
									<button
										on:click={scheduleEntry}
										disabled={!scheduleInput}
										class="mt-2 w-full rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-white hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
									>
										{displayStatus === 'scheduled' ? 'Reschedule' : 'Schedule'}
									</button>
								</div>
							{/if}

							{#if displayStatus !== 'archived'}
								<button
									on:click={archive}
									class="w-full rounded-md border border-line2 bg-paper px-3 py-2 text-sm font-medium text-ink/80 hover:bg-ink/5"
								>
									Archive
								</button>
							{/if}
						</div>
					{:else}
						<p class="rounded-md border border-line2 bg-paper-bg/50 p-3 text-xs text-ink/70">
							{#if editsAreBuffered}
								Your edits are saved as a pending change. An admin needs to approve before they go live.
							{:else}
								Your changes are saved automatically as a draft. An admin will publish your entry when it's ready.
							{/if}
						</p>
					{/if}
				</div>

				{#if isAdmin}
					<!-- Author picker: admin-only. Lazy-loads the eligible-authors list
					     on focus so the initial page render doesn't wait for it. -->
					<div class="rounded-md border border-line2 bg-paper p-4">
						<h3 class="mb-3 text-xs font-semibold tracking-wider text-ink/60 uppercase font-mono-system">
							Author
						</h3>
						<p class="mb-2 text-xs text-ink/70">
							Currently:
							<span class="font-medium text-ink">
								{author ? `${author.firstName} ${author.lastName || ''}`.trim() : '—'}
							</span>
						</p>
						<select
							value={authorId}
							on:focus={ensureAuthorsLoaded}
							on:change={(e) => changeAuthor(e.currentTarget.value)}
							class="w-full rounded-md border border-line2 bg-paper px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
						>
							{#if loadingAuthors && !authorOptions}
								<option>Loading…</option>
							{:else if !authorOptions}
								{#if author}
									<option value={author.id}>
										{author.firstName}
										{author.lastName || ''}
									</option>
								{/if}
							{:else}
								{#each authorOptions as opt}
									<option value={opt.id}>
										{opt.firstName}
										{opt.lastName || ''}
										{#if opt.email}— {opt.email}{/if}
									</option>
								{/each}
							{/if}
						</select>
					</div>
				{/if}

				<div class="rounded-md border border-line2 bg-paper p-4">
					<h3 class="mb-3 text-xs font-semibold tracking-wider text-ink/60 uppercase font-mono-system">
						Images
					</h3>
					<CoverImagePicker label="Cover" value={coverImage} on:change={handleCoverChange} />
					<div class="my-4 h-px bg-line2"></div>
					<CoverImagePicker
						label="Thumbnail"
						value={thumbnailImage}
						on:change={handleThumbnailChange}
					/>
					<p class="mt-2 text-[11px] text-ink/50">
						Thumbnail defaults to the cover if left empty.
					</p>
				</div>

				<div class="rounded-md border border-line2 bg-paper p-4">
					<h3 class="mb-3 text-xs font-semibold tracking-wider text-ink/60 uppercase font-mono-system">
						Video
					</h3>
					<VideoSlotPicker target="entry" id={entry.id} {entry} on:patch={handleVideoPatch} />
				</div>

				<div class="rounded-md border border-line2 bg-paper p-4">
					<h3 class="mb-3 text-xs font-semibold tracking-wider text-ink/60 uppercase font-mono-system">
						Settings
					</h3>

					<label class="mb-3 block">
						<span class="mb-1 block text-[11px] font-medium text-ink/60 uppercase tracking-wider font-mono-system">
							Slug
						</span>
						<input
							type="text"
							bind:value={slug}
							class="w-full rounded-md border border-line2 bg-paper px-3 py-2 font-mono-system text-xs text-ink focus:border-accent focus:outline-none"
						/>
						<p class="mt-1 text-[11px] text-ink/50 font-mono-system">URL: /library/{slug}</p>
					</label>

					<label class="mb-3 block">
						<span class="mb-1 block text-[11px] font-medium text-ink/60 uppercase tracking-wider font-mono-system">
							Access
						</span>
						<select
							bind:value={accessMode}
							class="w-full rounded-md border border-line2 bg-paper px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
						>
							<option value="free">Free (anyone can read)</option>
							<option value="premium">Premium (subscribers only)</option>
						</select>
					</label>

					<label class="block">
						<span class="mb-1 block text-[11px] font-medium text-ink/60 uppercase tracking-wider font-mono-system">
							Excerpt
						</span>
						<textarea
							bind:value={excerpt}
							rows="3"
							placeholder="Short summary shown on listings (auto-generated if blank)"
							class="w-full rounded-md border border-line2 bg-paper px-3 py-2 text-xs text-ink placeholder:text-ink/40 focus:border-accent focus:outline-none"
						></textarea>
					</label>
				</div>

				{#if status === 'draft'}
					<div class="rounded-md border border-red-300 bg-red-50 p-4">
						<h3 class="mb-2 text-xs font-semibold tracking-wider text-red-700 uppercase font-mono-system">
							Danger zone
						</h3>
						<button
							on:click={deleteEntry}
							class="w-full rounded-md bg-red-100 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-200"
						>
							Delete draft
						</button>
					</div>
				{/if}
			</aside>
		</div>
	</div>
{/if}


<style>
	/* Rich body-diff view — headings, quotes, and list containers use the
	   editor's Newsreader serif at prose-like sizes so the diff reads like
	   the actual article. Added/removed word-level marks stay compact so
	   long swaps don't blow the block heights. */
	.cms-diff-view :global(.diff-block) {
		margin: 0.75rem 0;
		line-height: 1.7;
	}
	.cms-diff-view :global(h2.diff-block) {
		font-size: 1.75rem;
		font-weight: 600;
		line-height: 1.2;
		margin: 1.5rem 0 0.5rem;
		color: var(--color-warm, #b7642e);
	}
	.cms-diff-view :global(h3.diff-block) {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 1.25rem 0 0.5rem;
	}
	.cms-diff-view :global(h4.diff-block) {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 1rem 0 0.5rem;
	}
	.cms-diff-view :global(blockquote.diff-block) {
		border-left: 3px solid var(--color-warm, #b7642e);
		padding-left: 1rem;
		font-style: italic;
		margin: 1rem 0;
	}
	.cms-diff-view :global(ul.diff-block),
	.cms-diff-view :global(ol.diff-block) {
		white-space: pre-wrap;
		padding-left: 1.5rem;
	}

	/* Block-level add/remove — whole paragraphs, headings, or list blocks
	   that came or went in the draft. Light-tinted background + colored
	   left rail so the change surface is obvious without hiding the text. */
	.cms-diff-view :global(.diff-added) {
		background: rgb(220 252 231);
		border-left: 3px solid rgb(21 128 61);
		padding: 0.25rem 0.5rem 0.25rem 0.75rem;
		border-radius: 0.25rem;
	}
	.cms-diff-view :global(.diff-removed) {
		background: rgb(254 226 226);
		border-left: 3px solid rgb(185 28 28);
		padding: 0.25rem 0.5rem 0.25rem 0.75rem;
		border-radius: 0.25rem;
		text-decoration: line-through;
	}

	/* Word-level add/remove — inline highlights inside a block whose
	   surrounding prose kept its structure. */
	.cms-diff-view :global(.diff-word-added) {
		background: rgb(220 252 231);
		color: rgb(20 83 45);
		padding: 0 0.15rem;
		border-radius: 0.15rem;
	}
	.cms-diff-view :global(.diff-word-removed) {
		background: rgb(254 226 226);
		color: rgb(127 29 29);
		padding: 0 0.15rem;
		border-radius: 0.15rem;
		text-decoration: line-through;
	}

	/* Widget summary rows — decklist / stats-table / video / image — since
	   the diff view is a plain-text-with-structure surface, widgets show
	   as compact chips labeled with the widget type + a status. */
	.cms-diff-view :global(.diff-widget) {
		margin: 0.75rem 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.5rem 0.75rem;
		border-radius: 0.375rem;
		font-size: 0.8125rem;
		font-family: ui-sans-serif, system-ui, sans-serif;
	}
	.cms-diff-view :global(.diff-widget-label) {
		font-weight: 500;
	}
	.cms-diff-view :global(.diff-widget-status) {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.6875rem;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-weight: 700;
	}
	.cms-diff-view :global(.diff-widget-unchanged) {
		background: rgb(245 245 244);
		color: rgb(87 83 78);
	}
	.cms-diff-view :global(.diff-widget-added) {
		background: rgb(220 252 231);
		color: rgb(20 83 45);
	}
	.cms-diff-view :global(.diff-widget-removed) {
		background: rgb(254 226 226);
		color: rgb(127 29 29);
		text-decoration: line-through;
	}
	.cms-diff-view :global(.diff-widget-changed) {
		background: rgb(255 251 235);
		color: rgb(120 53 15);
	}
</style>
