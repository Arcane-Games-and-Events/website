<!--
  StoreHeader — the top of every store page, in the AGE Open's poster
  register: the circuit's code block, the store's name in the condensed
  face over an ink band washed with the circuit colour, the season meter
  (eight Opens, played and scheduled), and the tabs.

  Props: where ({ store, circuit, role, viaAdmin }), season ({ year,
  played, scheduled, target }), nav (the store tabs; off in admin),
  kicker / sub (the lines above and below the name), actions (buttons
  under the name)
-->
<script>
	import { page } from '$app/state';

	/** @type {{ where: any, season: { year: number, played: number, scheduled: number, target: number }, nav?: boolean, kicker?: string, sub?: string, actions?: import('svelte').Snippet }} */
	let { where, season, nav = true, kicker = '', sub = '', actions } = $props();

	const s = $derived(where.store);
	const c = $derived(where.circuit);
	const base = $derived(`/store/${s.slug}`);
	const tabs = $derived([
		{ id: 'season', href: base, label: 'Season' },
		{ id: 'events', href: `${base}/events`, label: 'Events' },
		{ id: 'calendar', href: `${base}/calendar`, label: 'Calendar' },
		{ id: 'players', href: `${base}/players`, label: 'Players' },
		{ id: 'payouts', href: `${base}/payouts`, label: 'Payouts' },
		{ id: 'members', href: `${base}/members`, label: 'Members' }
	]);
	const current = $derived.by(() => {
		const rest = page.url.pathname.slice(base.length);
		for (const t of ['events', 'calendar', 'players', 'payouts', 'members'])
			if (rest.startsWith(`/${t}`)) return t;
		return 'season';
	});
	const place = $derived([s.city, s.state].filter(Boolean).join(', '));
	const role = $derived(
		where.viaAdmin ? 'Viewing as admin' : where.role === 'owner' ? 'Owner' : 'Manager'
	);
</script>

<section
	class="relative overflow-hidden bg-ink font-libre text-paper-bg"
	style="--cc: {c.color}; background-image: linear-gradient(100deg, color-mix(in srgb, var(--cc) 55%, transparent) 0%, transparent 62%);"
>
	<div
		class="mx-auto flex max-w-[1200px] flex-col gap-6 px-5 pt-7 pb-6 md:flex-row md:items-end md:justify-between md:px-8 md:pt-10 md:pb-8"
	>
		<div class="flex min-w-0 items-end gap-4 md:gap-5">
			<span
				class="ao-cond flex h-[58px] w-[64px] shrink-0 items-center justify-center text-[30px] leading-none font-black text-white ring-1 ring-white/25 md:h-[76px] md:w-[84px] md:text-[40px]"
				style="background: var(--cc);"
				aria-hidden="true">{c.short}</span
			>
			<div class="min-w-0">
				<p
					class="text-[9.5px] font-extrabold tracking-[0.26em] text-paper-bg/70 uppercase md:text-[10.5px]"
				>
					<span class="text-gold">◆</span>
					{kicker || `AGE Open · ${c.name} circuit`}
				</p>
				<h1
					class="ao-cond mt-1.5 truncate text-[40px] leading-[0.9] font-black tracking-[-0.01em] uppercase md:text-[64px]"
				>
					{s.name}
				</h1>
				<p class="mt-2 text-[12.5px] text-paper-bg/70">
					{#if sub}{sub}{:else}{place ? `${place} · ` : ''}<span class="font-semibold text-paper-bg"
							>{role}</span
						>{/if}{s.active ? '' : ' · inactive'}
				</p>
				{#if actions}<div class="mt-4 flex flex-wrap gap-2.5">{@render actions()}</div>{/if}
			</div>
		</div>

		<a
			href={base}
			class="group block w-full shrink-0 md:w-[280px]"
			aria-label="Season {season.year}: {season.played} of {season.target} Opens played, {season.scheduled} scheduled"
		>
			<span
				class="flex items-baseline justify-between text-[9.5px] font-extrabold tracking-[0.2em] text-paper-bg/70 uppercase"
			>
				<span>Season {season.year}</span>
				<span
					><span class="ao-cond text-[26px] leading-none text-paper-bg tabular-nums"
						>{season.played}</span
					><span class="text-paper-bg/60"> / {season.target} played</span></span
				>
			</span>
			<span class="mt-2 grid grid-cols-8 gap-[3px]" aria-hidden="true">
				{#each Array.from({ length: season.target }) as _, i (i)}
					<span
						class="h-[10px] {i < season.played
							? ''
							: i < season.played + season.scheduled
								? 'border border-paper-bg/70'
								: 'border border-dashed border-paper-bg/30'}"
						style={i < season.played ? 'background: var(--cc)' : ''}
					></span>
				{/each}
			</span>
			<span class="mt-1.5 block text-[10.5px] text-paper-bg/55"
				>{season.scheduled} scheduled · {Math.max(
					0,
					season.target - season.played - season.scheduled
				)} to schedule</span
			>
		</a>
	</div>
</section>

{#if nav}
	<nav
		class="sticky top-[var(--desk-header,0px)] z-40 border-t border-paper-bg/15 bg-ink font-libre text-paper-bg"
		style="--cc: {c.color};"
		aria-label="Store sections"
	>
		<div
			class="mx-auto flex h-[48px] max-w-[1200px] items-stretch overflow-x-auto px-5 [scrollbar-width:none] md:px-8 [&::-webkit-scrollbar]:hidden"
		>
			{#each tabs as tab (tab.id)}
				<a
					href={tab.href}
					aria-current={current === tab.id ? 'page' : undefined}
					class="flex shrink-0 items-center border-b-[3px] px-3 text-[10.5px] font-extrabold tracking-[0.16em] whitespace-nowrap uppercase transition-colors first:-ml-3 {current ===
					tab.id
						? 'text-paper-bg'
						: 'border-transparent text-paper-bg/55 hover:text-paper-bg'}"
					style={current === tab.id ? 'border-color: var(--cc)' : ''}>{tab.label}</a
				>
			{/each}
		</div>
	</nav>
{/if}
