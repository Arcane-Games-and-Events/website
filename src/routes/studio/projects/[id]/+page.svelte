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
				? 'h-8 px-3 text-xs'
				: 'h-10 px-5 text-xs'} bg-gold font-extrabold tracking-widest text-ink uppercase transition-colors hover:bg-paper-bg disabled:opacity-60"
			>{live ? 'Unpublish' : 'Publish'}</button
		>
	{/snippet}
</DeskHeader>
<DeskTabs />

<div class="mx-auto w-full max-w-page space-y-8 px-5 py-8 font-libre md:px-8">
	<div class="flex flex-wrap items-baseline justify-between gap-3">
		<a
			href="/studio/projects"
			class="text-xs font-extrabold tracking-widest text-soft uppercase hover:text-ink"
			>← Projects</a
		>
		{#if live}
			<a href="/studios/projects" class="text-xs text-soft underline hover:text-ink"
				>View on AGE Studios ↗</a
			>
		{/if}
	</div>
	{#if error}
		<p class="border-l-3 border-hero-rb bg-hero-rb/5 px-3 py-2 text-sm text-hero-rb" role="alert">
			{error}
		</p>
	{:else if !live && data.problems.length}
		<p class="border-l-3 border-gold bg-gold/10 px-3 py-2 text-sm" role="status">
			Before publishing: {data.problems.join(' ')}
		</p>
	{/if}
	<section>
		<h2 class="border-b-3 border-ink pb-2.5 text-xs font-extrabold tracking-widest uppercase">
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
			class="text-xs font-extrabold tracking-widest text-hero-rb uppercase hover:underline"
			>Delete project</button
		>
	</section>
</div>
