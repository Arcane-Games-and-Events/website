<script>
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import FormatTag from '$lib/components/age/FormatTag.svelte';
	import { getCircuit, circuitVar } from '$lib/data/circuits.js';

	let { data } = $props();
	const t = $derived(data.ticket);
	const ev = $derived(t.event || {});
	const circuit = $derived(getCircuit(ev.circuit));
	const accent = $derived(circuitVar(ev.circuit));

	const utc = (d, opts) =>
		d ? new Date(d).toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' }) : '';
	const month = $derived(utc(ev.eventDate, { month: 'short' }).toUpperCase());
	const day = $derived(utc(ev.eventDate, { day: 'numeric' }));
	const longDate = $derived(
		utc(ev.eventDate, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) ||
			'Date TBA'
	);
	const time = $derived(
		ev.eventDate
			? new Date(ev.eventDate).toLocaleTimeString('en-US', {
					hour: 'numeric',
					minute: '2-digit',
					timeZone: 'UTC'
				})
			: ''
	);
	const daysLeft = $derived.by(() => {
		if (!ev.eventDate) return null;
		const end = new Date(ev.eventDate);
		end.setUTCHours(23, 59, 59, 999);
		return Math.max(0, Math.floor((end.getTime() - Date.now()) / 86400000));
	});
	const countdown = $derived(
		daysLeft == null
			? ''
			: daysLeft === 0
				? 'Today'
				: daysLeft === 1
					? 'Tomorrow'
					: `In ${daysLeft} days`
	);
	const paid = $derived(Number(t.amountPaid) > 0 ? `$${Number(t.amountPaid).toFixed(2)}` : 'Free');
	const player = $derived([t.firstName, t.lastName].filter(Boolean).join(' ') || 'Player');
</script>

<svelte:head>
	<title>Your ticket · {ev.title || 'AGE Open'} — AGE</title>
</svelte:head>

<AgeShell active="AGE Open">
	<!-- ============ ink band ============ -->
	<section class="relative overflow-hidden bg-ink text-paper-bg">
		<div
			class="absolute inset-0 mix-blend-multiply"
			style="background: {accent}; opacity: 0.18;"
			aria-hidden="true"
		></div>
		<div
			class="relative mx-auto grid w-full max-w-page items-center gap-10 px-5 pt-12 pb-14 md:px-8 md:pt-16 md:pb-20 lg:grid-cols-[minmax(0,1fr)_480px] lg:gap-16"
		>
			<div class="fp-rise min-w-0">
				<p class="text-xs font-extrabold tracking-widest text-warm-light uppercase">
					<span aria-hidden="true">◆</span>
					{t.refunded ? 'Refunded' : data.isNew ? 'Purchase confirmed' : 'Your ticket'}
				</p>
				<h1
					class="ao-cond mt-5 text-6xl leading-none font-black [text-wrap:balance] uppercase md:text-8xl"
				>
					{#if t.refunded}This one's refunded.{:else}You're in.{/if}
				</h1>
				<p class="mt-6 max-w-lg font-newsreader text-lg leading-normal text-paper-bg/75 md:text-xl">
					{#if t.refunded}
						The seat has been released and the money is on its way back to your card.
					{:else}
						A seat at {ev.title || 'the event'} is yours. There's nothing to print or bring: we enter
						every player into GEM before the event, and you'll be paired from there. The code on the
						ticket is only a backup in case we need to look you up on the day.
						{#if data.siblings.length}
							This order also covers {data.siblings
								.map((s) => [s.firstName, s.lastName].filter(Boolean).join(' ') || 'another player')
								.join(', ')}.
						{/if}
					{/if}
				</p>
				{#if !t.refunded}
					<p
						class="mt-6 inline-flex items-center gap-2.5 border px-4 py-2.5 text-xs font-extrabold tracking-widest uppercase {t.enteredIntoGem
							? 'border-prem-light/60 text-prem-light'
							: 'border-paper-bg/30 text-paper-bg/70'}"
					>
						<span
							class="h-2 w-2 {t.enteredIntoGem
								? 'bg-prem-light'
								: 'animate-pulse-dot bg-paper-bg/60'}"
							aria-hidden="true"
						></span>
						{#if t.enteredIntoGem}Entered into GEM{:else}GEM entry pending · done before the event{/if}
					</p>
				{/if}
				<div class="mt-8 flex flex-wrap gap-3">
					{#if data.isOwner}
						<a
							href="/account/tickets"
							class="inline-flex items-center bg-paper-bg px-6 py-3.5 text-xs font-extrabold tracking-widest text-ink uppercase transition-colors hover:bg-warm hover:text-white"
							>Your tickets →</a
						>
					{/if}
					<a
						href="/ageopen/{ev.id || ''}"
						class="inline-flex items-center border border-paper-bg/40 px-6 py-3.5 text-xs font-extrabold tracking-widest uppercase transition-colors hover:border-paper-bg"
						>Event page</a
					>
				</div>
			</div>

			<!-- ============ the admission ticket ============ -->
			<div class="fp-rise flex justify-center lg:justify-end" style="animation-delay: 160ms;">
				<div
					class="relative w-full max-w-lg rotate-2 transition-transform duration-700 ease-out hover:rotate-0 {t.refunded
						? 'opacity-70 grayscale'
						: ''}"
					style="filter: drop-shadow(0 24px 30px rgba(0,0,0,0.55));"
				>
					<div class="grid grid-cols-[1fr_92px] bg-paper-bg text-ink">
						<!-- body -->
						<div class="min-w-0">
							<div class="relative aspect-16/7 overflow-hidden bg-ink">
								<img
									src={circuit.image}
									alt=""
									class="absolute inset-0 h-full w-full object-cover"
								/>
								<span
									class="absolute inset-0"
									style="background: linear-gradient(90deg, color-mix(in srgb, {accent} 72%, rgba(23,21,15,0.55)) 0%, rgba(23,21,15,0) 80%);"
									aria-hidden="true"
								></span>
								<span
									class="absolute bottom-3 left-4 text-xs font-extrabold tracking-widest text-white uppercase"
									>◆ AGE Open{ev.circuit ? ` · ${ev.circuit}` : ''}</span
								>
							</div>
							<div class="px-5 pt-4 pb-5">
								<p class="ao-cond text-3xl leading-none font-black [text-wrap:balance] uppercase">
									{ev.title || 'AGE Open'}
								</p>
								<p class="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
									{#if ev.format}<FormatTag format={ev.format} />{/if}
									<span class="text-xs font-semibold text-fade"
										>{longDate}{time ? ` · ${time}` : ''}</span
									>
								</p>
								{#if ev.location}
									<p class="mt-1 text-xs font-semibold text-fade">
										{ev.location}{ev.address ? ` · ${ev.address}` : ''}
									</p>
								{/if}
								<dl class="mt-4 grid grid-cols-[1fr_auto] gap-3 border-t border-line pt-4">
									<div class="min-w-0">
										<dt class="text-xs font-extrabold tracking-widest text-fade uppercase">
											Player
										</dt>
										<dd class="mt-0.5 truncate font-newsreader text-lg leading-tight font-semibold">
											{player}
										</dd>
										{#if t.gemId}<dd class="text-xs font-semibold text-fade">
												GEM {t.gemId}
											</dd>{/if}
									</div>
									<div class="text-right">
										<dt class="text-xs font-extrabold tracking-widest text-fade uppercase">Paid</dt>
										<dd class="ao-cond mt-0.5 text-3xl leading-none font-black tabular-nums">
											{paid}
										</dd>
									</div>
								</dl>
								<p class="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
									<span class="text-xs font-extrabold tracking-widest text-fade uppercase">GEM</span
									>
									<span
										class="inline-flex items-center gap-1.5 text-xs font-extrabold tracking-widest uppercase {t.enteredIntoGem
											? 'text-prem'
											: 'text-fade'}"
									>
										<span
											class="h-1.5 w-1.5 {t.enteredIntoGem ? 'bg-prem' : 'bg-line2'}"
											aria-hidden="true"
										></span>
										{t.enteredIntoGem ? 'Entered' : 'Pending'}
									</span>
								</p>
								<p class="mt-2 flex items-center justify-between gap-3">
									<span class="text-xs font-extrabold tracking-widest text-fade uppercase"
										>Backup code</span
									>
									<span class="font-mono text-sm font-semibold tracking-widest tabular-nums"
										>{t.code}</span
									>
								</p>
							</div>
						</div>
						<!-- stub -->
						<div
							class="relative flex flex-col items-center justify-between bg-paper py-5 text-center"
						>
							<span class="ao-perf absolute inset-y-2 left-0 w-px text-line2" aria-hidden="true"
							></span>
							<span
								class="text-xs font-extrabold tracking-widest text-fade uppercase [writing-mode:vertical-rl]"
								>Admit one</span
							>
							<span>
								<span class="block text-xs font-extrabold tracking-widest" style="color: {accent};"
									>{month || 'TBA'}</span
								>
								<span class="ao-cond block text-5xl leading-none font-black tabular-nums"
									>{day || '—'}</span
								>
							</span>
							<span
								class="inline-flex items-center gap-1.5 text-xs font-extrabold tracking-widest text-warm uppercase"
							>
								{#if countdown}<span
										class="h-1.5 w-1.5 animate-pulse-dot bg-warm"
										aria-hidden="true"
									></span>{countdown}{/if}
							</span>
						</div>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- ============ the particulars ============ -->
	<section class="border-b border-line bg-paper">
		<div
			class="mx-auto grid w-full max-w-page gap-px border-x border-line bg-line px-0 sm:grid-cols-3"
		>
			{#each [['When', `${longDate}${time ? ` · ${time}` : ''}`], ['Where', ev.location ? `${ev.location}${ev.address ? ` · ${ev.address}` : ''}` : 'Venue TBA'], ['Purchased', utc( t.createdAt, { month: 'long', day: 'numeric', year: 'numeric' } )]] as [k, v] (k)}
				<div class="bg-paper px-5 py-5 md:px-8">
					<p class="text-xs font-extrabold tracking-widest text-fade uppercase">{k}</p>
					<p class="mt-1.5 font-newsreader text-lg leading-snug font-semibold">{v}</p>
				</div>
			{/each}
		</div>
	</section>

	{#if data.isOwner && !t.refunded}
		<section class="mx-auto w-full max-w-page px-5 py-10 md:px-8 md:py-14">
			<p class="max-w-2xl font-newsreader text-base leading-normal text-soft">
				Plans change? Tickets can be refunded from <a
					href="/account/tickets"
					class="text-warm underline-offset-4 hover:underline">your account</a
				>
				up to 24 hours before the event. Closer than that, send a refund request and a person will look
				at it.
				{#if t.orderId}<a
						href="/account/purchases/{t.orderId}"
						class="text-warm underline-offset-4 hover:underline">View the receipt →</a
					>{/if}
			</p>
		</section>
	{/if}
</AgeShell>
