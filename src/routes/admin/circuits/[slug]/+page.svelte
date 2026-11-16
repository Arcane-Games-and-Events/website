<script>
	import AgeOpenHeader, {
		btnLine as hbtnLine
	} from '$lib/components/age/admin/AgeOpenHeader.svelte';
	import { enhance } from '$app/forms';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';
	import CircuitFields from '$lib/components/age/admin/stores/CircuitFields.svelte';
	import * as ui from '$lib/components/age/admin/ui.js';
	import { circuitImage } from '$lib/data/circuits.js';

	let { data, form } = $props();
	let busy = $state(false);
	const c = $derived(data.circuit);
	const shown = $derived(
		circuitImage(c.name, c.imageUrl ? [{ name: c.name, image: c.imageUrl }] : [])
	);

	// The chosen file, previewed before it's uploaded.
	let preview = $state(/** @type {string | null} */ (null));
	let uploading = $state(false);
	/** @type {HTMLInputElement | undefined} */
	let picker = $state();
	// Deleting: the exact name typed, and the box ticked.
	const h = $derived(data.history || { events: 0, standings: 0, heroes: 0, matches: 0 });
	const blockers = $derived(
		[
			[data.stores.length, 'store'],
			[h.events, 'event'],
			[h.standings, 'standing'],
			[h.heroes, 'hero record'],
			[h.matches, 'match']
		].filter(([n]) => n > 0)
	);
	let confirmName = $state('');
	let understood = $state(false);
	let deleting = $state(false);
	let toggling = $state(false);
	const ready = $derived(confirmName.trim() === c.name && understood && !blockers.length);

	function choose(e) {
		const f = e.currentTarget.files?.[0];
		if (preview) URL.revokeObjectURL(preview);
		preview = f ? URL.createObjectURL(f) : null;
	}
</script>

<svelte:head><title>{c.name} · Admin</title></svelte:head>

<AgeOpenHeader
	title={c.name}
	subtitle="{data.events} {data.events === 1 ? 'event' : 'events'} · {data.stores.length} {data
		.stores.length === 1
		? 'store'
		: 'stores'}{c.active ? '' : ' · inactive'}"
	circuit={c.name}
	trail={[{ href: '/admin/circuits', label: 'Circuits & stores' }]}
>
	{#snippet actions()}
		<a href="/admin/stores/new?circuit={c.slug}" class={hbtnLine}>+ Store</a>
	{/snippet}
</AgeOpenHeader>

{#if form?.error && form?.section !== 'delete'}<AdminNotice
		tone="error"
		message={form.error}
	/>{/if}
{#if form?.saved}<AdminNotice tone="success" message={form.saved} />{/if}

<div class="mx-auto w-full max-w-[1200px] px-5 pt-6 pb-20 md:px-8">
	<div class="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
		<div class="flex min-w-0 flex-col gap-8">
			<!-- the circuit's picture -->
			<section class="{ui.panel} overflow-hidden" style="border-top-color: {c.color}">
				<div class="grid md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
					<div class="relative aspect-video bg-ink">
						<img
							src={preview || shown}
							alt="{c.name} circuit"
							class="absolute inset-0 h-full w-full object-cover"
						/>
						<div
							class="absolute inset-0"
							style="background: linear-gradient(90deg, color-mix(in srgb, {c.color} 72%, rgba(23,21,15,0.55)) 0%, rgba(23,21,15,0) 75%);"
						></div>
						<div class="absolute bottom-0 left-0 p-4 text-white">
							<span
								class="ao-cond inline-flex h-[34px] min-w-[40px] items-center justify-center px-1.5 text-[18px] leading-none font-black"
								style="background: {c.color}">{c.short}</span
							>
							<p class="ao-cond mt-2 text-[30px] leading-none font-black uppercase">{c.name}</p>
						</div>
						{#if preview}
							<span
								class="absolute top-3 left-3 bg-gold px-2 py-1 text-[9px] font-extrabold tracking-[0.18em] text-ink uppercase"
								>Preview · not saved</span
							>
						{/if}
					</div>
					<div class="flex flex-col justify-between gap-4 p-5">
						<div>
							<p class={ui.label}>Circuit picture</p>
							<p class="mt-2 text-[13px] leading-relaxed text-soft">
								Shown on this circuit’s event cards, the AGE Open pages and the homepage. Wide
								pictures work best; it’s cropped to 16:9 around the most interesting part.
							</p>
							<p class="mt-2 text-[11.5px] text-fade">
								{c.imageUrl
									? 'Uploaded picture'
									: 'No upload yet: the built-in picture is showing.'}
							</p>
						</div>
						<form
							method="POST"
							action="?/image"
							enctype="multipart/form-data"
							class="flex flex-col gap-2.5"
							use:enhance={() => {
								uploading = true;
								return async ({ update }) => {
									await update();
									uploading = false;
									if (preview) URL.revokeObjectURL(preview);
									preview = null;
								};
							}}
						>
							<input
								bind:this={picker}
								type="file"
								name="image"
								accept="image/jpeg,image/png,image/webp,image/avif,image/heic"
								class="sr-only"
								onchange={choose}
							/>
							{#if preview}
								<div class="flex gap-2">
									<button class="{ui.btn} flex-1 justify-center" disabled={uploading}
										>{uploading ? 'Uploading…' : 'Use this picture'}</button
									>
									<button
										type="button"
										class={ui.ghost}
										onclick={() => {
											if (picker) picker.value = '';
											if (preview) URL.revokeObjectURL(preview);
											preview = null;
										}}>Cancel</button
									>
								</div>
							{:else}
								<button
									type="button"
									class="{ui.btn} justify-center"
									onclick={() => picker?.click()}
									>{c.imageUrl ? 'Replace picture' : 'Upload a picture'}</button
								>
							{/if}
						</form>
						{#if c.imageUrl && !preview}
							<form
								method="POST"
								action="?/removeImage"
								use:enhance={({ cancel }) => {
									if (!confirm('Remove this picture? The built-in one shows instead.')) cancel();
								}}
							>
								<button class="{ui.danger} px-0">Remove picture</button>
							</form>
						{/if}
					</div>
				</div>
			</section>

			<form
				method="POST"
				action="?/save"
				class="{ui.panel} p-5 md:p-7"
				use:enhance={() => {
					busy = true;
					return async ({ update }) => {
						await update({ reset: false });
						busy = false;
					};
				}}
			>
				{#key c.updatedAt}
					<CircuitFields value={c} />
				{/key}
				<div class="mt-7 flex flex-wrap gap-3 border-t border-line2 pt-5">
					<button class={ui.btn} disabled={busy}>{busy ? 'Saving…' : 'Save circuit'}</button>
					<a href="/admin/circuits" class={ui.ghost}>Cancel</a>
				</div>
			</form>

			<!-- danger zone: collapsed, and deliberately slow -->
			<details class="group border border-hero-rb/30 bg-white" open={form?.section === 'delete'}>
				<summary
					class="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden"
				>
					<span>
						<span class="block text-[10px] font-extrabold tracking-[0.2em] text-hero-rb uppercase"
							>Danger zone</span
						>
						<span class="mt-0.5 block text-[13px] text-soft"
							>Take this circuit off the site, or delete it</span
						>
					</span>
					<span
						class="text-[10px] font-extrabold tracking-[0.16em] text-soft uppercase group-open:hidden"
						>Show</span
					>
					<span
						class="hidden text-[10px] font-extrabold tracking-[0.16em] text-soft uppercase group-open:inline"
						>Hide</span
					>
				</summary>
				<div class="border-t border-hero-rb/20 px-5 pt-4 pb-5">
					{#if form?.section === 'delete' && form?.error}
						<AdminNotice tone="error" message={form.error} pad="pb-4 px-0! md:px-0!" />
					{/if}

					<!-- active / inactive: two confirmations -->
					<div class="flex flex-wrap items-start justify-between gap-4">
						<div class="min-w-0 flex-1">
							<p class="flex items-center gap-2.5">
								<span class="text-[10px] font-extrabold tracking-[0.2em] uppercase">Status</span>
								<span class="{ui.pill} {c.active ? ui.pillTone.active : ui.pillTone.inactive}"
									>{c.active ? 'Active' : 'Inactive'}</span
								>
							</p>
							<p class="mt-1.5 text-[13px] leading-relaxed text-soft">
								{c.active
									? 'On the AGE Open’s circuit lists, filters and the homepage.'
									: 'Hidden from the AGE Open’s circuit lists, filters and the homepage. Its events, standings and stores are kept.'}
							</p>
						</div>
						{#if !toggling}
							<button
								type="button"
								onclick={() => (toggling = true)}
								class="h-[38px] shrink-0 border px-4 text-[10px] font-extrabold tracking-[0.16em] uppercase transition-colors {c.active
									? 'border-hero-rb/40 text-hero-rb hover:bg-hero-rb hover:text-white'
									: 'border-line2 hover:border-ink'}"
								>{c.active ? 'Make inactive…' : 'Make active again…'}</button
							>
						{/if}
					</div>
					{#if toggling}
						<form
							method="POST"
							action="?/active"
							class="mt-4 border-l-[3px] px-4 py-3.5 {c.active
								? 'border-hero-rb bg-hero-rb/[0.05]'
								: 'border-prem bg-prem/[0.06]'}"
							use:enhance={({ cancel }) => {
								const ask = c.active
									? `Last check: take ${c.name} off the AGE Open?`
									: `Last check: put ${c.name} back on the AGE Open?`;
								if (!confirm(ask)) {
									cancel();
									return;
								}
								return async ({ update }) => {
									await update();
									toggling = false;
								};
							}}
						>
							<input type="hidden" name="active" value={c.active ? 'false' : 'true'} />
							<input type="hidden" name="confirmed" value="yes" />
							<p class="text-[13.5px] leading-relaxed">
								{#if c.active}
									<b>Make {c.name} inactive?</b> It disappears from the AGE Open’s circuit lists, filters
									and the homepage straight away. Its events, standings and stores stay as they are,
									and you can make it active again later.
								{:else}
									<b>Make {c.name} active again?</b> It goes back on the AGE Open’s circuit lists, filters
									and the homepage straight away.
								{/if}
							</p>
							<div class="mt-3 flex flex-wrap gap-2.5">
								<button class={c.active ? ui.dangerFill : ui.btn}
									>{c.active
										? `Yes, make ${c.name} inactive`
										: `Yes, make ${c.name} active`}</button
								>
								<button type="button" class={ui.ghost} onclick={() => (toggling = false)}
									>Keep it {c.active ? 'active' : 'inactive'}</button
								>
							</div>
						</form>
					{/if}

					<div class="my-5 border-t border-hero-rb/20"></div>

					<p class="mb-2 text-[10px] font-extrabold tracking-[0.2em] uppercase">Delete</p>
					{#if blockers.length}
						<p class="text-[13.5px] leading-relaxed">
							<b>{c.name} can’t be deleted.</b>
							It still has {blockers.map(([n, w]) => `${n} ${w}${n === 1 ? '' : 's'}`).join(', ')},
							which would be left pointing at a circuit that no longer exists.
						</p>
						<p class="mt-2 text-[13px] leading-relaxed text-soft">
							To take it off the site, make it inactive above. It disappears from public pages and
							its history stays.{#if data.stores.length}
								Stores have to be moved to another circuit or removed before it could ever be
								deleted.{/if}
						</p>
					{:else}
						<p class="text-[13.5px] leading-relaxed">
							This removes <b>{c.name}</b> and its picture for good. It has no stores, events or
							standings, so nothing else is affected. <b>This can’t be undone.</b>
						</p>
						<p class="mt-1.5 text-[12.5px] text-soft">
							Only want it off the site for now? Make it inactive above instead.
						</p>
						<form
							method="POST"
							action="?/delete"
							class="mt-4 flex flex-col gap-3"
							use:enhance={({ cancel }) => {
								if (!ready || !confirm(`Last check: delete the ${c.name} circuit permanently?`)) {
									cancel();
									return;
								}
								deleting = true;
								return async ({ update }) => {
									await update();
									deleting = false;
								};
							}}
						>
							<div>
								<label for="d-name" class="{ui.label} mb-2 block"
									>Type <span class="tracking-normal text-ink normal-case">“{c.name}”</span> to confirm</label
								>
								<input
									id="d-name"
									name="confirmName"
									bind:value={confirmName}
									autocomplete="off"
									spellcheck="false"
									placeholder={c.name}
									class="{ui.input} max-w-[360px] bg-white"
								/>
							</div>
							<label class="flex items-start gap-2.5 text-[13px]">
								<input
									type="checkbox"
									name="understood"
									bind:checked={understood}
									class="mt-0.5 h-4 w-4"
								/>
								I understand {c.name} will be deleted permanently and this can’t be undone.
							</label>
							<button class="{ui.dangerFill} w-fit" disabled={!ready || deleting}
								>{deleting ? 'Deleting…' : `Delete ${c.name}`}</button
							>
						</form>
					{/if}
				</div>
			</details>
		</div>

		<aside>
			<h2 class="{ui.label} border-b border-line2 pb-2">Stores in {c.name}</h2>
			<ul>
				{#each data.stores as s (s.id)}
					<li class="border-b border-line2">
						<a
							href="/admin/stores/{s.slug}"
							class="flex items-baseline justify-between gap-3 py-2.5 hover:text-warm"
						>
							<span class="truncate font-newsreader text-[15.5px] font-semibold">{s.name}</span>
							{#if !s.active}<span class={ui.note}>inactive</span>{/if}
						</a>
					</li>
				{:else}
					<li class="py-3 text-[13px] text-soft italic">None yet.</li>
				{/each}
			</ul>
			<a href="/admin/stores/new?circuit={c.slug}" class="mt-4 inline-block {ui.textAction}"
				>+ Add a store</a
			>
		</aside>
	</div>
</div>
