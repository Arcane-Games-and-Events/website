<script>
	/** Studio → Projects: the cards AGE Studios shows for things that aren't Studio videos. */
	import { goto } from '$app/navigation';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import DialogShell from '$lib/desk/editor/DialogShell.svelte';
	import Picture from '$lib/components/media/Picture.svelte';
	import ProjectForm from '$lib/studio/ProjectForm.svelte';
	import { PROJECT_TYPE } from '$lib/studio/projects.js';

	/** @type {{ data: any }} */
	let { data } = $props();
	let creating = $state(false);
	const chip =
		'inline-flex items-center border px-1.5 py-[1px] text-[9px] font-extrabold tracking-[0.14em] uppercase';
</script>

<svelte:head><title>Projects · Studio</title></svelte:head>

<DeskHeader
	title="Projects"
	subtitle="Interactive pages, stats, software and films. Each one is a card on AGE Studios that links to the project."
>
	{#snippet actions(compact)}
		<button
			type="button"
			onclick={() => (creating = true)}
			class="{compact
				? 'h-8 px-3 text-[9.5px]'
				: 'h-10 px-5 text-[10.5px]'} bg-gold font-extrabold tracking-[0.14em] text-ink uppercase transition-colors hover:bg-paper-bg"
			>New project</button
		>
	{/snippet}
</DeskHeader>
<DeskTabs />

<div class="mx-auto w-full max-w-[1200px] px-5 py-8 font-libre md:px-8">
	{#if data.projects.length}
		<ul class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.projects as p (p.id)}
				{@const t = PROJECT_TYPE[p.type]}
				<li class="border border-line2 bg-white">
					<a href="/studio/projects/{p.id}" class="group block">
						<span class="relative block aspect-video overflow-hidden {t.block}">
							{#if p.cover}
								<Picture
									image={p.cover}
									alt=""
									sizes="400px"
									class="absolute inset-0 h-full w-full object-cover"
								/>
							{:else}
								<span
									class="absolute inset-0 flex items-center justify-center p-4 text-center font-newsreader text-[22px] font-semibold"
									>{p.title}</span
								>
							{/if}
						</span>
						<span class="block p-3">
							<span class="flex flex-wrap gap-1.5">
								<span class="{chip} border-transparent {t.block}">{t.label}</span>
								{#if p.status === 'published'}
									<span class="{chip} border-ink bg-ink text-paper-bg">Live</span>
								{:else}
									<span class="{chip} border-line2 text-fade">Draft</span>
								{/if}
								{#if p.isFeatured}<span class="{chip} border-studio/60 text-studio">Featured</span
									>{/if}
								{#if p.isPremium}<span class="{chip} border-prem/50 text-prem">Premium</span>{/if}
							</span>
							<span
								class="mt-2 block font-newsreader text-[18px] font-semibold group-hover:text-warm"
								>{p.title}</span
							>
							{#if p.dek}<span class="mt-0.5 block text-[12.5px] text-soft">{p.dek}</span>{/if}
						</span>
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<div class="border-[3px] border-double border-ink px-6 py-12 text-center">
			<p class="font-newsreader text-[22px] font-semibold">No projects yet.</p>
			<p class="mt-2 text-[13.5px] text-soft">
				Add a card for an interactive page, a stats page, a piece of software or a film.
			</p>
			<button
				type="button"
				onclick={() => (creating = true)}
				class="mt-5 bg-ink px-5 py-3 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase hover:bg-warm"
				>Add the first project</button
			>
		</div>
	{/if}
</div>

<DialogShell
	open={creating}
	onclose={() => (creating = false)}
	kicker="Projects"
	title="New project"
	wide
>
	{#if creating}
		<ProjectForm onsaved={(p) => goto(`/studio/projects/${p.id}`)} />
	{/if}
</DialogShell>
