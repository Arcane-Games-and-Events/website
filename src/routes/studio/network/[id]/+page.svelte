<script>
	/**
	 * Studio → Network → one creator. Their details on top; then the
	 * videos pulled in from their channel, each with a Feature switch.
	 * Only featured videos are on AGE Studios, in the order set here.
	 */
	import { goto, invalidate } from '$app/navigation';
	import { untrack } from 'svelte';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import CoverImagePicker from '$lib/desk/editor/CoverImagePicker.svelte';
	import { cleanTypedSlug } from '$lib/desk/slug.js';
	import { clock, shortDate } from '$lib/desk/video/format.js';

	/** @type {{ data: any }} */
	let { data } = $props();
	const c = $derived(data.channel);

	const c0 = untrack(() => data.channel);
	let form = $state({
		name: c0.name,
		slug: c0.slug,
		kind: c0.kind,
		description: c0.description ?? '',
		isActive: c0.isActive,
		coverImageId: c0.coverImageId
	});
	let image = $state(untrack(() => data.channel.image));
	let saving = $state(false);
	let saved = $state(false);
	let syncing = $state(false);
	let note = $state('');
	let error = $state('');
	let link = $state('');
	let adding = $state(false);
	let q = $state(untrack(() => data.q));
	let busyIds = $state(/** @type {string[]} */ ([]));

	async function api(path, method, body) {
		const res = await fetch(path, {
			method,
			headers: { 'content-type': 'application/json' },
			body: body === undefined ? undefined : JSON.stringify(body)
		});
		const out = await res.json().catch(() => ({}));
		if (!res.ok) throw new Error(out.message || 'Something went wrong.');
		return out;
	}
	const refresh = () => invalidate('studio:network');

	async function save(e) {
		e.preventDefault();
		saving = true;
		error = '';
		try {
			await api(`/api/studio/network/${c.id}`, 'PATCH', form);
			saved = true;
			setTimeout(() => (saved = false), 2000);
			await refresh();
		} catch (err) {
			error = err.message;
		} finally {
			saving = false;
		}
	}

	async function sync() {
		syncing = true;
		error = note = '';
		try {
			const { sync: s } = await api(`/api/studio/network/${c.id}/sync`, 'POST');
			note = s.added
				? `${s.added} new ${s.added === 1 ? 'video' : 'videos'} pulled in.`
				: 'Up to date: nothing new.';
			await refresh();
		} catch (err) {
			error = err.message;
			await refresh();
		} finally {
			syncing = false;
		}
	}

	async function remove() {
		if (!confirm(`Remove ${c.name} from the network? Their videos come off AGE Studios.`)) return;
		try {
			await api(`/api/studio/network/${c.id}`, 'DELETE');
			goto('/studio/network');
		} catch (err) {
			error = err.message;
		}
	}

	async function addByLink(e) {
		e.preventDefault();
		if (!link.trim()) return;
		adding = true;
		error = note = '';
		try {
			await api(`/api/studio/network/${c.id}/videos`, 'POST', { url: link });
			link = '';
			note = 'Added and featured.';
			await refresh();
		} catch (err) {
			error = err.message;
		} finally {
			adding = false;
		}
	}

	async function toggle(v) {
		busyIds = [...busyIds, v.id];
		error = '';
		try {
			await api(`/api/studio/network/videos/${v.id}`, 'PATCH', { isFeatured: !v.isFeatured });
			await refresh();
		} catch (err) {
			error = err.message;
		} finally {
			busyIds = busyIds.filter((x) => x !== v.id);
		}
	}

	async function move(i, by) {
		const ids = data.featured.map((v) => v.id);
		const j = i + by;
		if (j < 0 || j >= ids.length) return;
		[ids[i], ids[j]] = [ids[j], ids[i]];
		try {
			await api(`/api/studio/network/${c.id}/videos`, 'PUT', { order: ids });
			await refresh();
		} catch (err) {
			error = err.message;
		}
	}

	function filter(show, query = q) {
		const p = new URLSearchParams();
		if (show !== 'all') p.set('show', show);
		if (query.trim()) p.set('q', query.trim());
		goto(`?${p}`, { keepFocus: true, noScroll: true, replaceState: true });
	}

	const label = 'text-[10.5px] font-extrabold tracking-[0.16em] uppercase';
	const field =
		'h-10 w-full border border-line2 bg-white px-3 text-[14px] outline-none focus:border-ink';
	const chip =
		'inline-flex items-center border px-1.5 py-[1px] text-[9px] font-extrabold tracking-[0.14em] uppercase';
</script>

<svelte:head><title>{c.name} · Network · Studio</title></svelte:head>

<DeskHeader
	kicker="The AGE Network"
	title={c.name}
	subtitle="{c.featured ?? data.featured.length} featured on AGE Studios · {c.handle
		? `@${c.handle}`
		: c.youtubeChannelId}"
>
	{#snippet actions(compact)}
		<button
			type="button"
			onclick={sync}
			disabled={syncing}
			class="{compact
				? 'h-8 px-3 text-[9.5px]'
				: 'h-10 px-5 text-[10.5px]'} bg-gold font-extrabold tracking-[0.14em] text-ink uppercase transition-colors hover:bg-paper-bg disabled:opacity-60"
			>{syncing ? 'Syncing…' : 'Sync now'}</button
		>
	{/snippet}
</DeskHeader>
<DeskTabs />

<div class="mx-auto w-full max-w-[1200px] space-y-10 px-5 py-8 font-libre md:px-8">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<a href="/studio/network" class="{label} text-soft hover:text-ink">← Network</a>
		<span class="flex flex-wrap gap-4 text-[11.5px] text-fade">
			<span>{c.lastSyncedAt ? `Last synced ${shortDate(c.lastSyncedAt)}` : 'Not synced yet'}</span>
			<a href={c.youtubeUrl} target="_blank" rel="noopener" class="underline hover:text-ink"
				>Channel on YouTube ↗</a
			>
			{#if data.featured.length && c.isActive}
				<a href="/studios/partners/{c.slug}" class="underline hover:text-ink">View on site ↗</a>
			{/if}
		</span>
	</div>

	{#if c.syncError}
		<p class="border border-hero-rb/40 bg-hero-rb/5 px-4 py-3 text-[13px] text-hero-rb">
			The last sync failed: {c.syncError}
		</p>
	{/if}
	{#if note}<p class="text-[13px] text-prem" role="status">{note}</p>{/if}
	{#if error}<p class="text-[13px] text-hero-rb" role="alert">{error}</p>{/if}

	<!-- ============ featured, in order ============ -->
	<section>
		<h2 class="flex items-baseline justify-between border-b-[3px] border-ink pb-2.5 {label}">
			On AGE Studios <span class="tracking-normal text-fade normal-case"
				>{data.featured.length} featured, in this order</span
			>
		</h2>
		{#if data.featured.length}
			<ol class="divide-y divide-line">
				{#each data.featured as v, i (v.id)}
					<li class="grid grid-cols-[96px_minmax(0,1fr)_auto] items-center gap-3 py-2.5">
						<img
							src={v.thumbnailUrl}
							alt=""
							class="aspect-video w-24 object-cover {v.isAvailable ? '' : 'opacity-40'}"
						/>
						<span class="min-w-0">
							<span class="block truncate font-newsreader text-[16px] font-semibold">{v.title}</span
							>
							{#if !v.isAvailable}
								<span class="{chip} mt-0.5 border-hero-rb/50 text-hero-rb"
									>Gone from YouTube · hidden</span
								>
							{:else}
								<span class="block text-[11.5px] text-fade"
									>{v.publishedAt ? shortDate(v.publishedAt) : ''}{v.duration
										? ` · ${clock(v.duration)}`
										: ''}</span
								>
							{/if}
						</span>
						<span class="flex items-center gap-1">
							<button
								type="button"
								onclick={() => move(i, -1)}
								disabled={i === 0}
								aria-label="Move up"
								class="h-9 w-9 border border-line2 text-[13px] hover:border-ink disabled:opacity-30"
								>↑</button
							>
							<button
								type="button"
								onclick={() => move(i, 1)}
								disabled={i === data.featured.length - 1}
								aria-label="Move down"
								class="h-9 w-9 border border-line2 text-[13px] hover:border-ink disabled:opacity-30"
								>↓</button
							>
							<button
								type="button"
								onclick={() => toggle(v)}
								disabled={busyIds.includes(v.id)}
								class="h-9 border border-line2 px-3 text-[9.5px] font-extrabold tracking-[0.14em] uppercase hover:border-hero-rb hover:text-hero-rb"
								>Remove</button
							>
						</span>
					</li>
				{/each}
			</ol>
		{:else}
			<p class="py-5 text-[14px] text-soft">
				Nothing featured yet, so {c.name} isn’t on AGE Studios. Pick videos below.
			</p>
		{/if}
	</section>

	<!-- ============ pick videos ============ -->
	<section>
		<h2 class="border-b-[3px] border-ink pb-2.5 {label}">Pick videos to feature</h2>
		<div class="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
			<nav class="flex border border-line2" aria-label="Show">
				{#each [['all', 'All'], ['new', 'Not featured'], ['featured', 'Featured']] as [k, word] (k)}
					<button
						type="button"
						onclick={() => filter(k)}
						aria-pressed={data.show === k}
						class="flex-1 px-3 py-2 text-[10px] font-extrabold tracking-[0.14em] whitespace-nowrap uppercase {data.show ===
						k
							? 'bg-ink text-paper-bg'
							: 'text-soft hover:text-ink'}">{word}</button
					>
				{/each}
			</nav>
			<form
				class="flex gap-2 md:w-[320px]"
				onsubmit={(e) => {
					e.preventDefault();
					filter(data.show);
				}}
			>
				<input type="search" bind:value={q} placeholder="Search titles" class={field} />
			</form>
		</div>

		{#if data.videos.length}
			<ul class="mt-4 grid gap-x-5 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
				{#each data.videos as v (v.id)}
					<li class="flex flex-col">
						<a
							href="https://www.youtube.com/watch?v={v.youtubeVideoId}"
							target="_blank"
							rel="noopener"
							class="relative block aspect-video overflow-hidden bg-ink"
						>
							<img src={v.thumbnailUrl} alt="" loading="lazy" class="h-full w-full object-cover" />
							{#if v.duration}
								<span
									class="absolute right-0 bottom-0 bg-ink/85 px-1.5 py-0.5 text-[11px] text-paper-bg tabular-nums"
									>{clock(v.duration)}</span
								>
							{/if}
						</a>
						<p class="mt-2 font-newsreader text-[16px] leading-snug font-semibold">{v.title}</p>
						<p class="mt-0.5 text-[11.5px] text-fade">
							{v.publishedAt ? shortDate(v.publishedAt) : ''}
						</p>
						<button
							type="button"
							onclick={() => toggle(v)}
							disabled={busyIds.includes(v.id) || (!v.isFeatured && !v.isAvailable)}
							aria-pressed={v.isFeatured}
							class="mt-2.5 h-10 border text-[10px] font-extrabold tracking-[0.16em] uppercase transition-colors disabled:opacity-50 {v.isFeatured
								? 'border-ink bg-ink text-paper-bg hover:bg-hero-rb'
								: 'border-ink/60 hover:bg-gold'}"
						>
							{v.isFeatured ? '✓ Featured · take off' : 'Feature on AGE Studios'}
						</button>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="py-6 text-[14px] text-soft">
				{data.q || data.show !== 'all'
					? 'No videos match.'
					: 'No videos pulled in yet. Try Sync now.'}
			</p>
		{/if}

		<form class="mt-8 border-t border-line pt-5" onsubmit={addByLink}>
			<label for="by-link" class={label}>Add an older video by its link</label>
			<p class="mt-1 text-[12px] text-fade">
				The sync pulls in their newest uploads. For anything older, paste its link: it’s added and
				featured.
			</p>
			<div class="mt-2 flex flex-col gap-2 md:flex-row">
				<input
					id="by-link"
					type="text"
					inputmode="url"
					bind:value={link}
					placeholder="https://www.youtube.com/watch?v=…"
					class={field}
				/>
				<button
					type="submit"
					disabled={adding || !link.trim()}
					class="h-10 bg-ink px-5 text-[10.5px] font-extrabold tracking-[0.16em] whitespace-nowrap text-paper-bg uppercase hover:bg-warm disabled:opacity-50"
					>{adding ? 'Adding…' : 'Add video'}</button
				>
			</div>
		</form>
	</section>

	<!-- ============ about ============ -->
	<section>
		<h2 class="border-b-[3px] border-ink pb-2.5 {label}">About the creator</h2>
		<form class="mt-5 grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]" onsubmit={save}>
			<div>
				<CoverImagePicker
					label="Picture"
					value={image}
					on:change={(e) => {
						image = e.detail;
						form.coverImageId = e.detail?.id ?? null;
					}}
				/>
				<p class="mt-1.5 text-[11.5px] leading-snug text-fade">
					Leave empty to use their YouTube picture.
				</p>
			</div>
			<div class="space-y-4">
				<label class="block">
					<span class={label}>Name</span>
					<input bind:value={form.name} class="mt-1.5 {field}" required maxlength="120" />
				</label>
				<label class="block">
					<span class={label}>Web address</span>
					<span class="mt-1.5 flex border border-line2 bg-white focus-within:border-ink">
						<span class="pl-2.5 text-[13.5px] leading-10 text-fade">/studios/partners/</span>
						<input
							value={form.slug}
							oninput={(e) => (form.slug = cleanTypedSlug(e.currentTarget.value))}
							class="h-10 min-w-0 flex-1 bg-transparent pr-3 text-[14px] outline-none"
						/>
					</span>
				</label>
				<fieldset>
					<legend class={label}>Kind</legend>
					<div class="mt-1.5 flex w-fit border border-line2">
						{#each [['video', 'Video'], ['podcast', 'Podcast']] as [k, word] (k)}
							<label
								class="cursor-pointer px-4 py-2 text-[10px] font-extrabold tracking-[0.14em] uppercase {form.kind ===
								k
									? 'bg-ink text-paper-bg'
									: 'text-soft'}"
							>
								<input type="radio" bind:group={form.kind} value={k} class="sr-only" />{word}
							</label>
						{/each}
					</div>
				</fieldset>
				<label class="block">
					<span class={label}>Description</span>
					<textarea
						bind:value={form.description}
						rows="4"
						maxlength="4000"
						class="mt-1.5 w-full border border-line2 bg-white px-3 py-2 text-[14px] outline-none focus:border-ink"
					></textarea>
				</label>
				<label class="flex items-center gap-2.5 text-[13.5px]">
					<input type="checkbox" bind:checked={form.isActive} class="h-4 w-4" />
					Show this creator on AGE Studios
				</label>
				<div class="flex flex-wrap items-center gap-3 pt-1">
					<button
						type="submit"
						disabled={saving}
						class="h-10 bg-ink px-5 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase hover:bg-warm disabled:opacity-50"
						>{saving ? 'Saving…' : saved ? 'Saved' : 'Save'}</button
					>
					<button
						type="button"
						onclick={remove}
						class="h-10 border border-line2 px-4 text-[10px] font-extrabold tracking-[0.14em] text-soft uppercase hover:border-hero-rb hover:text-hero-rb"
						>Remove creator</button
					>
				</div>
			</div>
		</form>
	</section>
</div>
