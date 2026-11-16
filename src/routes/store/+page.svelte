<script>
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';

	let { data } = $props();
	const ROLE = { owner: 'Owner', manager: 'Manager' };
</script>

<svelte:head><title>Your stores · AGE</title></svelte:head>

<DeskHeader
	kicker="Store"
	title="Your stores"
	subtitle="The local game stores you help run on the AGE Open circuit."
/>

<div class="mx-auto w-full max-w-[1200px] px-5 pt-8 pb-20 md:px-8">
	<ul class="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
		{#each data.stores as s (s.id)}
			<li>
				<a
					href="/store/{s.slug}"
					class="group block border border-t-[3px] border-line2 bg-white p-5 transition-shadow hover:shadow-[0_14px_28px_-20px_rgb(23_21_15/0.45)]"
					style="border-top-color: {s.circuitColor}"
				>
					<p
						class="text-[9.5px] font-extrabold tracking-[0.2em] uppercase"
						style="color: {s.circuitColor}"
					>
						◆ {s.circuitName} circuit
					</p>
					<h2
						class="mt-2 font-newsreader text-[22px] leading-tight font-semibold group-hover:text-warm"
					>
						{s.name}
					</h2>
					<p class="mt-1 text-[12.5px] text-soft">
						{[s.city, s.state].filter(Boolean).join(', ') || 'AGE Open store'} · {ROLE[s.role] ||
							s.role}{s.active ? '' : ' · inactive'}
					</p>
				</a>
			</li>
		{/each}
	</ul>
</div>
