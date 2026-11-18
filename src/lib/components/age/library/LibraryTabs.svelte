<!--
  LibraryTabs — the Library's sections (All, Articles, Videos, Matches,
  Topics) as a row of buttons on every Library page, set like the cards
  around them: white, a hairline frame, the name in the serif and a count.
  Each section's colour is only a hint — its small icon, and an edge along
  the bottom that shows as the button lifts on hover and presses in on a
  click. The one you're on is the Library's navy. Five across on wide screens; on phones All runs the
  full width with the other four in pairs beneath.

  Props: current (all | articles | videos | matches | topics | search), counts
-->
<script>
	/** @type {{ current?: string, counts: { articles: number, videos: number, matches: number, topics: number } }} */
	let { current = '', counts } = $props();

	// each section's colour: ink, the Library's blue, rust, green and gold
	const TONE = {
		all: 'var(--color-ink)',
		articles: 'var(--color-warm)',
		videos: 'var(--color-studio)',
		matches: 'var(--color-prem)',
		topics: 'var(--color-gold)'
	};

	// 20×20 line icons
	const ICON = {
		all: 'M3.5 3.5h5.5v5.5H3.5zM11 3.5h5.5v5.5H11zM3.5 11h5.5v5.5H3.5zM11 11h5.5v5.5H11z',
		articles: 'M4 4h12M4 8h12M4 12h12M4 16h7',
		videos: 'M3.5 5h13v10h-13zM8.5 7.8v4.4l3.8-2.2z',
		matches: 'M4 4l6 6M10 10l6 6M16 4l-6 6M4 16l3-3M13 7l3-3',
		topics: 'M3.5 10.5 10 4h6.5v6.5L10 17zM13 7.5h.01'
	};

	const TABS = $derived([
		{ id: 'all', label: 'All', href: '/library', n: null },
		{ id: 'articles', label: 'Articles', href: '/library/articles', n: counts.articles },
		{ id: 'videos', label: 'Videos', href: '/library/videos', n: counts.videos },
		{ id: 'matches', label: 'Matches', href: '/library/matches', n: counts.matches },
		{ id: 'topics', label: 'Topics', href: '/library/topics', n: counts.topics }
	]);
</script>

<nav class="border-b border-line2 bg-paper-bg text-ink" aria-label="The Library">
	<div class="mx-auto w-full max-w-page px-5 py-5 md:px-8 md:py-6">
		<ul class="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 lg:gap-3">
			{#each TABS as t (t.id)}
				{@const on = t.id === current}
				<li class="max-sm:first:col-span-2">
					<a
						href={t.href}
						aria-current={on ? 'page' : undefined}
						aria-label={t.n == null ? t.label : `${t.label}: ${t.n}`}
						style="--tone: {TONE[t.id]}"
						class="lib-tile group flex h-14 items-center gap-2.5 border px-3 sm:gap-3 sm:px-3.5 md:h-15 {on
							? 'is-on border-warm-deep bg-warm-deep text-white'
							: 'border-line2 bg-white text-ink'}"
					>
						<svg
							viewBox="0 0 20 20"
							class="h-5 w-5 shrink-0 transition-transform duration-300 group-hover:-rotate-6 {on
								? 'text-warm-light'
								: ''}"
							style={on ? '' : 'color: var(--tone)'}
							fill="none"
							stroke="currentColor"
							stroke-width="1.7"
							stroke-linejoin="round"
							stroke-linecap="round"
							aria-hidden="true"><path d={ICON[t.id]} /></svg
						>
						<span class="min-w-0 flex-1 truncate font-newsreader text-xl leading-none font-semibold"
							>{t.label}</span
						>
						{#if t.n != null}<span
								class="px-1.5 py-1 font-libre text-xs font-bold tabular-nums {on
									? 'bg-white/15 text-white'
									: 'bg-panel text-soft'}">{t.n}</span
							>{/if}
						<span
							class="hidden text-base opacity-40 transition duration-300 group-hover:translate-x-0.5 group-hover:opacity-100 sm:inline"
							aria-hidden="true">→</span
						>
					</a>
				</li>
			{/each}
		</ul>
	</div>
</nav>

<style>
	/* a hint of each section's colour: an edge along the bottom that shows
	   as the button lifts, and presses in on a click */
	.lib-tile {
		box-shadow: inset 0 -2px 0 0 var(--color-line);
		transition:
			transform 160ms ease-out,
			box-shadow 160ms ease-out,
			border-color 160ms ease-out;
	}
	.lib-tile:hover {
		transform: translateY(-2px);
		border-color: color-mix(in srgb, var(--tone) 45%, var(--color-line2));
		box-shadow:
			inset 0 -3px 0 0 var(--tone),
			0 10px 18px -14px rgb(23 21 15 / 0.45);
	}
	.lib-tile:active {
		transform: translateY(0);
		box-shadow: inset 0 -1px 0 0 var(--tone);
	}
	.lib-tile.is-on {
		box-shadow: inset 0 -3px 0 0 var(--color-warm-light);
	}
	.lib-tile.is-on:hover {
		border-color: var(--color-warm-deep);
		box-shadow:
			inset 0 -3px 0 0 var(--color-warm-light),
			0 10px 18px -14px rgb(23 21 15 / 0.45);
	}
	.lib-tile:focus-visible {
		outline: 2px solid var(--color-warm);
		outline-offset: 3px;
	}
	@media (prefers-reduced-motion: reduce) {
		.lib-tile,
		.lib-tile:hover,
		.lib-tile:active {
			transform: none;
			transition: none;
		}
	}
</style>
