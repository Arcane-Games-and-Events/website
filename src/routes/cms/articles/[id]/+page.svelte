<script>
	import { onDestroy } from 'svelte';
	import Editor from '$lib/cms/editor/Editor.svelte';
	import CoverImagePicker from '$lib/cms/editor/CoverImagePicker.svelte';
	import { coerceLexicalDoc } from '$lib/cms/editor/utils.js';

	export let data;

	// `data.article` is what the load function returns. Reading via `$:` here
	// would run AFTER the `let` initializers below, so we read straight from
	// `data.article` to seed local form state at component-setup time.
	let article = data?.article || null;
	$: article = data?.article || null;

	// Helper: when an article is published/scheduled, the editor displays the
	// staged draft_* values if any are present, otherwise the live values.
	function liveOrDraft(art, field) {
		if (!art) return undefined;
		const draftKey = `draft${field[0].toUpperCase()}${field.slice(1)}`;
		if (art.draftUpdatedAt && art[draftKey] !== null && art[draftKey] !== undefined) {
			return art[draftKey];
		}
		return art[field];
	}

	// Local form state — initialized once from server data, picking the draft
	// version of each editable field if a pending-changes buffer exists.
	let title = liveOrDraft(data?.article, 'title') || 'Untitled';
	let slug = data?.article?.slug || ''; // slug is always live
	let excerpt = liveOrDraft(data?.article, 'excerpt') || '';
	let accessMode = data?.article?.accessMode || 'free';
	let status = data?.article?.status || 'draft';
	let body = coerceLexicalDoc(liveOrDraft(data?.article, 'body'));
	let coverImage = data?.coverImage || null;
	let coverImageId =
		data?.article?.draftCoverImageId ?? data?.article?.coverImageId ?? null;

	// Admin-only fields
	let isAdmin = !!data?.isAdmin;
	let author = data?.author || null;
	let authorId = data?.article?.authorId || null;
	// Schedule input is a local datetime (the <input type="datetime-local">
	// produces a string like "2026-05-01T12:00"; we serialize to UTC on save).
	let scheduleInput = data?.article?.scheduledFor
		? toLocalInput(new Date(data.article.scheduledFor))
		: '';

	// Authors list for the admin picker (lazy-loaded on demand).
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

	function toLocalInput(d) {
		// Format Date → "yyyy-MM-ddTHH:mm" for <input type="datetime-local">.
		const pad = (n) => String(n).padStart(2, '0');
		return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
	}

	// `status` reflects the underlying DB column. `displayStatus` is what the
	// editor panel and buttons should react to — once a scheduled article's
	// time has passed it's effectively live (the public renderer already treats
	// it that way), so the UI flips to "Published" without needing a DB write.
	$: displayStatus =
		status === 'scheduled' &&
		article?.scheduledFor &&
		new Date(article.scheduledFor).getTime() <= Date.now()
			? 'published'
			: status;
	$: scheduleHasPassed = displayStatus === 'published' && status === 'scheduled';

	// Has the article been edited since it last went live?
	$: hasPendingChanges = !!article?.draftUpdatedAt;
	// Edits to a live (published or scheduled) article get buffered.
	$: editsAreBuffered = status === 'published' || status === 'scheduled';

	async function handleCoverChange(e) {
		const media = e.detail || null;
		coverImage = media;
		coverImageId = media?.id || null;
		// Persist immediately — picker is its own user action, not part of autosave.
		await save({ coverImageId });
	}

	let saveState = 'idle'; // 'idle' | 'saving' | 'saved' | 'error'
	let lastError = '';
	let saveTimer = null;
	// Wait for the editor's first synthetic mount-update before treating any
	// changes as user-driven, otherwise we fire an autosave immediately on load.
	let ready = false;

	// Track whether form fields differ from last server snapshot.
	let serverSnapshot = JSON.stringify({ title, slug, excerpt, accessMode, body });
	$: dirty = JSON.stringify({ title, slug, excerpt, accessMode, body }) !== serverSnapshot;

	function scheduleSave() {
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => save(), 1500);
	}

	$: if (ready && dirty) scheduleSave();

	function handleEditorReady() {
		// Re-baseline once the editor has hydrated, so the initial Lexical
		// "empty paragraph" doesn't count as user input.
		serverSnapshot = JSON.stringify({ title, slug, excerpt, accessMode, body });
		ready = true;
	}

	async function save(extra = {}) {
		if (saveState === 'saving') return;
		saveState = 'saving';
		// Snapshot what we're sending. After the response, we only re-sync local
		// form fields if the user hasn't typed since the request started — this
		// stops autosaves from clobbering keystrokes mid-request (which was
		// causing the slug input to drop characters and jump the caret).
		const sentTitle = title;
		const sentSlug = slug;
		const sentExcerpt = excerpt;
		const sentAccessMode = accessMode;
		try {
			const res = await fetch(`/api/cms/articles/${article.id}`, {
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
			article = json.article;
			// Status reflects server-side state changes (publish, schedule, etc.)
			// — those originate here, never from the user typing, so safe to sync.
			status = article.status;
			// Re-baseline dirty against the current LOCAL values (whatever the
			// user has typed). The server-side normalized values can wait until
			// the next save cycle once the user pauses typing.
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

	async function scheduleArticle() {
		if (!scheduleInput) {
			alert('Pick a date and time to schedule.');
			return;
		}
		const when = new Date(scheduleInput);
		if (isNaN(when.getTime())) {
			alert('Invalid date.');
			return;
		}
		if (when.getTime() <= Date.now()) {
			alert('Schedule time must be in the future.');
			return;
		}
		await save({ status: 'scheduled', scheduledFor: when.toISOString() });
	}

	async function approveDraft() {
		const res = await fetch(`/api/cms/articles/${article.id}/approve-draft`, {
			method: 'POST'
		});
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			alert(err?.message || 'Failed to approve changes');
			return;
		}
		const j = await res.json();
		article = j.article;
		// Re-baseline form state from the now-live values.
		title = article.title || 'Untitled';
		excerpt = article.excerpt || '';
		body = coerceLexicalDoc(article.body);
		coverImageId = article.coverImageId || null;
		serverSnapshot = JSON.stringify({ title, slug, excerpt, accessMode, body });
	}

	async function discardDraft() {
		if (!confirm('Discard pending changes? This cannot be undone.')) return;
		const res = await fetch(`/api/cms/articles/${article.id}/discard-draft`, {
			method: 'POST'
		});
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			alert(err?.message || 'Failed to discard changes');
			return;
		}
		const j = await res.json();
		article = j.article;
		// Pull the form back to the live values.
		title = article.title || 'Untitled';
		excerpt = article.excerpt || '';
		body = coerceLexicalDoc(article.body);
		coverImageId = article.coverImageId || null;
		serverSnapshot = JSON.stringify({ title, slug, excerpt, accessMode, body });
	}

	async function changeAuthor(newAuthorId) {
		if (!newAuthorId || newAuthorId === authorId) return;
		const res = await fetch(`/api/cms/articles/${article.id}`, {
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ authorId: newAuthorId })
		});
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			alert(err?.message || 'Failed to change author');
			return;
		}
		const j = await res.json();
		article = j.article;
		authorId = j.article.authorId;
		// Refresh the author display from the picker list.
		const picked = (authorOptions || []).find((a) => a.id === authorId);
		if (picked) author = picked;
	}

	async function deleteArticle() {
		if (!confirm(`Delete "${article.title}"? This cannot be undone.`)) return;
		const res = await fetch(`/api/cms/articles/${article.id}`, { method: 'DELETE' });
		if (!res.ok) {
			const err = await res.json().catch(() => ({}));
			alert(err?.message || 'Failed to delete');
			return;
		}
		window.location.href = '/cms/articles';
	}

	onDestroy(() => {
		if (saveTimer) clearTimeout(saveTimer);
	});

	let editorChangeCount = 0;
	function handleEditorChange(e) {
		body = e.detail;
		editorChangeCount++;
		// Lexical fires one synthetic change immediately on mount as it hydrates
		// state. We treat that first emit as the editor reaching a ready state.
		if (!ready && editorChangeCount === 1) {
			handleEditorReady();
		}
	}
</script>

<svelte:head>
	<title>{title || 'Untitled'} - CMS</title>
</svelte:head>

{#if !article}
	<div class="mx-auto max-w-2xl px-4 py-16 text-center">
		<h1 class="mb-2 text-xl font-semibold text-white">Couldn't load this article</h1>
		<p class="text-sm text-gray-400">
			If the CMS tables haven't been created yet, run migration
			<code class="rounded bg-gray-800 px-1.5 py-0.5 text-blue-400"
				>014_custom_cms.sql</code
			>
			on Supabase, then reload.
		</p>
		<a
			href="/cms/articles"
			class="mt-4 inline-block text-sm font-medium text-blue-400 hover:text-blue-300"
			>← Back to articles</a
		>
	</div>
{:else}

<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
	<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
		<a href="/cms/articles" class="text-sm text-gray-400 hover:text-white">← Back to articles</a>
		<div class="flex items-center gap-3 text-xs">
			{#if saveState === 'saving'}
				<span class="text-gray-400">Saving…</span>
			{:else if saveState === 'saved' && !dirty}
				<span class="text-emerald-400">Saved</span>
			{:else if saveState === 'error'}
				<span class="text-red-400">Save failed: {lastError}</span>
			{:else if dirty}
				<span class="text-amber-400">Unsaved changes</span>
			{/if}
		</div>
	</div>

	<div class="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
		<!-- Main column: title + editor -->
		<div class="space-y-4">
			<input
				type="text"
				bind:value={title}
				placeholder="Article title"
				class="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-2xl font-semibold text-white placeholder:text-gray-600 focus:border-blue-500 focus:outline-none"
			/>

			<Editor bind:value={body} placeholder="Start writing your article…" on:change={handleEditorChange} />
		</div>

		<!-- Sidebar -->
		<aside class="space-y-4">
			{#if hasPendingChanges}
				<!-- Pending changes banner — for live articles, edits are buffered
				     until an admin approves. -->
				<div class="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
					<div class="mb-1 flex items-center gap-2">
						<span class="rounded-full bg-amber-500/30 px-2 py-0.5 text-[10px] font-bold tracking-wider text-amber-200 uppercase">
							Pending changes
						</span>
					</div>
					<p class="mb-3 text-xs text-amber-200/90">
						{#if isAdmin}
							These edits are saved but won't appear publicly until you approve them.
						{:else}
							Your edits are saved as a pending change. An admin needs to approve before they
							go live.
						{/if}
						{#if article.draftUpdatedAt}
							<span class="mt-1 block text-[11px] text-amber-200/60">
								Last edited {new Date(article.draftUpdatedAt).toLocaleString()}
							</span>
						{/if}
					</p>
					{#if isAdmin}
						<div class="flex gap-2">
							<button
								on:click={approveDraft}
								class="flex-1 rounded-lg bg-emerald-500 px-3 py-2 text-xs font-semibold text-black hover:bg-emerald-400"
							>
								Approve & publish
							</button>
							<button
								on:click={discardDraft}
								class="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-medium text-gray-300 hover:bg-gray-700"
							>
								Discard
							</button>
						</div>
					{/if}
				</div>
			{/if}

			<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
				<h3 class="mb-3 text-sm font-semibold text-white">Publish</h3>

				<div class="mb-3 text-xs text-gray-400">
					<div>
						Status:
						<span class="font-medium text-white capitalize">{displayStatus}</span>
					</div>
					{#if article.publishedAt}
						<div class="mt-0.5 text-gray-500">
							Published {new Date(article.publishedAt).toLocaleString()}
						</div>
					{:else if scheduleHasPassed}
						<div class="mt-0.5 text-gray-500">
							Live since {new Date(article.scheduledFor).toLocaleString()}
						</div>
					{/if}
					{#if displayStatus === 'scheduled' && article.scheduledFor}
						<div class="mt-0.5 text-blue-400">
							Goes live {new Date(article.scheduledFor).toLocaleString()}
						</div>
					{/if}
				</div>

				{#if isAdmin}
					<!-- Admin-only publish + schedule controls -->
					<div class="space-y-2">
						{#if displayStatus !== 'published'}
							<button
								on:click={publish}
								class="w-full rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
							>
								Publish now
							</button>
						{:else}
							<button
								on:click={unpublish}
								class="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700"
							>
								Unpublish (back to draft)
							</button>
						{/if}

						<!-- Schedule -->
						{#if displayStatus !== 'published'}
							<div class="rounded-lg border border-blue-500/30 bg-blue-500/5 p-2">
								<label class="block text-[11px] font-medium text-blue-300">
									Schedule for later
									<input
										type="datetime-local"
										bind:value={scheduleInput}
										class="mt-1 w-full rounded-md border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-white focus:border-blue-500 focus:outline-none"
									/>
								</label>
								<button
									on:click={scheduleArticle}
									disabled={!scheduleInput}
									class="mt-2 w-full rounded-md bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
								>
									{displayStatus === 'scheduled' ? 'Reschedule' : 'Schedule'}
								</button>
							</div>
						{/if}

						{#if displayStatus !== 'archived'}
							<button
								on:click={archive}
								class="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700"
							>
								Archive
							</button>
						{/if}
					</div>
				{:else}
					<!-- Writer-only — autosave handles drafts; only an admin can publish. -->
					<p class="rounded-lg border border-gray-800 bg-gray-900/60 p-3 text-xs text-gray-400">
						{#if editsAreBuffered}
							Your edits are saved as a pending change. An admin needs to approve before they
							go live.
						{:else}
							Your changes are saved automatically as a draft. An admin will publish your
							article when it's ready.
						{/if}
					</p>
				{/if}
			</div>

			{#if isAdmin}
				<!-- Author picker (admin-only). Lazy-loads the author list on focus. -->
				<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
					<h3 class="mb-3 text-sm font-semibold text-white">Author</h3>
					<p class="mb-2 text-xs text-gray-400">
						Currently:
						<span class="font-medium text-white">
							{author ? `${author.firstName} ${author.lastName || ''}`.trim() : '—'}
						</span>
					</p>
					<select
						value={authorId}
						on:focus={ensureAuthorsLoaded}
						on:change={(e) => changeAuthor(e.currentTarget.value)}
						class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
					>
						{#if loadingAuthors && !authorOptions}
							<option>Loading…</option>
						{:else if !authorOptions}
							<!-- Show current author as the only option until the list loads -->
							{#if author}
								<option value={author.id}>{author.firstName} {author.lastName || ''}</option>
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

			<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
				<h3 class="mb-3 text-sm font-semibold text-white">Cover image</h3>
				<CoverImagePicker value={coverImage} on:change={handleCoverChange} />
			</div>

			<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
				<h3 class="mb-3 text-sm font-semibold text-white">Settings</h3>

				<label class="mb-3 block">
					<span class="mb-1 block text-xs font-medium text-gray-400">Slug</span>
					<input
						type="text"
						bind:value={slug}
						class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 font-mono text-xs text-white focus:border-blue-500 focus:outline-none"
					/>
					<p class="mt-1 text-[11px] text-gray-500">URL: /articles/{slug}</p>
				</label>

				<label class="mb-3 block">
					<span class="mb-1 block text-xs font-medium text-gray-400">Access</span>
					<select
						bind:value={accessMode}
						class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
					>
						<option value="free">Free (anyone can read)</option>
						<option value="premium">Premium (gated for 60 days)</option>
					</select>
				</label>

				<label class="block">
					<span class="mb-1 block text-xs font-medium text-gray-400">Excerpt</span>
					<textarea
						bind:value={excerpt}
						rows="3"
						placeholder="Short summary shown on listings (auto-generated if blank)"
						class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none"
					></textarea>
				</label>
			</div>

			{#if status === 'draft'}
				<div class="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
					<h3 class="mb-2 text-sm font-semibold text-red-400">Danger zone</h3>
					<button
						on:click={deleteArticle}
						class="w-full rounded-lg bg-red-500/20 px-3 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/30"
					>
						Delete draft
					</button>
				</div>
			{/if}
		</aside>
	</div>
</div>
{/if}
