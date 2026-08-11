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

	function toLocalInput(d) {
		const pad = (n) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}

	// Media pickers hold their own local state so the sidebar previews update
	// immediately on upload without waiting for a full form save cycle.
	let coverImage = data?.coverImage || null;
	let thumbnailImage = data?.thumbnailImage || null;

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
	// nothing else still references the media. Response is ignored — the
	// endpoint returns `{ deleted: false, reason }` when the media is still
	// used elsewhere, and that's fine (leaves the shared image intact).
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

	async function scheduleEntry() {
		if (!scheduleInput) return alert('Pick a date and time to schedule.');
		const when = new Date(scheduleInput);
		if (isNaN(when.getTime())) return alert('Invalid date.');
		if (when.getTime() <= Date.now()) return alert('Schedule time must be in the future.');
		await save({ status: 'scheduled', scheduledFor: when.toISOString() });
	}

	async function approveDraft() {
		const res = await fetch(`/api/cms/entries/${entry.id}/approve-draft`, { method: 'POST' });
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			return alert(err?.message || 'Failed to approve changes');
		}
		const j = await res.json();
		entry = j.entry;
		title = entry.title || 'Untitled';
		excerpt = entry.excerpt || '';
		body = coerceLexicalDoc(entry.body);
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
				<input
					type="text"
					bind:value={title}
					placeholder="Entry title"
					class="w-full rounded-md border border-line2 bg-paper px-4 py-3 font-newsreader text-2xl font-semibold text-ink placeholder:text-ink/40 focus:border-accent focus:outline-none"
				/>

				<Editor bind:value={body} placeholder="Start writing your entry…" on:change={handleEditorChange} />
			</div>

			<!-- Sidebar -->
			<aside class="space-y-4">
				{#if hasPendingChanges}
					<!-- Pending-changes banner — edits to a live entry are buffered until
					     an admin approves. -->
					<div class="rounded-md border border-warm/40 bg-warm/10 p-4">
						<div class="mb-1 flex items-center gap-2">
							<span class="rounded-full bg-warm/25 px-2 py-0.5 text-[10px] font-bold tracking-wider text-warm uppercase font-mono-system">
								Pending changes
							</span>
						</div>
						<p class="mb-3 text-xs text-ink/80">
							{#if isAdmin}
								These edits are saved but won't appear publicly until you approve them.
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
							<div class="flex gap-2">
								<button
									on:click={approveDraft}
									class="flex-1 rounded-md bg-emerald-700 px-3 py-2 text-xs font-semibold text-paper-bg hover:bg-emerald-800"
								>
									Approve & publish
								</button>
								<button
									on:click={discardDraft}
									class="rounded-md border border-line2 bg-paper px-3 py-2 text-xs font-medium text-ink/80 hover:bg-ink/5"
								>
									Discard
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
