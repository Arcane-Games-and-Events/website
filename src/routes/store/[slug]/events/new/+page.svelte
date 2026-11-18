<script>
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';
	import EventFields from '$lib/components/age/store/EventFields.svelte';
	import { circuitVar } from '$lib/data/circuits.js';
	import * as ui from '$lib/components/age/admin/ui.js';

	let { data, form } = $props();
	let busy = $state(false);
	const w = $derived(data.where);
	const base = $derived(`/store/${w.store.slug}`);
	const color = $derived(w.circuit.color);
	const address = $derived(
		[w.store.address, w.store.city, w.store.state].filter(Boolean).join(', ')
	);

	// The date as it's typed, for the "what's nearby" panel.
	let picked = $state(untrack(() => form?.value?.eventDate || data.date || ''));
	const day = $derived(picked ? new Date(`${picked.slice(0, 10)}T00:00:00Z`) : null);
	const near = $derived(
		day
			? data.nearby.filter(
					(e) =>
						Math.abs(new Date(e.eventDate).getTime() - day.getTime() - 43200000) <= 3.5 * 86400000
				)
			: []
	);
	const sameMonth = $derived(
		day
			? data.nearby.filter((e) => {
					const d = new Date(e.eventDate);
					return (
						e.storeId === w.store.id &&
						d.getUTCFullYear() === day.getUTCFullYear() &&
						d.getUTCMonth() === day.getUTCMonth()
					);
				})
			: []
	);
	const past = $derived(day ? day.getTime() + 86400000 < data.now : false);
	const when = (e) =>
		new Date(e.eventDate).toLocaleString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: '2-digit',
			timeZone: 'UTC'
		});
	const monthName = $derived(
		day ? day.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' }) : ''
	);
</script>

<svelte:head><title>Schedule an Open · {w.store.name}</title></svelte:head>

{#if form?.error}<AdminNotice tone="error" message={form.error} />{/if}

<div class="mx-auto w-full max-w-page px-5 pt-7 pb-20 md:px-8" style="--cc: {color};">
	<a href="{base}/events" class="{ui.label} hover:text-ink">← Events</a>
	<h2 class="ao-cond mt-3 text-5xl leading-none font-black uppercase md:text-6xl">
		Schedule an Open
	</h2>
	<p class="mt-1.5 text-sm text-soft">
		It goes live on the {w.circuit.name} AGE Open as soon as you publish, and players can sign up straight
		away.
	</p>

	<div class="mt-7 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
		<form
			method="POST"
			class="border border-t-4 border-line2 bg-white p-5 md:p-7"
			style="border-top-color: var(--cc)"
			use:enhance={() => {
				busy = true;
				return async ({ update }) => {
					await update({ reset: false });
					busy = false;
				};
			}}
		>
			<EventFields
				value={form?.value
					? {
							...form.value,
							gemIdRequired: form.value.gemIdRequired === 'on',
							premiumDiscount: form.value.premiumDiscount === 'on'
						}
					: {
							title: `AGE Open ${w.circuit.name}`,
							location: w.store.name,
							address,
							eventDate: data.date,
							format: data.usual?.format || 'Classic Constructed',
							price: data.usual?.price ?? null,
							playerCap: data.usual?.playerCap ?? null
						}}
				formats={data.formats}
				timezoneLabel={w.circuit.timezone.split('/')[1].replace('_', ' ')}
				ondate={(v) => (picked = v)}
				today={new Date(data.now).toISOString().slice(0, 10)}
				marks={data.nearby.map((e) => ({
					date: new Date(e.eventDate).toISOString().slice(0, 10),
					color: circuitVar(e.circuit),
					label: `${e.circuit}${e.storeId === w.store.id ? ' (you)' : ''} · ${e.storeName || e.location || e.title}`
				}))}
			/>
			<div class="mt-7 flex flex-wrap gap-3 border-t border-line2 pt-5">
				<button
					class="inline-flex h-11 items-center gap-2 px-6 text-xs font-extrabold tracking-widest text-white uppercase transition hover:brightness-110 disabled:opacity-50"
					style="background: var(--cc)"
					disabled={busy}
					>{busy ? 'Publishing…' : 'Publish the Open'} <span aria-hidden="true">→</span></button
				>
				<a href="{base}/events" class={ui.ghost}>Cancel</a>
			</div>
		</form>

		<!-- what's around the date -->
		<aside class="lg:sticky lg:top-[calc(var(--desk-header,0px)+64px)] lg:self-start">
			<div class="border border-line2 bg-paper px-5 py-5">
				<p class={ui.label}>Around that date</p>
				{#if !day}
					<p class="mt-3 text-sm text-soft">
						Pick a date and you’ll see every AGE Open within a few days of it, across all circuits.
					</p>
				{:else}
					<p class="ao-cond mt-2 text-3xl leading-none font-black uppercase">
						{day.toLocaleDateString('en-US', {
							weekday: 'short',
							month: 'short',
							day: 'numeric',
							timeZone: 'UTC'
						})}
					</p>
					{#if past}
						<p class="mt-3 text-sm font-semibold text-hero-rb">That date has already passed.</p>
					{/if}
					{#if sameMonth.length}
						<p class="mt-3 border-l-3 border-gold bg-gold/10 px-3 py-2 text-xs leading-snug">
							You already have {sameMonth.length === 1 ? 'an Open' : `${sameMonth.length} Opens`} in
							{monthName}. The season asks for one a month.
						</p>
					{/if}
					{#if near.length}
						<ul class="mt-4 flex flex-col gap-2">
							{#each near as e (e.id)}
								<li class="flex items-start gap-2.5">
									<span
										class="mt-1 h-2.5 w-2.5 shrink-0"
										style="background: {circuitVar(e.circuit)}"
									></span>
									<span class="min-w-0 text-xs leading-snug">
										<b>{e.circuit}</b>{e.storeId === w.store.id ? ' (you)' : ''} · {when(e)}
										<span class="block truncate text-soft"
											>{e.storeName || e.location || e.title}</span
										>
									</span>
								</li>
							{/each}
						</ul>
					{:else if !past}
						<p class="mt-3 text-sm text-prem">
							<b>✓ Clear.</b> No other AGE Open within three days.
						</p>
					{/if}
				{/if}
				<a href="{base}/calendar" class="mt-5 inline-block {ui.textAction}">Open the calendar →</a>
			</div>
		</aside>
	</div>
</div>
