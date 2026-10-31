<!--
  WatchArchive — one kind's archive on AGE Studios: the station ident, the
  channel bar, search (plus event for gameplay) and sort, heroes as chips
  that scroll sideways on phones, a grid, and pages. The filters are plain
  links and a GET form, so every view has its own address.
-->
<script>
	import StudiosMasthead from './StudiosMasthead.svelte';
	import ChannelBar from './ChannelBar.svelte';
	import StudiosCard from './StudiosCard.svelte';
	import { STUDIOS_NAV } from './nav.js';

	/**
	 * @type {{ data: any, title: string, kicker: string, lead: string, path: string,
	 *   channel: string, gameplay?: boolean, noun: [string, string] }}
	 */
	let { data, title, kicker, lead, path, channel, gameplay = false, noun } = $props();
	const f = $derived(data.filters);
	const a = $derived(data.archive);

	const hrefWith = (over) => {
		const q = new URLSearchParams();
		for (const [k, v] of Object.entries({ ...f, page: 1, ...over }))
			if (v && !(k === 'sort' && v === 'newest') && !(k === 'page' && Number(v) <= 1))
				q.set(k, String(v));
		const s = q.toString();
		return `${path}${s ? `?${s}` : ''}`;
	};
	const filtered = $derived(!!(f.q || f.event || f.hero));
	const control =
		'h-11 border border-paper-bg/20 bg-studio-panel px-3 text-[14px] text-paper-bg placeholder:text-paper-bg/40 focus:border-studio-light focus:ring-0';
	const chip = (on) =>
		`st-wide flex shrink-0 items-center border px-3 py-2 text-[9.5px] font-bold tracking-[0.12em] whitespace-nowrap uppercase transition-colors ${
			on
				? 'border-studio-light bg-studio-light text-studio-night'
				: 'border-paper-bg/15 text-paper-bg/80 hover:border-studio-light hover:text-studio-light'
		}`;
	const tag = 'st-wide text-[9.5px] font-bold tracking-[0.18em] uppercase';
</script>

<div class="min-h-[60vh] bg-studio-night text-paper-bg">
	<StudiosMasthead {kicker} {title} {lead} />
	<ChannelBar channels={STUDIOS_NAV} current={channel} />

	<section class="mx-auto w-full max-w-[1280px] px-5 py-8 md:px-8 md:py-12">
		<form method="GET" action={path} class="flex flex-wrap gap-2" role="search">
			{#if f.hero}<input type="hidden" name="hero" value={f.hero} />{/if}
			<input
				type="search"
				name="q"
				value={f.q}
				placeholder={gameplay ? 'Search titles and players' : 'Search titles, shows and guests'}
				aria-label="Search"
				class="{control} min-w-0 flex-1 basis-[220px]"
			/>
			{#if gameplay && a.events.length}
				<select name="event" value={f.event} aria-label="Event" class="{control} pr-8">
					<option value="">Every event</option>
					{#each a.events as ev (ev.id)}<option value={ev.id}>{ev.title}</option>{/each}
				</select>
			{/if}
			<select name="sort" value={f.sort} aria-label="Sort" class="{control} pr-8">
				<option value="newest">Newest</option>
				<option value="oldest">Oldest</option>
				<option value="longest">Longest</option>
			</select>
			<button
				type="submit"
				class="st-wide h-11 bg-studio-light px-5 text-[10px] font-extrabold tracking-[0.14em] text-studio-night uppercase hover:bg-paper-bg"
				>Show</button
			>
		</form>

		{#if gameplay && a.heroes.length}
			<nav
				class="st-rail -mx-5 mt-4 flex gap-1.5 overflow-x-auto px-5 md:mx-0 md:flex-wrap md:px-0"
				aria-label="Hero"
			>
				<a href={hrefWith({ hero: '' })} class={chip(!f.hero)}>Every hero</a>
				{#each a.heroes as h (h)}
					<a href={hrefWith({ hero: h })} class={chip(f.hero === h)}>{h}</a>
				{/each}
			</nav>
		{/if}

		<div
			class="mt-8 flex flex-wrap items-baseline justify-between gap-3 border-b border-paper-bg/15 pb-3"
		>
			<p class="{tag} text-studio-mute">
				{a.total}
				{a.total === 1 ? noun[0] : noun[1]}{#if filtered}
					· of {a.totalAll}{/if}
			</p>
			{#if filtered}
				<a href={path} class="{tag} text-studio-light hover:text-paper-bg">Clear filters</a>
			{/if}
		</div>

		{#if a.items.length}
			<ul class="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
				{#each a.items as item (item.id)}
					<li>
						<StudiosCard {item} sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw" />
					</li>
				{/each}
			</ul>
		{:else}
			<div class="mt-8 border border-paper-bg/15 px-6 py-14 text-center">
				<p class="font-newsreader text-[24px] font-semibold">
					{filtered ? 'Nothing matches that.' : `No ${noun[1]} yet.`}
				</p>
				{#if filtered}
					<a
						href={path}
						class="st-wide mt-5 inline-block bg-studio-light px-5 py-3 text-[10px] font-extrabold tracking-[0.16em] text-studio-night uppercase hover:bg-paper-bg"
						>Show everything</a
					>
				{/if}
			</div>
		{/if}

		{#if a.totalPages > 1}
			<nav
				class="mt-12 flex items-center justify-between border-t border-paper-bg/15 pt-5"
				aria-label="Pages"
			>
				{#if a.page > 1}
					<a href={hrefWith({ page: a.page - 1 })} class="{tag} hover:text-studio-light">← Newer</a>
				{:else}<span></span>{/if}
				<span class="{tag} text-studio-mute">Page {a.page} of {a.totalPages}</span>
				{#if a.page < a.totalPages}
					<a href={hrefWith({ page: a.page + 1 })} class="{tag} hover:text-studio-light">Older →</a>
				{:else}<span></span>{/if}
			</nav>
		{/if}
	</section>
</div>
