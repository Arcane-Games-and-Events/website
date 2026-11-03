<script>
	/**
	 * The Library → Matches: every bonus match from AGE Open, made to be
	 * searched. Search players, heroes and events; narrow by hero, event,
	 * format and stage (Swiss rounds or the top cut); sort; page through.
	 * The filters live in the address, so every view can be shared, and the
	 * server does the work, so it stays quick as the archive grows.
	 */
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import LibraryHeader from '$lib/components/age/library/LibraryHeader.svelte';
	import LibraryPager from '$lib/components/age/library/LibraryPager.svelte';
	import FilterSelect from '$lib/components/age/FilterSelect.svelte';
	import MediaCard from '$lib/components/age/studios/MediaCard.svelte';
	import { filterHref } from '$lib/components/age/library/filterHref.js';
	import { goto } from '$app/navigation';

	let { data } = $props();
	const f = $derived(data.filters);
	const a = $derived(data.archive);
	const PATH = '/library/matches';

	const go = (over) => goto(filterHref(PATH, f, over), { noScroll: true, keepFocus: true });

	// What's typed; reset to the address's search on every navigation.
	let q = $derived(f.q);
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let typing;
	function onSearch() {
		clearTimeout(typing);
		typing = setTimeout(() => go({ q: q.trim() }), 350);
	}

	const filtered = $derived(!!(f.q || f.event || f.hero || f.format || f.stage));
	const STAGES = [
		{ v: '', l: 'All rounds' },
		{ v: 'swiss', l: 'Swiss' },
		{ v: 'top', l: 'Top cut' }
	];
	const resultLine = $derived(
		a.total === 0
			? filtered
				? 'Nothing matches that.'
				: 'No matches yet.'
			: `${a.total} ${a.total === 1 ? 'match' : 'matches'}${filtered ? ` of ${a.totalAll}` : ''}${f.q ? ` for “${f.q}”` : ''}`
	);
</script>

<svelte:head>
	<title>Matches · Library · AGE</title>
	<meta
		name="description"
		content="Every bonus match from AGE Open: search by player, hero, event and format."
	/>
</svelte:head>

<AgeShell active="Library">
	<LibraryHeader
		current="matches"
		counts={data.drawers}
		title="Matches"
		lead="Bonus gameplay from AGE Open: find a hero, a player, an event or a top cut."
		search={false}
	/>

	<div class="bg-paper-bg text-ink">
		<section class="mx-auto w-full max-w-[1200px] px-5 pt-8 pb-20 md:px-8 md:pt-10">
			<!-- ============ search and filters ============ -->
			<label
				class="group flex max-w-[760px] items-center gap-3 border border-line2 bg-paper px-4 transition-colors focus-within:border-warm"
			>
				<svg
					class="h-4 w-4 shrink-0 text-fade group-focus-within:text-warm"
					viewBox="0 0 20 20"
					fill="none"
					stroke="currentColor"
					stroke-width="1.8"
					aria-hidden="true"
				>
					<circle cx="8.5" cy="8.5" r="5.5" />
					<path d="M13 13l4.5 4.5" stroke-linecap="square" />
				</svg>
				<span class="sr-only">Search matches</span>
				<input
					type="search"
					bind:value={q}
					oninput={onSearch}
					onkeydown={(e) => {
						if (e.key === 'Enter') {
							clearTimeout(typing);
							go({ q: q.trim() });
						}
					}}
					placeholder="Search players, heroes, events"
					autocomplete="off"
					class="w-full min-w-0 border-0 bg-transparent py-3 text-[15px] text-ink placeholder:text-fade focus:ring-0 focus:outline-none"
				/>
			</label>

			<div class="mt-6 flex flex-col gap-5 md:flex-row md:flex-wrap md:items-center md:gap-x-8">
				{#if a.hasRounds}
					<div
						class="inline-flex w-full border border-line2 p-1 md:w-auto"
						role="group"
						aria-label="Stage"
					>
						{#each STAGES as o (o.v)}
							{@const on = f.stage === o.v}
							<button
								type="button"
								onclick={() => go({ stage: o.v })}
								aria-pressed={on}
								class="flex-1 px-4 py-2 text-[13px] font-semibold transition-colors md:flex-none {on
									? 'bg-ink text-paper-bg'
									: 'text-soft hover:text-ink'}">{o.l}</button
							>
						{/each}
					</div>
				{/if}

				<div
					class="grid grid-cols-2 items-end gap-x-5 gap-y-4 md:ml-auto md:flex md:flex-wrap md:items-center md:gap-7"
					onchange={(e) => {
						const t = /** @type {HTMLSelectElement} */ (e.target);
						const key = t.getAttribute('aria-label');
						const field = { Hero: 'hero', Event: 'event', Format: 'format', Sort: 'sort' }[
							key ?? ''
						];
						if (field) go({ [field]: t.value });
					}}
				>
					{#if a.heroes.length}
						<FilterSelect
							label="Hero"
							value={f.hero}
							options={[{ v: '', l: 'Every hero' }, ...a.heroes.map((h) => ({ v: h, l: h }))]}
						/>
					{/if}
					{#if a.events.length}
						<FilterSelect
							label="Event"
							value={f.event}
							options={[
								{ v: '', l: 'Every event' },
								...a.events.map((ev) => ({ v: ev.id, l: ev.title }))
							]}
						/>
					{/if}
					{#if a.formats.length > 1}
						<FilterSelect
							label="Format"
							value={f.format}
							options={[{ v: '', l: 'Every format' }, ...a.formats.map((x) => ({ v: x, l: x }))]}
						/>
					{/if}
					<FilterSelect
						label="Sort"
						value={f.sort}
						options={[
							{ v: 'newest', l: 'Newest' },
							{ v: 'oldest', l: 'Oldest' },
							{ v: 'longest', l: 'Longest' }
						]}
					/>
					{#if filtered}
						<a
							href={PATH}
							class="col-span-2 justify-self-start text-[13px] font-semibold text-warm hover:text-ink md:col-span-1"
							>Clear filters</a
						>
					{/if}
				</div>
			</div>

			<p class="mt-5 text-[14px] text-fade" aria-live="polite">{resultLine}</p>

			{#if a.items.length}
				<ul class="mt-8 grid gap-x-6 gap-y-11 sm:grid-cols-2 lg:grid-cols-3">
					{#each a.items as item (item.id)}
						<li>
							<MediaCard
								{item}
								sans
								sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw"
							/>
						</li>
					{/each}
				</ul>
			{:else}
				<div class="mt-8 border border-line2 px-6 py-14 text-center">
					<p class="text-[22px] font-bold tracking-[-0.02em]">
						{filtered ? 'Nothing matches that.' : 'The first matches are on their way.'}
					</p>
					{#if filtered}
						<a
							href={PATH}
							class="mt-6 inline-block bg-ink px-5 py-3 text-[13px] font-bold text-paper-bg hover:bg-warm"
							>Show every match</a
						>
					{/if}
				</div>
			{/if}

			<LibraryPager
				page={a.page}
				totalPages={a.totalPages}
				href={(n) => filterHref(PATH, f, { page: n })}
			/>
		</section>
	</div>
</AgeShell>
