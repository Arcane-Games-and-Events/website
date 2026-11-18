<script>
	/**
	 * Header for every AGE Open sub-page (Events, Standings, Decklists,
	 * Archive, Rules): the ink poster band with the Open Series logo, the
	 * page title in the condensed poster face, a short strap, and a strip
	 * linking every section of the series so the hub is always one click
	 * away.
	 */
	import { page } from '$app/state';
	import { circuitsFrom } from '$lib/data/circuits.js';

	/** @type {{ active: string, title: string, strap?: string, children?: import('svelte').Snippet }} */
	let { active, title, strap = '', children } = $props();

	const SECTIONS = [
		{ id: 'overview', label: 'Overview', href: '/ageopen' },
		{ id: 'events', label: 'Events', href: '/ageopen?tab=events' },
		{ id: 'standings', label: 'Standings', href: '/ageopen?tab=standings' },
		{ id: 'decklists', label: 'Decklists', href: '/ageopen?tab=decklists' },
		{ id: 'results', label: 'Archive', href: '/ageopen?tab=results' },
		{ id: 'rules', label: 'Rules & Info', href: '/ageopen?tab=rules' }
	];

	// The circuits, from the database (the root layout), or the original three.
	const circuitLine = $derived(
		circuitsFrom(page.data?.circuits)
			.map((c) => c.name)
			.join(' · ')
	);
</script>

<section class="relative overflow-hidden bg-ink text-paper-bg">
	<img
		src="/banner/age-open-banner.webp"
		alt=""
		aria-hidden="true"
		class="absolute inset-0 h-full w-full object-cover opacity-25 grayscale"
	/>
	<div
		class="absolute inset-0"
		style="background: linear-gradient(100deg, rgba(23,21,15,0.97) 0%, rgba(23,21,15,0.9) 55%, rgba(23,21,15,0.7) 100%);"
		aria-hidden="true"
	></div>

	<div class="relative mx-auto w-full max-w-page px-5 pt-8 md:px-8 md:pt-10">
		<div class="flex flex-wrap items-center justify-between gap-4">
			<a href="/ageopen" class="block w-fit" aria-label="AGE Open Series overview">
				<img
					src="/age_open_logo.svg"
					alt="AGE Open Series"
					width="629"
					height="294"
					class="h-auto w-38 md:w-45"
				/>
			</a>
			<p class="text-xs font-extrabold tracking-widest text-paper-bg/60 uppercase">
				Season ’26 · {circuitLine}
			</p>
		</div>

		<div
			class="fp-rise mt-8 flex flex-col gap-5 md:mt-10 md:flex-row md:items-end md:justify-between md:gap-10"
		>
			<h1 class="ao-cond text-7xl leading-none font-black uppercase md:text-9xl">
				{title}
			</h1>
			{#if strap}
				<p
					class="max-w-md font-newsreader text-lg leading-normal text-paper-bg/75 italic md:pb-2 md:text-right md:text-xl"
				>
					{strap}
				</p>
			{/if}
		</div>
		{#if children}
			<div class="mt-8">{@render children()}</div>
		{/if}

		<!-- every section of the series -->
		<nav
			aria-label="AGE Open sections"
			class="-mx-5 mt-9 overflow-x-auto border-t border-paper-bg/15 px-5 md:mx-0 md:mt-10 md:px-0"
		>
			<ul class="flex gap-7">
				{#each SECTIONS as s (s.id)}
					<li class="shrink-0">
						<a
							href={s.href}
							aria-current={s.id === active ? 'page' : undefined}
							class="block border-t-3 pt-3.5 pb-4 text-xs font-extrabold tracking-widest whitespace-nowrap uppercase transition-colors {s.id ===
							active
								? 'border-warm-light text-paper-bg'
								: 'border-transparent text-paper-bg/55 hover:text-paper-bg'}"
						>
							{s.label}
						</a>
					</li>
				{/each}
			</ul>
		</nav>
	</div>
</section>
