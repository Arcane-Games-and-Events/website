<!--
  AdminHeader — the top of every admin page, so they all match: the ink
  poster band (washed with a circuit's colour on circuit, store and event
  pages, else Library blue), the kicker, the page title in the condensed
  poster face, a subtitle and the page's buttons. The page puts the admin
  tabs (and any sub-navigation) under it; AgeOpenHeader does that for the
  AGE Open area.

  A page one level down (an order, a member, a partner, an event) gives a
  trail instead of a kicker: a breadcrumb back up from `root`
  (Admin / Orders, or AGE Open / Events).

  Props:
    title, subtitle, kicker ('Admin' unless given)
    lead      a snippet in place of the kicker (e.g. the home page's date)
    circuit   a circuit's name: its colour and code badge
    trail     [{ href, label }] — the pages above this one, after `root`
    root      where the trail starts ({ href: '/admin', label: 'Admin' })
    actions   buttons beside the title (use the exported btn classes)
-->
<script module>
	/** The header's buttons: the main one, and the outlined ones. */
	export const btn =
		'inline-flex h-10 items-center gap-2 bg-paper-bg px-4 text-xs font-extrabold tracking-widest text-ink uppercase transition-colors hover:bg-gold disabled:opacity-50';
	export const btnLine =
		'inline-flex h-10 items-center gap-2 border border-paper-bg/35 px-4 text-xs font-extrabold tracking-widest text-paper-bg uppercase transition-colors hover:border-paper-bg disabled:opacity-50';
</script>

<script>
	import { page } from '$app/state';
	import { circuitVar, circuitsFrom } from '$lib/data/circuits.js';

	/** @type {{ title: string, subtitle?: string, kicker?: string, lead?: import('svelte').Snippet, circuit?: string | null, trail?: { href: string, label: string }[] | null, root?: { href: string, label: string }, actions?: import('svelte').Snippet<[boolean]> }} */
	let {
		title,
		subtitle = '',
		kicker = 'Admin',
		lead,
		circuit = null,
		trail = null,
		root = { href: '/admin', label: 'Admin' },
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
	<div class="mx-auto max-w-page px-5 pt-7 pb-8 md:px-8 md:pt-10 md:pb-10">
		<!-- the trail (or kicker) on its own line, flush left with the badge -->
		{#if trail}
			<nav aria-label="Breadcrumb" class="mb-3">
				<ol
					class="flex flex-wrap items-center gap-x-2.5 text-xs font-extrabold tracking-widest text-paper-bg/55 uppercase"
				>
					{#each [root, ...trail] as t, i (t.href)}
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
			<p class="mb-3 text-xs font-extrabold tracking-widest text-paper-bg/70 uppercase">
				{#if lead}{@render lead()}{:else}<span class="text-gold">◆</span> {kicker}{/if}
			</p>
		{/if}
		<div class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
			<div class="flex min-w-0 items-stretch gap-4 md:gap-5">
				{#if short}
					<span
						class="ao-cond flex w-16 shrink-0 items-center justify-center self-stretch text-3xl leading-none font-black text-white ring-1 ring-white/25 md:w-21 md:text-4xl"
						style="background: var(--cc);"
						aria-hidden="true">{short}</span
					>
				{/if}
				<div class="min-w-0">
					<h1
						class="ao-cond text-4xl leading-none font-black tracking-normal break-words uppercase md:truncate md:text-7xl"
						{title}
					>
						{title}
					</h1>
					{#if subtitle}<p class="mt-2 text-sm text-paper-bg/70">{subtitle}</p>{/if}
				</div>
			</div>
			{#if actions}
				<div class="flex shrink-0 flex-wrap items-center gap-2.5">{@render actions(false)}</div>
			{/if}
		</div>
	</div>
</section>
