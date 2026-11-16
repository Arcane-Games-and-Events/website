<!--
  StoreFields — the store form (new and edit), in the store pages' style:
  four groups — the store (name, its circuit as colour chips), where it is,
  how to reach it, and the money (revenue share override, and on edit
  whether it's active). Fields light up in the circuit's colour.

  Starting values are read once, so a background refresh never wipes
  what's been typed; the page remounts this after a save.

  Props: value (the store, or defaults), circuits ({ id, name, color,
  active }[]), defaultShare (the program default, 0–1, or null)
-->
<script>
	import { untrack } from 'svelte';
	import * as F from '$lib/components/age/store/fields.js';

	/** @type {{ value?: any, circuits: any[], defaultShare?: string | number | null }} */
	let { value = {}, circuits, defaultShare = null } = $props();

	const v = untrack(() => value);
	const circuitList = untrack(() => circuits);
	const fallbackShare = untrack(() => defaultShare);
	const pct = (x) => (x == null || x === '' ? '' : String(Math.round(Number(x) * 10000) / 100));

	let circuitId = $state(v.circuitId || '');
	let active = $state(v.active ?? true);
	const picked = $derived(circuitList.find((c) => c.id === circuitId));
</script>

<div class="flex flex-col gap-7" style={picked ? `--cc: ${picked.color}` : ''}>
	<!-- the store -->
	<div class={F.groupFirst}>
		<div>
			<p class={F.groupTitle}>The store</p>
			<p class={F.groupNote}>Its name on the AGE Open, and the circuit it runs.</p>
		</div>
		<div class="flex flex-col gap-5">
			<div>
				<label for="s-name" class={F.label}>Store name</label>
				<input
					id="s-name"
					name="name"
					required
					maxlength="80"
					value={v.name || ''}
					placeholder="Bay Area Games"
					class="{F.field} font-semibold"
				/>
			</div>
			<fieldset>
				<legend class={F.label}>Circuit</legend>
				<div class="flex flex-wrap gap-2">
					{#each circuitList as c (c.id)}
						<label
							class={F.chip(circuitId === c.id)}
							style={circuitId === c.id ? `background: ${c.color}` : ''}
						>
							<input
								type="radio"
								name="circuitId"
								value={c.id}
								bind:group={circuitId}
								required
								class="sr-only"
							/>
							<span
								class="mr-2 h-2.5 w-2.5 shrink-0 {circuitId === c.id ? 'bg-white' : ''}"
								style={circuitId === c.id ? '' : `background: ${c.color}`}
								aria-hidden="true"
							></span>
							{c.name}{c.active ? '' : ' (inactive)'}
						</label>
					{/each}
				</div>
			</fieldset>
		</div>
	</div>

	<!-- where -->
	<div class={F.group}>
		<div>
			<p class={F.groupTitle}>Where it is</p>
			<p class={F.groupNote}>New events start with this address.</p>
		</div>
		<div class="grid gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
			<div class="sm:col-span-2">
				<label for="s-address" class={F.label}>Street address</label>
				<input
					id="s-address"
					name="address"
					maxlength="160"
					value={v.address || ''}
					class={F.field}
				/>
			</div>
			<div>
				<label for="s-city" class={F.label}>City</label>
				<input id="s-city" name="city" maxlength="60" value={v.city || ''} class={F.field} />
			</div>
			<div>
				<label for="s-state" class={F.label}>State</label>
				<input id="s-state" name="state" maxlength="30" value={v.state || ''} class={F.field} />
			</div>
		</div>
	</div>

	<!-- contact -->
	<div class={F.group}>
		<div>
			<p class={F.groupTitle}>Contact</p>
			<p class={F.groupNote}>For AGE; players don’t see these.</p>
		</div>
		<div class="grid gap-5 sm:grid-cols-2">
			<div class="sm:col-span-2">
				<label for="s-web" class={F.label}>Website</label>
				<input
					id="s-web"
					name="website"
					maxlength="200"
					value={v.website || ''}
					placeholder="bayareagames.com"
					class={F.field}
				/>
			</div>
			<div>
				<label for="s-phone" class={F.label}>Phone</label>
				<input
					id="s-phone"
					name="phone"
					type="tel"
					maxlength="30"
					value={v.phone || ''}
					class={F.field}
				/>
			</div>
			<div>
				<label for="s-email" class={F.label}>Contact email</label>
				<input
					id="s-email"
					name="contactEmail"
					type="email"
					maxlength="120"
					value={v.contactEmail || ''}
					class={F.field}
				/>
			</div>
		</div>
	</div>

	<!-- money -->
	<div class={F.group}>
		<div>
			<p class={F.groupTitle}>Money</p>
			<p class={F.groupNote}>AGE takes the ticket payments and pays the store its share monthly.</p>
		</div>
		<div class="flex flex-col gap-5">
			<div class="max-w-[280px]">
				<label for="s-share" class={F.label}>Store’s share of ticket sales</label>
				<div class="relative">
					<input
						id="s-share"
						name="revenueShare"
						inputmode="decimal"
						maxlength="6"
						value={pct(v.revenueShare)}
						placeholder={fallbackShare == null ? 'Not set' : pct(fallbackShare)}
						class="{F.field} pr-9 font-semibold tabular-nums"
					/>
					<span
						class="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[15px] font-semibold text-soft"
						>%</span
					>
				</div>
				<p class={F.hint}>
					Blank uses the program default{fallbackShare == null
						? ' (not set yet)'
						: ` (${pct(fallbackShare)}%)`}.
				</p>
			</div>
			{#if v.id}
				<input type="hidden" name="hasActive" value="1" />
				<label
					class="flex cursor-pointer items-start justify-between gap-5 border border-line2 bg-white px-4 py-3 transition-colors hover:border-ink/40"
				>
					<span>
						<span class="block text-[14px] font-semibold">Active</span>
						<span class="mt-0.5 block text-[12px] leading-snug text-soft"
							>An inactive store keeps its history but can’t schedule events.</span
						>
					</span>
					<span class="relative mt-0.5 inline-flex shrink-0">
						<input type="checkbox" name="active" bind:checked={active} class="peer sr-only" />
						<span
							class="h-[24px] w-[44px] bg-line2 transition-colors peer-checked:bg-[var(--cc,var(--color-ink))] peer-focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--cc,var(--color-ink))_25%,transparent)]"
						></span>
						<span
							class="absolute top-[3px] left-[3px] h-[18px] w-[18px] bg-white shadow-sm transition-transform peer-checked:translate-x-[20px]"
						></span>
					</span>
				</label>
			{/if}
		</div>
	</div>
</div>
