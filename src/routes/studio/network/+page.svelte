<script>
	/**
	 * Studio → Network: outside creators on AGE Studios. Paste a channel
	 * link, check it's the right one, add it; their uploads come in for
	 * picking on the creator's page. Nothing goes public until it's featured.
	 */
	import { goto, invalidate } from '$app/navigation';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import { shortDate } from '$lib/desk/video/format.js';

	/** @type {{ data: any }} */
	let { data } = $props();

	let url = $state('');
	let kind = $state('video');
	let preview = $state(/** @type {any} */ (null));
	let busy = $state(false);
	let error = $state('');

	async function call(body) {
		const res = await fetch('/api/studio/network', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(body)
		});
		const out = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(out.message || 'Something went wrong.');
		return out;
	}

	async function lookUp(e) {
		e.preventDefault();
		if (!url.trim() || busy) return;
		busy = true;
		error = '';
		preview = null;
		try {
			preview = (await call({ url, preview: true })).channel;
		} catch (err) {
			error = err.message;
		} finally {
			busy = false;
		}
	}

	async function add() {
		busy = true;
		error = '';
		try {
			const out = await call({ url, kind });
			await invalidate('studio:network');
			goto(`/studio/network/${out.channel.id}?show=new`);
		} catch (err) {
			error = err.message;
			busy = false;
		}
	}

	const label = 'text-[10.5px] font-extrabold tracking-[0.16em] uppercase';
	const chip =
		'inline-flex items-center border px-1.5 py-[1px] text-[9px] font-extrabold tracking-[0.14em] uppercase';
</script>

<svelte:head><title>Network · Studio</title></svelte:head>

<DeskHeader
	title="The AGE Network"
	subtitle="Creators from the community. Add a channel, then pick which of their videos go on AGE Studios."
/>
<DeskTabs />

<div class="mx-auto w-full max-w-[1200px] space-y-10 px-5 py-8 font-libre md:px-8">
	<section class="border border-line2 bg-white p-5 md:p-6">
		<h2 class={label}>Add a creator</h2>
		<form class="mt-3 flex flex-col gap-3 md:flex-row" onsubmit={lookUp}>
			<label class="min-w-0 flex-1">
				<span class="sr-only">YouTube channel link</span>
				<input
					type="text"
					inputmode="url"
					bind:value={url}
					oninput={() => (preview = null)}
					placeholder="https://www.youtube.com/@channel"
					class="h-11 w-full border border-line2 bg-paper-bg px-3 text-[14px] outline-none focus:border-ink"
				/>
			</label>
			<button
				type="submit"
				disabled={busy || !url.trim()}
				class="h-11 bg-ink px-5 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase hover:bg-warm disabled:opacity-50"
				>{busy && !preview ? 'Looking…' : 'Look up'}</button
			>
		</form>
		<p class="mt-2 text-[12px] text-fade">
			Any link to the channel works: youtube.com/@name, /channel/UC…, /c/… or /user/…
		</p>
		{#if error}<p class="mt-3 text-[13px] text-hero-rb" role="alert">{error}</p>{/if}

		{#if preview}
			<div class="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-[96px_minmax(0,1fr)]">
				{#if preview.avatarUrl}
					<img src={preview.avatarUrl} alt="" class="h-24 w-24 object-cover" />
				{:else}
					<span class="h-24 w-24 bg-ink"></span>
				{/if}
				<div class="min-w-0">
					<p class="font-newsreader text-[22px] font-semibold">{preview.name}</p>
					<p class="text-[12.5px] text-soft">
						{preview.handle ? `@${preview.handle}` : preview.channelId}
					</p>
					{#if preview.description}
						<p class="mt-2 line-clamp-3 text-[13px] text-soft">{preview.description}</p>
					{/if}
					{#if preview.existing}
						<p class="mt-3 text-[13px]">
							Already in the network:
							<a href="/studio/network/{preview.existing.id}" class="underline hover:text-warm"
								>{preview.existing.name}</a
							>
						</p>
					{:else}
						<div class="mt-4 flex flex-wrap items-center gap-3">
							<fieldset class="flex border border-line2">
								<legend class="sr-only">Kind of creator</legend>
								{#each [['video', 'Video'], ['podcast', 'Podcast']] as [k, word] (k)}
									<label
										class="cursor-pointer px-3 py-2 text-[10px] font-extrabold tracking-[0.14em] uppercase {kind ===
										k
											? 'bg-ink text-paper-bg'
											: 'text-soft'}"
									>
										<input type="radio" bind:group={kind} value={k} class="sr-only" />{word}
									</label>
								{/each}
							</fieldset>
							<button
								type="button"
								onclick={add}
								disabled={busy}
								class="bg-gold px-5 py-2.5 text-[10.5px] font-extrabold tracking-[0.16em] text-ink uppercase hover:bg-ink hover:text-paper-bg disabled:opacity-50"
								>{busy ? 'Adding…' : 'Add to the network'}</button
							>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</section>

	<section>
		<h2 class="flex items-baseline justify-between border-b-[3px] border-ink pb-2.5 {label}">
			Creators <span class="tracking-normal text-fade normal-case">{data.channels.length}</span>
		</h2>
		{#if data.channels.length}
			<ul class="divide-y divide-line">
				{#each data.channels as c (c.id)}
					<li>
						<a
							href="/studio/network/{c.id}"
							class="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-4 py-3.5 hover:bg-white/60 md:grid-cols-[56px_minmax(0,1fr)_auto]"
						>
							{#if c.avatar}
								<img src={c.avatar} alt="" class="h-14 w-14 object-cover" />
							{:else}
								<span class="h-14 w-14 bg-ink"></span>
							{/if}
							<span class="min-w-0">
								<span class="flex flex-wrap items-center gap-1.5">
									<span class="{chip} border-ink/60"
										>{c.kind === 'podcast' ? 'Podcast' : 'Video'}</span
									>
									{#if !c.isActive}<span class="{chip} border-line2 text-fade">Hidden</span>{/if}
									{#if c.fresh}<span class="{chip} border-prem/50 text-prem"
											>{c.fresh} new this week</span
										>{/if}
									{#if c.syncError}<span class="{chip} border-hero-rb/50 text-hero-rb"
											>Sync failed</span
										>{/if}
									{#if c.unavailable}<span class="{chip} border-hero-rb/50 text-hero-rb"
											>{c.unavailable} gone from YouTube</span
										>{/if}
								</span>
								<span class="mt-1 block truncate font-newsreader text-[18px] font-semibold"
									>{c.name}</span
								>
								<span class="block text-[12px] text-soft"
									>{c.featured} featured · {c.videos} pulled in{c.handle
										? ` · @${c.handle}`
										: ''}</span
								>
							</span>
							<span class="hidden text-right text-[11.5px] text-fade md:block">
								{c.lastSyncedAt ? `Synced ${shortDate(c.lastSyncedAt)}` : 'Not synced yet'}
								{#if c.newestAt}<br />Newest upload {shortDate(c.newestAt)}{/if}
							</span>
						</a>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="py-8 text-[14px] text-soft">
				No creators yet. Paste a YouTube channel link above to add the first.
			</p>
		{/if}
	</section>
</div>
