<!--
  EventFields — the store's event form (new and edit), in four short
  groups: the basics (title, format as chips), when and where (date and
  start time on the venue's clock, venue, address), entry (fee and player
  cap), and the details players read (description, two switches). The
  circuit is the store's and the month follows the date, so neither is
  asked for. Fields light up in the circuit's colour (--cc, set by the
  page) when focused.

  Starting values are read once, so a background refresh never wipes
  what's been typed.

  Props: value (the event, or defaults), formats, priceLocked (tickets
  have sold: the fee can't change), timezoneLabel, ondate (the date and
  time as picked, for scheduling hints), today (YYYY-MM-DD on the venue's
  clock), marks (AGE Opens to dot on the date picker)
-->
<script>
	import { untrack } from 'svelte';
	import DateTimePicker from './DateTimePicker.svelte';
	import * as F from './fields.js';

	/** @type {{ value?: any, formats: string[], priceLocked?: boolean, timezoneLabel?: string, ondate?: (v: string) => void, today: string, marks?: any[] }} */
	let {
		value = {},
		formats,
		priceLocked = false,
		timezoneLabel = '',
		ondate,
		today,
		marks = []
	} = $props();

	const v = untrack(() => value);
	const formatList = untrack(() => formats);
	// The stored time is the venue's wall clock as UTC: show it as is.
	const local = (d) => (d ? new Date(d).toISOString().slice(0, 16) : '');
	const startDate =
		typeof v.eventDate === 'string' && v.eventDate.length === 16 ? v.eventDate : local(v.eventDate);

	let format = $state(v.format || formatList[0]);
	let capped = $state(v.playerCap != null && v.playerCap !== '');

	const { label, field, groupTitle, groupNote } = F;
	const group = F.group;
</script>

<div class="flex flex-col gap-7">
	<!-- the basics -->
	<div class="grid gap-5 md:grid-cols-[180px_minmax(0,1fr)] md:gap-8">
		<div>
			<p class={groupTitle}>The basics</p>
			<p class={groupNote}>What players see on the AGE Open.</p>
		</div>
		<div class="flex flex-col gap-5">
			<div>
				<label for="e-title" class={label}>Title</label>
				<input
					id="e-title"
					name="title"
					required
					maxlength="140"
					value={v.title || ''}
					placeholder="AGE Open Los Angeles · December"
					class="{field} font-semibold"
				/>
			</div>
			<fieldset>
				<legend class={label}>Format</legend>
				<div class="flex flex-wrap gap-2">
					{#each formatList as f (f)}
						<label
							class="relative flex h-[38px] cursor-pointer items-center border px-3.5 text-[12.5px] font-semibold transition-colors has-[:focus-visible]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--cc,var(--color-ink))_25%,transparent)] {format ===
							f
								? 'border-transparent text-white'
								: 'border-line2 bg-white text-ink hover:border-ink/50'}"
							style={format === f ? 'background: var(--cc, var(--color-ink))' : ''}
						>
							<input
								type="radio"
								name="format"
								value={f}
								bind:group={format}
								class="sr-only"
								required
							/>
							{f}
						</label>
					{/each}
				</div>
			</fieldset>
		</div>
	</div>

	<!-- when and where -->
	<div class={group}>
		<div>
			<p class={groupTitle}>When & where</p>
			<p class={groupNote}>
				{timezoneLabel ? `${timezoneLabel} time, at the venue.` : 'At the venue.'}
			</p>
		</div>
		<div class="grid gap-5 sm:grid-cols-2">
			<div class="sm:col-span-2">
				<label for="e-date" class={label}>Date and start time</label>
				<DateTimePicker
					id="e-date"
					name="eventDate"
					value={startDate}
					{today}
					{marks}
					onchange={(v) => ondate?.(v)}
				/>
			</div>
			<div>
				<label for="e-location" class={label}>Venue</label>
				<input
					id="e-location"
					name="location"
					required
					maxlength="140"
					value={v.location || ''}
					class={field}
				/>
			</div>
			<div>
				<label for="e-address" class={label}>Address</label>
				<input
					id="e-address"
					name="address"
					maxlength="240"
					value={v.address || ''}
					placeholder="Street, city"
					class={field}
				/>
			</div>
		</div>
	</div>

	<!-- entry -->
	<div class={group}>
		<div>
			<p class={groupTitle}>Entry</p>
			<p class={groupNote}>AGE takes the payments; your share is paid monthly.</p>
		</div>
		<div class="grid gap-5 sm:grid-cols-2">
			<div>
				<label for="e-price" class={label}>Entry fee</label>
				<div class="relative">
					<span
						class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[15px] font-semibold text-soft"
						>$</span
					>
					<input
						id="e-price"
						name="price"
						inputmode="decimal"
						required
						value={v.price != null && v.price !== ''
							? Number(v.price).toFixed(2).replace(/\.00$/, '')
							: ''}
						readonly={priceLocked}
						placeholder="40"
						class="{field} pl-8 font-semibold tabular-nums {priceLocked
							? 'cursor-not-allowed bg-paper text-fade'
							: ''}"
					/>
				</div>
				<p class="mt-1.5 text-[11.5px] text-fade">
					{priceLocked ? 'Tickets have sold, so the fee stays as it is.' : 'Per player.'}
				</p>
			</div>
			<div>
				<span class={label}>Player cap</span>
				<div class="flex items-stretch gap-2">
					<div class="flex border border-line2 bg-white" role="group" aria-label="Player cap">
						<button
							type="button"
							onclick={() => (capped = false)}
							aria-pressed={!capped}
							class="h-[44px] px-3.5 text-[11px] font-extrabold tracking-[0.12em] uppercase transition-colors {capped
								? 'text-soft hover:text-ink'
								: 'bg-ink text-paper-bg'}">No cap</button
						>
						<button
							type="button"
							onclick={() => (capped = true)}
							aria-pressed={capped}
							class="h-[44px] px-3.5 text-[11px] font-extrabold tracking-[0.12em] uppercase transition-colors {capped
								? 'bg-ink text-paper-bg'
								: 'text-soft hover:text-ink'}">Cap at</button
						>
					</div>
					{#if capped}
						<label for="e-cap" class="sr-only">Most players</label>
						<input
							id="e-cap"
							name="playerCap"
							type="number"
							min="1"
							max="2000"
							required
							value={v.playerCap ?? 64}
							class="{field} w-[100px] font-semibold tabular-nums"
						/>
					{/if}
				</div>
				<p class="mt-1.5 text-[11.5px] text-fade">
					{capped ? 'Sign-ups close when it’s full.' : 'Anyone can sign up.'}
				</p>
			</div>
		</div>
	</div>

	<!-- for players -->
	<div class={group}>
		<div>
			<p class={groupTitle}>For players</p>
			<p class={groupNote}>Shown on the event’s public page.</p>
		</div>
		<div class="flex flex-col gap-5">
			<div>
				<label for="e-desc" class={label}>About the event</label>
				<textarea
					id="e-desc"
					name="description"
					rows="4"
					maxlength="5000"
					placeholder="Prizes, schedule, what to bring."
					class="{field} h-auto py-3 leading-relaxed">{v.description || ''}</textarea
				>
			</div>
			<div class="flex flex-col gap-3">
				{#each [{ name: 'gemIdRequired', on: v.gemIdRequired ?? true, title: 'Ask for a GEM ID', note: 'Players give it when they sign up, so you can enter them and report results.' }, { name: 'premiumDiscount', on: v.premiumDiscount ?? true, title: 'Premium members get $5 off', note: 'Taken off at checkout; the store is paid what the player paid.' }] as t (t.name)}
					<label
						class="flex cursor-pointer items-start justify-between gap-5 border border-line2 bg-white px-4 py-3 transition-colors hover:border-ink/40"
					>
						<span>
							<span class="block text-[14px] font-semibold">{t.title}</span>
							<span class="mt-0.5 block text-[12px] leading-snug text-soft">{t.note}</span>
						</span>
						<span class="relative mt-0.5 inline-flex shrink-0">
							<input type="checkbox" name={t.name} checked={t.on} class="peer sr-only" />
							<span
								class="h-[24px] w-[44px] bg-line2 transition-colors peer-checked:bg-[var(--cc,var(--color-ink))] peer-focus-visible:shadow-[0_0_0_3px_color-mix(in_srgb,var(--cc,var(--color-ink))_25%,transparent)]"
							></span>
							<span
								class="absolute top-[3px] left-[3px] h-[18px] w-[18px] bg-white shadow-sm transition-transform peer-checked:translate-x-[20px]"
							></span>
						</span>
					</label>
				{/each}
			</div>
		</div>
	</div>
</div>
