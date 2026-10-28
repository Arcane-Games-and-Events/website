<script>
	import DeskTabs from '$lib/components/age/desk/DeskTabs.svelte';
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { beforeNavigate } from '$app/navigation';
	import AuthorCard from '$lib/components/age/library/AuthorCard.svelte';
	import DailyReadsChart from '$lib/components/age/desk/DailyReadsChart.svelte';
	import {
		LINK_PLATFORMS,
		linkLabel,
		normalizeUrl,
		bioToHtml,
		detectPlatform
	} from '$lib/desk/authorLinks.js';

	/** @type {{ data: any, form: any }} */
	let { data, form } = $props();

	const LIMITS = { name: 60, title: 80, bio: 600, links: 4 };

	// ============ form state (seeded once from the saved profile) ============
	// Seed the form once from the saved profile; edits live in local state.
	const p = untrack(() => data.profile);
	let displayName = $state(p?.displayName || '');
	let title = $state(p?.title || '');
	let bio = $state(p?.bio || '');
	let avatar = $state(p?.avatar || null);
	let links = $state(
		(p?.links?.length ? p.links : []).map((l) => ({
			platform: l.platform || 'website',
			url: l.url || '',
			customLabel: l.customLabel || ''
		}))
	);

	const snapshot = () => JSON.stringify({ displayName, title, bio, a: avatar?.id || null, links });
	let saved = $state(snapshot());
	const dirty = $derived(snapshot() !== saved);

	let saving = $state(false);
	let justSaved = $state(false);
	let error = $state('');
	$effect(() => {
		if (form?.error) error = form.error;
	});

	beforeNavigate(({ cancel, type }) => {
		if (dirty && type !== 'form' && !confirm('You have unsaved profile changes. Leave anyway?'))
			cancel();
	});

	// ============ photo upload ============
	let fileEl = $state();
	let uploading = $state(false);
	async function onFile(e) {
		const file = e.currentTarget.files?.[0];
		e.currentTarget.value = '';
		if (!file) return;
		if (!file.type.startsWith('image/')) {
			error = 'Photos need to be an image file.';
			return;
		}
		uploading = true;
		error = '';
		try {
			const fd = new FormData();
			fd.append('file', file);
			const res = await fetch('/api/desk/upload', { method: 'POST', body: fd });
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				error = body?.message || `Upload failed (${res.status}).`;
				return;
			}
			const { media } = await res.json();
			avatar = { id: media.id, url: media.url };
		} catch (err) {
			error = err?.message || 'Upload failed.';
		} finally {
			uploading = false;
		}
	}

	// ============ links ============
	function addLink() {
		if (links.length < LIMITS.links) links.push({ platform: 'website', url: '', customLabel: '' });
	}
	function removeLink(i) {
		links.splice(i, 1);
	}

	// ============ preview ============
	const fallbackName = $derived(data.account.name || 'Your name');
	const previewAuthor = $derived({
		name: displayName.trim() || fallbackName,
		role: title.trim(),
		profilePicture: avatar?.url || null,
		slug: null,
		pieces: data.stats?.published || 0
	});
	const previewLinks = $derived(
		links
			.filter((l) => l.url.trim())
			.map((l) => ({ label: linkLabel(l), href: normalizeUrl(l.url) }))
	);

	// ============ stats helpers ============
	const s = $derived(data.stats);
	const fmt = (n) => Number(n || 0).toLocaleString('en-US');
	const mins = (sec) => {
		if (sec == null) return '—';
		const m = Math.floor(sec / 60);
		const r = sec % 60;
		return m ? `${m}m ${String(r).padStart(2, '0')}s` : `${r}s`;
	};
	const fmtDate = (d) =>
		d
			? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
			: '—';
	const topReads = $derived(Math.max(1, ...(s?.rows || []).map((r) => r.views)));

	const field =
		'w-full border border-line2 bg-paper px-3.5 py-2.5 text-[15px] text-ink placeholder:text-fade focus:border-ink focus:ring-0 focus:outline-none';
	const label = 'text-[9.5px] font-extrabold tracking-[0.18em] text-fade uppercase';
</script>

<svelte:head>
	<title>Your profile · Desk</title>
</svelte:head>

<DeskHeader
	kicker="Your profile"
	title={displayName.trim() || fallbackName}
	subtitle="How you appear on every piece you write, and how your work is being read."
/>
<DeskTabs />

<div class="mx-auto w-full max-w-[1200px] px-5 py-10 font-libre md:px-8 md:py-12">
	{#if !data.available}
		<div class="mb-8 border-l-[3px] border-gold bg-gold/10 px-5 py-4">
			<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-[#8a6116] uppercase">
				Profiles aren’t switched on yet
			</p>
			<p class="mt-1 text-[14px] text-soft">
				An admin needs to apply migration 020 before profiles can be saved. You can fill this in
				now; saving will work once it’s applied.
			</p>
		</div>
	{/if}

	<div class="grid gap-12 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-14">
		<!-- ============ form ============ -->
		<form
			method="POST"
			action="?/save"
			use:enhance={() => {
				saving = true;
				error = '';
				return async ({ result, update }) => {
					saving = false;
					if (result.type === 'success') {
						saved = snapshot();
						justSaved = true;
						setTimeout(() => (justSaved = false), 2500);
					}
					await update({ reset: false, invalidateAll: false });
				};
			}}
			class="min-w-0"
		>
			<h2
				class="flex items-center gap-2.5 border-b-[3px] border-ink pb-2 text-[10.5px] font-extrabold tracking-[0.22em] uppercase"
			>
				<span class="text-[8px] text-warm" aria-hidden="true">◆</span>Byline
			</h2>

			<!-- photo -->
			<div class="mt-6 flex items-center gap-5">
				<span class="relative block h-[88px] w-[88px] shrink-0 overflow-hidden bg-line">
					{#if avatar?.url}
						<img src={avatar.url} alt="" class="absolute inset-0 h-full w-full object-cover" />
					{:else}
						<span
							class="absolute inset-0 flex items-center justify-center text-[28px] font-extrabold text-fade"
							aria-hidden="true">{(displayName.trim() || fallbackName).charAt(0)}</span
						>
					{/if}
				</span>
				<div>
					<p class={label}>Photo</p>
					<div class="mt-2 flex flex-wrap gap-2">
						<button
							type="button"
							onclick={() => fileEl?.click()}
							disabled={uploading}
							class="min-h-[40px] border-[1.5px] border-ink px-4 text-[10px] font-extrabold tracking-[0.16em] uppercase transition-colors hover:bg-ink hover:text-paper-bg disabled:opacity-60"
							>{uploading ? 'Uploading…' : avatar ? 'Replace photo' : 'Upload photo'}</button
						>
						{#if avatar}
							<button
								type="button"
								onclick={() => (avatar = null)}
								class="min-h-[40px] px-3 text-[10px] font-extrabold tracking-[0.16em] text-fade uppercase transition-colors hover:text-hero-rb"
								>Remove</button
							>
						{/if}
					</div>
					<p class="mt-1.5 text-[12px] text-fade">A square headshot works best.</p>
					<input
						bind:this={fileEl}
						type="file"
						accept="image/*"
						class="sr-only"
						tabindex="-1"
						onchange={onFile}
					/>
				</div>
			</div>
			<input type="hidden" name="avatarMediaId" value={avatar?.id || ''} />

			<div class="mt-6 grid gap-5 sm:grid-cols-2">
				<label class="block">
					<span class={label}>Byline name</span>
					<input
						name="displayName"
						bind:value={displayName}
						maxlength={LIMITS.name}
						placeholder={fallbackName}
						class="mt-1.5 {field}"
					/>
					<span class="mt-1 block text-[12px] text-fade">Leave blank to use your account name.</span
					>
				</label>
				<label class="block">
					<span class={label}>Title</span>
					<input
						name="title"
						bind:value={title}
						maxlength={LIMITS.title}
						placeholder="e.g. Pro player · LA circuit"
						class="mt-1.5 {field}"
					/>
					<span class="mt-1 block text-[12px] text-fade">Shown under your name.</span>
				</label>
			</div>

			<label class="mt-5 block">
				<span class="flex items-baseline justify-between">
					<span class={label}>Bio</span>
					<span
						class="text-[11px] tabular-nums {bio.length > LIMITS.bio
							? 'font-bold text-hero-rb'
							: 'text-fade'}">{bio.length} / {LIMITS.bio}</span
					>
				</span>
				<textarea
					name="bio"
					bind:value={bio}
					rows="5"
					placeholder="A few lines about you and how you play. Readers see this under every piece you write."
					class="mt-1.5 resize-y font-newsreader text-[16px] leading-[1.55] {field}"
				></textarea>
			</label>

			<!-- links -->
			<div class="mt-6">
				<div class="flex items-baseline justify-between">
					<span class={label}>Links</span>
					<span class="text-[11px] text-fade">{links.length} / {LIMITS.links}</span>
				</div>
				<ol class="mt-2 space-y-2">
					{#each links as l, i (i)}
						<li class="grid grid-cols-[130px_minmax(0,1fr)_auto] gap-2">
							<select
								bind:value={l.platform}
								onchange={() => (l.auto = false)}
								aria-label="Platform"
								class="border border-line2 bg-paper px-2.5 py-2.5 text-[14px] focus:border-ink focus:ring-0"
							>
								{#each LINK_PLATFORMS as [id, name] (id)}
									<option value={id}>{name}</option>
								{/each}
							</select>
							<div class="flex min-w-0 gap-2">
								{#if l.platform === 'other'}
									<input
										bind:value={l.customLabel}
										maxlength="30"
										placeholder="Label"
										aria-label="Link label"
										class="w-[110px] shrink-0 {field}"
									/>
								{/if}
								<input
									bind:value={l.url}
									oninput={(e) => {
										// Fill in the platform from the address unless it was picked by hand.
										const found = detectPlatform(e.currentTarget.value);
										if (found && (l.platform === 'website' || l.auto)) {
											l.platform = found;
											l.auto = true;
										}
									}}
									type="text"
									inputmode="url"
									placeholder="https://"
									aria-label="Link address"
									class="min-w-0 flex-1 {field}"
								/>
							</div>
							<button
								type="button"
								onclick={() => removeLink(i)}
								class="px-2 text-[18px] leading-none text-fade transition-colors hover:text-hero-rb"
								aria-label="Remove link">×</button
							>
						</li>
					{/each}
				</ol>
				{#if links.length < LIMITS.links}
					<button
						type="button"
						onclick={addLink}
						class="mt-2.5 text-[10px] font-extrabold tracking-[0.16em] text-warm uppercase transition-colors hover:text-ink"
						>+ Add a link</button
					>
				{/if}
				<input type="hidden" name="links" value={JSON.stringify(links)} />
			</div>

			<!-- save bar -->
			<div
				class="sticky bottom-0 z-10 mt-8 flex flex-wrap items-center gap-4 border-t-[3px] border-ink bg-paper-bg py-4"
			>
				<button
					type="submit"
					disabled={saving || !dirty || bio.length > LIMITS.bio}
					class="min-h-[46px] bg-ink px-7 text-[10.5px] font-extrabold tracking-[0.16em] text-paper-bg uppercase transition-colors hover:bg-warm disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-ink"
				>
					{saving ? 'Saving…' : 'Save profile'}
				</button>
				{#if justSaved}
					<span class="text-[12.5px] font-semibold text-prem" role="status">✓ Saved</span>
				{:else if dirty}
					<span class="text-[12.5px] text-soft">Unsaved changes</span>
				{/if}
				{#if error}
					<span class="text-[12.5px] font-semibold text-hero-rb" role="alert">{error}</span>
				{/if}
			</div>
		</form>

		<!-- ============ live preview ============ -->
		<aside class="lg:sticky lg:top-[calc(var(--desk-top)+24px)] lg:self-start">
			<p class={label}>Preview · how readers see you</p>
			<div class="mt-2 border border-line2 bg-paper-bg px-5 pb-1">
				<AuthorCard author={previewAuthor} bioHtml={bioToHtml(bio)} links={previewLinks} />
			</div>
			<p class="mt-2 text-[12px] text-fade">
				This card appears at the end of every article you write.
			</p>
		</aside>
	</div>

	<!-- ============ your numbers ============ -->
	<section class="mt-16">
		<div class="flex flex-wrap items-end justify-between gap-4 border-b-[3px] border-ink pb-2">
			<h2
				class="flex items-center gap-2.5 text-[10.5px] font-extrabold tracking-[0.22em] uppercase"
			>
				<span class="text-[8px] text-warm" aria-hidden="true">◆</span>Your articles, by the numbers
			</h2>
			<nav class="flex gap-px border border-line2 bg-line2" aria-label="Date range">
				{#each [7, 30, 90] as r (r)}
					<a
						href="?range={r}"
						data-sveltekit-noscroll
						aria-current={data.range === r ? 'page' : undefined}
						class="px-3 py-1.5 text-[10px] font-extrabold tracking-[0.14em] uppercase transition-colors {data.range ===
						r
							? 'bg-ink text-paper-bg'
							: 'bg-paper-bg text-soft hover:text-ink'}">{r} days</a
					>
				{/each}
			</nav>
		</div>
		<p class="mt-2 text-[12.5px] text-fade">Only your own published pieces are counted here.</p>

		{#if s && s.available === false}
			<p class="mt-6 font-newsreader text-[16px] text-soft italic">
				Reader numbers start once analytics are switched on (migration 021).
			</p>
		{:else if !s}
			<p class="mt-6 font-newsreader text-[16px] text-soft italic">
				Reader numbers couldn’t be loaded right now.
			</p>
		{:else if !s.published}
			<p class="mt-6 font-newsreader text-[16px] text-soft italic">
				Once your first piece is published, its reader numbers will show up here.
			</p>
		{:else}
			<dl class="mt-6 grid grid-cols-2 border-y border-line2 md:grid-cols-4">
				{#each [['Views', fmt(s.totals.views)], ['Readers', fmt(s.totals.readers)], ['Engaged per view', mins(s.totals.avgEngaged)], ['Finished', s.totals.completionRate == null ? '—' : `${Math.round(s.totals.completionRate)}%`]] as [k, v], i (k)}
					<div
						class="border-line2 py-4 {i % 2 ? 'border-l border-line2 pl-4' : 'pr-4'} {i === 2
							? 'border-t border-line2 md:border-t-0 md:border-l md:pl-4'
							: ''} {i === 3 ? 'border-t md:border-t-0' : ''}"
					>
						<dd class="text-[30px] leading-none font-extrabold tracking-[-0.02em] tabular-nums">
							{v}
						</dd>
						<dt class="mt-1.5 text-[9.5px] font-extrabold tracking-[0.16em] text-fade uppercase">
							{k}
						</dt>
					</div>
				{/each}
			</dl>

			<div class="mt-8">
				<DailyReadsChart daily={s.daily} label="Views per day of your articles" />
			</div>

			<div class="mt-10">
				<div
					class="hidden grid-cols-[minmax(0,1fr)_110px_90px_90px_100px] gap-4 border-b border-line2 pb-2 text-[9px] font-extrabold tracking-[0.18em] text-fade uppercase md:grid"
				>
					<span>Article</span><span class="text-right">Views</span><span class="text-right"
						>Readers</span
					><span class="text-right">Engaged</span><span class="text-right">Finished</span>
				</div>
				<ol>
					{#each s.rows as r (r.id)}
						<li class="border-b border-line2">
							<a
								href="/desk/analytics/{r.id}?range={data.range}"
								class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 py-3 transition-colors hover:bg-paper md:grid-cols-[minmax(0,1fr)_110px_90px_90px_100px]"
							>
								<span class="min-w-0">
									<span class="block truncate font-newsreader text-[17px] font-semibold"
										>{r.title}</span
									>
									<span class="mt-1 block h-[4px] max-w-[320px] bg-line" aria-hidden="true">
										<span
											class="block h-full bg-[#2563eb]"
											style="width: {(r.views / topReads) * 100}%;"
										></span>
									</span>
									<span class="mt-1 block text-[11.5px] text-fade">
										Published {fmtDate(r.publishedAt)}{r.accessMode === 'premium'
											? ' · Premium'
											: ''}
									</span>
								</span>
								<span class="text-right text-[15px] font-bold tabular-nums">{fmt(r.views)}</span>
								<span class="col-span-2 text-[12px] text-soft tabular-nums md:hidden">
									{fmt(r.readers)} readers · {mins(r.avgEngaged)} engaged · {r.completionRate ==
									null
										? '—'
										: `${Math.round(r.completionRate)}%`} finished
								</span>
								<span class="hidden text-right text-[13.5px] tabular-nums md:block"
									>{fmt(r.readers)}</span
								>
								<span class="hidden text-right text-[13.5px] tabular-nums md:block"
									>{mins(r.avgEngaged)}</span
								>
								<span class="hidden text-right text-[13.5px] tabular-nums md:block"
									>{r.completionRate == null ? '—' : `${Math.round(r.completionRate)}%`}</span
								>
							</a>
						</li>
					{/each}
				</ol>
			</div>
		{/if}
	</section>
</div>
