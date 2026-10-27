<script>
	/**
	 * Header for every AGE Open sub-page (Events, Standings, Decklists,
	 * Archive, Rules): the ink poster band with the Open Series logo, the
	 * page title in the condensed poster face, a short strap, and a strip
	 * linking every section of the series so the hub is always one click
	 * away.
	 */
	/** @type {{ active: string, title: string, strap?: string, children?: import('svelte').Snippet }} */
	let { active, title, strap = '', children } = $props();

	const SECTIONS = [
		{ id: 'overview', label: 'Overview', href: '/age-open' },
		{ id: 'events', label: 'Events', href: '/age-open?tab=events' },
		{ id: 'standings', label: 'Standings', href: '/age-open?tab=standings' },
		{ id: 'decklists', label: 'Decklists', href: '/age-open?tab=decklists' },
		{ id: 'results', label: 'Archive', href: '/age-open?tab=results' },
		{ id: 'rules', label: 'Rules & Info', href: '/age-open?tab=rules' }
	];
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

	<div class="relative mx-auto w-full max-w-[1200px] px-5 pt-8 md:px-8 md:pt-10">
		<div class="flex flex-wrap items-center justify-between gap-4">
			<a href="/age-open" class="block w-fit" aria-label="AGE Open Series overview">
				<img
					src="/age_open_logo.svg"
					alt="AGE Open Series"
					width="629"
					height="294"
					class="h-auto w-[150px] md:w-[180px]"
				/>
			</a>
			<p class="text-[9.5px] font-extrabold tracking-[0.26em] text-paper-bg/60 uppercase">
				Season ’26 · Los Angeles · St. Louis · New England
			</p>
		</div>

		<div
			class="fp-rise mt-8 flex flex-col gap-5 md:mt-10 md:flex-row md:items-end md:justify-between md:gap-10"
		>
			<h1 class="ao-cond text-[72px] leading-[0.82] font-black uppercase md:text-[120px]">
				{title}
			</h1>
			{#if strap}
				<p
					class="max-w-[420px] font-newsreader text-[17px] leading-[1.45] text-paper-bg/75 italic md:pb-2 md:text-right md:text-[19px]"
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
							class="block border-t-[3px] pt-3.5 pb-4 text-[10.5px] font-extrabold tracking-[0.18em] whitespace-nowrap uppercase transition-colors {s.id ===
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
