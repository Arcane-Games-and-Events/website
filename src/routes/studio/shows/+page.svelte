<script>
	/** Studio → Shows: podcasts and interview series, and a way to start a new one. */
	import { goto } from '$app/navigation';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import DialogShell from '$lib/desk/editor/DialogShell.svelte';
	import Picture from '$lib/components/media/Picture.svelte';
	import ShowForm from '$lib/studio/ShowForm.svelte';
	import { KIND } from '$lib/studio/kinds.js';

	/** @type {{ data: any }} */
	let { data } = $props();
	let creating = $state(false);
</script>

<svelte:head><title>Shows · Studio</title></svelte:head>

<DeskHeader title="Shows" subtitle="Podcasts and interview series. Their episodes are in Media.">
	{#snippet actions(compact)}
		<button
			type="button"
			onclick={() => (creating = true)}
			class="{compact
				? 'h-8 px-3 text-[9.5px]'
				: 'h-10 px-5 text-[10.5px]'} bg-gold font-extrabold tracking-[0.14em] text-ink uppercase transition-colors hover:bg-paper-bg"
			>New show</button
		>
	{/snippet}
</DeskHeader>
<DeskTabs />

<div class="mx-auto w-full max-w-[1200px] px-5 py-8 font-libre md:px-8">
	{#if data.shows.length}
		<ul class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
			{#each data.shows as s (s.id)}
				<li class="border border-line2 bg-white {s.isActive ? '' : 'opacity-60'}">
					<a href="/studio/shows/{s.id}" class="group block">
						<span class="relative block aspect-square overflow-hidden bg-academy">
							{#if s.cover}
								<Picture
									image={s.cover}
									alt=""
									sizes="300px"
									class="absolute inset-0 h-full w-full object-cover"
								/>
							{:else}
								<span
									class="absolute inset-0 flex items-center justify-center p-4 text-center font-newsreader text-[22px] font-semibold text-paper-bg"
									>{s.name}</span
								>
							{/if}
						</span>
						<span class="block p-3">
							<span class="block font-newsreader text-[18px] font-semibold group-hover:text-warm"
								>{s.name}</span
							>
							<span class="block text-[11.5px] text-fade"
								>{KIND[s.kind].short}{s.host ? ` · ${s.host}` : ''}</span
							>
							<span class="mt-1 block text-[12px] text-soft"
								>{s.episodes}
								{s.episodes === 1 ? 'episode' : 'episodes'}{s.isActive ? '' : ' · inactive'}</span
							>
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<div class="border-[3px] border-double border-ink px-6 py-12 text-center">
			<p class="font-newsreader text-[22px] font-semibold">No shows yet.</p>
			<p class="mt-2 text-[13.5px] text-soft">
				Create a podcast or an interview series, then add its episodes from Media.
			</p>
			<button
				type="button"
				onclick={() => (creating = true)}
				class="mt-5 bg-ink px-5 py-3 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase hover:bg-warm"
				>Create the first show</button
			>
		</div>
	{/if}
</div>

<DialogShell
	open={creating}
	onclose={() => (creating = false)}
	kicker="Shows"
	title="New show"
	wide
>
	{#if creating}
		<ShowForm onsaved={(s) => goto(`/studio/shows/${s.id}`)} />
	{/if}
</DialogShell>
