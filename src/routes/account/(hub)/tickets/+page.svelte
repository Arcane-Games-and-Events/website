<script>
	/**
	 * The member's tickets, as a wallet: upcoming events are admission
	 * tickets (the same stub as the AGE Open header), past events are torn
	 * stubs with the player's finish printed on them.
	 */
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Panel from '$lib/components/account/Panel.svelte';
	import Notice from '$lib/components/account/Notice.svelte';
	import FormatTag from '$lib/components/age/FormatTag.svelte';
	import { getCircuit, circuitVar } from '$lib/data/circuits.js';
	import * as ui from '$lib/components/account/ui.js';

	let { data, form } = $props();
	let busy = $state('');
	let asking = $state('');
	let reason = $state('');

	const enh = (id) => () => {
		busy = id;
		return async ({ update }) => {
			busy = '';
			asking = '';
			reason = '';
			await update();
			await invalidateAll();
		};
	};

	const utc = (d, o) =>
		d ? new Date(d).toLocaleDateString('en-US', { ...o, timeZone: 'UTC' }) : '';
	const month = (d) => utc(d, { month: 'short' }).toUpperCase();
	const day = (d) => utc(d, { day: 'numeric' });
	const longDate = (d) => utc(d, { weekday: 'long', month: 'long', day: 'numeric' }) || 'Date TBA';
	const time = (d) =>
		d
			? new Date(d).toLocaleTimeString('en-US', {
					hour: 'numeric',
					minute: '2-digit',
					timeZone: 'UTC'
				})
			: '';
	const daysLeft = (d) => {
		if (!d) return null;
		const end = new Date(d);
		end.setUTCHours(23, 59, 59, 999);
		return Math.max(0, Math.floor((end.getTime() - Date.now()) / 86400000));
	};
	const countdown = (d) => {
		const n = daysLeft(d);
		return n == null ? 'Date TBA' : n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : `In ${n} days`;
	};
	const ordinal = (n) => {
		const s = ['th', 'st', 'nd', 'rd'];
		const v = n % 100;
		return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
	};
	const player = (t) => [t.firstName, t.lastName].filter(Boolean).join(' ') || 'Player';
	const paid = (t) => (Number(t.amountPaid) > 0 ? `$${Number(t.amountPaid).toFixed(2)}` : 'Free');

	// Upcoming tickets, soonest first; the header's "next up" is the first.
	const upcoming = $derived(
		[...data.upcoming].sort((a, b) => new Date(a.eventDate || 0) - new Date(b.eventDate || 0))
	);
	const next = $derived(upcoming.find((t) => !t.refunded) || null);
	const played = $derived(data.past.filter((t) => !t.refunded).length);
	const tops = $derived(data.past.filter((t) => t.finish?.rank && t.finish.rank <= 8).length);
</script>

<svelte:head><title>Tickets — AGE</title></svelte:head>

<Panel
	rubric="Tickets"
	title="Your seat at the table"
	lead="Every event you've entered. There's nothing to print: we enter you into GEM before the day, and the ticket is your backup."
>
	{#if form?.success}<Notice tone="success" message={form.message} />{/if}
	{#if form?.error}<Notice tone="error" message={form.error} />{/if}

	<!-- ============ the record ============ -->
	<dl class="mb-8 grid grid-cols-3 gap-px border border-line2 bg-line2">
		{#each [['Next up', next ? countdown(next.eventDate) : '—', next ? next.eventTitle : 'Nothing booked'], ['Events played', String(played), played === 1 ? 'AGE Open' : 'AGE Opens'], ['Top 8 finishes', String(tops), tops === 1 ? 'cut made' : 'cuts made']] as [k, n, sub] (k)}
			<div class="bg-paper-bg px-4 py-4 md:px-5">
				<dt class={ui.label}>{k}</dt>
				<dd class="ao-cond mt-1 text-[24px] leading-none font-black md:text-[36px]">
					{n}
				</dd>
				<dd class="mt-1 truncate text-[11px] font-semibold text-fade">{sub}</dd>
			</div>
		{/each}
	</dl>

	<!-- ============ a ticket ============ -->
	{#snippet admission(t, i)}
		{@const c = getCircuit(t.circuit)}
		{@const accent = circuitVar(t.circuit)}
		{@const live = t.eventStatus === 'in_progress'}
		<li
			class="group relative transition-transform duration-500 ease-[cubic-bezier(0.22,0.61,0.36,1)] hover:-translate-y-1 {t.refunded
				? 'opacity-60 grayscale'
				: ''}"
			style="filter: drop-shadow(0 14px 22px rgba(23,21,15,0.28)); animation-delay: {i * 70}ms;"
		>
			<div class="grid grid-cols-[1fr_84px] bg-paper-bg text-ink md:grid-cols-[1fr_92px]">
				<!-- body -->
				<div class="min-w-0">
					<a
						href="/age-open/{t.eventId}"
						class="relative block aspect-[16/6] overflow-hidden bg-ink"
					>
						<img
							src={c.image}
							alt=""
							loading="lazy"
							class="absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.04]"
						/>
						<span
							class="absolute inset-0"
							style="background: linear-gradient(90deg, color-mix(in srgb, {accent} 72%, rgba(23,21,15,0.55)) 0%, rgba(23,21,15,0) 80%);"
							aria-hidden="true"
						></span>
						<span
							class="absolute bottom-3 left-4 text-[9.5px] font-extrabold tracking-[0.22em] text-white uppercase"
							>◆ AGE Open{t.circuit ? ` · ${t.circuit}` : ''}</span
						>
						{#if live}
							<span
								class="absolute top-3 right-3 inline-flex items-center gap-1.5 bg-hero-rb px-2 py-1 text-[8.5px] font-extrabold tracking-[0.16em] text-white uppercase"
								><span class="h-[5px] w-[5px] animate-pulse-dot bg-white" aria-hidden="true"
								></span>Live now</span
							>
						{:else if t.refunded}
							<span
								class="absolute top-3 right-3 bg-ink px-2 py-1 text-[8.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase"
								>Refunded</span
							>
						{:else if t.request?.status === 'pending'}
							<span
								class="absolute top-3 right-3 bg-paper-bg px-2 py-1 text-[8.5px] font-extrabold tracking-[0.16em] text-ink uppercase"
								>Refund requested</span
							>
						{/if}
					</a>
					<div class="px-4 pt-3 pb-4 md:px-5">
						<a
							href="/age-open/{t.eventId}"
							class="ao-cond block text-[26px] leading-[0.95] font-black [text-wrap:balance] uppercase hover:text-warm md:text-[28px]"
							>{t.eventTitle}</a
						>
						<p class="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
							{#if t.format}<FormatTag format={t.format} />{/if}
							<span class="text-[11px] font-semibold text-fade"
								>{longDate(t.eventDate)}{time(t.eventDate)
									? ` · ${time(t.eventDate)}`
									: ''}{t.location ? ` · ${t.location}` : ''}</span
							>
						</p>
						<dl class="mt-3 grid grid-cols-[1fr_auto] items-end gap-3 border-t border-line pt-3">
							<div class="min-w-0">
								<dt class="text-[8px] font-extrabold tracking-[0.22em] text-fade uppercase">
									Player
								</dt>
								<dd class="mt-0.5 truncate font-newsreader text-[16px] leading-tight font-semibold">
									{player(t)}
								</dd>
								{#if t.gemId}<dd class="text-[10px] font-semibold text-fade">GEM {t.gemId}</dd>{/if}
							</div>
							<div class="text-right">
								<dt class="text-[8px] font-extrabold tracking-[0.22em] text-fade uppercase">
									{t.refunded ? 'Refunded' : 'Paid'}
								</dt>
								<dd class="ao-cond mt-0.5 text-[22px] leading-none font-black tabular-nums">
									{paid(t)}
								</dd>
							</div>
						</dl>
						<div
							class="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line pt-3"
						>
							<span
								class="inline-flex items-center gap-1.5 text-[9px] font-extrabold tracking-[0.14em] uppercase {t.enteredIntoGem
									? 'text-prem'
									: 'text-fade'}"
							>
								<span
									class="h-[5px] w-[5px] {t.enteredIntoGem ? 'bg-prem' : 'bg-line2'}"
									aria-hidden="true"
								></span>
								{t.enteredIntoGem ? 'Entered into GEM' : 'GEM entry pending'}
							</span>
							<span class="flex flex-wrap items-center gap-x-3">
								<a href="/events/{t.eventId}/ticket/{t.id}" class={ui.textAction}>Ticket</a>
								{#if t.orderId}<a href="/account/purchases/{t.orderId}" class={ui.textAction}
										>Receipt</a
									>{/if}
								{#if t.can.action === 'refund'}
									<button
										type="button"
										class="{ui.textAction} text-hero-rb"
										onclick={() => (asking = asking === t.id ? '' : t.id)}
										disabled={!!busy}>Refund</button
									>
								{:else if t.can.action === 'request'}
									<button
										type="button"
										class="{ui.textAction} text-hero-rb"
										onclick={() => (asking = asking === t.id ? '' : t.id)}
										disabled={!!busy}>Request refund</button
									>
								{:else if t.request?.status === 'pending'}
									<form method="POST" action="?/withdraw" use:enhance={enh(t.id)} class="inline">
										<input type="hidden" name="requestId" value={t.request.id} /><button
											class="{ui.textAction} text-hero-rb"
											disabled={!!busy}>Withdraw request</button
										>
									</form>
								{:else if !t.refunded && t.can.reason}
									<span class="text-[10px] font-semibold text-fade" title={t.can.reason}
										>{t.can.reason === 'The event has started.'
											? 'No refunds once the event has started'
											: t.can.reason === 'This ticket was free.'
												? 'Free ticket'
												: t.can.reason}</span
									>
								{/if}
							</span>
						</div>
					</div>
				</div>
				<!-- stub -->
				<div class="relative flex flex-col items-center justify-between bg-paper py-4 text-center">
					<span class="ao-perf absolute inset-y-2 left-0 w-px text-line2" aria-hidden="true"></span>
					<span
						class="text-[7.5px] font-extrabold tracking-[0.24em] text-fade uppercase [writing-mode:vertical-rl]"
						>Admit one</span
					>
					<span>
						<span
							class="block text-[9.5px] font-extrabold tracking-[0.18em]"
							style="color: {accent};">{month(t.eventDate) || 'TBA'}</span
						>
						<span class="ao-cond block text-[40px] leading-[0.85] font-black tabular-nums"
							>{day(t.eventDate) || '—'}</span
						>
					</span>
					<span
						class="inline-flex items-center gap-1.5 px-1 text-center text-[8px] font-extrabold tracking-[0.12em] text-warm uppercase"
					>
						{#if !t.refunded}<span
								class="h-[5px] w-[5px] animate-pulse-dot bg-warm"
								aria-hidden="true"
							></span>{countdown(t.eventDate)}{/if}
					</span>
				</div>
			</div>
			{#if asking === t.id}
				<form
					method="POST"
					action="?/refund"
					use:enhance={enh(t.id)}
					class="border border-t-0 border-line2 bg-paper px-5 py-4"
				>
					<input type="hidden" name="ticketId" value={t.id} />
					<p class="font-newsreader text-[15px] leading-[1.5]">
						{#if t.can.action === 'refund'}
							Refund <strong>{paid(t)}</strong> to the card you paid with? The seat goes back on sale
							right away. Banks take three to ten business days to show a refund.
						{:else}
							The event is less than 24 hours away, so a person needs to look at this. Tell us what
							happened and we'll reply by email.
						{/if}
					</p>
					<input
						type="text"
						name="reason"
						bind:value={reason}
						maxlength="300"
						class="{ui.input} mt-3"
						placeholder={t.can.action === 'refund' ? 'Reason (optional)' : 'What happened?'}
						required={t.can.action === 'request'}
					/>
					<div class="mt-3 flex gap-2">
						<button class="{ui.btn} h-[40px]" disabled={busy === t.id}
							>{busy === t.id
								? 'Sending…'
								: t.can.action === 'refund'
									? 'Refund this ticket'
									: 'Send request'}</button
						>
						<button type="button" class="{ui.ghost} h-[40px]" onclick={() => (asking = '')}
							>Never mind</button
						>
					</div>
				</form>
			{/if}
		</li>
	{/snippet}

	<!-- ============ a torn stub, for an event that's been played ============ -->
	{#snippet stub(t)}
		{@const accent = circuitVar(t.circuit)}
		{@const f = t.finish}
		<li class="relative {t.refunded ? 'opacity-50' : ''}">
			<div class="ao-torn grid grid-cols-[84px_1fr] bg-paper text-ink">
				<div
					class="relative flex flex-col items-center justify-center border-r border-dashed border-line2 py-4 text-center"
				>
					<span class="block text-[9px] font-extrabold tracking-[0.18em]" style="color: {accent};"
						>{month(t.eventDate)}</span
					>
					<span class="ao-cond block text-[34px] leading-[0.85] font-black tabular-nums"
						>{day(t.eventDate)}</span
					>
					<span class="mt-1 text-[8px] font-extrabold tracking-[0.14em] text-fade uppercase"
						>{utc(t.eventDate, { year: 'numeric' })}</span
					>
				</div>
				<div class="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2 px-4 py-4 md:px-5">
					<div class="min-w-0 flex-1">
						<a
							href="/age-open/{t.eventId}/results"
							class="ao-cond block truncate text-[22px] leading-none font-black uppercase hover:text-warm"
							>{t.eventTitle}</a
						>
						<p class="mt-1 text-[11px] font-semibold text-fade">
							{t.circuit || 'AGE Open'}{t.location ? ` · ${t.location}` : ''} · {player(
								t
							)}{t.refunded ? ' · refunded' : ''}
						</p>
					</div>
					{#if f && f.rank}
						<div class="text-right">
							<p class="text-[8px] font-extrabold tracking-[0.22em] text-fade uppercase">Finish</p>
							<p
								class="ao-cond text-[30px] leading-none font-black {f.rank <= 8 ? 'text-prem' : ''}"
							>
								{ordinal(f.rank)}<span class="text-[14px] text-fade"> / {f.of}</span>
							</p>
							{#if f.wins != null}<p class="text-[10px] font-semibold text-fade tabular-nums">
									{f.wins}–{f.losses ?? 0}{f.draws ? `–${f.draws}` : ''}
								</p>{/if}
						</div>
					{:else if !t.refunded}
						<a href="/age-open/{t.eventId}/results" class={ui.textAction}>Results →</a>
					{/if}
					<a href="/events/{t.eventId}/ticket/{t.id}" class="{ui.textAction} text-fade">Stub</a>
				</div>
			</div>
		</li>
	{/snippet}

	<h3 class={ui.label}>Upcoming</h3>
	{#if upcoming.length}
		<ul class="mt-4 grid gap-6 lg:grid-cols-2">
			{#each upcoming as t, i (t.id)}{@render admission(t, i)}{/each}
		</ul>
	{:else}
		<div class="mt-4 border border-dashed border-line2 px-6 py-10 text-center">
			<p class="ao-cond text-[34px] leading-none font-black uppercase">No seat booked yet.</p>
			<p class="mx-auto mt-3 max-w-[420px] font-newsreader text-[16px] text-soft italic">
				The next AGE Open is waiting for you. Members save on every ticket.
			</p>
			<a href="/age-open?tab=events" class="{ui.btn} mt-6">Find your next open →</a>
		</div>
	{/if}

	{#if data.past.length}
		<h3 class="mt-14 {ui.label}">Played</h3>
		<ul class="mt-4 grid gap-3">
			{#each data.past as t (t.id)}{@render stub(t)}{/each}
		</ul>
	{/if}
</Panel>
