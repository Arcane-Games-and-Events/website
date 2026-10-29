<script>
	import { page } from '$app/stores';
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import PremiumTag from '$lib/components/age/PremiumTag.svelte';

	let { data, children } = $props();

	const NAV = [
		{ href: '/account/membership', label: 'Membership' },
		{ href: '/account/tickets', label: 'Tickets' },
		{ href: '/account/purchases', label: 'Purchases' },
		{ href: '/account/payment-methods', label: 'Payment methods' },
		{ href: '/account/referrals', label: 'Referrals' },
		{ href: '/account/profile', label: 'Profile' },
		{ href: '/account/security', label: 'Security' }
	];
	const active = (href) => $page.url.pathname === href || $page.url.pathname.startsWith(href + '/');

	const memberSince = () =>
		data.user?.createdAt
			? new Date(data.user.createdAt).toLocaleDateString('en-US', {
					month: 'short',
					year: 'numeric'
				})
			: '—';
	const cardNameLong =
		`${data.user?.firstName || ''} ${data.user?.lastName || ''}`.trim().length > 20;
	const initials = () => {
		const a = (data.user?.firstName || '').trim().charAt(0).toUpperCase();
		const b = (data.user?.lastName || '').trim().charAt(0).toUpperCase();
		return a + b || (data.user?.email?.charAt(0).toUpperCase() ?? '?');
	};
	const standing = $derived(
		data.membershipStatus === 'past_due'
			? 'Payment needed'
			: data.membershipStatus === 'cancelled'
				? 'Cancelled'
				: data.isPremium
					? 'AGE Premium'
					: 'Free member'
	);
</script>

<svelte:head>
	<title>Account — AGE</title>
</svelte:head>

<AgeShell>
	<!-- ============ masthead: ink band + membership card ============ -->
	<section class="relative overflow-hidden bg-ink text-paper-bg">
		<span
			class="pointer-events-none absolute -right-6 -bottom-16 font-newsreader text-[260px] leading-none font-semibold tracking-[-0.06em] text-paper-bg/[0.035] select-none md:-bottom-24 md:text-[420px]"
			aria-hidden="true">{initials()}</span
		>
		<div
			class="relative mx-auto grid w-full max-w-[1200px] gap-10 px-5 pt-10 pb-12 md:px-8 md:pt-14 md:pb-16 lg:grid-cols-[1fr_400px] lg:items-center lg:gap-16"
		>
			<div class="fp-rise min-w-0">
				<p class="text-[9.5px] font-extrabold tracking-[0.26em] text-warm-light uppercase">
					<span aria-hidden="true">◆</span> Your account
				</p>
				<p
					class="mt-5 font-newsreader text-[20px] leading-none text-paper-bg/60 italic md:text-[26px]"
				>
					Welcome back,
				</p>
				<h1
					class="mt-1 font-newsreader text-[44px] leading-[0.95] font-semibold tracking-[-0.025em] [text-wrap:balance] md:text-[72px]"
				>
					{data.user?.firstName || ''}
					{data.user?.lastName || ''}
				</h1>
				<div class="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] text-paper-bg/55">
					{#if data.isPremium}<PremiumTag />{:else}<span
							class="border border-paper-bg/30 px-2 py-[3px] text-[9.5px] font-extrabold tracking-[0.16em] text-paper-bg/80 uppercase"
							>Free member</span
						>{/if}
					<span class="font-semibold">{data.user?.email}</span>
				</div>
				{#if !data.isPremium && !data.membershipStatus}
					<a
						href="/premium"
						class="mt-7 inline-block border-b-2 border-warm-light pb-1 text-[10.5px] font-extrabold tracking-[0.18em] uppercase transition-[letter-spacing] hover:tracking-[0.26em]"
						>Become a member →</a
					>
				{:else if data.membershipStatus === 'past_due'}
					<a
						href="/account/membership"
						class="mt-7 inline-block border-b-2 border-hero-rb pb-1 text-[10.5px] font-extrabold tracking-[0.18em] text-paper-bg uppercase"
						>Your last payment failed. Update your card →</a
					>
				{/if}
			</div>

			<!-- membership card -->
			<div class="fp-rise flex justify-center lg:justify-end" style="animation-delay: 160ms;">
				<div
					class="group relative aspect-[1.586] w-full max-w-[400px] rotate-[-1.5deg] text-ink transition-transform duration-700 ease-[cubic-bezier(0.22,0.61,0.36,1)] hover:rotate-0"
				>
					<div
						class="absolute inset-0 overflow-hidden bg-paper-bg"
						style="box-shadow: 0 1px 0 rgba(255,255,255,0.7) inset, 0 2px 3px rgba(0,0,0,0.25), 0 18px 30px -12px rgba(0,0,0,0.55), 0 40px 60px -30px rgba(0,0,0,0.7);"
					>
						<svg
							class="absolute inset-0 h-full w-full opacity-[0.12] mix-blend-multiply"
							aria-hidden="true"
						>
							<filter id="card-grain">
								<feTurbulence
									type="fractalNoise"
									baseFrequency="0.9"
									numOctaves="3"
									stitchTiles="stitch"
								/>
								<feColorMatrix values="0 0 0 0 0.3  0 0 0 0 0.27  0 0 0 0 0.2  0 0 0 0.9 0" />
							</filter>
							<rect width="100%" height="100%" filter="url(#card-grain)" />
						</svg>
						<span
							class="pointer-events-none absolute inset-[10px] border-[3px] border-double border-ink/80"
							aria-hidden="true"
						></span>
						{#each ['top-[5px] left-[5px]', 'top-[5px] right-[5px]', 'bottom-[5px] left-[5px]', 'bottom-[5px] right-[5px]'] as pos (pos)}
							<span
								class="pointer-events-none absolute {pos} bg-paper-bg px-[3px] text-[10px] leading-none text-warm"
								aria-hidden="true">◆</span
							>
						{/each}
					</div>

					<div
						class="absolute top-0 right-7 z-[2] flex w-[38px] flex-col items-center pt-2.5 pb-4 transition-transform duration-700 ease-[cubic-bezier(0.22,0.61,0.36,1)] group-hover:translate-y-1 md:right-8 md:w-[42px] md:pt-3 md:pb-5 {data.isPremium
							? 'bg-prem text-white'
							: 'bg-paper text-ink/70'}"
						style="clip-path: polygon(0 0, 100% 0, 100% 100%, 50% calc(100% - 12px), 0 100%); filter: drop-shadow(0 4px 4px rgba(0,0,0,0.25));"
						role="img"
						aria-label={data.isPremium ? 'Premium member' : 'Member'}
					>
						<span
							class="pointer-events-none absolute inset-x-[4px] top-0 bottom-[10px] border-x {data.isPremium
								? 'border-white/35'
								: 'border-ink/20'}"
							aria-hidden="true"
						></span>
						<span class="text-[10px] leading-none" aria-hidden="true">◆</span>
						<span
							class="mt-1.5 text-[7.5px] font-extrabold tracking-[0.24em] uppercase [writing-mode:vertical-rl] md:mt-2 md:text-[8.5px] md:tracking-[0.3em]"
							aria-hidden="true">{data.isPremium ? 'Premium' : 'Member'}</span
						>
					</div>

					<div
						class="relative flex h-full flex-col justify-between px-6 pt-6 pb-[22px] md:px-7 md:pt-7 md:pb-6"
					>
						<div class="flex items-start justify-between gap-4">
							<div>
								<img class="h-[22px] invert md:h-[26px]" src="/logo.svg" alt="AGE" />
								<p
									class="mt-2 text-[7.5px] font-extrabold tracking-[0.3em] text-warm uppercase md:text-[8px]"
								>
									<span aria-hidden="true">◆</span> Membership card
								</p>
							</div>
						</div>
						<div class="pr-12 md:pr-0">
							<p
								class="text-[7.5px] font-extrabold tracking-[0.26em] text-fade uppercase md:text-[8px]"
							>
								Member
							</p>
							<p
								class="mt-0.5 line-clamp-2 font-newsreader leading-[1.05] font-semibold tracking-[-0.015em] [text-wrap:balance] {cardNameLong
									? 'text-[18px] md:text-[21px]'
									: 'text-[22px] md:text-[26px]'}"
								style="text-shadow: 0 1px 0 rgba(255,255,255,0.8);"
							>
								{data.user?.firstName || ''}
								{data.user?.lastName || ''}
							</p>
							<p class="mt-1 font-newsreader text-[12.5px] text-soft italic md:text-[13.5px]">
								{#if data.isPremium}<span class="font-semibold text-prem not-italic"
										>{standing}</span
									>{:else}{standing}{/if} since {memberSince()}
							</p>
						</div>
						<dl class="grid grid-cols-2 gap-3 border-t border-ink/20 pt-2">
							{#each [['GEM ID', data.user?.gemId || '—'], ['Purchases', String(data.counts?.purchases || 0)]] as [k, v] (k)}
								<div>
									<dt
										class="text-[7px] font-extrabold tracking-[0.22em] text-fade uppercase md:text-[7.5px]"
									>
										{k}
									</dt>
									<dd
										class="mt-0.5 font-newsreader text-[14px] leading-tight font-semibold tabular-nums"
									>
										{v}
									</dd>
								</div>
							{/each}
						</dl>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- ============ rail + page ============ -->
	<div
		class="mx-auto grid w-full max-w-[1200px] grid-cols-[minmax(0,1fr)] gap-8 px-5 pt-10 pb-16 md:px-8 md:pt-14 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14"
	>
		<nav aria-label="Account sections" class="min-w-0 lg:sticky lg:top-24 lg:self-start">
			<ul
				class="-mx-5 flex gap-6 overflow-x-auto border-b border-line px-5 lg:mx-0 lg:block lg:overflow-visible lg:border-t lg:border-b-0 lg:px-0"
			>
				{#each NAV as t (t.href)}
					<li class="shrink-0 lg:border-b lg:border-line">
						<a
							href={t.href}
							aria-current={active(t.href) ? 'page' : undefined}
							class="group flex w-full items-center justify-between gap-3 border-b-2 py-3 text-left text-[10.5px] font-extrabold tracking-[0.16em] whitespace-nowrap uppercase transition-colors lg:border-b-0 lg:py-3.5 {active(
								t.href
							)
								? 'border-warm text-warm'
								: 'border-transparent text-soft hover:text-ink'}"
						>
							<span class="flex items-center gap-3">
								<span
									class="hidden h-[3px] w-4 transition-colors lg:block {active(t.href)
										? 'bg-warm'
										: 'bg-line2 group-hover:bg-ink'}"
									aria-hidden="true"
								></span>
								{t.label}
								{#if t.href === '/account/tickets' && data.counts?.upcomingTickets}
									<span class="text-[9px] text-fade">{data.counts.upcomingTickets}</span>
								{/if}
							</span>
							<span
								class="hidden -translate-x-1 opacity-0 transition-[opacity,transform] lg:inline {active(
									t.href
								)
									? 'translate-x-0 opacity-100'
									: 'group-hover:translate-x-0 group-hover:opacity-60'}"
								aria-hidden="true">→</span
							>
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<div class="min-w-0">
			{@render children()}
		</div>
	</div>
</AgeShell>
