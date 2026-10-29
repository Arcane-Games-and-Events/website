<script>
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Panel from '$lib/components/account/Panel.svelte';
	import Notice from '$lib/components/account/Notice.svelte';
	import CardFields from '$lib/components/payments/CardFields.svelte';
	import * as ui from '$lib/components/account/ui.js';

	let { data, form } = $props();
	let adding = $state(false);
	let updating = $state(''); // card id being re-entered
	let busy = $state('');
	let fields = $state();
	let cardError = $state('');
	let makeDefault = $state(false);

	$effect(() => {
		if (form?.retoken && form.cardId) {
			adding = false;
			updating = form.cardId;
		}
	});

	const enh = (id) => () => {
		busy = id;
		return async ({ update }) => {
			busy = '';
			await update();
			await invalidateAll();
		};
	};

	const tokenizeThenSubmit =
		(id) =>
		async ({ formData, cancel }) => {
			busy = id;
			cardError = '';
			try {
				const t = await fields.tokenize();
				formData.set('dataDescriptor', t.opaqueData.dataDescriptor);
				formData.set('dataValue', t.opaqueData.dataValue);
				formData.set('expMonth', String(t.expiry.month));
				formData.set('expYear', String(t.expiry.year));
				formData.set('lastFour', t.lastFour);
				formData.set('firstName', t.billTo.firstName);
				formData.set('lastName', t.billTo.lastName);
				formData.set('zip', t.billTo.zip);
			} catch (err) {
				cardError = err.message;
				busy = '';
				cancel();
				return;
			}
			return async ({ update, result }) => {
				busy = '';
				if (result.type === 'success' && !result.data?.retoken) {
					adding = false;
					updating = '';
				}
				await update();
				await invalidateAll();
			};
		};
</script>

<svelte:head><title>Payment methods — AGE</title></svelte:head>

<Panel
	rubric="Payment methods"
	title="Saved cards"
	lead="Cards on file for faster checkout and membership renewals. Numbers are held by Authorize.net, never by AGE."
>
	{#snippet aside()}
		{#if !adding && !updating}
			<button
				type="button"
				class={ui.btn}
				onclick={() => (adding = true)}
				disabled={!data.accept?.ready}>+ Add a card</button
			>
		{/if}
	{/snippet}

	{#if form?.success}<Notice tone={form.retoken ? 'info' : 'success'} message={form.message} />{/if}
	{#if form?.error}<Notice tone="error" message={form.error} />{/if}

	{#if adding || updating}
		<form
			method="POST"
			action={updating ? '?/update' : '?/add'}
			use:enhance={tokenizeThenSubmit('form')}
			class="{ui.panel} mb-8 px-6 pt-5 pb-6 md:px-7"
		>
			{#if updating}<input type="hidden" name="cardId" value={updating} />{/if}
			<p class={ui.label}>{updating ? 'Re-enter the card to update it' : 'New card'}</p>
			<div class="mt-4">
				<CardFields
					bind:this={fields}
					accept={data.accept}
					firstName={data.user?.firstName}
					lastName={data.user?.lastName}
				/>
			</div>
			{#if !updating}
				<label class="mt-4 flex items-center gap-3 text-[13px] text-soft">
					<input
						type="checkbox"
						name="makeDefault"
						value="1"
						bind:checked={makeDefault}
						class="h-4 w-4 border-[1.5px] border-line2 text-ink focus:ring-0"
					/>
					Make this my default card
				</label>
			{/if}
			{#if cardError}<p class="mt-3 text-[12.5px] font-semibold text-hero-rb">{cardError}</p>{/if}
			<div class="mt-5 flex gap-2">
				<button class={ui.btn} disabled={busy === 'form'}
					>{busy === 'form' ? 'Saving…' : updating ? 'Update card' : 'Save card'}</button
				>
				<button
					type="button"
					class={ui.ghost}
					onclick={() => {
						adding = false;
						updating = '';
						cardError = '';
					}}>Cancel</button
				>
			</div>
		</form>
	{/if}

	{#if data.cards.length === 0}
		<p class="border-t border-line py-8 font-newsreader text-[17px] text-soft italic">
			No cards saved yet. You can save one at checkout, or add one here.
		</p>
	{:else}
		<ul class="border-t border-line">
			{#each data.cards as c (c.id)}
				<li class="flex flex-wrap items-center gap-4 border-b border-line py-4">
					<div class="min-w-0 flex-1">
						<p class="font-newsreader text-[19px] font-semibold">
							{c.brand} •••• {c.lastFour}
							{#if c.isDefault}<span
									class="ml-2 align-middle text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase"
									>Default</span
								>{/if}
						</p>
						<p class="mt-0.5 text-[12.5px] {c.usable ? 'text-soft' : 'text-hero-rb'}">
							{#if c.status === 'expired'}Expired {c.expiry}{:else if !c.usable}Can no longer be
								charged{:else}Expires {c.expiry}{/if}{c.nickname ? ` · ${c.nickname}` : ''}
						</p>
					</div>
					<div class="flex flex-wrap gap-2">
						{#if !c.usable}
							<button
								type="button"
								class={ui.ghostSm}
								onclick={() => {
									updating = c.id;
									adding = false;
								}}>Update card</button
							>
						{:else if !c.isDefault}
							<form method="POST" action="?/makeDefault" use:enhance={enh(c.id)}>
								<input type="hidden" name="cardId" value={c.id} />
								<button class={ui.ghostSm} disabled={!!busy}>Make default</button>
							</form>
						{/if}
						<form
							method="POST"
							action="?/remove"
							use:enhance={enh(c.id)}
							onsubmit={(e) => {
								if (!confirm(`Remove the ${c.brand} ending ${c.lastFour}?`)) e.preventDefault();
							}}
						>
							<input type="hidden" name="cardId" value={c.id} />
							<button class={ui.danger} disabled={!!busy}>Remove</button>
						</form>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</Panel>
