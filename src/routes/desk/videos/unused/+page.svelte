<script>
	/**
	 * Unused on Mux — assets nothing on the site points to. They still cost
	 * storage on Mux. Deletable on the live site only.
	 */
	import { invalidateAll } from '$app/navigation';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import VideoAreaNav from '$lib/desk/video/VideoAreaNav.svelte';
	import VideoThumb from '$lib/desk/video/VideoThumb.svelte';
	import { shortDate } from '$lib/desk/video/format.js';
	import { dur } from '$lib/desk/analyticsFormat.js';

	/** @type {{ data: any }} */
	let { data } = $props();
	let busy = $state('');
	let error = $state('');

	async function remove(ids) {
		if (
			!confirm(
				ids.length > 1
					? `Delete all ${ids.length} unused videos from Mux? This can’t be undone.`
					: 'Delete this video from Mux? This can’t be undone.'
			)
		)
			return;
		error = '';
		for (const id of ids) {
			busy = id;
			const res = await fetch(`/api/desk/videos/unused/${id}`, { method: 'DELETE' });
			if (!res.ok) {
				error = (await res.json().catch(() => ({})))?.message || 'Couldn’t delete one of them';
				break;
			}
		}
		busy = '';
		await invalidateAll();
	}
	const total = $derived(data.assets.reduce((s, a) => s + (a.duration || 0), 0));
</script>

<svelte:head><title>Unused on Mux · Videos — Desk</title></svelte:head>

<DeskHeader
	kicker="Videos"
	title="Unused on Mux"
	subtitle="Videos on Mux that nothing on the site uses."
/>
<DeskTabs />
<VideoAreaNav areas={data.areas} analytics={false} />

<div class="mx-auto w-full max-w-[1200px] px-5 py-8 font-libre md:px-8 md:py-10">
	{#if !data.canDelete}
		<p
			class="mb-6 max-w-[720px] border-l-[3px] border-warm bg-paper px-4 py-3 text-[13px] leading-relaxed"
		>
			This isn’t the live site. Dev shares the Mux account with production, so videos the live site
			uses show up here too. The list is read-only; delete unused videos from the live site.
		</p>
	{/if}
	<div class="flex flex-wrap items-baseline justify-between gap-3">
		<p class="text-[13px] text-soft">
			{data.assets.length} videos · {dur(total)} in all
		</p>
		{#if data.canDelete && data.assets.length}
			<button
				type="button"
				disabled={!!busy}
				onclick={() => remove(data.assets.map((a) => a.id))}
				class="h-9 bg-hero-rb px-4 text-[10px] font-extrabold tracking-[0.14em] text-white uppercase disabled:opacity-50"
				>Delete all unused</button
			>
		{/if}
	</div>
	{#if error}<p class="mt-3 text-[12.5px] text-hero-rb" role="alert">{error}</p>{/if}

	{#if data.assets.length}
		<ul class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			{#each data.assets as a (a.id)}
				<li class="border border-line2 bg-white">
					<VideoThumb
						video={{ ...a, status: a.status === 'ready' ? 'ready' : 'preparing', provider: 'mux' }}
					/>
					<div class="p-3">
						<p class="truncate font-mono text-[11px] text-fade">{a.id}</p>
						<p class="mt-1 text-[12.5px]">
							{shortDate(a.createdAt)}{#if a.was}<span class="text-fade"> · was {a.was}</span>{/if}
						</p>
						{#if data.canDelete}
							<button
								type="button"
								disabled={!!busy}
								onclick={() => remove([a.id])}
								class="mt-2 text-[9.5px] font-extrabold tracking-[0.14em] text-fade uppercase hover:text-hero-rb disabled:opacity-40"
								>{busy === a.id ? 'Deleting…' : 'Delete'}</button
							>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="mt-6 font-newsreader text-[16px] text-soft italic">Nothing unused. Mux is tidy.</p>
	{/if}
</div>
