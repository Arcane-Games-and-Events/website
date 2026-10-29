<script>
	import { enhance } from '$app/forms';
	import Panel from '$lib/components/account/Panel.svelte';
	import Notice from '$lib/components/account/Notice.svelte';
	import * as ui from '$lib/components/account/ui.js';

	let { form } = $props();
	let busy = $state(false);
</script>

<svelte:head><title>Security — AGE</title></svelte:head>

<Panel rubric="Security" title="Password" lead="Keep your account yours.">
	{#if form?.success}<Notice tone="success" message={form.message} />{/if}
	{#if form?.error}<Notice tone="error" message={form.error} />{/if}

	<form
		method="POST"
		action="?/changePassword"
		use:enhance={() => {
			busy = true;
			return async ({ update }) => {
				busy = false;
				await update({ reset: true });
			};
		}}
		class="{ui.panel} px-6 pt-5 pb-6 md:px-7"
	>
		<div class="grid gap-4">
			<label
				><span class={ui.fieldLabel}>Current password</span><input
					type="password"
					name="currentPassword"
					autocomplete="current-password"
					class={ui.input}
					required
				/></label
			>
			<label
				><span class={ui.fieldLabel}>New password</span><input
					type="password"
					name="newPassword"
					autocomplete="new-password"
					minlength="8"
					class={ui.input}
					required
				/></label
			>
			<label
				><span class={ui.fieldLabel}>Confirm new password</span><input
					type="password"
					name="confirmPassword"
					autocomplete="new-password"
					minlength="8"
					class={ui.input}
					required
				/></label
			>
		</div>
		<button class="{ui.btn} mt-5" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button>
		<p class="mt-4 {ui.note}">
			Forgot it? <a href="/forgot-password" class="text-warm underline-offset-4 hover:underline"
				>Reset it by email</a
			>.
		</p>
	</form>
</Panel>
