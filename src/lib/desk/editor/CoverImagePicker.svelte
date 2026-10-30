<!--
  CoverImagePicker — sidebar picker for a cover or thumbnail image on an
  entry, lesson, or course. Tapping the tile opens the image library, where
  the writer picks one of their images or uploads a new one (with alt text
  and a credit). Fires a `change` event with the chosen library item so the
  parent can PATCH the target column.

  Props:
    value   — the currently selected image (library item or media row), or null.
    label   — heading label (e.g. "Cover", "Thumbnail").

  Events:
    change — detail is the chosen library item (or null on remove).
-->
<script>
	import { createEventDispatcher } from 'svelte';
	import MediaPicker from '$lib/desk/media/MediaPicker.svelte';
	import Picture from '$lib/components/media/Picture.svelte';

	export let value = null;
	export let label = 'Image';

	const dispatch = createEventDispatcher();
	let open = false;

	$: preview = value?.image || (value?.url ? { src: value.url, alt: value.alt || '' } : null);
</script>

<!-- A 16:9 tile: tap it to choose or replace from the library. -->
<div>
	<div class="mb-1.5 flex items-baseline justify-between gap-2">
		<span class="text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase">{label}</span>
		{#if value}
			<button
				type="button"
				on:click={() => dispatch('change', null)}
				class="text-[9.5px] font-extrabold tracking-[0.12em] text-fade uppercase transition-colors hover:text-hero-rb"
				>Remove</button
			>
		{/if}
	</div>

	<button
		type="button"
		on:click={() => (open = true)}
		aria-label="{value ? 'Replace' : 'Choose'} {label.toLowerCase()}"
		class="group relative block aspect-video w-full overflow-hidden border transition-colors {preview
			? 'border-line2 bg-line'
			: 'border-dashed border-line2 bg-paper hover:border-ink'}"
	>
		{#if preview}
			<Picture
				image={preview}
				alt={value.alt || ''}
				sizes="320px"
				class="absolute inset-0 h-full w-full object-cover"
			/>
			<span
				class="absolute right-0 bottom-0 bg-ink/85 px-2 py-1 text-[9px] font-extrabold tracking-[0.14em] text-paper-bg uppercase transition-colors group-hover:bg-ink"
				>Replace</span
			>
		{:else}
			<span
				class="absolute inset-0 flex flex-col items-center justify-center gap-1 text-fade transition-colors group-hover:text-ink"
			>
				<span class="text-[20px] leading-none font-light" aria-hidden="true">+</span>
				<span class="text-[9.5px] font-extrabold tracking-[0.14em] uppercase">Choose image</span>
			</span>
		{/if}
	</button>
</div>

<MediaPicker
	bind:open
	title="Choose a {label.toLowerCase()} image"
	onpick={(item) => dispatch('change', item)}
/>
