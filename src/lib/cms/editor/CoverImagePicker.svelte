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

<!-- A 16:9 tile: tap it to upload or replace. -->
<div>
	<div class="mb-1.5 flex items-baseline justify-between gap-2">
		<span class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase">{label}</span>
		{#if value}
			<button
				type="button"
				on:click={remove}
				class="text-[9.5px] font-extrabold tracking-[0.12em] text-fade uppercase transition-colors hover:text-hero-rb"
				>Remove</button
			>
		{/if}
	</div>

	<button
		type="button"
		on:click={pick}
		disabled={uploading}
		aria-label="{value ? 'Replace' : 'Upload'} {label.toLowerCase()}"
		class="group relative block aspect-video w-full overflow-hidden border transition-colors disabled:cursor-wait {value?.url
			? 'border-line2 bg-line'
			: 'border-dashed border-line2 bg-paper hover:border-ink'}"
	>
		{#if value?.url}
			<img
				src={value.url}
				alt={value.alt || ''}
				class="absolute inset-0 h-full w-full object-cover"
				loading="lazy"
			/>
			<span
				class="absolute right-0 bottom-0 bg-ink/85 px-2 py-1 text-[9px] font-extrabold tracking-[0.14em] text-paper-bg uppercase transition-colors group-hover:bg-ink"
				>{uploading ? 'Uploading…' : 'Replace'}</span
			>
		{:else}
			<span
				class="absolute inset-0 flex flex-col items-center justify-center gap-1 text-fade transition-colors group-hover:text-ink"
			>
				<span class="text-[20px] leading-none font-light" aria-hidden="true">+</span>
				<span class="text-[9.5px] font-extrabold tracking-[0.14em] uppercase"
					>{uploading ? 'Uploading…' : 'Upload'}</span
				>
			</span>
		{/if}
	</button>

	<input bind:this={inputEl} type="file" {accept} on:change={handleFile} class="hidden" />

	{#if errorMsg}
		<p class="mt-1.5 text-[11.5px] text-hero-rb">{errorMsg}</p>
	{/if}
</div>
