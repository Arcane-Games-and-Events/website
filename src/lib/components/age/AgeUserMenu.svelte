<script>
	/**
	 * Editorial user menu — the trigger chip + dropdown panel for the
	 * signed-in state of `<AgeHeader>`.
	 *
	 * Style cues match the rest of the editorial chrome: ink-bordered
	 * chip, paper-tone dropdown with hairline rules, uppercase tracked
	 * labels, and the same hover invert (ink bg + paper-bg text).
	 *
	 * The dropdown closes on outside click and on Escape.
	 */
	import { page } from '$app/stores';
	import { onMount } from 'svelte';

	/** @type {{ user: any, isPremium?: boolean }} */
	let { user, isPremium = false } = $props();

	const assignedEventsCount = $derived($page.data?.assignedEventsCount ?? 0);
	const isStaff = $derived(assignedEventsCount > 0);

	let open = $state(false);

	/** @type {HTMLDivElement | undefined} */
	let root;

	function close() {
		open = false;
	}

	function toggle() {
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

	function initials() {
		const a = (user?.firstName || '').trim().charAt(0).toUpperCase();
		const b = (user?.lastName || '').trim().charAt(0).toUpperCase();
		return a + b || (user?.email?.charAt(0).toUpperCase() ?? '?');
	}

	// Trigger-chip label. Prefer first name; if it's missing, fall back
	// to the email's local part so the chip never renders the generic
	// "Account" word — the user's identity should be the primary label
	// on every page.
	function triggerLabel() {
		const first = (user?.firstName || '').trim();
		if (first) return first;
		const email = user?.email || '';
		if (email.includes('@')) return email.split('@')[0];
		return email || 'Account';
	}

	const isAdmin = $derived(user?.role === 'admin');

	const ITEMS = $derived([
		{ label: 'Account', href: '/account' },
		{ label: 'Refer a Friend', href: '/account/referrals' },
		...(isStaff ? [{ label: 'Staff', href: '/staff', badge: assignedEventsCount }] : []),
		...(isAdmin ? [{ label: 'Admin', href: '/admin' }] : [])
	]);
</script>

<div class="relative" bind:this={root}>
	<!-- trigger chip -->
	<button
		type="button"
		onclick={toggle}
		aria-haspopup="menu"
		aria-expanded={open}
		class="group border-ink hover:bg-ink hover:text-paper-bg inline-flex h-9 cursor-pointer items-center gap-[10px] border-[1.5px] bg-transparent pr-[10px] pl-[6px] text-[11px] font-bold tracking-[0.06em] uppercase transition-colors"
	>
		<span
			class="bg-ink text-paper-bg group-hover:bg-paper-bg group-hover:text-ink relative inline-flex h-[26px] w-[26px] items-center justify-center text-[10px] font-extrabold leading-none transition-colors"
		>
			{initials()}
			{#if isPremium}
				<span
					class="bg-prem absolute -right-[2px] -bottom-[2px] block h-[8px] w-[8px] ring-[1.5px] ring-current"
					aria-label="Premium member"
				></span>
			{/if}
		</span>
		<span class="hidden sm:inline">{triggerLabel()}</span>
		<svg
			class="hidden h-[8px] w-[10px] sm:block"
			viewBox="0 0 10 8"
			fill="none"
			stroke="currentColor"
			stroke-width="1.6"
			stroke-linecap="square"
			aria-hidden="true"
		>
			<path d="M1.5 2 L5 6 L8.5 2" />
		</svg>
	</button>

	<!-- dropdown panel -->
	{#if open}
		<div
			role="menu"
			class="bg-paper-bg border-ink absolute top-[calc(100%+4px)] right-0 z-50 w-[280px] border-[1.5px] shadow-[0_18px_36px_-22px_rgba(20,16,8,0.5)]"
		>
			<!-- header: name + email -->
			<div class="border-line2 border-b px-4 pt-[14px] pb-[12px]">
				<div class="font-newsreader text-ink text-[16px] leading-[1.15] font-semibold">
					{user?.firstName ?? ''}
					{user?.lastName ?? ''}
				</div>
				<div class="text-fade mt-[3px] truncate text-[11px] font-semibold">
					{user?.email ?? ''}
				</div>
				{#if isPremium}
					<span
						class="bg-prem mt-[10px] inline-flex items-center gap-[6px] px-[8px] py-[3px] text-[9px] font-extrabold tracking-[0.12em] text-white uppercase"
					>
						AGE Premium
					</span>
				{/if}
			</div>

			<!-- nav items -->
			<ul role="none" class="m-0 list-none p-0">
				{#each ITEMS as item (item.href)}
					<li role="none" class="border-line border-b last:border-b-0">
						<a
							role="menuitem"
							href={item.href}
							onclick={close}
							class="text-soft hover:bg-ink hover:text-paper-bg flex items-center justify-between gap-3 px-4 py-[11px] text-[11px] font-extrabold tracking-[0.12em] uppercase transition-colors"
						>
							<span>{item.label}</span>
							<span class="ml-auto flex items-center gap-[10px]">
								{#if item.badge}
									<span
										class="border-prem/40 bg-prem/10 text-prem inline-flex items-center border px-[6px] py-[1px] text-[9px] font-extrabold tabular-nums"
									>
										{item.badge}
									</span>
								{/if}
								<span class="opacity-60" aria-hidden="true">→</span>
							</span>
						</a>
					</li>
				{/each}
			</ul>

			<!-- logout — don't close the menu here, because closing would
				 unmount this form before the browser fires the submit. The
				 server redirects to /login on success anyway. -->
			<form method="POST" action="/logout" class="border-line2 border-t">
				<button
					type="submit"
					class="text-warm hover:bg-warm hover:text-paper-bg flex w-full cursor-pointer items-center justify-between px-4 py-[11px] text-[11px] font-extrabold tracking-[0.12em] uppercase transition-colors"
				>
					<span>Sign out</span>
					<span class="opacity-60" aria-hidden="true">↪</span>
				</button>
			</form>
		</div>
	{/if}
</div>
