<!--
  MediaPicker — choose an image from the library, or upload a new one, for a
  cover, thumbnail, inline image or author photo.

  Writers see their own uploads; admins and editors see everyone's and can
  narrow to their own. Inside a Classroom course (or a Desk entry) the
  picker shows that course's (or entry's) images, with the older uploads
  not filed under one a tap away; uploads are filed under it. Selecting an image (or finishing an upload) opens its
  details beside the grid, so alt text and a credit can be set before it's
  used. Drag files anywhere onto the dialog to upload them.

  "Hero art" switches the grid to the heroes' stills (the hero art);
  choosing one puts a copy into this library, course or entry, with the
  hero's name as alt text and the credit filled in, and uses it.

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
	import { currentCourse, currentEntry, importHero } from './api.js';
	import { HERO_NAMES } from '$lib/data/heroArt.js';
	import { heroImageUrl } from '$lib/heroImage.js';

	/** @type {{ open?: boolean, title?: string, onpick: (item: any) => void }} */
	let { open = $bindable(false), title = 'Choose an image', onpick } = $props();

	const { lib, load, more, upload, prepend, replace, remove } = createLibrary();
	let selected = $state(/** @type {any} */ (null));
	let fileEl = $state();
	let dragging = $state(false);
	let searchTimer;
	// Inside a course or an entry: its name for the toggle, else ''.
	let place = $state('');

	// The hero art: every hero with art, filtered by the search.
	let source = $state(/** @type {'library' | 'heroes'} */ ('library'));
	let hero = $state(/** @type {string | null} */ (null));
	let importing = $state(false);
	let heroError = $state('');
	const HEROES = Object.entries(HERO_NAMES)
		.map(([slug, name]) => ({ slug, name, src: heroImageUrl(name) }))
		.sort((a, b) => a.name.localeCompare(b.name));
	const heroes = $derived.by(() => {
		const q = lib.q.trim().toLowerCase();
		return q ? HEROES.filter((h) => h.name.toLowerCase().includes(q)) : HEROES;
	});
	const pickedHero = $derived(HEROES.find((h) => h.slug === hero) || null);

	let wasOpen = false;
	$effect.pre(() => {
		if (open && !wasOpen) {
			selected = null;
			source = 'library';
			hero = null;
			heroError = '';
			lib.q = '';
			lib.older = false;
			place = currentCourse() ? 'course' : currentEntry() ? 'entry' : '';
			load();
		}
		wasOpen = open;
	});

	function onSearch() {
		if (source === 'heroes') return;
		clearTimeout(searchTimer);
		searchTimer = setTimeout(load, 250);
	}

	async function add(files) {
		const list = imageFiles(files);
		if (!list.length) return;
		// uploads are filed under the course or entry, so show its images
		if (lib.older) {
			lib.older = false;
			load();
		}
		const done = await upload(list);
		if (done.length) selected = done[0];
	}

	function onDrop(e) {
		e.preventDefault();
		dragging = false;
		add(e.dataTransfer?.files);
	}

	async function choose() {
		if (source === 'heroes') {
			if (!hero) return;
			importing = true;
			heroError = '';
			try {
				const { media } = await importHero(hero);
				prepend(media);
				onpick(media);
				open = false;
			} catch (e) {
				heroError = /** @type {any} */ (e)?.message || 'Couldn’t add that hero’s art.';
			} finally {
				importing = false;
			}
			return;
		}
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
		<div
			class="mb-3 flex gap-px border border-line2 bg-line2"
			role="tablist"
			aria-label="Where from"
		>
			{#each [['library', 'Your images'], ['heroes', 'Hero art']] as [key, label] (key)}
				<button
					type="button"
					role="tab"
					aria-selected={source === key}
					onclick={() => {
						source = /** @type {any} */ (key);
						heroError = '';
						if (key === 'library' && lib.q) load();
					}}
					class="h-[40px] flex-1 text-[10.5px] font-extrabold tracking-[0.14em] uppercase transition-colors {source ===
					key
						? 'bg-ink text-paper-bg'
						: 'bg-paper-bg text-soft hover:text-ink'}">{label}</button
				>
			{/each}
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<input
				type="search"
				bind:value={lib.q}
				oninput={onSearch}
				placeholder={source === 'heroes' ? 'Search heroes' : 'Search by name, alt text or credit'}
				class="h-[42px] min-w-0 flex-1 basis-[220px] border border-line2 bg-white px-3 text-[14px] text-ink placeholder:text-fade/70 focus:border-ink focus:ring-0 focus:outline-none"
			/>
			{#if source === 'heroes'}
				<span class="text-[12px] text-fade"
					>{heroes.length}
					{heroes.length === 1 ? 'hero' : 'heroes'} · art © Legend Story Studios</span
				>
			{:else if place}
				<span class="inline-flex gap-px border border-line2 bg-line2">
					{#each [[false, `This ${place}`], [true, 'Older uploads']] as [key, label] (label)}
						<button
							type="button"
							aria-pressed={lib.older === key}
							onclick={() => {
								lib.older = key;
								load();
							}}
							class="h-[42px] px-3 text-[10px] font-extrabold tracking-[0.12em] uppercase {lib.older ===
							key
								? 'bg-ink text-paper-bg'
								: 'bg-paper-bg text-soft hover:text-ink'}">{label}</button
						>
					{/each}
				</span>
			{:else if lib.all}
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
				hidden={source === 'heroes'}
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
				{#if source === 'heroes'}
					{#if heroes.length}
						<ul class="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
							{#each heroes as h (h.slug)}
								<li>
									<button
										type="button"
										onclick={() => (hero = h.slug)}
										aria-pressed={hero === h.slug}
										class="group block w-full border-2 text-left transition-colors {hero === h.slug
											? 'border-ink'
											: 'border-transparent hover:border-line2'}"
									>
										<span class="block aspect-video overflow-hidden bg-ink">
											<img
												src={h.src}
												alt=""
												loading="lazy"
												class="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
											/>
										</span>
										<span class="block truncate px-1.5 py-1 text-[12px] font-semibold"
											>{h.name}</span
										>
									</button>
								</li>
							{/each}
						</ul>
					{:else}
						<p
							class="border border-dashed border-line2 px-6 py-12 text-center text-[14px] text-soft"
						>
							No hero matches that search.
						</p>
					{/if}
				{:else}
					{#if lib.error}<p class={ui.error}>{lib.error}</p>{/if}
					{#if lib.loaded && !lib.items.length && !lib.uploads.length}
						<div class="border border-dashed border-line2 px-6 py-12 text-center">
							<p class="font-newsreader text-[18px] font-semibold">
								{lib.q
									? 'No images match that search.'
									: lib.older
										? 'No older uploads.'
										: place
											? `No images in this ${place} yet.`
											: 'No images yet.'}
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
				{/if}
			</div>

			<aside class="border-line2 lg:border-l lg:pl-5">
				{#if source === 'heroes'}
					{#if pickedHero}
						<img src={pickedHero.src} alt="" class="block aspect-video w-full object-cover" />
						<p class="mt-3 font-newsreader text-[18px] font-semibold">{pickedHero.name}</p>
						<p class="mt-1 text-[12.5px] leading-snug text-soft">
							A copy goes into your images{place ? ` for this ${place}` : ''}, with “{pickedHero.name}”
							as its alt text and the credit “Art © Legend Story Studios”. You can change both
							after.
						</p>
					{:else}
						<p class="py-6 text-[13px] leading-snug text-fade">
							Choose a hero to use their art. It’s added to your images, ready to use.
						</p>
					{/if}
					{#if heroError}<p class={ui.error}>{heroError}</p>{/if}
				{:else if selected}
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
		<button
			type="button"
			onclick={choose}
			disabled={source === 'heroes' ? !hero || importing : !selected}
			class={ui.primary}>{importing ? 'Adding…' : 'Use this image'}</button
		>
	{/snippet}
</DialogShell>
