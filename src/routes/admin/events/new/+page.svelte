<script>
	import AgeOpenHeader from '$lib/components/age/admin/AgeOpenHeader.svelte';
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';
	import EventFields from '$lib/components/age/store/EventFields.svelte';
	import * as F from '$lib/components/age/store/fields.js';
	import { circuitVar } from '$lib/data/circuits.js';
	import * as ui from '$lib/components/age/admin/ui.js';

	let { data, form } = $props();
	let busy = $state(false);

	let circuitName = $state(untrack(() => form?.value?.circuit || data.pick.circuit || ''));
	let storeId = $state(untrack(() => form?.value?.storeId || data.pick.store || ''));
	const circuit = $derived(data.circuits.find((c) => c.name === circuitName));
	const stores = $derived(
		circuit ? data.stores.filter((s) => s.circuitId === circuit.id && s.active) : []
	);
	const runBy = $derived(stores.find((s) => s.id === storeId));
	// A store from another circuit can't run it.
	$effect(() => {
		if (storeId && circuit && !stores.some((s) => s.id === storeId)) storeId = '';
	});
	const tz = $derived((circuit?.timezone || 'America/Chicago').split('/')[1].replace('_', ' '));
	const startValue = untrack(() => {
		if (form?.value)
			return {
				...form.value,
				gemIdRequired: form.value.gemIdRequired === 'on',
				premiumDiscount: form.value.premiumDiscount === 'on'
			};
		const s = data.stores.find((x) => x.id === data.pick.store);
		return {
			title: data.pick.circuit ? `AGE Open ${data.pick.circuit}` : '',
			location: s?.name || '',
			address: s ? [s.address, s.city, s.state].filter(Boolean).join(', ') : '',
			format: 'Classic Constructed'
		};
	});
</script>

<svelte:head><title>New event · Admin</title></svelte:head>

<AgeOpenHeader
	title="New event"
	subtitle="An AGE Open on any circuit."
	trail={[{ href: '/admin/events', label: 'Events' }]}
/>

{#if form?.error}<AdminNotice tone="error" message={form.error} />{/if}

<div
	class="mx-auto w-full max-w-[1200px] px-5 pt-7 pb-20 md:px-8"
	style={circuit ? `--cc: ${circuit.color}` : ''}
>
	<h2 class="ao-cond text-[44px] leading-none font-black uppercase md:text-[56px]">
		Schedule an Open
	</h2>
	<p class="mt-1.5 text-[13px] text-soft">
		It goes live on the AGE Open as soon as you create it.
		{#if runBy}It’ll show in {runBy.name}’s store area too.{/if}
	</p>

	<form
		method="POST"
		class="mt-7 max-w-[980px] border border-t-[4px] border-line2 bg-white"
		style="border-top-color: {circuit ? circuit.color : 'var(--color-ink)'}"
		use:enhance={() => {
			busy = true;
			return async ({ update }) => {
				await update({ reset: false });
				busy = false;
			};
		}}
	>
		<div class="flex flex-col gap-7 px-5 py-6 md:px-7">
			<!-- circuit and store -->
			<div class={F.groupFirst}>
				<div>
					<p class={F.groupTitle}>Circuit</p>
					<p class={F.groupNote}>Where it counts toward the standings, and who runs it.</p>
				</div>
				<div class="flex flex-col gap-5">
					<fieldset>
						<legend class={F.label}>Circuit</legend>
						<div class="flex flex-wrap gap-2">
							{#each data.circuits as c (c.id)}
								<label
									class={F.chip(circuitName === c.name)}
									style={circuitName === c.name ? `background: ${c.color}` : ''}
								>
									<input
										type="radio"
										name="circuit"
										value={c.name}
										bind:group={circuitName}
										required
										class="sr-only"
									/>
									<span
										class="mr-2 h-2.5 w-2.5 shrink-0 {circuitName === c.name ? 'bg-white' : ''}"
										style={circuitName === c.name ? '' : `background: ${circuitVar(c.name)}`}
										aria-hidden="true"
									></span>
									{c.name}{c.active ? '' : ' (inactive)'}
								</label>
							{/each}
						</div>
					</fieldset>
					{#if circuit}
						<fieldset>
							<legend class={F.label}>Run by</legend>
							<div class="flex flex-wrap gap-2">
								<label class={F.chip(!storeId)} style={!storeId ? F.chipOn : ''}>
									<input
										type="radio"
										name="storeId"
										value=""
										bind:group={storeId}
										class="sr-only"
									/>
									AGE
								</label>
								{#each stores as s (s.id)}
									<label class={F.chip(storeId === s.id)} style={storeId === s.id ? F.chipOn : ''}>
										<input
											type="radio"
											name="storeId"
											value={s.id}
											bind:group={storeId}
											class="sr-only"
										/>
										{s.name}
									</label>
								{/each}
							</div>
							<p class={F.hint}>
								{stores.length
									? 'A store’s event counts toward its payouts and season.'
									: `${circuit.name} has no active store yet.`}
							</p>
						</fieldset>
					{/if}
				</div>
			</div>

			<div class="border-t border-line2 pt-6">
				<EventFields
					value={startValue}
					formats={data.formats}
					timezoneLabel={tz}
					today={new Date(data.now).toISOString().slice(0, 10)}
					marks={data.nearby.map((e) => ({
						date: new Date(e.eventDate).toISOString().slice(0, 10),
						color: circuitVar(e.circuit),
						label: `${e.circuit} · ${e.storeName || e.location || e.title}`
					}))}
				/>
			</div>
		</div>
		<div
			class="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-line2 bg-white px-5 py-3.5 shadow-[0_-12px_24px_-18px_rgb(23_21_15/0.35)] md:px-7"
		>
			<a href="/admin/events" class={ui.ghost}>Cancel</a>
			<button
				class="inline-flex h-[44px] items-center gap-2 px-6 text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase transition-[filter] hover:brightness-110 disabled:opacity-50"
				style="background: {circuit ? circuit.color : 'var(--color-ink)'}"
				disabled={busy || !circuit}
				>{busy ? 'Creating…' : 'Create the event'} <span aria-hidden="true">→</span></button
			>
		</div>
	</form>
</div>
