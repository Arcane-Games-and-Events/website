<script>
	import AgeOpenHeader, {
		btn as hbtn,
		btnLine as hbtnLine
	} from '$lib/components/age/admin/AgeOpenHeader.svelte';
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';
	import Figures from '$lib/components/age/admin/Figures.svelte';
	import Section from '$lib/components/age/admin/Section.svelte';
	import * as ui from '$lib/components/age/admin/ui.js';
	import { circuitImage } from '$lib/data/circuits.js';

	let { data, form } = $props();

	const circuits = $derived(data.circuits || []);
	const t = $derived(data.totals || {});
	const pct = (v) => (v == null ? '' : String(Math.round(Number(v) * 10000) / 100));
	const share = (s) =>
		s.revenueShare != null
			? `${pct(s.revenueShare)}%`
			: data.program?.defaultShare != null
				? `${pct(data.program.defaultShare)}% (default)`
				: 'Not set';
	const month = new Date().toLocaleDateString('en-US', { month: 'long' });
	const cols = 'md:grid-cols-[minmax(0,1fr)_150px_70px_80px_80px_100px_100px_70px]';
</script>

<svelte:head><title>Circuits & stores · Admin</title></svelte:head>

<AgeOpenHeader
	title="Circuits & stores"
	subtitle="The AGE Open circuits, the stores that run them, and what each store is owed."
>
	{#snippet actions()}
		{#if data.ready}
			<a href="/admin/stores/new" class={hbtn}>+ New store</a>
			<a href="/admin/circuits/new" class={hbtnLine}>+ New circuit</a>
		{/if}
	{/snippet}
</AgeOpenHeader>

{#if !data.ready}
	<AdminNotice
		tone="info"
		message="Stores need migration 045. Run supabase/migrations/045_stores.sql in the Supabase SQL editor, then reload."
	/>
{:else}
	{#if page.url.searchParams.get('deleted')}
		<AdminNotice
			tone="success"
			message="The {page.url.searchParams.get('deleted')} circuit was deleted."
		/>
	{/if}
	{#if form?.error}<AdminNotice tone="error" message={form.error} />{/if}
	{#if form?.saved}<AdminNotice tone="success" message={form.saved} />{/if}

	<div class="mx-auto w-full max-w-[1200px] px-5 pt-6 pb-20 md:px-8">
		<Figures
			items={[
				{ label: 'Circuits', value: ui.fmt(t.circuits) },
				{ label: 'Stores', value: ui.fmt(t.stores), note: `${ui.fmt(t.members)} members` },
				{ label: `Events in ${month}`, value: ui.fmt(t.eventsMonth) },
				{ label: `Players in ${month}`, value: ui.fmt(t.playersMonth) },
				{ label: `Tickets in ${month}`, value: ui.money(t.revenueMonth, 0) },
				{
					label: 'Owed to stores',
					value: ui.money((t.owedCents || 0) / 100),
					tone: t.owedCents ? 'text-hero-rb' : ''
				}
			]}
		/>

		{#each circuits as c (c.id)}
			<section class="mt-10">
				<div
					class="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b-[3px] pb-2"
					style="border-color: {c.color}"
				>
					<h2 class="flex items-center gap-3">
						<a href="/admin/circuits/{c.slug}" class="block shrink-0" title="Change the picture">
							<img
								src={circuitImage(c.name, c.imageUrl ? [{ name: c.name, image: c.imageUrl }] : [])}
								alt=""
								class="h-[36px] w-[64px] object-cover"
							/>
						</a>
						<span
							class="text-[10.5px] font-extrabold tracking-[0.22em] uppercase"
							style="color: {c.color}">◆ {c.name}</span
						>
						<span class="text-[11px] text-fade"
							>{c.short}{c.region ? ` · ${c.region}` : ''}{c.active ? '' : ' · inactive'}</span
						>
					</h2>
					<span class="flex items-center gap-4">
						<a href="/admin/stores/new?circuit={c.slug}" class={ui.textAction}>+ Store</a>
						<a href="/admin/circuits/{c.slug}" class={ui.textAction}>Edit circuit →</a>
					</span>
				</div>

				{#if c.stores.length}
					<div class="{ui.rowHead} mt-3 {cols} gap-3">
						<span>Store</span><span>Owners</span><span class="text-right">Members</span><span
							class="text-right">Upcoming</span
						><span class="text-right">Players</span><span class="text-right">Tickets</span><span
							class="text-right">Owed</span
						><span></span>
					</div>
					<ul>
						{#each c.stores as s (s.id)}
							<li class={ui.row}>
								<a href="/admin/stores/{s.slug}" class="group {ui.rowLink} {cols} md:gap-3">
									<span class="block min-w-0">
										<span class="{ui.titleText} block truncate group-hover:text-warm">{s.name}</span
										>
										<span class="block truncate text-[11.5px] text-fade"
											>{[s.city, s.state].filter(Boolean).join(', ') || '—'} · {share(s)}{s.active
												? ''
												: ' · inactive'}</span
										>
									</span>
									<span class="mt-1 block truncate text-[12.5px] text-soft md:mt-0"
										>{s.owners || 'No owner yet'}</span
									>
									<span class="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 md:contents">
										<span class="text-[12.5px] tabular-nums md:text-right"
											><span class="text-fade md:hidden">Members </span>{s.members}</span
										>
										<span class="text-[12.5px] tabular-nums md:text-right"
											><span class="text-fade md:hidden">Upcoming </span>{s.upcoming}</span
										>
										<span class="text-[12.5px] tabular-nums md:text-right"
											><span class="text-fade md:hidden">Players </span>{s.playersMonth}</span
										>
										<span class="text-[12.5px] tabular-nums md:text-right"
											><span class="text-fade md:hidden">Tickets </span>{ui.money(
												s.revenueMonth,
												0
											)}</span
										>
										<span
											class="text-[12.5px] tabular-nums md:text-right {s.owedCents
												? 'font-semibold text-hero-rb'
												: ''}"
											><span class="font-normal text-fade md:hidden">Owed </span>{ui.money(
												s.owedCents / 100
											)}</span
										>
									</span>
									<span class="hidden text-right md:block"
										><span class={ui.textAction}>Open →</span></span
									>
								</a>
							</li>
						{/each}
					</ul>
				{:else}
					<p class={ui.empty}>
						No store runs this circuit yet.
						<a href="/admin/stores/new?circuit={c.slug}" class="{ui.textAction} not-italic"
							>Add one →</a
						>
					</p>
				{/if}
			</section>
		{/each}

		<p class="mt-8">
			<a href="/admin/circuits/new" class={ui.ghost}>+ New circuit</a>
		</p>

		<Section
			title="Program settings"
			class="mt-14"
			note="Applies to every store without its own share"
		>
			<form
				method="POST"
				action="?/program"
				use:enhance
				class="grid max-w-[640px] gap-5 md:grid-cols-2"
			>
				<div>
					<label for="p-share" class="{ui.label} mb-2 block">Stores’ share of ticket revenue</label>
					<div class="flex items-center gap-2">
						<input
							id="p-share"
							name="defaultShare"
							inputmode="decimal"
							maxlength="6"
							value={pct(data.program?.defaultShare)}
							placeholder="Not set"
							class="{ui.input} w-[110px]"
						/>
						<span class="text-[14px] text-soft">%</span>
					</div>
					<p class="mt-1.5 {ui.note}">Until it’s set, payouts can’t be worked out.</p>
				</div>
				<div>
					<label for="p-fees" class="{ui.label} mb-2 block">Card fees are paid by</label>
					<select id="p-fees" name="feePayer" class="{ui.select} w-full">
						<option value="age" selected={data.program?.feePayer !== 'store'}>AGE</option>
						<option value="store" selected={data.program?.feePayer === 'store'}
							>The store (taken from its share)</option
						>
					</select>
				</div>
				<div class="md:col-span-2">
					<button class={ui.btn}>Save settings</button>
				</div>
			</form>
		</Section>
	</div>
{/if}
