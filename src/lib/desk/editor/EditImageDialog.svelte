<!--
  Edit an inline image: its alt text and credit, or swap it for another image
  from the library. Alt text and credit belong to the library image, so a
  change here updates every place that image is used (and the dialog says
  so). The image's display size is set on the card itself and kept here.
-->
<script>
	import DialogShell from './DialogShell.svelte';
	import * as ui from './dialogStyles.js';
	import MediaPicker from '$lib/desk/media/MediaPicker.svelte';
	import { getMedia, updateMedia } from '$lib/desk/media/api.js';

	/** @type {{ open?: boolean, initial?: any, onsubmit: (data: any) => void, onclose?: () => void }} */
	let { open = $bindable(false), initial = null, onsubmit, onclose } = $props();

	let image = $state(/** @type {any} */ (null));
	let alt = $state('');
	let credit = $state('');
	let creditUrl = $state('');
	let library = $state(/** @type {any} */ (null)); // the library item, when we can manage it
	let locked = $state(false); // someone else's image: credit can't be changed here
	let saving = $state(false);
	let errorMsg = $state('');
	let pickerOpen = $state(false);

	let wasOpen = false;
	$effect.pre(() => {
		if (open && !wasOpen) {
			image = initial ? { ...initial } : null;
			alt = initial?.alt || '';
			credit = '';
			creditUrl = '';
			library = null;
			locked = false;
			errorMsg = '';
			if (initial?.mediaId) loadLibrary(initial.mediaId);
		}
		wasOpen = open;
	});

	async function loadLibrary(id) {
		try {
			const { media } = await getMedia(id);
			library = media;
			alt = alt || media.alt || '';
			credit = media.credit || '';
			creditUrl = media.creditUrl || '';
		} catch (err) {
			if (err?.status === 403) locked = true;
		}
	}

	function close() {
		open = false;
		onclose?.();
	}

	function swap(item) {
		image = {
			...image,
			url: item.image?.src || item.url,
			width: item.image?.width || item.width || null,
			height: item.image?.height || item.height || null,
			mediaId: item.id
		};
		library = item;
		locked = false;
		alt = item.alt || '';
		credit = item.credit || '';
		creditUrl = item.creditUrl || '';
	}

	async function submit() {
		errorMsg = '';
		if (library) {
			const patch = {};
			if (alt.trim() !== (library.alt || '')) patch.alt = alt;
			if (credit.trim() !== (library.credit || '')) patch.credit = credit;
			if (creditUrl.trim() !== (library.creditUrl || '')) patch.creditUrl = creditUrl;
			if (Object.keys(patch).length) {
				saving = true;
				try {
					await updateMedia(library.id, patch);
				} catch (err) {
					errorMsg = err?.message || 'Could not save.';
					return;
				} finally {
					saving = false;
				}
			}
		}
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
		onclick={() => (pickerOpen = true)}
		class="mt-2 min-h-[40px] w-full border-[1.5px] border-ink px-3 text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors hover:bg-ink hover:text-paper-bg"
		>Swap image</button
	>

	<label class="mt-5 block">
		<span class={ui.label}>Alt text</span>
		<input type="text" bind:value={alt} placeholder="What the image shows" class={ui.input} />
		<span class={ui.hint}>Read aloud by screen readers, and shown if the image can’t load.</span>
	</label>

	{#if locked}
		<p class="{ui.hint} mt-5">
			This image belongs to someone else, so its credit can only be changed by them or an editor.
		</p>
	{:else if image?.mediaId}
		<label class="mt-5 block">
			<span class={ui.label}>Credit<span class={ui.optional}>optional</span></span>
			<input
				type="text"
				bind:value={credit}
				placeholder="Art by … / Courtesy of …"
				maxlength="200"
				class={ui.input}
			/>
		</label>
		<label class="mt-4 block">
			<span class={ui.label}>Credit link<span class={ui.optional}>optional</span></span>
			<input
				type="url"
				inputmode="url"
				bind:value={creditUrl}
				placeholder="https://"
				class={ui.input}
			/>
			<span class={ui.hint}
				>Shown under the image. Alt text and credit update everywhere this image is used.</span
			>
		</label>
	{/if}
	{#if errorMsg}<p class={ui.error}>{errorMsg}</p>{/if}

	{#snippet footer()}
		<button type="button" onclick={close} class={ui.secondary}>Cancel</button>
		<button type="button" onclick={submit} disabled={saving || !image?.url} class={ui.primary}
			>{saving ? 'Saving…' : 'Save changes'}</button
		>
	{/snippet}
</DialogShell>

<MediaPicker bind:open={pickerOpen} title="Swap image" onpick={swap} />
