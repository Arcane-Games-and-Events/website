<script>
	import AgeOpenHeader from '$lib/components/age/admin/AgeOpenHeader.svelte';
	import { enhance } from '$app/forms';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';
	import CircuitFields from '$lib/components/age/admin/stores/CircuitFields.svelte';
	import * as ui from '$lib/components/age/admin/ui.js';

	let { form } = $props();
	let busy = $state(false);
</script>

<svelte:head><title>New circuit · Admin</title></svelte:head>

<AgeOpenHeader
	title="New circuit"
	subtitle="A new AGE Open circuit."
	trail={[{ href: '/admin/circuits', label: 'Circuits & stores' }]}
/>

{#if form?.error}<AdminNotice tone="error" message={form.error} />{/if}

<div class="mx-auto w-full max-w-[1200px] px-5 pt-6 pb-20 md:px-8">
	<form
		method="POST"
		class="mt-6 max-w-[860px] {ui.panel} p-5 md:p-7"
		use:enhance={() => {
			busy = true;
			return async ({ update }) => {
				await update({ reset: false });
				busy = false;
			};
		}}
	>
		<CircuitFields value={form?.value || {}} />
		<div class="mt-7 flex flex-wrap gap-3 border-t border-line2 pt-5">
			<button class={ui.btn} disabled={busy}>{busy ? 'Creating…' : 'Create circuit'}</button>
			<a href="/admin/circuits" class={ui.ghost}>Cancel</a>
		</div>
	</form>
</div>
