<script>
	/** Studio → Projects → one project: its card, publishing, and deleting. */
	import { goto, invalidate } from '$app/navigation';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import ProjectForm from '$lib/studio/ProjectForm.svelte';
	import { PROJECT_TYPE } from '$lib/studio/projects.js';

	/** @type {{ data: any }} */
	let { data } = $props();
	let busy = $state(false);
	let error = $state('');
	const p = $derived(data.project);
	const live = $derived(p.status === 'published');

	async function setStatus(status) {
		busy = true;
		error = '';
		const res = await fetch(`/api/studio/projects/${p.id}`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ status })
		});
		busy = false;
		if (!res.ok) error = (await res.json().catch(() => ({}))).message || 'Couldn’t save';
		else invalidate('studio:projects');
	}

	async function remove() {
		if (
			!confirm(
				`Delete “${p.title}”? Its card leaves AGE Studios. The project itself isn’t touched.`
			)
		)
			return;
		const res = await fetch(`/api/studio/projects/${p.id}`, { method: 'DELETE' });
		if (res.ok) goto('/studio/projects');
		else error = (await res.json().catch(() => ({}))).message || 'Couldn’t delete';
	}
</script>

<svelte:head><title>{p.title} · Studio</title></svelte:head>

<DeskHeader
	kicker={PROJECT_TYPE[p.type].label}
	title={p.title}
	subtitle={live ? 'Live on AGE Studios' : 'A draft: only the Studio can see it'}
>
	{#snippet actions(compact)}
		<button
			type="button"
			disabled={busy}
			onclick={() => setStatus(live ? 'draft' : 'published')}
			class="{compact
				? 'h-8 px-3 text-[9.5px]'
				: 'h-10 px-5 text-[10.5px]'} bg-gold font-extrabold tracking-[0.14em] text-ink uppercase transition-colors hover:bg-paper-bg disabled:opacity-60"
			>{live ? 'Unpublish' : 'Publish'}</button
		>
	{/snippet}
</DeskHeader>
<DeskTabs />

<div class="mx-auto w-full max-w-[1200px] space-y-8 px-5 py-8 font-libre md:px-8">
	<div class="flex flex-wrap items-baseline justify-between gap-3">
		<a
			href="/studio/projects"
			class="text-[10.5px] font-extrabold tracking-[0.16em] text-soft uppercase hover:text-ink"
			>← Projects</a
		>
		{#if live}
			<a href="/studios/projects" class="text-[12.5px] text-soft underline hover:text-ink"
				>View on AGE Studios ↗</a
			>
		{/if}
	</div>
	{#if error}
		<p
			class="border-l-[3px] border-hero-rb bg-hero-rb/5 px-3 py-2 text-[13px] text-hero-rb"
			role="alert"
		>
			{error}
		</p>
	{:else if !live && data.problems.length}
		<p class="border-l-[3px] border-gold bg-gold/10 px-3 py-2 text-[13px]" role="status">
			Before publishing: {data.problems.join(' ')}
		</p>
	{/if}
	<section>
		<h2
			class="border-b-[3px] border-ink pb-2.5 text-[10.5px] font-extrabold tracking-[0.16em] uppercase"
		>
			The card
		</h2>
		<div class="mt-5">
			{#key p.id}
				<ProjectForm project={p} cover={data.cover} onsaved={() => invalidate('studio:projects')} />
			{/key}
		</div>
	</section>
	<section class="border-t border-line pt-6">
		<button
			type="button"
			onclick={remove}
			class="text-[10.5px] font-extrabold tracking-[0.14em] text-hero-rb uppercase hover:underline"
			>Delete project</button
		>
	</section>
</div>
