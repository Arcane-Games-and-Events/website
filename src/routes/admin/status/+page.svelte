<script>
	/**
	 * Admin → Status: how each part of the site is checking out (the same
	 * checks /status shows), incidents and maintenance on now with a form to
	 * post an update, what's coming up, and posting a new one. The public
	 * page and the site banner follow from here.
	 */
	import AdminHeader, {
		btn as hbtn,
		btnLine as hbtnLine
	} from '$lib/components/age/admin/AdminHeader.svelte';
	import AdminTabs from '$lib/components/age/admin/AdminTabs.svelte';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';
	import UptimeBars from '$lib/components/age/status/UptimeBars.svelte';
	import * as F from '$lib/components/age/store/fields.js';
	import { enhance } from '$app/forms';
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { prefersReducedMotion } from 'svelte/motion';
	import { IMPACT, OVERALL, STATUS_WORD, pct, stampOf } from '$lib/components/age/status/words.js';

	let { data, form } = $props();

	const top = $derived(OVERALL[data.overall]);
	const COMP = $derived(Object.fromEntries(data.components.map((c) => [c.id, c.label])));
	const motion = (ms) => ({ duration: prefersReducedMotion.current ? 0 : ms, easing: cubicOut });
	const ago = (d) => {
		const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
		return m < 1
			? 'just now'
			: m < 60
				? `${m}m ago`
				: m < 1440
					? `${Math.round(m / 60)}h ago`
					: stampOf(d);
	};

	// the new incident form
	let creating = $state(false);
	let kind = $state('incident');
	let impact = $state('minor');
	let running = $state(false);
	const STATUSES = $derived(
		kind === 'maintenance'
			? ['scheduled', 'in_progress', 'completed']
			: ['investigating', 'identified', 'monitoring', 'resolved']
	);
	const tone = $derived(kind === 'maintenance' ? IMPACT.maintenance.tone : IMPACT[impact].tone);
	const notice = (id) => (form?.section === id ? form : null);

	// A chip for a radio or checkbox inside it, lit in the form's colour.
	const chip =
		'relative flex h-[38px] cursor-pointer items-center border border-line2 bg-white px-3.5 text-[12.5px] font-semibold text-ink transition-colors hover:border-ink/50 has-[:checked]:border-transparent has-[:checked]:bg-[var(--cc)] has-[:checked]:text-white has-[:focus-visible]:shadow-[0_0_0_3px_color-mix(in_srgb,var(--cc)_25%,transparent)]';
	const sectionTitle = 'ao-cond text-[36px] leading-none font-black uppercase md:text-[44px]';
	// datetime-local in the admin's own clock, sent to the server as ISO.
	const local = (d) => {
		const x = new Date(d);
		return new Date(x.getTime() - x.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
	};
	const iso = (v) => (v ? new Date(v).toISOString() : '');
	let startsLocal = $state(local(Date.now() + 86400000));
	let endsLocal = $state(local(Date.now() + 86400000 + 3600000));
</script>

<svelte:head><title>Status · Admin</title></svelte:head>

<AdminHeader
	title="Status"
	subtitle="Checks every five minutes. Post incidents and maintenance for /status."
>
	{#snippet actions()}
		<a href="/status" target="_blank" rel="noopener" class={hbtnLine}>Public page ↗</a>
		<button
			type="button"
			onclick={() => {
				creating = !creating;
				kind = 'incident';
				impact = 'minor';
			}}
			class={hbtn}>{creating ? 'Close' : '+ Post an incident'}</button
		>
	{/snippet}
</AdminHeader>
<AdminTabs />

{#if !data.ready}
	<AdminNotice
		tone="info"
		message="The status page needs migration 047 (status checks, incidents and the roadmap). Apply it in Supabase, then reload."
	/>
{/if}
{#if form?.saved && !form.section}<AdminNotice tone="success" message={form.saved} />{/if}

<div class="mx-auto w-full max-w-[1200px] px-5 pt-6 pb-20 md:px-8">
	<!-- the whole picture -->
	<section
		class="flex flex-col gap-3 p-5 text-white md:flex-row md:items-center md:justify-between md:p-6"
		style="background: {top.tone}"
	>
		<p class="ao-cond text-[34px] leading-none font-black uppercase md:text-[48px]">{top.word}</p>
		<form
			method="POST"
			action="?/run"
			use:enhance={() => {
				running = true;
				return async ({ update }) => {
					await update();
					running = false;
				};
			}}
		>
			<button
				disabled={running}
				class="inline-flex h-[40px] items-center border border-white/70 px-4 text-[10px] font-extrabold tracking-[0.14em] uppercase hover:bg-white/15 disabled:opacity-60"
				>{running ? 'Checking…' : 'Check everything now'}</button
			>
		</form>
	</section>

	<!-- ============ NEW ============ -->
	{#if creating}
		<form
			method="POST"
			action="?/create"
			use:enhance={() =>
				async ({ result, update }) => {
					await update();
					if (result.type === 'success') creating = false;
				}}
			class="mt-6 border border-l-[6px] border-line2 bg-white"
			style="--cc: {tone}; border-left-color: {tone}"
			transition:slide={motion(220)}
		>
			<div class="flex flex-col gap-6 px-4 py-5 md:px-6 md:py-6">
				<div class={F.groupFirst}>
					<div>
						<p class={F.groupTitle}>What</p>
						<p class={F.groupNote}>Something broke, or work you’re planning.</p>
					</div>
					<div class="flex flex-col gap-4">
						<div class="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Kind">
							{#each [['incident', 'Incident'], ['maintenance', 'Maintenance']] as [k, l] (k)}
								<label class={chip}
									><input
										type="radio"
										name="kind"
										value={k}
										bind:group={kind}
										class="sr-only"
									/>{l}</label
								>
							{/each}
						</div>
						<label class="block">
							<span class={F.label}>Title</span>
							<input
								name="title"
								required
								maxlength="160"
								placeholder={kind === 'maintenance'
									? 'Database upgrade'
									: 'Checkout is failing for some cards'}
								class={F.field}
							/>
						</label>
						{#if kind === 'incident'}
							<div>
								<span class={F.label}>How bad</span>
								<div class="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Impact">
									{#each [['minor', 'Minor: slow, or failing for some'], ['major', 'Major: down for everyone']] as [k, l] (k)}
										<label class={chip}
											><input
												type="radio"
												name="impact"
												value={k}
												bind:group={impact}
												class="sr-only"
											/>{l}</label
										>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				</div>
				<div class={F.group}>
					<div>
						<p class={F.groupTitle}>Where</p>
						<p class={F.groupNote}>The parts of the site it touches.</p>
					</div>
					<div class="flex flex-wrap gap-1.5">
						{#each data.components as c (c.id)}
							<label class={chip}
								><input
									type="checkbox"
									name="components"
									value={c.id}
									class="sr-only"
								/>{c.label}</label
							>
						{/each}
					</div>
				</div>
				<div class={F.group}>
					<div>
						<p class={F.groupTitle}>{kind === 'maintenance' ? 'When' : 'Where it stands'}</p>
						<p class={F.groupNote}>
							{kind === 'maintenance'
								? 'The window, in your time.'
								: 'You can change this with each update.'}
						</p>
					</div>
					<div class="flex flex-col gap-4">
						<div class="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Status">
							{#each STATUSES as st, i (st)}
								<label class={chip}
									><input
										type="radio"
										name="status"
										value={st}
										checked={i === 0}
										class="sr-only"
									/>{STATUS_WORD[st]}</label
								>
							{/each}
						</div>
						{#if kind === 'maintenance'}
							<div class="grid max-w-[560px] grid-cols-2 gap-3">
								<!-- typed in this browser's clock; sent as exact moments -->
								<input type="hidden" name="startsAt" value={iso(startsLocal)} />
								<input type="hidden" name="endsAt" value={iso(endsLocal)} />
								<label class="block">
									<span class={F.label}>Starts</span>
									<input type="datetime-local" required bind:value={startsLocal} class={F.field} />
								</label>
								<label class="block">
									<span class={F.label}>Ends</span>
									<input type="datetime-local" bind:value={endsLocal} class={F.field} />
								</label>
							</div>
						{/if}
					</div>
				</div>
				<div class={F.group}>
					<div>
						<p class={F.groupTitle}>First update</p>
						<p class={F.groupNote}>What people see on /status. Plain words.</p>
					</div>
					<label class="block">
						<span class="sr-only">First update</span>
						<textarea
							name="body"
							rows="4"
							required
							maxlength="4000"
							placeholder={kind === 'maintenance'
								? 'We’re upgrading the database. The site may be slow for a few minutes.'
								: 'We’re looking into reports that card payments are failing.'}
							class="{F.field} h-auto py-3"
						></textarea>
					</label>
				</div>
			</div>
			<div
				class="flex flex-wrap items-center justify-between gap-3 border-t border-line2 bg-paper/60 px-4 py-3 md:px-6"
			>
				<label class="flex cursor-pointer items-center gap-2 text-[12.5px]">
					<input type="checkbox" name="banner" checked class="h-4 w-4 border-line2 focus:ring-0" />
					Show a banner across the site while it’s on
				</label>
				<span class="flex items-center gap-2">
					{#if notice('new')?.error}<span class="text-[12.5px] font-semibold text-hero-rb"
							>{notice('new').error}</span
						>{/if}
					<button
						type="button"
						onclick={() => (creating = false)}
						class="inline-flex h-[40px] items-center px-3 text-[10px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink"
						>Cancel</button
					>
					<button
						class="inline-flex h-[40px] items-center px-5 text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase transition-[filter] hover:brightness-110"
						style="background: var(--cc)">Post it</button
					>
				</span>
			</div>
		</form>
	{/if}
	{#if form?.section === 'new' && form?.saved}<p class="mt-3 text-[13px] font-semibold text-prem">
			{form.saved}
		</p>{/if}

	<!-- ============ ON NOW + COMING UP ============ -->
	{#each [['On now', data.active], ['Coming up', data.scheduled]] as [heading, list] (heading)}
		{#if list.length}
			<section class="mt-12">
				<div class="flex flex-wrap items-end justify-between gap-3 border-b-[3px] border-ink pb-3">
					<h2 class={sectionTitle}>{heading}</h2>
				</div>
				<div class="mt-5 flex flex-col gap-4">
					{#each list as i (i.id)}
						{@render incident(i, true)}
					{/each}
				</div>
			</section>
		{/if}
	{/each}

	<!-- ============ THE CHECKS ============ -->
	<section class="mt-12">
		<div class="flex flex-wrap items-end justify-between gap-3 border-b-[3px] border-ink pb-3">
			<h2 class={sectionTitle}>The checks</h2>
			<span class="text-[12px] text-soft">Last 30 days · every five minutes</span>
		</div>
		<ul class="mt-5 grid gap-3 md:grid-cols-2">
			{#each data.components as c (c.id)}
				{@const state = !c.current ? 'none' : c.current.ok ? 'up' : 'down'}
				{@const t =
					state === 'up'
						? 'var(--color-prem)'
						: state === 'down'
							? 'var(--color-hero-rb)'
							: 'var(--color-line2)'}
				<li
					class="border border-l-[4px] border-line2 bg-white px-4 py-4"
					style="border-left-color: {t}"
				>
					<div class="flex items-start justify-between gap-3">
						<div class="min-w-0">
							<p class="ao-cond text-[24px] leading-none font-black uppercase">{c.label}</p>
							<p class="mt-1 text-[12px] text-fade">{c.note}</p>
						</div>
						<span
							class="shrink-0 px-2 py-[3px] text-[9.5px] font-extrabold tracking-[0.16em] uppercase {state ===
							'none'
								? 'border border-line2 text-fade'
								: 'text-white'}"
							style={state === 'none' ? '' : `background: ${t}`}
							>{state === 'up' ? 'Up' : state === 'down' ? 'Down' : 'Not checked'}</span
						>
					</div>
					<div class="mt-3"><UptimeBars bars={c.bars} days={30} /></div>
					<p class="mt-2 flex flex-wrap justify-between gap-x-3 text-[11.5px] text-soft">
						<span
							>{c.current
								? `${ago(c.current.at)}${c.current.ms != null ? ` · ${c.current.ms} ms` : ''}`
								: c.lastAt
									? `Not checked lately (last ${ago(c.lastAt)}): not set up here, or the job stopped`
									: 'No checks yet (not set up here, or the job hasn’t run)'}</span
						>
						<span class="tabular-nums">{pct(c.uptime)} up over 90 days</span>
					</p>
					{#if c.current && !c.current.ok && c.current.note}
						<p
							class="mt-2 border-l-[3px] border-hero-rb bg-hero-rb/[0.06] px-2.5 py-1.5 font-mono text-[11.5px]"
						>
							{c.current.note}
						</p>
					{/if}
				</li>
			{/each}
		</ul>
	</section>

	<!-- ============ PAST ============ -->
	<section class="mt-12">
		<div class="flex flex-wrap items-end justify-between gap-3 border-b-[3px] border-ink pb-3">
			<h2 class={sectionTitle}>The last 60 days</h2>
		</div>
		{#if data.past.length}
			<div class="mt-5 flex flex-col gap-3">
				{#each data.past as i (i.id)}
					{@render incident(i, false)}
				{/each}
			</div>
		{:else}
			<p class="mt-5 font-newsreader text-[16px] text-soft italic">
				Nothing resolved in the last 60 days.
			</p>
		{/if}
	</section>
</div>

{#snippet incident(i, open)}
	{@const imp = IMPACT[i.impact]}
	{@const statuses =
		i.kind === 'maintenance'
			? ['scheduled', 'in_progress', 'completed']
			: ['investigating', 'identified', 'monitoring', 'resolved']}
	{@const n = notice(i.id)}
	<article
		class="border border-l-[6px] border-line2 {open ? 'bg-white' : 'bg-paper/50'}"
		style="border-left-color: {imp.tone}; --cc: {imp.tone}"
	>
		<div class="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 md:px-6 md:pt-5">
			<div class="min-w-0">
				<p class="flex flex-wrap items-center gap-2">
					<span
						class="px-2 py-[3px] text-[9.5px] font-extrabold tracking-[0.16em] text-white uppercase"
						style="background: {imp.tone}"
						>{i.kind === 'maintenance' ? 'Maintenance' : `${imp.word} incident`}</span
					>
					<span
						class="border border-ink px-2 py-[2px] text-[9.5px] font-extrabold tracking-[0.16em] uppercase"
						>{STATUS_WORD[i.status] || i.status}</span
					>
					{#each i.components as c (c)}<span
							class="border border-line2 px-1.5 py-px text-[10px] text-soft">{COMP[c] || c}</span
						>{/each}
					{#if open && i.banner}<span
							class="text-[10px] font-extrabold tracking-[0.14em] text-warm uppercase"
							>◆ {i.kind === 'maintenance' && i.status === 'scheduled'
								? 'Banner when it starts'
								: 'Banner on'}</span
						>{/if}
				</p>
				<h3 class="mt-2 font-newsreader text-[21px] leading-tight font-semibold md:text-[24px]">
					{i.title}
				</h3>
				<p class="mt-0.5 text-[12px] text-fade">
					{i.kind === 'maintenance' && i.endsAt
						? `${stampOf(i.startsAt)} to ${stampOf(i.endsAt)}`
						: `Started ${stampOf(i.startsAt)}`}{i.resolvedAt
						? ` · closed ${stampOf(i.resolvedAt)}`
						: ''}
				</p>
			</div>
			<span class="flex items-center gap-3">
				{#if open}
					<form method="POST" action="?/banner" use:enhance>
						<input type="hidden" name="id" value={i.id} />
						<input type="hidden" name="on" value={i.banner ? '0' : '1'} />
						<button
							class="text-[10px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink"
							>{i.banner ? 'Hide banner' : 'Show banner'}</button
						>
					</form>
				{/if}
				<form
					method="POST"
					action="?/remove"
					use:enhance={({ cancel }) => {
						if (!confirm(`Delete “${i.title}” and its updates? It disappears from /status.`))
							cancel();
					}}
				>
					<input type="hidden" name="id" value={i.id} />
					<button
						class="text-[10px] font-extrabold tracking-[0.14em] text-hero-rb uppercase hover:underline"
						>Delete</button
					>
				</form>
			</span>
		</div>

		<ol class="mt-3 border-t border-line2">
			{#each i.updates as u (u.id)}
				<li
					class="grid gap-x-5 gap-y-1 border-b border-line px-4 py-3 last:border-b-0 md:grid-cols-[160px_minmax(0,1fr)] md:px-6"
				>
					<span>
						<span class="block text-[10px] font-extrabold tracking-[0.14em] uppercase"
							>{STATUS_WORD[u.status] || u.status}</span
						>
						<span class="block text-[11.5px] text-fade">{stampOf(u.createdAt)}</span>
					</span>
					<p class="font-newsreader text-[15.5px] leading-[1.55] whitespace-pre-line">{u.body}</p>
				</li>
			{/each}
		</ol>

		{#if open}
			<form
				method="POST"
				action="?/update"
				use:enhance={() =>
					async ({ update }) => {
						await update();
					}}
				class="border-t border-line2 bg-paper/60 px-4 py-4 md:px-6"
			>
				<input type="hidden" name="id" value={i.id} />
				<p class={F.label}>Post an update</p>
				<div class="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Status">
					{#each statuses as st (st)}
						<label class={chip}
							><input
								type="radio"
								name="status"
								value={st}
								checked={st === i.status}
								class="sr-only"
							/>{STATUS_WORD[st]}</label
						>
					{/each}
				</div>
				<div class="mt-3 flex flex-col gap-3 md:flex-row md:items-end">
					<label class="block flex-1">
						<span class="sr-only">Update</span>
						<textarea
							name="body"
							rows="2"
							required
							maxlength="4000"
							placeholder="What’s changed"
							class="{F.field} h-auto py-2.5"
						></textarea>
					</label>
					<button
						class="inline-flex h-[46px] shrink-0 items-center px-5 text-[10.5px] font-extrabold tracking-[0.16em] text-white uppercase transition-[filter] hover:brightness-110"
						style="background: var(--cc)">Post update</button
					>
				</div>
				{#if n?.error}<p class="mt-2 text-[12.5px] font-semibold text-hero-rb">{n.error}</p>{/if}
				{#if n?.saved}<p class="mt-2 text-[12.5px] font-semibold text-prem">{n.saved}</p>{/if}
				<p class="mt-2 text-[11.5px] text-fade">
					Choosing {i.kind === 'maintenance' ? 'Completed' : 'Resolved'} closes it and takes the banner
					down.
				</p>
			</form>
		{/if}
	</article>
{/snippet}
