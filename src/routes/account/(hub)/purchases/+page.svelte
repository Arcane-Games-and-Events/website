<script>
	import Panel from '$lib/components/account/Panel.svelte';
	import * as ui from '$lib/components/account/ui.js';
	let { data } = $props();
</script>

<svelte:head><title>Purchases — AGE</title></svelte:head>

<Panel
	rubric="Purchases"
	title="Purchase history"
	lead="Every membership charge and ticket, with its receipt."
>
	{#if data.orders.length === 0}
		<p class="border-t border-line py-8 font-newsreader text-[17px] text-soft italic">
			Nothing yet.
		</p>
	{:else}
		<ul class="border-t border-line">
			{#each data.orders as o (o.id)}
				<li>
					<a
						href="/account/purchases/{o.id}"
						class="grid gap-x-6 gap-y-1 border-b border-line py-4 transition-colors hover:bg-paper md:grid-cols-[120px_minmax(0,1fr)_auto] md:items-baseline"
					>
						<span class="text-[12.5px] text-soft tabular-nums">{ui.dateShort(o.createdAt)}</span>
						<span class="min-w-0">
							<span class="block font-newsreader text-[18px] leading-tight font-semibold"
								>{o.title}</span
							>
							<span class="block text-[12.5px] text-soft"
								>{o.kind}{o.quantity > 1 ? ` · ${o.quantity} tickets` : ''}{o.cardLastFour
									? ` · card •••• ${o.cardLastFour}`
									: ''}</span
							>
						</span>
						<span class="text-right">
							<span class="block font-semibold tabular-nums">{ui.money(o.amount)}</span>
							{#if o.status !== 'paid'}<span class="{ui.pill} {ui.tone.refunded} justify-end"
									>{o.status}</span
								>{/if}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</Panel>
