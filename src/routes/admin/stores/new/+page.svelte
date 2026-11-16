<script>
	import AgeOpenHeader from '$lib/components/age/admin/AgeOpenHeader.svelte';
	import { enhance } from '$app/forms';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';
	import StoreFields from '$lib/components/age/admin/stores/StoreFields.svelte';
	import PeopleSearch from '$lib/components/age/store/PeopleSearch.svelte';
	import * as F from '$lib/components/age/store/fields.js';
	import * as ui from '$lib/components/age/admin/ui.js';

	let { data, form } = $props();
	let busy = $state(false);
	let owner = $state(null);
	const value = $derived(
		form?.value
			? {
					...form.value,
					revenueShare: form.value.revenueShare ? Number(form.value.revenueShare) / 100 : null
				}
			: { circuitId: data.circuitId }
	);
</script>

<svelte:head><title>New store · Admin</title></svelte:head>

<AgeOpenHeader
	title="New store"
	subtitle="A local game store that runs an AGE Open circuit."
	trail={[{ href: '/admin/circuits', label: 'Circuits & stores' }]}
/>

{#if form?.error}<AdminNotice tone="error" message={form.error} />{/if}

<div class="mx-auto w-full max-w-[1200px] px-5 pt-7 pb-20 md:px-8">
	<h2 class="ao-cond mt-3 text-[44px] leading-none font-black uppercase md:text-[56px]">
		Open a new store
	</h2>
	<p class="mt-1.5 text-[13px] text-soft">
		The store gets its own area on the site, where its team schedules Opens and checks players in.
	</p>

	<form
		method="POST"
		class="mt-7 max-w-[980px] border border-t-[4px] border-line2 border-t-ink bg-white"
		use:enhance={() => {
			busy = true;
			return async ({ update }) => {
				await update({ reset: false });
				busy = false;
			};
		}}
	>
		<div class="flex flex-col gap-7 px-5 py-6 md:px-7">
			<StoreFields {value} circuits={data.circuits} defaultShare={data.program?.defaultShare} />

			<div class={F.group}>
				<div>
					<p class={F.groupTitle}>First owner</p>
					<p class={F.groupNote}>
						Optional. Owners add the rest of the team from the store’s own page.
					</p>
				</div>
				<div>
					<p class={F.label}>Search any AGE account</p>
					<PeopleSearch endpoint="/admin/people" bind:picked={owner} label="Find the first owner" />
					<p class={F.hint}>They need an AGE account already.</p>
				</div>
			</div>
		</div>
		<div
			class="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-line2 bg-white px-5 py-3.5 shadow-[0_-12px_24px_-18px_rgb(23_21_15/0.35)] md:px-7"
		>
			<a href="/admin/circuits" class={ui.ghost}>Cancel</a>
			<button
				class="inline-flex h-[44px] items-center gap-2 bg-ink px-6 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-warm disabled:opacity-50"
				disabled={busy}
				>{busy ? 'Creating…' : 'Create the store'} <span aria-hidden="true">→</span></button
			>
		</div>
	</form>
</div>
