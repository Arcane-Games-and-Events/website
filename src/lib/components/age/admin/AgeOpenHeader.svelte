<!--
  AgeOpenHeader — the top of every page in the admin AGE Open area, so they
  all match: the ink poster band (washed with a circuit's colour on circuit,
  store and event pages, else Library blue), the kicker, the page title in
  the condensed poster face, a subtitle and the page's buttons; then the
  admin tabs, and on the area's top pages the AGE Open sub-navigation.

  A page one level down (a store, a circuit, an event, a "new" page) gives
  a trail instead: the kicker becomes a breadcrumb back up through the area
  (AGE Open / Circuits & stores / Los Angeles) and the sub-navigation is
  left out, so there's never more than one menu under the admin tabs — the
  page's own, if it has one.

  Props:
    title, subtitle, kicker ('Admin · AGE Open' unless given)
    circuit   a circuit's name: its colour and code badge
    trail     [{ href, label }] — the pages above this one, after AGE Open
    actions   buttons beside the title (use the exported btn classes)

  Figures and anything else page-specific go in the page, under the tabs,
  so every header in the area has the same shape.
-->
<script module>
	/** The header's buttons: the main one, and the outlined ones. */
	export const btn =
		'inline-flex h-[40px] items-center gap-2 bg-paper-bg px-4 text-[10.5px] font-extrabold tracking-[0.16em] text-ink uppercase transition-colors hover:bg-gold';
	export const btnLine =
		'inline-flex h-[40px] items-center gap-2 border border-paper-bg/35 px-4 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:border-paper-bg';
</script>

<script>
	import { page } from '$app/state';
	import AdminTabs from './AdminTabs.svelte';
	import AgeOpenSubnav from './AgeOpenSubnav.svelte';
	import { circuitVar, circuitsFrom } from '$lib/data/circuits.js';

	/** @type {{ title: string, subtitle?: string, kicker?: string, circuit?: string | null, trail?: { href: string, label: string }[], actions?: import('svelte').Snippet }} */
	let {
		title,
		subtitle = '',
		kicker = 'Admin · AGE Open',
		circuit = null,
		trail = null,
		actions
	} = $props();

	const wash = $derived(circuit ? circuitVar(circuit) : 'var(--color-warm)');
	const short = $derived(
		circuit ? circuitsFrom(page.data?.circuits).find((c) => c.name === circuit)?.short || '' : ''
	);
</script>

<section
	class="relative overflow-hidden bg-ink font-libre text-paper-bg"
	style="--cc: {wash}; background-image: linear-gradient(100deg, color-mix(in srgb, var(--cc) 50%, transparent) 0%, transparent 62%);"
>
	<div class="mx-auto max-w-[1200px] px-5 pt-7 pb-8 md:px-8 md:pt-10 md:pb-10">
		<!-- the trail (or kicker) on its own line, flush left with the badge -->
		{#if trail}
			<nav aria-label="Breadcrumb" class="mb-3">
				<ol
					class="flex flex-wrap items-center gap-x-2.5 text-[10px] font-extrabold tracking-[0.26em] text-paper-bg/55 uppercase"
				>
					{#each [{ href: '/admin/ageopen', label: 'AGE Open' }, ...trail] as t, i (t.href)}
						<li class="flex items-center gap-x-2.5">
							{#if i}<span class="text-paper-bg/30" aria-hidden="true">/</span>{/if}
							<a href={t.href} class="transition-colors hover:text-paper-bg"
								>{#if !i}<span class="mr-1.5 text-gold">◆</span>{/if}{t.label}</a
							>
						</li>
					{/each}
				</ol>
			</nav>
		{:else}
			<p class="mb-3 text-[10px] font-extrabold tracking-[0.26em] text-paper-bg/70 uppercase">
				<span class="text-gold">◆</span>
				{kicker}
			</p>
		{/if}
		<div class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
			<div class="flex min-w-0 items-stretch gap-4 md:gap-5">
				{#if short}
					<span
						class="ao-cond flex w-[64px] shrink-0 items-center justify-center self-stretch text-[30px] leading-none font-black text-white ring-1 ring-white/25 md:w-[84px] md:text-[40px]"
						style="background: var(--cc);"
						aria-hidden="true">{short}</span
					>
				{/if}
				<div class="min-w-0">
					<h1
						class="ao-cond truncate text-[44px] leading-[0.95] font-black tracking-[-0.01em] uppercase md:text-[68px]"
						{title}
					>
						{title}
					</h1>
					{#if subtitle}<p class="mt-2 text-[13px] text-paper-bg/70">{subtitle}</p>{/if}
				</div>
			</div>
			{#if actions}
				<div class="flex shrink-0 flex-wrap gap-2.5">{@render actions()}</div>
			{/if}
		</div>
	</div>
</section>
<AdminTabs />
{#if !trail}<AgeOpenSubnav />{/if}
