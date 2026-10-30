<script>
	/**
	 * Desk → Images. The image library: search, sort and browse uploads,
	 * upload more (button or drag and drop anywhere on the page), and open an
	 * image to edit its name, alt text and credit, crop or rotate it into a
	 * new copy, see where it's used, or delete it.
	 *
	 * Writers see their own images. Admins and editors see everyone's and
	 * can narrow to their own or to one uploader.
	 */
	import { onMount } from 'svelte';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import MediaGrid from '$lib/desk/media/MediaGrid.svelte';
	import MediaDetails from '$lib/desk/media/MediaDetails.svelte';
	import { createLibrary, imageFiles } from '$lib/desk/media/library.svelte.js';

	/** @type {{ data: any }} */
	let { data } = $props();

	const { lib, load, more, upload, prepend, replace, remove } = createLibrary();
	let selected = $state(/** @type {any} */ (null));
	let fileEl = $state();
	let dragging = $state(false);
	let searchTimer;

	onMount(load);

	function onSearch() {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(load, 250);
	}

	async function add(files) {
		const list = imageFiles(files);
		if (!list.length) return;
		const done = await upload(list);
		if (done.length === 1) selected = done[0];
	}

	// Drag and drop anywhere on the page.
	let depth = 0;
	function onDragEnter(e) {
		if (!e.dataTransfer?.types?.includes('Files')) return;
		depth++;
		dragging = true;
	}
	function onDragLeave() {
		depth = Math.max(0, depth - 1);
		if (!depth) dragging = false;
	}
	function onDrop(e) {
		e.preventDefault();
		depth = 0;
		dragging = false;
		add(e.dataTransfer?.files);
	}

	const SORTS = [
		['new', 'Newest'],
		['old', 'Oldest'],
		['name', 'Name']
	];
	const control =
		'h-[42px] border border-line2 bg-white px-3 text-[13.5px] text-ink focus:border-ink focus:ring-0 focus:outline-none';
</script>

<svelte:head><title>Images — Desk</title></svelte:head>

<svelte:window
	ondragenter={onDragEnter}
	ondragleave={onDragLeave}
	ondragover={(e) => e.preventDefault()}
	ondrop={onDrop}
/>

<DeskHeader
	kicker="Image library"
	title="Images"
	subtitle={data.canSeeAll
		? 'Every image uploaded to the Desk. Reuse, edit, credit or remove them.'
		: 'Everything you’ve uploaded. Reuse, edit, credit or remove your images.'}
>
	{#snippet actions(compact)}
		<button
			type="button"
			onclick={() => fileEl?.click()}
			class="{compact
				? 'h-8 px-3 text-[9.5px]'
				: 'h-10 px-5 text-[10.5px]'} bg-gold font-extrabold tracking-[0.14em] text-ink uppercase transition-colors hover:bg-paper-bg"
			>Upload</button
		>
	{/snippet}
</DeskHeader>
<DeskTabs />

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

<div class="mx-auto w-full max-w-[1200px] px-5 py-8 font-libre md:px-8 md:py-10">
	<!-- toolbar -->
	<div class="flex flex-wrap items-center gap-2">
		<input
			type="search"
			bind:value={lib.q}
			oninput={onSearch}
			placeholder="Search by name, alt text or credit"
			class="{control} min-w-0 flex-1 basis-[240px]"
			aria-label="Search images"
		/>
		<select bind:value={lib.sort} onchange={load} class="{control} pr-8" aria-label="Sort images">
			{#each SORTS as [key, label] (key)}<option value={key}>{label}</option>{/each}
		</select>
		{#if data.canSeeAll}
			<select
				value={lib.scope === 'mine' ? '__mine' : lib.uploader}
				onchange={(e) => {
					const v = e.currentTarget.value;
					lib.scope = v === '__mine' ? 'mine' : 'all';
					lib.uploader = v === '__mine' ? '' : v;
					load();
				}}
				class="{control} max-w-[220px] pr-8"
				aria-label="Whose images"
			>
				<option value="">Everyone’s images</option>
				<option value="__mine">My images</option>
				{#each data.uploaders as u (u.id)}
					<option value={u.id}>{u.name} ({u.count})</option>
				{/each}
			</select>
		{/if}
	</div>
	<p class="mt-2 text-[12px] text-fade">
		Drop images anywhere on this page to upload them. Big photos are scaled down and every image is
		converted to fast-loading formats automatically.
	</p>

	<div class="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
		<div class="min-w-0">
			{#if lib.error}
				<p
					class="border-l-[3px] border-hero-rb bg-hero-rb/[0.06] px-3 py-2 text-[13px] text-hero-rb"
				>
					{lib.error}
				</p>
			{/if}
			{#if !lib.loaded && lib.loading}
				<p class="py-10 text-[13px] text-fade">Loading images…</p>
			{:else if lib.loaded && !lib.items.length && !lib.uploads.length}
				<div class="border border-dashed border-line2 px-6 py-16 text-center">
					<p class="font-newsreader text-[22px] font-semibold">
						{lib.q ? 'No images match that search.' : 'No images yet.'}
					</p>
					<p class="mt-1 text-[13.5px] text-fade">
						Upload one with the button above, or drag files onto the page.
					</p>
				</div>
			{:else}
				<MediaGrid
					items={lib.items}
					uploads={lib.uploads}
					selectedId={selected?.id}
					showUploader={lib.all}
					onselect={(item) => (selected = selected?.id === item.id ? null : item)}
				/>
				{#if lib.nextOffset != null}
					<div class="mt-6 text-center">
						<button
							type="button"
							onclick={more}
							disabled={lib.loading}
							class="h-10 border border-line2 px-6 text-[10px] font-extrabold tracking-[0.12em] uppercase hover:border-ink disabled:opacity-60"
							>{lib.loading ? 'Loading…' : 'Show more'}</button
						>
					</div>
				{/if}
			{/if}
		</div>

		<!-- details: a side panel on wide screens, a sheet over the page on phones -->
		{#if selected}
			<aside
				class="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto border-t-[5px] border-ink bg-paper-bg px-5 pt-4 pb-8 shadow-[0_-18px_36px_-22px_rgba(20,16,8,0.5)] lg:sticky lg:top-[calc(var(--desk-header,0px)+60px)] lg:z-auto lg:max-h-[calc(100vh-var(--desk-header,0px)-80px)] lg:self-start lg:border lg:border-t-[5px] lg:border-line2 lg:border-t-ink lg:p-5 lg:shadow-none"
				aria-label="Image details"
			>
				<div class="mb-3 flex items-center justify-between gap-3">
					<p class="truncate text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase">
						Image details
					</p>
					<button
						type="button"
						onclick={() => (selected = null)}
						aria-label="Close details"
						class="-mr-2 flex h-9 w-9 items-center justify-center text-[20px] text-fade hover:text-ink"
						>×</button
					>
				</div>
				<MediaDetails
					item={selected}
					onchange={(m) => {
						replace(m);
						selected = { ...selected, ...m, uploaderName: selected.uploaderName };
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
			</aside>
		{:else}
			<aside class="hidden lg:block">
				<div class="border border-dashed border-line2 px-5 py-8 text-[13px] leading-snug text-fade">
					Choose an image to edit its name, alt text and credit, crop it, see where it’s used, or
					delete it.
				</div>
			</aside>
		{/if}
	</div>
</div>

{#if dragging}
	<div
		class="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center border-[4px] border-dashed border-ink bg-paper-bg/90"
	>
		<p class="font-newsreader text-[28px] font-semibold">Drop to upload</p>
	</div>
{/if}
