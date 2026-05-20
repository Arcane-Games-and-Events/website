<script>
	import { onDestroy, onMount } from 'svelte';
	import Editor from '$lib/cms/editor/Editor.svelte';
	import { coerceLexicalDoc } from '$lib/cms/editor/utils.js';

	export let data;

	$: lesson = data?.lesson || null;
	$: course = data?.course || null;

	let title = data?.lesson?.title || 'Untitled';
	let videoId = data?.lesson?.videoId || '';
	let isPreview = data?.lesson?.isPreview ?? false;
	let body = coerceLexicalDoc(data?.lesson?.body);

	let saveState = 'idle';
	let saveTimer = null;
	let lastError = '';
	let ready = false;

	let serverSnapshot = JSON.stringify({ title, videoId, isPreview, body });
	$: dirty = JSON.stringify({ title, videoId, isPreview, body }) !== serverSnapshot;
	$: if (ready && dirty) scheduleSave();

	function scheduleSave() {
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(save, 1500);
	}

	async function save() {
		if (!lesson) return;
		saveState = 'saving';
		try {
			const res = await fetch(`/api/cms/lessons/${lesson.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ title, videoId: videoId || null, isPreview, body })
			});
			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				saveState = 'error';
				lastError = err?.message || `HTTP ${res.status}`;
				return;
			}
			const json = await res.json();
			lesson = json.lesson;
			serverSnapshot = JSON.stringify({ title, videoId, isPreview, body });
			saveState = 'saved';
		} catch (e) {
			saveState = 'error';
			lastError = e?.message || 'Network error';
		}
	}

	let editorChangeCount = 0;
	function handleEditorChange(e) {
		body = e.detail;
		editorChangeCount++;
		if (!ready && editorChangeCount === 1) {
			serverSnapshot = JSON.stringify({ title, videoId, isPreview, body });
			ready = true;
		}
	}

	async function deleteLesson() {
		if (!lesson) return;
		if (!confirm(`Delete lesson "${lesson.title}"?`)) return;
		const res = await fetch(`/api/cms/lessons/${lesson.id}`, { method: 'DELETE' });
		if (!res.ok) {
			alert('Failed to delete');
			return;
		}
		window.location.href = course ? `/cms/courses/${course.id}` : '/cms/courses';
	}

	onDestroy(() => {
		if (saveTimer) clearTimeout(saveTimer);
	});
</script>

<svelte:head>
	<title>{title || 'Untitled'} - CMS</title>
</svelte:head>

{#if !lesson}
	<div class="mx-auto max-w-2xl px-4 py-16 text-center">
		<h1 class="mb-2 text-xl font-semibold text-white">Couldn't load this lesson</h1>
	</div>
{:else}
	<div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
		<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
			<a
				href={course ? `/cms/courses/${course.id}` : '/cms/courses'}
				class="text-sm text-gray-400 hover:text-white">← Back to course</a
			>
			<div class="text-xs">
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
			<div class="space-y-4">
				<input
					type="text"
					bind:value={title}
					placeholder="Lesson title"
					class="w-full rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 text-2xl font-semibold text-white placeholder:text-gray-600 focus:border-purple-500 focus:outline-none"
				/>

				<Editor bind:value={body} placeholder="Lesson body…" on:change={handleEditorChange} />
			</div>

			<aside class="space-y-4">
				<div class="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
					<h3 class="mb-3 text-sm font-semibold text-white">Video</h3>
					<label class="mb-3 block">
						<span class="mb-1 block text-xs font-medium text-gray-400">Mux Asset ID</span>
						<input
							type="text"
							bind:value={videoId}
							placeholder="asset_xyz123 or playback id"
							class="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 font-mono text-xs text-white focus:border-purple-500 focus:outline-none"
						/>
						<p class="mt-1 text-[11px] text-gray-500">
							Upload to Mux first, paste the asset ID here. Direct-upload UI is a follow-up.
						</p>
					</label>

					<label class="flex cursor-pointer items-center gap-2 text-sm text-gray-200">
						<input
							type="checkbox"
							bind:checked={isPreview}
							class="h-4 w-4 border-gray-600 bg-gray-800"
						/>
						Free preview lesson (non-purchasers can watch)
					</label>
				</div>

				<div class="rounded-xl border border-red-500/30 bg-red-500/5 p-4">
					<h3 class="mb-2 text-sm font-semibold text-red-400">Danger zone</h3>
					<button
						on:click={deleteLesson}
						class="w-full rounded-lg bg-red-500/20 px-3 py-2 text-sm font-semibold text-red-400 hover:bg-red-500/30"
						>Delete lesson</button
					>
				</div>
			</aside>
		</div>
	</div>
{/if}
