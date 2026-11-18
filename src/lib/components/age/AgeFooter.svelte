<script>
	const COLUMNS = [
		{
			h: 'Read',
			items: [
				{ label: 'Latest Articles', href: '/library/articles' },
				{ label: 'Pro Insight', href: '/library/articles?access=premium' },
				{ label: 'The SAGE Series', href: '/library/search?q=SAGE' },
				{ label: 'Set Reviews', href: '/library/tag/set-review' },
				{ label: 'Matches', href: '/library/matches' },
				// AGE Studios is hidden for now; put it back here when it returns.
				// { label: 'AGE Studios', href: '/studios' },
				{ label: 'Premium', href: '/premium' }
			]
		},
		{
			h: 'Compete',
			items: [
				{ label: 'AGE Open Series', href: '/ageopen' },
				{ label: 'Standings', href: '/ageopen?tab=standings' },
				{ label: 'Decklists', href: '/ageopen?tab=decklists' },
				{ label: 'Players', href: '/ageopen?tab=standings' },
				{ label: 'Academy', href: '/academy' }
			]
		},
		{
			h: 'Company',
			items: [
				{ label: 'About AGE', href: '/about' },
				{ label: 'Advertise', href: '/advertise' },
				{ label: 'Contact', href: '/contact' },
				{ label: 'Status', href: '/status' },
				{ label: 'Roadmap', href: '/roadmap' },
				{ label: 'Newsletter', href: '/newsletter' }
			]
		}
	];

	const SOCIAL = [
		{ label: 'YT', href: 'https://youtube.com', aria: 'YouTube' },
		{ label: 'X', href: 'https://x.com', aria: 'X' },
		{ label: 'BS', href: 'https://bsky.app', aria: 'Bluesky' },
		{ label: 'DC', href: 'https://discord.gg', aria: 'Discord' }
	];

	const year = new Date().getFullYear();
</script>

<div class="border-t-3 border-double border-ink">
	<div
		class="mx-auto grid w-full max-w-400 grid-cols-1 gap-8 px-4 py-10 sm:grid-cols-2 md:px-10 md:py-10 lg:grid-cols-[2fr_1fr_1fr_1fr] lg:px-14 lg:py-12"
	>
		<div>
			<a href="/" aria-label="AGE home" class="inline-block">
				<img class="mb-3.5 h-8 invert" src="/logo.svg" alt="AGE" />
			</a>
			<p class="max-w-xs text-sm leading-normal text-soft">
				Arcane Games and Events — independent, member-supported competitive Flesh and Blood across
				Los Angeles, New England, and St. Louis.
			</p>
			<div class="mt-4 flex gap-2.5">
				{#each SOCIAL as { label, href, aria } (label)}
					<a
						{href}
						aria-label={aria}
						target="_blank"
						rel="noopener noreferrer"
						class="flex h-8 w-8 items-center justify-center border border-line2 text-xs font-extrabold text-soft hover:border-ink hover:text-ink"
					>
						{label}
					</a>
				{/each}
			</div>
		</div>

		{#each COLUMNS as col (col.h)}
			<div>
				<h6 class="mb-3.5 text-xs font-extrabold tracking-widest text-fade uppercase">
					{col.h}
				</h6>
				<ul class="m-0 list-none p-0 text-sm font-semibold">
					{#each col.items as { label, href } (label)}
						<li class="py-1.5 text-soft transition-colors hover:text-ink">
							<a {href}>{label}</a>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</div>
</div>

<div class="border-t border-line2">
	<div
		class="mx-auto flex w-full max-w-400 flex-wrap justify-between gap-2 px-4 py-4 text-xs font-semibold text-fade md:px-10 lg:px-14"
	>
		<span
			>© {year} Arcane Games and Events LLC · <a href="/privacy">Privacy</a> ·
			<a href="/terms">Terms</a> · <a href="/refund-policy">Refunds</a></span
		>
		<span>Flesh and Blood is a trademark of Legend Story Studios</span>
	</div>
</div>
