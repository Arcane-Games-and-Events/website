<!--
  RefundConsent — the box above every guide payment: unchecked, required,
  with the exact words stored with the order and a link to the policy.
  The pay button stays disabled until it's ticked (bind:checked).

  Props: checked (bindable), disabled
-->
<script>
	import { REFUND_CONSENT_TEXT } from '$lib/academy/partner/terms.js';

	/** @type {{ checked?: boolean, disabled?: boolean }} */
	let { checked = $bindable(false), disabled = false } = $props();
</script>

<div class="border border-line2 bg-paper px-3.5 py-3">
	<label class="flex cursor-pointer items-start gap-2.5 text-xs leading-snug text-ink">
		<input
			type="checkbox"
			bind:checked
			{disabled}
			required
			class="mt-0.5 h-4 w-4 shrink-0 border-ink text-prem focus:ring-0"
		/>
		<span>{REFUND_CONSENT_TEXT}</span>
	</label>
	<a
		href="/refund-policy"
		target="_blank"
		rel="noopener"
		class="mt-1.5 ml-7 inline-block text-xs font-semibold text-soft underline underline-offset-2 hover:text-ink"
		>Refund policy</a
	>
</div>
