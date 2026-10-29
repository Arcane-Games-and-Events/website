<script>
	/**
	 * Choose a saved card or enter a new one.
	 *
	 *   <PaymentMethodPicker bind:this={picker} {cards} {accept} />
	 *   const payment = await picker.getPayment();
	 *     → { savedCardId }  or  { opaqueData, expiry, lastFour, billTo, saveCard, makeDefault }
	 *
	 * Expired cards are listed but can't be chosen; the member is pointed
	 * at the account page to update them.
	 */
	import CardFields from './CardFields.svelte';

	let {
		/** publicCard() rows: { id, brand, lastFour, expiry, usable, status, isDefault } */
		cards = [],
		accept,
		firstName = '',
		lastName = '',
		/** Offer the "save this card" checkbox for a new card. */
		showSaveOption = true,
		/** When true the save checkbox is on and can't be turned off (memberships). */
		forceSave = false,
		disabled = false,
		onchange = () => {}
	} = $props();

	const usable = $derived(cards.filter((c) => c.usable));
	let mode = $state('saved'); // 'saved' | 'new'
	let selectedId = $state('');
	let saveCard = $state(true);
	let fields = $state();

	$effect(() => {
		// First render, or the card list changed under us.
		if (usable.length === 0) {
			mode = 'new';
		} else if (!usable.some((c) => c.id === selectedId)) {
			selectedId = (usable.find((c) => c.isDefault) || usable[0]).id;
			mode = 'saved';
		}
	});
	$effect(() => {
		onchange({ mode, selectedId });
	});

	/** Whether what's chosen can be submitted. */
	export function complete() {
		if (mode === 'saved') return !!selectedId;
		return !!fields?.complete();
	}

	/** The payment to send. Tokenizes a new card. */
	export async function getPayment() {
		if (mode === 'saved') {
			if (!selectedId) throw new Error('Choose a card.');
			return { savedCardId: selectedId };
		}
		const token = await fields.tokenize();
		return {
			...token,
			saveCard: forceSave || (showSaveOption && saveCard),
			makeDefault: usable.length === 0
		};
	}

	export function clearNewCard() {
		fields?.clear();
	}

	const optionCls =
		'flex w-full items-center gap-3 border-[1.5px] px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60';
</script>

<div class="space-y-4">
	{#if cards.length > 0}
		<div>
			<div class="mb-[10px] text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase">
				Pay with
			</div>
			<div class="space-y-2">
				{#each cards as card (card.id)}
					<button
						type="button"
						class="{optionCls} {mode === 'saved' && selectedId === card.id
							? 'border-ink bg-paper'
							: 'border-line2 bg-paper-bg hover:border-ink'}"
						disabled={disabled || !card.usable}
						onclick={() => {
							mode = 'saved';
							selectedId = card.id;
						}}
						aria-pressed={mode === 'saved' && selectedId === card.id}
					>
						<span
							class="block h-3 w-3 shrink-0 border-[1.5px] {mode === 'saved' &&
							selectedId === card.id
								? 'border-ink bg-ink'
								: 'border-line2'}"
						></span>
						<span class="min-w-0 flex-1">
							<span class="block text-[13.5px] font-semibold text-ink">
								{card.brand} •••• {card.lastFour}
								{#if card.isDefault}<span
										class="ml-2 text-[10px] font-extrabold tracking-[0.12em] text-fade uppercase"
										>Default</span
									>{/if}
							</span>
							<span class="block text-[11.5px] {card.usable ? 'text-fade' : 'text-hero-rb'}">
								{#if card.status === 'expired'}
									Expired {card.expiry}.
									<a href="/account/payment-methods" class="underline">Update it</a> to use it again.
								{:else if !card.usable}
									This card can no longer be charged.
								{:else}
									Expires {card.expiry}
								{/if}
							</span>
						</span>
					</button>
				{/each}
				<button
					type="button"
					class="{optionCls} {mode === 'new'
						? 'border-ink bg-paper'
						: 'border-line2 bg-paper-bg hover:border-ink'}"
					{disabled}
					onclick={() => (mode = 'new')}
					aria-pressed={mode === 'new'}
				>
					<span
						class="block h-3 w-3 shrink-0 border-[1.5px] {mode === 'new'
							? 'border-ink bg-ink'
							: 'border-line2'}"
					></span>
					<span class="text-[13.5px] font-semibold text-ink">Use a new card</span>
				</button>
			</div>
		</div>
	{/if}

	{#if mode === 'new'}
		<CardFields
			bind:this={fields}
			{accept}
			{firstName}
			{lastName}
			{disabled}
			compact={cards.length > 0}
		/>
		{#if showSaveOption}
			<label class="flex items-start gap-3 text-[12.5px] text-soft">
				<input
					type="checkbox"
					class="mt-[2px] h-4 w-4 shrink-0 border-[1.5px] border-line2 text-ink focus:ring-0"
					bind:checked={saveCard}
					disabled={disabled || forceSave}
				/>
				<span>
					{#if forceSave}
						This card is kept on file for your membership renewals. You can change it any time from
						your account.
					{:else}
						Save this card to my account for next time.
					{/if}
				</span>
			</label>
		{/if}
	{/if}
</div>
