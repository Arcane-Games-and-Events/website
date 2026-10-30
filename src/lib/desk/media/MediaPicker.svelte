<!--
  MediaPicker — choose an image from the library, or upload a new one, for a
  cover, thumbnail, inline image or author photo.

  Writers see their own uploads; admins and editors see everyone's and can
  narrow to their own. Selecting an image (or finishing an upload) opens its
  details beside the grid, so alt text and a credit can be set before it's
  used. Drag files anywhere onto the dialog to upload them.

  Props:
    open   — bindable
    title  — dialog title, e.g. "Choose a cover image"
    onpick — called with the chosen library item
-->
<script>
	import DialogShell from '$lib/desk/editor/DialogShell.svelte';
	import * as ui from '$lib/desk/editor/dialogStyles.js';
	import MediaGrid from './MediaGrid.svelte';
	import MediaDetails from './MediaDetails.svelte';
	import { createLibrary, imageFiles } from './library.svelte.js';

	/** @type {{ open?: boolean, title?: string, onpick: (item: any) => void }} */
	let { open = $bindable(false), title = 'Choose an image', onpick } = $props();

	const { lib, load, more, upload, prepend, replace, remove } = createLibrary();
	let selected = $state(/** @type {any} */ (null));
	let fileEl = $state();
	let dragging = $state(false);
	let searchTimer;

	let wasOpen = false;
	$effect.pre(() => {
		if (open && !wasOpen) {
			selected = null;
			lib.q = '';
			load();
		}
		wasOpen = open;
	});

	function onSearch() {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(load, 250);
	}

	async function add(files) {
		const list = imageFiles(files);
		if (!list.length) return;
		const done = await upload(list);
		if (done.length) selected = done[0];
	}

	function onDrop(e) {
		e.preventDefault();
		dragging = false;
		add(e.dataTransfer?.files);
	}

	function choose() {
		if (!selected) return;
		onpick(selected);
		open = false;
	}
	function close() {
		open = false;
	}
</script>

<DialogShell {open} kicker="Image library" {title} xl onclose={close}>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="relative"
		ondragover={(e) => {
			e.preventDefault();
			dragging = true;
		}}
		ondragleave={(e) => {
			if (!e.currentTarget.contains(/** @type {Node} */ (e.relatedTarget))) dragging = false;
		}}
		ondrop={onDrop}
	>
		<div class="flex flex-wrap items-center gap-2">
			<input
				type="search"
				bind:value={lib.q}
				oninput={onSearch}
				placeholder="Search by name, alt text or credit"
				class="h-[42px] min-w-0 flex-1 basis-[220px] border border-line2 bg-white px-3 text-[14px] text-ink placeholder:text-fade/70 focus:border-ink focus:ring-0 focus:outline-none"
			/>
			{#if lib.all}
				<span class="inline-flex gap-px border border-line2 bg-line2">
					{#each [['all', 'Everyone'], ['mine', 'Mine']] as [key, label] (key)}
						<button
							type="button"
							aria-pressed={lib.scope === key}
							onclick={() => {
								lib.scope = /** @type {any} */ (key);
								load();
							}}
							class="h-[42px] px-3 text-[10px] font-extrabold tracking-[0.12em] uppercase {lib.scope ===
							key
								? 'bg-ink text-paper-bg'
								: 'bg-paper-bg text-soft hover:text-ink'}">{label}</button
						>
					{/each}
				</span>
			{/if}
			<button
				type="button"
				onclick={() => fileEl?.click()}
				class="h-[42px] border-[1.5px] border-ink px-4 text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors hover:bg-ink hover:text-paper-bg"
				>Upload</button
			>
			<input
				bind:this={fileEl}
				type="file"
				accept="image/*,.heic,.heif"
				multiple
				class="hidden"
				onchange={(e) => {
					add(e.currentTarget.files);
					e.currentTarget.value = '';
				}}
			/>
		</div>

		<div class="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
			<div class="max-h-[58vh] min-h-[240px] overflow-y-auto pr-1">
				{#if lib.error}<p class={ui.error}>{lib.error}</p>{/if}
				{#if lib.loaded && !lib.items.length && !lib.uploads.length}
					<div class="border border-dashed border-line2 px-6 py-12 text-center">
						<p class="font-newsreader text-[18px] font-semibold">
							{lib.q ? 'No images match that search.' : 'No images yet.'}
						</p>
						<p class="mt-1 text-[13px] text-fade">Upload one, or drag files here.</p>
					</div>
				{:else}
					<MediaGrid
						items={lib.items}
						uploads={lib.uploads}
						selectedId={selected?.id}
						showUploader={lib.all}
						onselect={(item) => (selected = item)}
					/>
					{#if lib.nextOffset != null}
						<div class="mt-4 text-center">
							<button
								type="button"
								onclick={more}
								disabled={lib.loading}
								class="h-10 border border-line2 px-5 text-[10px] font-extrabold tracking-[0.12em] uppercase hover:border-ink"
								>{lib.loading ? 'Loading…' : 'Show more'}</button
							>
						</div>
					{/if}
				{/if}
			</div>

			<aside class="border-line2 lg:border-l lg:pl-5">
				{#if selected}
					<MediaDetails
						item={selected}
						compact
						onchange={(m) => {
							replace(m);
							selected = { ...selected, ...m };
						}}
						oncopied={(m) => {
							prepend(m);
							selected = m;
						}}
						ondeleted={(id) => {
							remove(id);
							selected = null;
						}}
					/>
				{:else}
					<p class="py-6 text-[13px] leading-snug text-fade">
						Choose an image to see its details, or upload a new one. You can add alt text and a
						credit before using it.
					</p>
				{/if}
			</aside>
		</div>

		{#if dragging}
			<div
				class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center border-[3px] border-dashed border-ink bg-paper-bg/90"
			>
				<p class="font-newsreader text-[22px] font-semibold">Drop to upload</p>
			</div>
		{/if}
	</div>

	{#snippet footer()}
		<button type="button" onclick={close} class={ui.secondary}>Cancel</button>
		<button type="button" onclick={choose} disabled={!selected} class={ui.primary}
			>Use this image</button
		>
	{/snippet}
</DialogShell>
