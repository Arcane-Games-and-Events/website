<script>
	/**
	 * Editorial user menu — the signed-in trigger and its dropdown for
	 * `<AgeHeader>`, in the same vocabulary as the header's AGE Open
	 * submenu: a plate-framed ink monogram, the first name in the nav's
	 * small caps, and a double-ruled paper panel with a serif heading, a
	 * short blue bar, hairline rows that invert to ink on hover and an
	 * arrow that slides in.
	 *
	 * Work tools (Admin, Desk, Staff) sit apart from the personal rows in a
	 * paper band at the top, each marked with a coloured icon tile, so the
	 * people who have them find them first. Same row size as the rest.
	 *
	 * The dropdown closes on outside click and on Escape.
	 */
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	/** @type {{ user: any, isPremium?: boolean }} */
	let { user, isPremium = false } = $props();

	const assignedEventsCount = $derived($page.data?.assignedEventsCount ?? 0);
	const isStaff = $derived(assignedEventsCount > 0);
	const isPartner = $derived($page.data?.isPartner ?? false);

	let open = $state(false);
	// Below sm the panel is fixed to the viewport width (the trigger sits
	// left of Get Premium and the burger, so a panel hung from it would
	// run off the screen). Its top is measured from the trigger when it
	// opens; the header's frosted backdrop makes the header the containing
	// block for fixed descendants, so the offset is taken from its top.
	let panelTop = $state(0);

	/** @type {HTMLDivElement | undefined} */
	let root;

	function close() {
		open = false;
	}

	function toggle() {
		if (!open && root) {
			const base = root.closest('header')?.getBoundingClientRect().top ?? 0;
			panelTop = Math.round(root.getBoundingClientRect().bottom - base + 8);
		}
		open = !open;
	}

	function onWindowClick(/** @type {MouseEvent} */ e) {
		if (!open) return;
		if (root && !root.contains(/** @type {Node} */ (e.target))) close();
	}

	function onKey(/** @type {KeyboardEvent} */ e) {
		if (e.key === 'Escape') close();
	}

	onMount(() => {
		window.addEventListener('click', onWindowClick);
		window.addEventListener('keydown', onKey);
		return () => {
			window.removeEventListener('click', onWindowClick);
			window.removeEventListener('keydown', onKey);
		};
	});

	const initials = $derived.by(() => {
		const a = (user?.firstName || '').trim().charAt(0).toUpperCase();
		const b = (user?.lastName || '').trim().charAt(0).toUpperCase();
		return a + b || (user?.email?.charAt(0).toUpperCase() ?? '?');
	});

	// Trigger label: the first name, or the email's local part, so the
	// trigger always carries the user's identity rather than "Account".
	const label = $derived.by(() => {
		const first = (user?.firstName || '').trim();
		if (first) return first;
		const email = user?.email || '';
		if (email.includes('@')) return email.split('@')[0];
		return email || 'Account';
	});

	const fullName = $derived(
		[user?.firstName, user?.lastName]
			.map((s) => (s || '').trim())
			.filter(Boolean)
			.join(' ') || label
	);

	const isAdmin = $derived(user?.role === 'admin');

	// Desk visibility mirrors `canAccessDesk` from src/lib/server/auth/roles.js —
	// admin billing tier OR the writer / editor / creator (teacher) role.
	const canAccessDesk = $derived(
		isAdmin ||
			(Array.isArray(user?.additionalRoles) &&
				['writer', 'editor', 'creator'].some((r) => user.additionalRoles.includes(r)))
	);

	const ITEMS = $derived([
		{ label: 'Account', href: '/account' },
		{ label: 'Refer a friend', href: '/account/referrals' },
		...(isPartner ? [{ label: 'Partner', href: '/partner' }] : [])
	]);

	// work tools, most powerful first
	const TOOLS = $derived([
		...(isAdmin
			? [{ key: 'admin', label: 'Admin', href: '/admin', tone: 'bg-warm text-white' }]
			: []),
		...(canAccessDesk
			? [{ key: 'desk', label: 'Desk', href: '/desk', tone: 'bg-gold text-ink' }]
			: []),
		...(isStaff
			? [
					{
						key: 'staff',
						label: 'Staff',
						href: '/staff',
						tone: 'bg-prem text-white',
						badge: assignedEventsCount
					}
				]
			: [])
	]);
</script>

<div class="relative" bind:this={root}>
	<!-- trigger: an outlined button — the burger's 40px height below lg,
	     Get Premium's 34px at lg+ where the burger is gone — labelled
	     with the monogram set into its left end and a person icon (the
	     "My account" label lives in the tooltip and accessible name);
	     inverts to ink on hover and while open -->
	<button
		type="button"
		onclick={toggle}
		aria-haspopup="menu"
		aria-expanded={open}
		aria-label="My account — {fullName}"
		title="My account"
		class="inline-flex h-10 cursor-pointer items-center gap-2 border-[1.5px] border-ink pr-[9px] pl-[3px] transition-colors lg:h-[34px] {open
			? 'bg-ink text-paper-bg'
			: 'bg-transparent text-ink hover:bg-ink hover:text-paper-bg'}"
	>
		<span
			class="flex h-[31px] w-[31px] items-center justify-center font-newsreader text-[14px] leading-none font-semibold tracking-[0.02em] text-white normal-case lg:h-[25px] lg:w-[25px] lg:text-[12.5px] {isPremium
				? 'bg-prem'
				: 'bg-ink'}"
			title={isPremium ? 'Premium member' : undefined}
		>
			{initials}
		</span>
		<svg
			class="h-[15px] w-[15px] shrink-0"
			viewBox="0 0 20 20"
			fill="currentColor"
			aria-hidden="true"
		>
			<circle cx="10" cy="6" r="4" />
			<path d="M2.5 19c0-4.4 3.4-7.5 7.5-7.5s7.5 3.1 7.5 7.5z" />
		</svg>
	</button>

	<!-- dropdown panel — the `before:` bridge fills the gap to the trigger
	     so the pointer can cross it without the menu closing -->
	{#if open}
		<div
			role="menu"
			class="fp-rise fixed inset-x-4 top-[var(--panel-top)] z-50 border-[3px] border-double border-ink bg-paper-bg shadow-[0_24px_44px_-24px_rgba(20,16,8,0.55)] before:absolute before:inset-x-0 before:-top-[12px] before:h-[12px] before:content-[''] sm:absolute sm:inset-x-auto sm:top-[calc(100%+8px)] sm:right-0 sm:w-[288px]"
			style="--panel-top: {panelTop}px; animation-duration: 0.3s;"
		>
			<!-- heading: name, email, membership -->
			<div class="border-b border-line px-4 pt-3 pb-3">
				<div class="flex items-baseline justify-between gap-3">
					<span
						class="truncate font-newsreader text-[17px] leading-tight font-semibold tracking-[-0.01em] text-ink"
						>{fullName}</span
					>
					<span class="h-[3px] w-6 shrink-0 bg-warm" aria-hidden="true"></span>
				</div>
				<div class="mt-1 truncate text-[10.5px] font-semibold text-fade">
					{user?.email ?? ''}
				</div>
				<div class="mt-2 text-[9.5px] font-extrabold tracking-[0.16em] uppercase">
					{#if isPremium}
						<span class="text-prem"><span aria-hidden="true">◆</span> Premium member</span>
					{:else}
						<a
							href="/premium"
							onclick={close}
							class="text-warm transition-[letter-spacing] hover:tracking-[0.22em]">Get Premium →</a
						>
					{/if}
				</div>
			</div>

			<!-- work tools: a paper band; rows match the personal rows below -->
			{#if TOOLS.length}
				<div class="border-b border-line2 bg-paper">
					<p
						class="px-4 pt-2.5 pb-1.5 text-[9px] font-extrabold tracking-[0.22em] text-fade uppercase"
					>
						<span class="text-warm" aria-hidden="true">◆</span> Your tools
					</p>
					<ul role="none" class="m-0 list-none p-0">
						{#each TOOLS as tool (tool.href)}
							<li role="none" class="border-t border-line2">
								<a
									role="menuitem"
									href={tool.href}
									onclick={close}
									class="group/mi flex items-center justify-between gap-3 px-4 py-[11px] text-[10.5px] font-extrabold tracking-[0.14em] text-ink uppercase transition-colors hover:bg-ink hover:text-paper-bg"
								>
									<span class="flex items-center gap-2.5">
										<!-- negative margin: the tile never makes the row taller -->
										<span
											class="-my-[3px] flex h-5 w-5 shrink-0 items-center justify-center {tool.tone}"
											aria-hidden="true">{@render toolIcon(tool.key)}</span
										>
										{tool.label}
										{#if tool.badge}
											<span
												class="inline-flex min-w-[18px] items-center justify-center bg-prem px-[5px] py-[1px] font-newsreader text-[11px] leading-none font-semibold text-white normal-case tabular-nums"
												aria-label="{tool.badge} assigned {tool.badge === 1 ? 'event' : 'events'}"
												>{tool.badge}</span
											>
										{/if}
									</span>
									<span
										class="-translate-x-1 opacity-0 transition-[opacity,transform] group-hover/mi:translate-x-0 group-hover/mi:opacity-100"
										aria-hidden="true">→</span
									>
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<!-- rows -->
			<ul role="none" class="m-0 list-none p-0">
				{#each ITEMS as item (item.href)}
					<li role="none" class="border-b border-line">
						<a
							role="menuitem"
							href={item.href}
							onclick={close}
							class="group/mi flex items-center justify-between gap-3 px-4 py-[11px] text-[10.5px] font-extrabold tracking-[0.14em] text-soft uppercase transition-colors hover:bg-ink hover:text-paper-bg"
						>
							<span>{item.label}</span>
							<span
								class="-translate-x-1 opacity-0 transition-[opacity,transform] group-hover/mi:translate-x-0 group-hover/mi:opacity-100"
								aria-hidden="true">→</span
							>
						</a>
					</li>
				{/each}
			</ul>

			<!-- sign out — the menu stays open here because closing would
			     unmount the form before the browser submits it; the server
			     redirects to /login on success -->
			<form method="POST" action="/logout">
				<button
					type="submit"
					class="group/so flex w-full cursor-pointer items-center justify-between px-4 py-[11px] text-[10.5px] font-extrabold tracking-[0.14em] text-fade uppercase transition-colors hover:bg-warm hover:text-white"
				>
					<span>Sign out</span>
					<span
						class="-translate-x-1 opacity-0 transition-[opacity,transform] group-hover/so:translate-x-0 group-hover/so:opacity-100"
						aria-hidden="true">→</span
					>
				</button>
			</form>
		</div>
	{/if}
</div>

{#snippet toolIcon(key)}
	<svg
		viewBox="0 0 20 20"
		class="h-3 w-3"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linejoin="round"
		stroke-linecap="round"
	>
		{#if key === 'staff'}
			<!-- lanyard badge -->
			<path d="M8 3.5V2h4v1.5" /><rect x="4" y="3.5" width="12" height="14.5" /><circle
				cx="10"
				cy="9"
				r="2.2"
			/><path d="M6.8 15c.6-1.6 1.7-2.5 3.2-2.5s2.6.9 3.2 2.5" />
		{:else if key === 'desk'}
			<!-- pen -->
			<path d="M13.6 2.9l3.5 3.5L7.5 16H4v-3.5z" /><path d="M11.4 5.1l3.5 3.5" />
		{:else}
			<!-- shield -->
			<path d="M10 2l6.5 2.6v4.9c0 4-2.7 6.9-6.5 8.5-3.8-1.6-6.5-4.5-6.5-8.5V4.6z" /><path
				d="M7.2 10.1l2 2 3.7-3.9"
			/>
		{/if}
	</svg>
{/snippet}
