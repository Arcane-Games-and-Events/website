<!--
  CoverImagePicker — sidebar picker for a cover or thumbnail image on an
  entry, lesson, or course. Uploads through /api/cms/upload (same endpoint
  the Lexical editor uses for inline images), fires a `change` event with
  the new media row so the parent can PATCH the target column.

  Props:
    value   — the currently selected media row (or null). Renders as a preview.
    label   — heading label (e.g. "Cover image", "Thumbnail image").
    accept  — file input accept attribute (default 'image/*').

  Events:
    change — detail is the new media row (or null on remove).
-->
<script>
	import { createEventDispatcher } from 'svelte';

	export let value = null;
	export let label = 'Image';
	export let accept = 'image/*';

	const dispatch = createEventDispatcher();

	let inputEl;
	let uploading = false;
	let errorMsg = '';

	function pick() {
		inputEl?.click();
	}

	function remove() {
		dispatch('change', null);
	}

	async function handleFile(e) {
		errorMsg = '';
		const file = e.target?.files?.[0];
		if (!file) return;
		if (!file.type.startsWith('image/')) {
			errorMsg = 'Only image files.';
			return;
		}
		uploading = true;
		try {
			const fd = new FormData();
			fd.append('file', file);
			const res = await fetch('/api/cms/upload', { method: 'POST', body: fd });
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				errorMsg = body?.message || `Upload failed (${res.status})`;
				return;
			}
			const { media } = await res.json();
			dispatch('change', media);
		} catch (err) {
			errorMsg = err?.message || 'Network error';
		} finally {
			uploading = false;
			if (inputEl) inputEl.value = '';
		}
	}
</script>

<div>
	<div class="mb-2 flex items-center justify-between gap-2">
		<span class="text-[11px] font-medium text-ink/60 uppercase tracking-wider font-mono-system">
			{label}
		</span>
		{#if value}
			<button
				type="button"
				on:click={remove}
				class="text-[11px] text-ink/50 hover:text-red-700 font-mono-system"
			>
				Remove
			</button>
		{/if}
	</div>

	{#if value?.url}
		<div class="mb-2 overflow-hidden rounded-md border border-line2 bg-paper-bg">
			<img
				src={value.url}
				alt={value.alt || ''}
				class="block h-auto w-full max-h-40 object-cover"
				loading="lazy"
			/>
		</div>
	{:else}
		<div class="mb-2 flex h-24 items-center justify-center rounded-md border border-dashed border-line2 bg-paper-bg text-xs text-ink/40">
			No image
		</div>
	{/if}

	<input
		bind:this={inputEl}
		type="file"
		{accept}
		on:change={handleFile}
		class="hidden"
	/>

	<button
		type="button"
		on:click={pick}
		disabled={uploading}
		class="w-full rounded-md border border-line2 bg-paper px-3 py-2 text-xs font-medium text-ink hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-60"
	>
		{uploading ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}
	</button>

	{#if errorMsg}
		<p class="mt-2 text-xs text-red-700">{errorMsg}</p>
	{/if}
</div>
