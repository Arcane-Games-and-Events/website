<script>
	import AgeShell from '$lib/components/age/AgeShell.svelte';

	let { data } = $props();

	const date = (d) =>
		d
			? new Date(d).toLocaleDateString('en-US', {
					month: 'long',
					day: 'numeric',
					year: 'numeric',
					timeZone: 'UTC'
				})
			: '—';
	const dollars = (c) => `$${(Number(c || 0) / 100).toFixed(Number(c) % 100 === 0 ? 0 : 2)}`;
	const noun = $derived(data.plan === 'yearly' ? 'year' : 'month');

	const next = [
		{
			href: '/library',
			label: 'Library',
			desc: 'Every premium article and the full gameplay library.'
		},
		{ href: '/academy', label: 'Academy', desc: 'Courses from the players who write for us.' },
		{
			href: '/ageopen',
			label: 'AGE Open',
			desc: 'Standings, results and your member ticket discount.'
		},
		{
			href: '/account/referrals',
			label: 'Bring a friend',
			desc: 'Your referral code earns you a free month.'
		}
	];
</script>

<svelte:head>
	<title>Welcome to AGE Premium</title>
</svelte:head>

<AgeShell>
	<section class="bg-ink text-paper-bg">
		<div class="mx-auto w-full max-w-page px-5 py-14 md:px-8 md:py-20">
			<p class="text-xs font-extrabold tracking-widest text-prem-light uppercase">
				<span aria-hidden="true">◆</span> AGE Premium
			</p>
			<h1
				class="fp-rise mt-5 font-newsreader text-5xl leading-none font-semibold tracking-tight [text-wrap:balance] md:text-7xl"
			>
				Welcome aboard{data.firstName ? `, ${data.firstName}` : ''}.
			</h1>
			<p class="mt-6 max-w-xl font-newsreader text-xl leading-normal text-paper-bg/75">
				Thank you for keeping AGE going. Your membership is live; everything it unlocks is open to
				you now, and a receipt is on its way to {data.email}.
			</p>
		</div>
	</section>

	<section class="border-b border-line bg-paper">
		<div
			class="mx-auto grid w-full max-w-page gap-10 px-5 py-12 md:px-8 md:py-16 lg:grid-cols-[minmax(0,1fr)_420px]"
		>
			<div>
				<h2 class="text-xs font-extrabold tracking-widest uppercase">
					<span class="text-xs text-prem" aria-hidden="true">◆</span> Where to next
				</h2>
				<ol class="mt-5 grid gap-px border-t-3 border-ink bg-line2 sm:grid-cols-2">
					{#each next as link, i (link.href)}
						<li class="bg-paper-bg">
							<a
								href={link.href}
								class="group flex h-full flex-col px-6 py-6 transition-colors hover:bg-paper"
							>
								<span class="ao-cond text-4xl leading-none font-black text-prem tabular-nums"
									>{String(i + 1).padStart(2, '0')}</span
								>
								<span class="mt-4 text-xs font-extrabold tracking-widest uppercase"
									>{link.label}
									<span
										aria-hidden="true"
										class="inline-block transition-transform group-hover:translate-x-1">→</span
									></span
								>
								<span class="mt-2 font-newsreader text-base leading-normal text-soft"
									>{link.desc}</span
								>
							</a>
						</li>
					{/each}
				</ol>
			</div>

			<aside class="border border-t-3 border-line2 border-t-ink bg-paper-bg">
				<div class="px-6 pt-5 pb-6">
					<p class="text-xs font-extrabold tracking-widest text-fade uppercase">Your membership</p>
					<dl class="mt-4 divide-y divide-line text-sm">
						<div class="flex items-baseline justify-between py-2.5">
							<dt class="text-soft">Plan</dt>
							<dd class="font-semibold">
								{data.plan === 'yearly' ? 'Annual' : 'Monthly'} · {dollars(data.priceCents)} / {noun}
							</dd>
						</div>
						{#if data.chargedCents != null}
							<div class="flex items-baseline justify-between py-2.5">
								<dt class="text-soft">Charged today</dt>
								<dd class="font-semibold tabular-nums">{dollars(data.chargedCents)}</dd>
							</div>
						{/if}
						<div class="flex items-baseline justify-between py-2.5">
							<dt class="text-soft">Paid through</dt>
							<dd class="font-semibold">{date(data.paidThrough)}</dd>
						</div>
						<div class="flex items-baseline justify-between py-2.5">
							<dt class="text-soft">Next renewal</dt>
							<dd class="font-semibold">{date(data.nextChargeAt)}</dd>
						</div>
						{#if data.card}
							<div class="flex items-baseline justify-between py-2.5">
								<dt class="text-soft">Card</dt>
								<dd class="font-semibold">{data.card.brand} •••• {data.card.lastFour}</dd>
							</div>
						{/if}
					</dl>
					<a
						href="/account/membership"
						class="mt-5 inline-flex h-11 w-full items-center justify-center bg-ink px-5 text-xs font-extrabold tracking-widest text-paper-bg uppercase transition-colors hover:bg-warm"
						>Manage membership</a
					>
					<p class="mt-3 text-xs leading-snug text-fade">
						Renews automatically every {noun}. Cancel any time from your account; cancelling stops
						future charges and keeps your access to the end of the period.
					</p>
				</div>
			</aside>
		</div>
	</section>
</AgeShell>
