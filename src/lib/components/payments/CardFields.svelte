<script>
	/**
	 * Card entry fields. The number and code never leave the browser except
	 * to Authorize.net: the parent calls `tokenize()` and gets a one-time
	 * token plus the expiry and last four.
	 *
	 *   <CardFields bind:this={fields} {accept} />
	 *   const { opaqueData, expiry, lastFour, billTo } = await fields.tokenize();
	 */
	import {
		tokenizeCard,
		loadAccept,
		formatCardNumber,
		guessBrand,
		TEST_CARDS
	} from '$lib/payments/accept.js';

	let {
		/** { apiLoginId, clientKey, sandbox, ready } from acceptConfig() */
		accept,
		/** Prefill for the name fields. */
		firstName = '',
		lastName = '',
		showName = true,
		showZip = true,
		compact = false,
		disabled = false
	} = $props();

	let number = $state('');
	let month = $state('');
	let year = $state('');
	let code = $state('');
	let zip = $state('');
	let first = $state(firstName);
	let last = $state(lastName);
	let fieldError = $state('');

	const brand = $derived(guessBrand(number));

	// Start fetching Accept.js as soon as the fields appear, so it is ready
	// by the time the member submits.
	$effect(() => {
		if (accept?.ready) loadAccept(accept.sandbox).catch(() => {});
	});
	const currentYear = new Date().getFullYear();
	const years = Array.from({ length: 15 }, (_, i) => String(currentYear + i));

	function onNumberInput(e) {
		number = formatCardNumber(e.target.value);
	}

	/** Fill the sandbox test card. */
	export function useTestCard(i = 0) {
		const c = TEST_CARDS[i];
		number = formatCardNumber(c.number);
		[month, year] = c.exp.split('/');
		year = `20${year}`;
		code = c.code;
		zip = c.zip;
		if (!first) first = 'Test';
		if (!last) last = 'Member';
	}

	/** Whether every required field has something in it. */
	export function complete() {
		return (
			number.replace(/\D/g, '').length >= 13 &&
			!!month &&
			!!year &&
			code.length >= 3 &&
			(!showZip || zip.trim().length >= 3) &&
			(!showName || (first.trim() && last.trim()))
		);
	}

	/**
	 * Tokenize what's typed. Throws with a message the user can read.
	 * @returns {Promise<{ opaqueData: object, expiry: { month: number, year: number }, lastFour: string, billTo: object }>}
	 */
	export async function tokenize() {
		fieldError = '';
		if (!complete()) {
			fieldError = 'Fill in every card field.';
			throw new Error(fieldError);
		}
		try {
			const token = await tokenizeCard({
				apiLoginId: accept.apiLoginId,
				clientKey: accept.clientKey,
				sandbox: accept.sandbox,
				card: { number, month, year, code, zip, fullName: `${first} ${last}`.trim() }
			});
			return {
				...token,
				billTo: { firstName: first.trim(), lastName: last.trim(), zip: zip.trim() }
			};
		} catch (err) {
			fieldError = err.message;
			throw err;
		}
	}

	export function clear() {
		number = '';
		month = '';
		year = '';
		code = '';
		fieldError = '';
	}

	const labelCls = 'mb-[7px] block text-[11px] font-bold tracking-[0.01em] text-soft';
	const inputCls =
		'h-[50px] w-full border-[1.5px] border-line2 bg-paper-bg px-[15px] text-[14.5px] font-medium text-ink transition-colors outline-none placeholder:text-fade hover:border-ink focus:border-ink disabled:opacity-60';
</script>

<div class={compact ? 'space-y-4' : 'space-y-5'}>
	{#if !accept?.ready}
		<div
			class="border-[1.5px] border-warm bg-warm/10 px-4 py-3 text-[12px] font-semibold tracking-[0.04em] text-warm uppercase"
		>
			Card payments aren't configured on this site yet.
		</div>
	{/if}

	{#if accept?.sandbox}
		<div class="border-[1.5px] border-line2 bg-paper px-4 py-3 text-[11.5px] text-soft">
			<div class="flex items-center justify-between gap-3">
				<div class="text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase">
					Test mode
				</div>
				<button
					type="button"
					class="text-[10.5px] font-extrabold tracking-[0.14em] text-warm uppercase hover:underline"
					onclick={() => useTestCard(0)}
					{disabled}
				>
					Fill test card
				</button>
			</div>
			<div class="mt-1 grid grid-cols-2 gap-x-4 gap-y-[2px] tabular-nums">
				<div><span class="text-fade">Card</span> 4007 0000 0002 7</div>
				<div><span class="text-fade">Exp</span> 12 / 2028</div>
				<div><span class="text-fade">CVV</span> 123</div>
				<div><span class="text-fade">ZIP</span> 12345 (46282 declines)</div>
			</div>
		</div>
	{/if}

	<div>
		<div class="mb-[14px] text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase">
			Card information
		</div>
		<label for="cf-number" class={labelCls}>
			Card number <span class="text-prem">*</span>
			{#if brand}<span class="ml-2 font-semibold text-fade">{brand}</span>{/if}
		</label>
		<input
			id="cf-number"
			type="text"
			inputmode="numeric"
			autocomplete="cc-number"
			placeholder="1234 5678 9012 3456"
			value={number}
			oninput={onNumberInput}
			maxlength="23"
			class="{inputCls} mb-[15px] tabular-nums"
			{disabled}
			required
		/>
		<div class="grid grid-cols-3 gap-[11px]">
			<div>
				<label for="cf-month" class={labelCls}>Month <span class="text-prem">*</span></label>
				<select
					id="cf-month"
					bind:value={month}
					autocomplete="cc-exp-month"
					class={inputCls}
					{disabled}
					required
				>
					<option value="">MM</option>
					{#each Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')) as m (m)}
						<option value={m}>{m}</option>
					{/each}
				</select>
			</div>
			<div>
				<label for="cf-year" class={labelCls}>Year <span class="text-prem">*</span></label>
				<select
					id="cf-year"
					bind:value={year}
					autocomplete="cc-exp-year"
					class={inputCls}
					{disabled}
					required
				>
					<option value="">YYYY</option>
					{#each years as y (y)}
						<option value={y}>{y}</option>
					{/each}
				</select>
			</div>
			<div>
				<label for="cf-code" class={labelCls}>CVV <span class="text-prem">*</span></label>
				<input
					id="cf-code"
					type="text"
					inputmode="numeric"
					autocomplete="cc-csc"
					placeholder="123"
					maxlength="4"
					bind:value={code}
					class="{inputCls} tabular-nums"
					{disabled}
					required
				/>
			</div>
		</div>
	</div>

	{#if showName || showZip}
		<div>
			<div class="mb-[14px] text-[10px] font-extrabold tracking-[0.14em] text-fade uppercase">
				Billing
			</div>
			<div
				class="grid gap-[11px] {showName && showZip
					? 'grid-cols-[1fr_1fr_98px]'
					: showName
						? 'grid-cols-2'
						: 'grid-cols-1'}"
			>
				{#if showName}
					<div>
						<label for="cf-first" class={labelCls}
							>First name <span class="text-prem">*</span></label
						>
						<input
							id="cf-first"
							type="text"
							autocomplete="cc-given-name"
							bind:value={first}
							class={inputCls}
							{disabled}
							required
						/>
					</div>
					<div>
						<label for="cf-last" class={labelCls}>Last name <span class="text-prem">*</span></label>
						<input
							id="cf-last"
							type="text"
							autocomplete="cc-family-name"
							bind:value={last}
							class={inputCls}
							{disabled}
							required
						/>
					</div>
				{/if}
				{#if showZip}
					<div>
						<label for="cf-zip" class={labelCls}>ZIP <span class="text-prem">*</span></label>
						<input
							id="cf-zip"
							type="text"
							inputmode="numeric"
							autocomplete="postal-code"
							maxlength="10"
							bind:value={zip}
							class="{inputCls} tabular-nums"
							{disabled}
							required
						/>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	{#if fieldError}
		<p class="m-0 text-[12.5px] font-semibold text-hero-rb">{fieldError}</p>
	{/if}
	<p class="m-0 text-[11px] leading-snug text-fade">
		Card details go straight to Authorize.net and never touch our servers.
	</p>
</div>
