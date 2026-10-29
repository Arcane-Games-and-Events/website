<script>
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Panel from '$lib/components/account/Panel.svelte';
	import Notice from '$lib/components/account/Notice.svelte';
	import * as ui from '$lib/components/account/ui.js';

	let { data, form } = $props();
	let busy = $state(false);
</script>

<svelte:head><title>Profile — AGE</title></svelte:head>

<Panel rubric="Profile" title="Your details" lead="How you appear on AGE and at the AGE Open.">
	{#if form?.success}<Notice tone="success" message={form.message} />{/if}
	{#if form?.error}<Notice tone="error" message={form.error} />{/if}

	<form
		method="POST"
		action="?/updateProfile"
		use:enhance={() => {
			busy = true;
			return async ({ update }) => {
				busy = false;
				await update();
				await invalidateAll();
			};
		}}
		class="{ui.panel} px-6 pt-5 pb-6 md:px-7"
	>
		<div class="grid gap-4 sm:grid-cols-2">
			<label
				><span class={ui.fieldLabel}>First name</span><input
					type="text"
					name="firstName"
					value={data.user.firstName}
					class={ui.input}
					required
					maxlength="60"
				/></label
			>
			<label
				><span class={ui.fieldLabel}>Last name</span><input
					type="text"
					name="lastName"
					value={data.user.lastName}
					class={ui.input}
					required
					maxlength="60"
				/></label
			>
			<label class="sm:col-span-2"
				><span class={ui.fieldLabel}
					>GEM ID <span class="font-normal text-fade">(optional)</span></span
				><input
					type="text"
					name="gemId"
					value={data.user.gemId || ''}
					class={ui.input}
					maxlength="40"
					placeholder="Your Flesh and Blood GEM ID"
				/></label
			>
			<div class="sm:col-span-2">
				<span class={ui.fieldLabel}>Email</span>
				<p
					class="h-[50px] border-[1.5px] border-line bg-paper px-[15px] text-[14.5px] leading-[48px] text-soft"
				>
					{data.user.email}
				</p>
				<p class="mt-1 {ui.note}">To change your email, write to info@arcanegamesandevents.com.</p>
			</div>
		</div>
		<button class="{ui.btn} mt-5" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
	</form>
</Panel>
