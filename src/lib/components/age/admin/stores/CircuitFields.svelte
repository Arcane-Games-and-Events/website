<!--
  CircuitFields — the fields of the circuit form (new and edit): name,
  short name, region, time zone, colour, order and a short description.
  Whether it's active is changed in the circuit page's danger zone.

  Props: value (the circuit, or defaults for a new one)
-->
<script>
	import { untrack } from 'svelte';
	import * as ui from '$lib/components/age/admin/ui.js';
	import ColorField from './ColorField.svelte';

	/** @type {{ value?: any }} */
	let { value = {} } = $props();

	// Starting values, read once: a background refresh of the page data
	// must not wipe what's been typed. The page remounts this after a submit.
	const v = untrack(() => value);

	const ZONES = [
		['America/Los_Angeles', 'Pacific'],
		['America/Phoenix', 'Arizona'],
		['America/Denver', 'Mountain'],
		['America/Chicago', 'Central'],
		['America/New_York', 'Eastern'],
		['America/Anchorage', 'Alaska'],
		['Pacific/Honolulu', 'Hawaii']
	];
</script>

<div class="grid gap-5 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1.4fr)]">
	<div>
		<label for="c-name" class="{ui.label} mb-2 block">Name</label>
		<input
			id="c-name"
			name="name"
			required
			maxlength="60"
			value={v.name || ''}
			placeholder="Bay Area"
			class={ui.input}
		/>
		{#if v.id}
			<p class="mt-1.5 {ui.note}">
				Renaming also renames it on this circuit’s events, standings and heroes.
			</p>
		{/if}
	</div>
	<div>
		<label for="c-short" class="{ui.label} mb-2 block">Short name</label>
		<input
			id="c-short"
			name="short"
			required
			maxlength="6"
			value={v.short || ''}
			placeholder="BAY"
			class="{ui.input} uppercase"
		/>
	</div>
	<div>
		<label for="c-region" class="{ui.label} mb-2 block">Region</label>
		<input
			id="c-region"
			name="region"
			maxlength="40"
			value={v.region || ''}
			placeholder="West Coast"
			class={ui.input}
		/>
	</div>
</div>

<div class="mt-5 grid gap-5 md:grid-cols-3">
	<div>
		<label for="c-tz" class="{ui.label} mb-2 block">Venues’ time zone</label>
		<select id="c-tz" name="timezone" class="{ui.select} w-full">
			{#each ZONES as [zone, label] (zone)}
				<option value={zone} selected={(v.timezone || 'America/Chicago') === zone}
					>{label} ({zone.split('/')[1].replace('_', ' ')})</option
				>
			{/each}
		</select>
		<p class="mt-1.5 {ui.note}">Event times are entered and shown in this zone.</p>
	</div>
	<div>
		<label for="c-color" class="{ui.label} mb-2 block">Colour</label>
		<ColorField
			id="c-color"
			name="color"
			value={v.color || '#5c5a52'}
			label={v.name || 'Circuit'}
		/>
	</div>
	<div>
		<label for="c-sort" class="{ui.label} mb-2 block">Order</label>
		<input
			id="c-sort"
			name="sort"
			type="number"
			min="0"
			max="999"
			value={v.sort ?? 10}
			class={ui.input}
		/>
		<p class="mt-1.5 {ui.note}">Lower comes first in lists.</p>
	</div>
</div>

<div class="mt-5">
	<label for="c-blurb" class="{ui.label} mb-2 block">About the circuit</label>
	<textarea
		id="c-blurb"
		name="blurb"
		rows="5"
		maxlength="600"
		placeholder="The circuit’s story, as players read it in its pop-out on the AGE Open."
		class={ui.textarea}>{v.blurb || ''}</textarea
	>
	<p class="mt-1.5 {ui.note}">
		Shown when players open the circuit on the AGE Open and the homepage.
	</p>
</div>
