<script>
	/**
	 * Editorial topbar for the admin surface.
	 *
	 * Mirrors the public site's paper/ink editorial voice — same border
	 * rhythm, same mono captions — with a green (prem) top hairline so
	 * the operator can tell at a glance they are in the ops surface, not
	 * the reader-facing site.
	 */
	/** @type {{ currentPage?: string, badges?: Record<string, number>, userEmail?: string | null }} */
	let { currentPage = '', badges = {}, userEmail = null } = $props();

	const NAV = [
		{ id: 'analytics', label: 'Analytics', href: '/admin/analytics' },
		{ id: 'content-analytics', label: 'Content', href: '/admin/content-analytics' },
		{ id: 'orders', label: 'Orders', href: '/admin/orders' },
		{ id: 'users', label: 'Users', href: '/admin/users' },
		{ id: 'events', label: 'Events', href: '/admin/events' },
		{ id: 'calendar', label: 'Calendar', href: '/admin/calendar' },
		{ id: 'podcasts', label: 'Podcasts', href: '/admin/podcasts' },
		{ id: 'vods', label: 'VODs', href: '/admin/vods' },
		{ id: 'cards', label: 'Cards', href: '/admin/cards' },
		{ id: 'partners', label: 'Partners', href: '/admin/partners' }
	];

	let mobileOpen = $state(false);

	const activeLabel = $derived(NAV.find((n) => n.id === currentPage)?.label ?? 'Admin');
</script>

<!-- Prem hairline — signals "admin surface" -->
<div class="bg-prem h-[6px]"></div>

<!-- Header band -->
<div class="bg-paper-bg border-ink border-b border-double">
	<div
		class="mx-auto flex w-full max-w-[1600px] items-center gap-6 px-4 md:px-10 lg:px-14 py-[14px]"
	>
		<a href="/admin/analytics" class="flex items-center gap-[10px]">
			<span
				class="bg-ink font-mono-system inline-flex items-center px-[9px] py-[5px] text-[10px] font-extrabold tracking-[0.16em] text-white uppercase"
			>
				AGE
			</span>
			<span
				class="font-mono-system text-fade text-[10px] font-extrabold tracking-[0.16em] uppercase"
			>
				Admin
			</span>
		</a>

		<span class="bg-line2 hidden h-[16px] w-[1px] md:block"></span>

		<div class="hidden md:block">
			<span
				class="font-mono-system text-warm text-[10px] font-extrabold tracking-[0.16em] uppercase"
			>
				{activeLabel}
			</span>
		</div>

		<div class="ml-auto flex items-center gap-3">
			<a
				href="/"
				class="font-mono-system text-fade hover:text-ink hidden text-[10px] font-bold tracking-[0.12em] uppercase transition-colors md:inline-flex"
			>
				← Back to site
			</a>
			{#if userEmail}
				<span
					class="font-mono-system text-fade hidden truncate text-[10px] font-bold tracking-[0.06em] uppercase md:inline-block max-w-[220px]"
					title={userEmail}
				>
					{userEmail}
				</span>
			{/if}
			<form method="POST" action="/logout" class="hidden md:inline" data-sveltekit-preload-data="off">
				<button
					type="submit"
					class="border-line2 hover:border-ink font-mono-system border px-[12px] py-[6px] text-[10px] font-bold tracking-[0.1em] uppercase transition-colors"
				>
					Sign out
				</button>
			</form>
			<button
				type="button"
				onclick={() => (mobileOpen = !mobileOpen)}
				aria-label="Toggle menu"
				class="border-line2 hover:border-ink flex h-[36px] w-[36px] items-center justify-center border transition-colors md:hidden"
			>
				<svg
					class="text-ink h-4 w-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
				</svg>
			</button>
		</div>
	</div>
</div>

<!-- Nav rail (desktop) -->
<div class="bg-paper-bg border-ink hidden border-b-[3px] border-double md:block">
	<div class="mx-auto w-full max-w-[1600px] px-4 md:px-10 lg:px-14">
		<nav class="flex items-center gap-1 overflow-x-auto whitespace-nowrap">
			{#each NAV as item (item.id)}
				{@const active = currentPage === item.id}
				{@const badge = badges[item.id]}
				<a
					href={item.href}
					class="font-mono-system relative inline-flex items-center gap-[8px] px-[14px] py-[13px] text-[10.5px] font-extrabold tracking-[0.14em] uppercase transition-colors {active
						? 'text-ink'
						: 'text-fade hover:text-ink'}"
				>
					{item.label}
					{#if badge && badge > 0}
						<span
							class="bg-warm inline-flex min-w-[16px] items-center justify-center px-1 py-[1px] text-[9px] font-extrabold tracking-normal text-white"
						>
							{badge}
						</span>
					{/if}
					{#if active}
						<span class="bg-warm absolute inset-x-[10px] bottom-0 h-[2px]"></span>
					{/if}
				</a>
			{/each}
		</nav>
	</div>
</div>

<!-- Mobile drawer -->
{#if mobileOpen}
	<div
		class="bg-paper-bg border-ink border-b-[3px] border-double md:hidden"
	>
		<div class="mx-auto w-full max-w-[1600px] px-4 py-2">
			<nav class="grid grid-cols-2 gap-1">
				{#each NAV as item (item.id)}
					{@const active = currentPage === item.id}
					{@const badge = badges[item.id]}
					<a
						href={item.href}
						onclick={() => (mobileOpen = false)}
						class="font-mono-system border-line2 flex items-center justify-between border px-[12px] py-[10px] text-[10.5px] font-extrabold tracking-[0.12em] uppercase transition-colors {active
							? 'border-ink text-ink'
							: 'text-fade hover:text-ink'}"
					>
						<span>{item.label}</span>
						{#if badge && badge > 0}
							<span
								class="bg-warm inline-flex min-w-[16px] items-center justify-center px-1 py-[1px] text-[9px] font-extrabold tracking-normal text-white"
							>
								{badge}
							</span>
						{/if}
					</a>
				{/each}
			</nav>
			<div class="mt-2 flex items-center justify-between border-line2 border-t pt-2">
				<a
					href="/"
					class="font-mono-system text-fade text-[10px] font-bold tracking-[0.12em] uppercase"
				>
					← Back to site
				</a>
				<form method="POST" action="/logout" data-sveltekit-preload-data="off">
					<button
						type="submit"
						class="font-mono-system text-fade text-[10px] font-bold tracking-[0.12em] uppercase"
					>
						Sign out
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}
