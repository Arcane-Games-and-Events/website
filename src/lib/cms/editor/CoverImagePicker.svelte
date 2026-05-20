<!--
  CoverImagePicker — drop-in widget for the article sidebar.

  Props:
    value         — { id, url, alt? } | null  (the current cover_image media row)

  Events:
    change        — fires with new media object (or null on remove)

  Uploads via POST /api/cms/upload and returns the cms_media row.
-->
<script>
	import { createEventDispatcher } from 'svelte';

	export let value = null;

	const dispatch = createEventDispatcher();

	let uploading = false;
	let error = '';
	let fileInput;

	async function handleFile(file) {
		if (!file) return;
		if (!file.type.startsWith('image/')) {
			error = 'Please choose an image file.';
			return;
		}
		uploading = true;
		error = '';
		try {
			const fd = new FormData();
			fd.append('file', file);
			const res = await fetch('/api/cms/upload', { method: 'POST', body: fd });
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				error = body?.message || `Upload failed (${res.status})`;
				return;
			}
			const { media } = await res.json();
			value = media;
			dispatch('change', media);
		} catch (e) {
			error = e?.message || 'Network error';
		} finally {
			uploading = false;
			if (fileInput) fileInput.value = '';
		}
	}

	function onPick() {
		fileInput?.click();
	}

	function onChange(e) {
		const f = e.target?.files?.[0];
		handleFile(f);
	}

	function onDrop(e) {
		e.preventDefault();
		const f = e.dataTransfer?.files?.[0];
		if (f) handleFile(f);
	}

	function remove() {
		value = null;
		dispatch('change', null);
	}
</script>

<div>
	<input
		bind:this={fileInput}
		type="file"
		accept="image/*"
		on:change={onChange}
		class="hidden"
	/>

	{#if value?.url}
		<div class="overflow-hidden rounded-lg border border-gray-700">
			<img src={value.url} alt={value.alt || ''} class="w-full" />
		</div>
		<div class="mt-2 flex items-center gap-2">
			<button
				type="button"
				on:click={onPick}
				disabled={uploading}
				class="text-xs font-medium text-blue-400 hover:text-blue-300 disabled:opacity-50"
			>
				Replace
			</button>
			<button
				type="button"
				on:click={remove}
				class="text-xs font-medium text-red-400 hover:text-red-300"
			>
				Remove
			</button>
		</div>
	{:else}
		<button
			type="button"
			on:click={onPick}
			on:dragover|preventDefault
			on:drop={onDrop}
			disabled={uploading}
			class="block w-full rounded-lg border border-dashed border-gray-700 bg-gray-900/60 p-6 text-center text-xs text-gray-400 transition-colors hover:border-blue-500/50 hover:text-blue-300 disabled:opacity-50"
		>
			{#if uploading}
				Uploading…
			{:else}
				<div class="font-medium">Click to upload cover image</div>
				<div class="mt-1 text-[11px] text-gray-500">or drop a file here</div>
			{/if}
		</button>
	{/if}

	{#if error}
		<p class="mt-2 text-xs text-red-400">{error}</p>
	{/if}
</div>
