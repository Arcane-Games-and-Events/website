<!--
  Edit an inline image: its alt text, or swap the file. The old file is
  left in storage — a published version of the entry may still show it.
-->
<script>
	import DialogShell from './DialogShell.svelte';
	import * as ui from './dialogStyles.js';

	/** @type {{ open?: boolean, initial?: any, onsubmit: (data: any) => void, onclose?: () => void }} */
	let { open = $bindable(false), initial = null, onsubmit, onclose } = $props();

	let image = $state(null);
	let alt = $state('');
	let uploading = $state(false);
	let errorMsg = $state('');
	let fileEl = $state();

	let wasOpen = false;
	$effect.pre(() => {
		if (open && !wasOpen) {
			image = initial ? { ...initial } : null;
			alt = initial?.alt || '';
			errorMsg = '';
		}
		wasOpen = open;
	});

	function close() {
		open = false;
		onclose?.();
	}

	async function onFile(e) {
		const file = e.currentTarget.files?.[0];
		e.currentTarget.value = '';
		if (!file) return;
		if (!file.type.startsWith('image/')) {
			errorMsg = 'Choose an image file.';
			return;
		}
		errorMsg = '';
		uploading = true;
		try {
			const fd = new FormData();
			fd.append('file', file);
			const res = await fetch('/api/desk/upload', { method: 'POST', body: fd });
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				errorMsg = body?.message || `Upload failed (${res.status}).`;
				return;
			}
			const { media } = await res.json();
			image = {
				url: media.url,
				width: media.width || null,
				height: media.height || null,
				mediaId: media.id
			};
		} catch (err) {
			errorMsg = err?.message || 'Network error.';
		} finally {
			uploading = false;
		}
	}

	function submit() {
		onsubmit({ ...image, alt: alt.trim() });
		close();
	}
</script>

<DialogShell {open} kicker="Edit" title="Image" onclose={close}>
	{#if image?.url}
		<div class="flex justify-center border border-line2 bg-line/50 p-2">
			<img src={image.url} alt="" class="block max-h-[240px] w-auto max-w-full" />
		</div>
	{/if}
	<button
		type="button"
		onclick={() => fileEl?.click()}
		disabled={uploading}
		class="mt-2 min-h-[40px] w-full border-[1.5px] border-ink px-3 text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors hover:bg-ink hover:text-paper-bg disabled:cursor-wait disabled:opacity-60"
		>{uploading ? 'Uploading…' : 'Replace image'}</button
	>
	<input bind:this={fileEl} type="file" accept="image/*" class="hidden" onchange={onFile} />

	<label class="mt-5 block">
		<span class={ui.label}>Alt text</span>
		<input type="text" bind:value={alt} placeholder="What the image shows" class={ui.input} />
		<span class={ui.hint}>Read aloud by screen readers, and shown if the image can’t load.</span>
	</label>
	{#if errorMsg}<p class={ui.error}>{errorMsg}</p>{/if}

	{#snippet footer()}
		<button type="button" onclick={close} class={ui.secondary}>Cancel</button>
		<button type="button" onclick={submit} disabled={uploading || !image?.url} class={ui.primary}
			>Save changes</button
		>
	{/snippet}
</DialogShell>
