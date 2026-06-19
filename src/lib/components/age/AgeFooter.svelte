<script>
	const COLUMNS = [
		{
			h: 'Read',
			items: [
				{ label: 'Latest Articles', href: '/library' },
				{ label: 'Pro Insight', href: '/library?tier=premium' },
				{ label: 'The SAGE Series', href: '/library?series=sage' },
				{ label: 'Set Reviews', href: '/library?topic=set-review' },
				{ label: 'Premium', href: '/premium' }
			]
		},
		{
			h: 'Compete',
			items: [
				{ label: 'AGE Open Series', href: '/age-open' },
				{ label: 'Standings', href: '/age-open?tab=standings' },
				{ label: 'Decklists', href: '/age-open?tab=decklists' },
				{ label: 'Players', href: '/age-open?tab=standings' },
				{ label: 'Academy', href: '/academy' }
			]
		},
		{
			h: 'Company',
			items: [
				{ label: 'About AGE', href: '/about' },
				{ label: 'AGE Studios', href: '/studios' },
				{ label: 'Advertise', href: '/advertise' },
				{ label: 'Contact', href: '/contact' },
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

<div class="border-ink border-t-[3px] border-double">
<div
	class="mx-auto grid w-full max-w-[min(94vw,1920px)] grid-cols-[2fr_1fr_1fr_1fr] gap-8 px-14 py-[46px]"
>
	<div>
		<a href="/" aria-label="AGE home" class="inline-block">
			<img
				class="mb-[14px] h-[30px] invert"
				src="https://www.age.events/logo.svg"
				alt="AGE"
			/>
		</a>
		<p class="text-soft max-w-[320px] text-[13px] leading-[1.55]">
			Arcane Games and Events — independent, member-supported competitive Flesh and Blood across
			Los Angeles, New England, and St. Louis.
		</p>
		<div class="mt-4 flex gap-[10px]">
			{#each SOCIAL as { label, href, aria } (label)}
				<a
					{href}
					aria-label={aria}
					target="_blank"
					rel="noopener noreferrer"
					class="border-line2 text-soft hover:border-ink hover:text-ink flex h-8 w-8 items-center justify-center border text-[10px] font-extrabold"
				>
					{label}
				</a>
			{/each}
		</div>
	</div>

	{#each COLUMNS as col (col.h)}
		<div>
			<h6 class="text-fade mb-[13px] text-[11px] font-extrabold tracking-[0.12em] uppercase">
				{col.h}
			</h6>
			<ul class="m-0 list-none p-0 text-[13.5px] font-semibold">
				{#each col.items as { label, href } (label)}
					<li class="text-soft hover:text-ink py-[5px] transition-colors">
						<a {href}>{label}</a>
					</li>
				{/each}
			</ul>
		</div>
	{/each}
</div>

</div>

<div class="border-line2 border-t">
	<div
		class="text-fade mx-auto flex w-full max-w-[min(94vw,1920px)] justify-between px-14 py-4 text-[11px] font-semibold"
	>
		<span>© {year} Arcane Games and Events LLC · <a href="/privacy">Privacy</a> · <a href="/terms">Terms</a></span>
		<span>Flesh and Blood is a trademark of Legend Story Studios</span>
	</div>
</div>
