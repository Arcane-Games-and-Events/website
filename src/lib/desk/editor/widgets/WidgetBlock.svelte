<!--
  WidgetBlock — the card a block widget (image, table, decklist, video)
  shows inside the editor. A short summary by default; "Preview" swaps it
  for the real public rendering, wrapped in the article's typography so it
  looks exactly as it will on the page. Edit and remove are handled by the
  editor through callbacks.

  Mounted by Editor.svelte into each decorator node's element (see
  ./mount.svelte.js). Lexical ignores DOM inside decorators, but it does
  listen for keys and clicks on the editable root, so events stop here.
-->
<script>
	import RenderLexical from '$lib/desk/render/RenderLexical.svelte';
	import { ARTICLE_PROSE } from '$lib/desk/render/articleProse.js';

	/** @type {{ type: string, data: any, json: any, onedit: () => void, onremove: () => void }} */
	let { type, data, json, onedit, onremove } = $props();

	let open = $state(false);

	const KINDS = {
		upload: { label: 'Image', tone: 'text-gold' },
		stats_table: { label: 'Table', tone: 'text-warm' },
		decklist: { label: 'Decklist', tone: 'text-prem' },
		inline_video: { label: 'Video', tone: 'text-hero-rb' }
	};
	let kind = $derived(KINDS[type] || { label: 'Widget', tone: 'text-fade' });

	const PITCHES = [
		['red', 'bg-[#A8392C]'],
		['yellow', 'bg-[#E5703E]'],
		['blue', 'bg-[#2C5BA8]']
	];

	function formatDuration(sec) {
		if (!sec || !Number.isFinite(sec)) return '';
		const s = Math.floor(sec);
		const h = Math.floor(s / 3600);
		const m = Math.floor((s % 3600) / 60);
		const r = String(s % 60).padStart(2, '0');
		return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
	}
	const sum = (list) => (list || []).reduce((n, c) => n + (c.quantity || 1), 0);

	let deck = $derived.by(() => {
		if (type !== 'decklist') return null;
		const { arenaCards = [], deckCards = [] } = data?.parsedCards || {};
		const byPitch = Object.fromEntries(
			PITCHES.map(([p]) => [p, sum(deckCards.filter((c) => c.color === p))])
		);
		const other = sum(deckCards.filter((c) => !PITCHES.some(([p]) => p === c.color)));
		return { arena: sum(arenaCards), byPitch, other, total: sum(arenaCards) + sum(deckCards) };
	});

	let title = $derived(
		type === 'upload'
			? data?.alt || 'Image'
			: type === 'stats_table'
				? data?.caption || 'Untitled table'
				: type === 'decklist'
					? data?.deckName || 'Untitled deck'
					: type === 'inline_video'
						? data?.youtubeTitle || 'Untitled video'
						: kind.label
	);
	let meta = $derived(
		type === 'stats_table'
			? `${data?.columns?.length || 0} columns · ${data?.rows?.length || 0} rows`
			: type === 'decklist'
				? `${deck?.total || 0} cards`
				: type === 'inline_video'
					? formatDuration(data?.youtubeDuration)
					: type === 'upload' && data?.width && data?.height
						? `${data.width} × ${data.height}`
						: ''
	);

	// a one-block document, rendered by the same pipeline as the article
	let doc = $derived({ root: { type: 'root', children: json ? [json] : [] } });

	const stop = (e) => e.stopPropagation();
	// buttons keep the editor's selection where it was
	const hold = (e) => {
		e.preventDefault();
		e.stopPropagation();
	};
	// the preview is a picture of the page, not a way off it
	const noNavigate = (e) => {
		if (e.target?.closest?.('a')) e.preventDefault();
	};

	const btn =
		'inline-flex h-8 shrink-0 items-center gap-1 px-2.5 text-[9.5px] font-extrabold tracking-[0.14em] uppercase transition-colors';
</script>

<!-- these listeners only fence events off from the editor around the card -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="border border-line2 bg-paper-bg font-libre text-ink not-italic"
	role="group"
	aria-label="{kind.label}: {title}"
	onmousedown={stop}
	onpointerdown={stop}
	onclick={stop}
	onkeydown={stop}
	onbeforeinput={stop}
>
	<!-- header: what it is, then preview / edit / remove. On phones the
	     title drops to its own line under the buttons. -->
	<div
		class="flex min-h-[44px] flex-wrap items-center gap-x-2.5 border-b border-line2 pr-1 pl-3 sm:flex-nowrap"
	>
		<span
			class="flex h-[42px] shrink-0 items-center gap-1.5 text-[9.5px] font-extrabold tracking-[0.18em] uppercase"
			><span class="text-[8px] {kind.tone}" aria-hidden="true">◆</span>{kind.label}</span
		>
		<span
			class="order-last min-w-0 basis-full truncate pr-2 pb-2.5 font-newsreader text-[15px] leading-tight font-semibold sm:order-none sm:flex-1 sm:basis-auto sm:pb-0"
			>{title}</span
		>
		{#if meta}<span class="hidden shrink-0 text-[11.5px] text-fade sm:inline">{meta}</span>{/if}
		<span class="ml-auto flex shrink-0 items-center sm:ml-0">
			<button
				type="button"
				onmousedown={hold}
				onclick={() => (open = !open)}
				aria-expanded={open}
				class="{btn} {open
					? 'bg-ink text-paper-bg'
					: 'text-soft hover:bg-ink/[0.06] hover:text-ink'}"
				>Preview<span
					class="text-[9px] transition-transform duration-200 {open ? 'rotate-180' : ''}"
					aria-hidden="true">▾</span
				></button
			>
			<button
				type="button"
				onmousedown={hold}
				onclick={onedit}
				class="{btn} text-soft hover:bg-ink/[0.06] hover:text-ink">Edit</button
			>
			<button
				type="button"
				onmousedown={hold}
				onclick={onremove}
				aria-label="Remove {kind.label.toLowerCase()}"
				title="Remove"
				class="{btn} w-8 justify-center px-0 text-[16px] font-normal text-fade hover:bg-hero-rb/10 hover:text-hero-rb"
				>×</button
			>
		</span>
	</div>

	{#if open}
		<!-- preview: the public rendering in the article's typography -->
		<div class="bg-paper-bg">
			<p
				class="flex items-baseline justify-between gap-3 px-3 pt-2.5 text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase md:px-5"
			>
				On the page<span class="font-semibold tracking-normal normal-case">As readers see it</span>
			</p>
			<div class="overflow-x-auto px-3 pt-3 pb-5 md:px-5" onclickcapture={noNavigate}>
				<div class={ARTICLE_PROSE}><RenderLexical content={doc} /></div>
			</div>
		</div>
	{:else if type === 'upload'}
		<div class="flex justify-center bg-line/50 p-3">
			{#if data?.url}
				<img src={data.url} alt={data.alt || ''} class="block max-h-[300px] w-auto max-w-full" />
			{:else}
				<p class="py-6 text-[13px] text-fade">This image is missing its file.</p>
			{/if}
		</div>
		<p class="border-t border-line2 px-3 py-2 text-[12px]">
			{#if data?.alt}<span class="text-fade">Alt text</span>&nbsp; {data.alt}{:else}<span
					class="text-hero-rb">No alt text.</span
				> <span class="text-fade">Add a short description in Edit.</span>{/if}
		</p>
	{:else if type === 'stats_table'}
		{@const cols = data?.columns || []}
		{@const rows = data?.rows || []}
		<div class="overflow-x-auto px-3 py-2.5">
			<table class="w-full text-[12.5px]">
				<thead>
					<tr class="border-b border-line2">
						{#each cols as c, i (i)}
							<th
								class="px-2 py-1.5 text-left text-[9.5px] font-extrabold tracking-[0.12em] text-fade uppercase"
								>{c}</th
							>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each rows.slice(0, 4) as r, ri (ri)}
						<tr class="border-b border-line last:border-b-0">
							{#each cols as _, i (i)}
								<td class="px-2 py-1.5 tabular-nums">{r[i] ?? ''}</td>
							{/each}
						</tr>
					{/each}
				</tbody>
			</table>
			{#if rows.length > 4}
				<p class="px-2 pt-1.5 text-[11.5px] text-fade">
					And {rows.length - 4} more {rows.length - 4 === 1 ? 'row' : 'rows'}
				</p>
			{/if}
		</div>
	{:else if type === 'decklist'}
		<div class="px-3 py-3">
			<p class="text-[13px]">
				{[data?.hero, data?.format].filter(Boolean).join(' · ') ||
					'No hero or format'}{#if data?.creator}<span class="text-fade"
						>&nbsp;· by {data.creator}</span
					>{/if}
			</p>
			<p class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-soft">
				<span><b class="font-semibold text-ink tabular-nums">{deck.arena}</b> arena</span>
				{#each PITCHES as [p, swatch] (p)}
					{#if deck.byPitch[p]}
						<span class="inline-flex items-center gap-1.5"
							><span class="h-2 w-2 {swatch}" aria-hidden="true"></span><span
								><b class="font-semibold text-ink tabular-nums">{deck.byPitch[p]}</b>
								{p}</span
							></span
						>
					{/if}
				{/each}
				{#if deck.other}<span
						><b class="font-semibold text-ink tabular-nums">{deck.other}</b> other</span
					>{/if}
			</p>
			{#if data?.fabraryUrl}
				<p class="mt-2 truncate text-[11.5px] text-fade">
					Links to {data.fabraryUrl.replace(/^https?:\/\//, '')}
				</p>
			{/if}
		</div>
	{:else if type === 'inline_video'}
		<div class="flex items-center gap-3 px-3 py-3">
			{#if data?.youtubeThumbnailUrl}
				<img
					src={data.youtubeThumbnailUrl}
					alt=""
					class="aspect-video w-28 shrink-0 border border-line2 object-cover sm:w-36"
				/>
			{/if}
			<div class="min-w-0">
				<p class="flex items-center gap-2 text-[11.5px] text-fade">
					<span
						class="border border-current px-1.5 py-[1px] text-[9px] font-extrabold tracking-[0.14em] text-hero-rb uppercase"
						>YouTube</span
					>{formatDuration(data?.youtubeDuration)}
				</p>
				<p class="mt-1 line-clamp-2 text-[13px] leading-snug">
					{data?.youtubeTitle || data?.youtubeUrl || 'Untitled video'}
				</p>
			</div>
		</div>
	{/if}
</div>
