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

<div class="mx-auto w-full max-w-page px-5 pt-8 pb-20 md:px-8">
	<ul class="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
		{#each data.stores as s (s.id)}
			<li>
				<a
					href="/store/{s.slug}"
					class="group block border border-t-3 border-line2 bg-white p-5 transition-shadow hover:shadow-lg"
					style="border-top-color: {s.circuitColor}"
				>
					<p
						class="text-xs font-extrabold tracking-widest uppercase"
						style="color: {s.circuitColor}"
					>
						◆ {s.circuitName} circuit
					</p>
					<h2
						class="mt-2 font-newsreader text-2xl leading-tight font-semibold group-hover:text-warm"
					>
						{s.name}
					</h2>
					<p class="mt-1 text-xs text-soft">
						{[s.city, s.state].filter(Boolean).join(', ') || 'AGE Open store'} · {ROLE[s.role] ||
							s.role}{s.active ? '' : ' · inactive'}
					</p>
				</a>
			</li>
		{/each}
	</ul>
</div>
