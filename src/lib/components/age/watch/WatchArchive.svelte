<!--
  WatchArchive — one kind's archive on AGE Studios: a masthead, search
  (plus event and hero for gameplay), sort, a grid, and pages. The filters
  are a GET form, so every view has its own address.
-->
<script>
	import WatchCard from './WatchCard.svelte';

	/**
	 * @type {{ data: any, title: string, kicker: string, lead: string, path: string,
	 *   gameplay?: boolean, noun: [string, string] }}
	 */
	let { data, title, kicker, lead, path, gameplay = false, noun } = $props();
	const f = $derived(data.filters);
	const a = $derived(data.archive);

	const pageHref = (p) => {
		const q = new URLSearchParams();
		for (const [k, v] of Object.entries(f)) if (v && !(k === 'sort' && v === 'newest')) q.set(k, v);
		if (p > 1) q.set('page', String(p));
		const s = q.toString();
		return `${path}${s ? `?${s}` : ''}`;
	};
	const filtered = $derived(!!(f.q || f.event || f.hero));
	const control =
		'h-[42px] border border-paper-bg/25 bg-transparent px-3 text-[13.5px] text-paper-bg placeholder:text-paper-bg/40 focus:border-warm-light focus:ring-0';
</script>

<section class="bg-ink text-paper-bg">
	<div class="mx-auto w-full max-w-[1200px] px-5 pt-8 pb-10 md:px-8 md:pt-10">
		<a
			href="/studios"
			class="text-[10.5px] font-extrabold tracking-[0.18em] text-paper-bg/60 uppercase hover:text-warm-light"
			>← AGE Studios</a
		>
		<p
			class="mt-6 flex items-center gap-2.5 text-[10.5px] font-extrabold tracking-[0.24em] text-warm-light uppercase"
		>
			<span aria-hidden="true">◆</span>
			{kicker}
		</p>
		<h1
			class="mt-2 font-newsreader text-[40px] leading-none font-semibold tracking-[-0.02em] md:text-[58px]"
		>
			{title}
		</h1>
		<p class="mt-3 max-w-[620px] font-newsreader text-[17px] text-paper-bg/70 italic">{lead}</p>

		<form method="GET" action={path} class="mt-7 flex flex-wrap gap-2" role="search">
			<input
				type="search"
				name="q"
				value={f.q}
				placeholder={gameplay ? 'Search titles and players' : 'Search titles, shows and guests'}
				aria-label="Search"
				class="{control} min-w-0 flex-1 basis-[240px]"
			/>
			{#if gameplay && a.events.length}
				<select
					name="event"
					value={f.event}
					aria-label="Event"
					class="{control} pr-8 [&>option]:text-ink"
				>
					<option value="">Every event</option>
					{#each a.events as ev (ev.id)}<option value={ev.id}>{ev.title}</option>{/each}
				</select>
			{/if}
			{#if gameplay && a.heroes.length}
				<select
					name="hero"
					value={f.hero}
					aria-label="Hero"
					class="{control} pr-8 [&>option]:text-ink"
				>
					<option value="">Every hero</option>
					{#each a.heroes as h (h)}<option value={h}>{h}</option>{/each}
				</select>
			{/if}
			<select
				name="sort"
				value={f.sort}
				aria-label="Sort"
				class="{control} pr-8 [&>option]:text-ink"
			>
				<option value="newest">Newest</option>
				<option value="oldest">Oldest</option>
				<option value="longest">Longest</option>
			</select>
			<button
				type="submit"
				class="h-[42px] bg-warm px-5 text-[10.5px] font-extrabold tracking-[0.14em] text-white uppercase hover:bg-paper-bg hover:text-ink"
				>Show</button
			>
		</form>
	</div>
</section>

<section class="mx-auto w-full max-w-[1200px] px-5 py-10 md:px-8 md:py-12">
	<div class="flex flex-wrap items-baseline justify-between gap-3 border-b-[3px] border-ink pb-3">
		<p class="text-[10.5px] font-extrabold tracking-[0.16em] uppercase">
			{a.total}
			{a.total === 1 ? noun[0] : noun[1]}{#if filtered}<span
					class="tracking-normal text-fade normal-case"
				>
					· of {a.totalAll}</span
				>{/if}
		</p>
		{#if filtered}
			<a
				href={path}
				class="text-[10.5px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink"
				>Clear filters</a
			>
		{/if}
	</div>

	{#if a.items.length}
		<ul class="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
			{#each a.items as item (item.id)}
				<li>
					<WatchCard {item} sizes="(min-width: 1024px) 380px, (min-width: 640px) 50vw, 100vw" />
				</li>
			{/each}
		</ul>
	{:else}
		<div class="mt-8 border-[3px] border-double border-ink px-6 py-12 text-center">
			<p class="font-newsreader text-[22px] font-semibold">
				{filtered ? 'Nothing matches that.' : `No ${noun[1]} yet.`}
			</p>
			{#if filtered}
				<a
					href={path}
					class="mt-5 inline-block bg-ink px-5 py-3 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase hover:bg-warm"
					>Show everything</a
				>
			{/if}
		</div>
	{/if}

	{#if a.totalPages > 1}
		<nav
			class="mt-12 flex items-center justify-between border-t border-line pt-5"
			aria-label="Pages"
		>
			{#if a.page > 1}
				<a
					href={pageHref(a.page - 1)}
					class="text-[10.5px] font-extrabold tracking-[0.16em] uppercase hover:text-warm"
					>← Newer</a
				>
			{:else}<span></span>{/if}
			<span class="text-[12px] text-fade">Page {a.page} of {a.totalPages}</span>
			{#if a.page < a.totalPages}
				<a
					href={pageHref(a.page + 1)}
					class="text-[10.5px] font-extrabold tracking-[0.16em] uppercase hover:text-warm"
					>Older →</a
				>
			{:else}<span></span>{/if}
		</nav>
	{/if}
</section>
