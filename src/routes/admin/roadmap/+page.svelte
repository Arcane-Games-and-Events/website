<script>
	/**
	 * Admin → Roadmap: the items on /roadmap by stage. Add one, edit it in
	 * place, nudge it up or down within its stage, move it to another stage
	 * (Shipped stamps the date), hide it from the public page, or delete it.
	 */
	import AdminHeader, {
		btn as hbtn,
		btnLine as hbtnLine
	} from '$lib/components/age/admin/AdminHeader.svelte';
	import AdminTabs from '$lib/components/age/admin/AdminTabs.svelte';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';
	import * as F from '$lib/components/age/store/fields.js';
	import { enhance } from '$app/forms';
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { prefersReducedMotion } from 'svelte/motion';
	import { AREA, AREAS, LIMITS, STAGES } from '$lib/roadmap.js';

	let { data, form } = $props();

	const motion = (ms) => ({ duration: prefersReducedMotion.current ? 0 : ms, easing: cubicOut });
	const sectionTitle = 'ao-cond text-[36px] leading-none font-black uppercase md:text-[44px]';
	const small =
		'inline-flex h-[34px] items-center border border-line2 bg-white px-3 text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors hover:border-ink disabled:opacity-35 disabled:hover:border-line2';
	const shippedOn = (d) =>
		d
			? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
			: '';

	let creating = $state(false);
	let editing = $state(/** @type {string | null} */ (null));
	let confirming = $state(/** @type {string | null} */ (null));
	const notice = (id) => (form?.section === id ? form : null);
	const total = $derived(STAGES.reduce((n, s) => n + data.roadmap[s.id].length, 0));

	/** Keep the page where it is after a small action (nudge, move). */
	const quiet =
		() =>
		async ({ update }) =>
			update({ reset: false, invalidateAll: true });
</script>

<svelte:head><title>Roadmap · Admin</title></svelte:head>

{#snippet itemForm(item, stageId)}
	{@const tone = item?.area ? AREA[item.area].tone : 'var(--color-ink)'}
	<form
		method="POST"
		action={item ? '?/update' : '?/create'}
		use:enhance={() =>
			async ({ result, update }) => {
				await update({ reset: !item });
				if (result.type === 'success') {
					if (item) editing = null;
					else creating = false;
				}
			}}
		class="flex flex-col gap-6 px-4 py-5 md:px-6 md:py-6"
		style="--cc: {tone}"
	>
		{#if item}<input type="hidden" name="id" value={item.id} />{/if}
		<div class={F.groupFirst}>
			<div>
				<p class={F.groupTitle}>What</p>
				<p class={F.groupNote}>A short name and a sentence or two on what it is.</p>
			</div>
			<div class="flex flex-col gap-4">
				<label class="block">
					<span class={F.label}>Title</span>
					<input
						name="title"
						required
						maxlength={LIMITS.title}
						value={item?.title || ''}
						placeholder="Spoilers in articles"
						class={F.field}
					/>
				</label>
				<label class="block">
					<span class={F.label}
						>Description <span class="tracking-normal normal-case">(optional)</span></span
					>
					<textarea
						name="body"
						rows="3"
						maxlength={LIMITS.body}
						placeholder="Hide results and decklists until the reader chooses to see them."
						class="{F.field} h-auto py-3 leading-relaxed">{item?.body || ''}</textarea
					>
				</label>
			</div>
		</div>
		<div class={F.group}>
			<div>
				<p class={F.groupTitle}>Where</p>
				<p class={F.groupNote}>The part of AGE it belongs to, and its stage.</p>
			</div>
			<div class="flex flex-col gap-4">
				<div class="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Area">
					<label
						class="{F.chip(
							false
						)} has-[:checked]:border-transparent has-[:checked]:bg-ink has-[:checked]:text-paper-bg"
						><input
							type="radio"
							name="area"
							value=""
							checked={!item?.area}
							class="sr-only"
						/>None</label
					>
					{#each AREAS as a (a.id)}
						<label
							class="{F.chip(
								false
							)} has-[:checked]:border-transparent has-[:checked]:bg-[var(--cc)] has-[:checked]:text-white"
							style="--cc: {a.tone}"
							><input
								type="radio"
								name="area"
								value={a.id}
								checked={item?.area === a.id}
								class="sr-only"
							/>{a.label}</label
						>
					{/each}
				</div>
				<div class="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Stage">
					{#each STAGES as s (s.id)}
						<label
							class="{F.chip(
								false
							)} has-[:checked]:border-transparent has-[:checked]:bg-ink has-[:checked]:text-paper-bg"
							><input
								type="radio"
								name="stage"
								value={s.id}
								checked={(item?.stage || stageId) === s.id}
								class="sr-only"
							/>{s.label}</label
						>
					{/each}
				</div>
				<label class="flex items-center gap-2.5 text-[13.5px]">
					<input
						type="checkbox"
						name="isPublic"
						checked={item ? item.isPublic : true}
						class="h-4 w-4 border-line2 text-ink focus:ring-0"
					/>
					Show it on the public roadmap
				</label>
			</div>
		</div>
		{#if notice(item?.id || 'new')?.error}
			<p
				class="border-l-[3px] border-hero-rb bg-hero-rb/[0.06] px-3 py-2 text-[12.5px] text-hero-rb"
			>
				{notice(item?.id || 'new').error}
			</p>
		{/if}
		<div class="flex flex-wrap items-center justify-end gap-2 border-t border-line2 pt-5">
			<button
				type="button"
				onclick={() => (item ? (editing = null) : (creating = false))}
				class="h-[42px] px-4 text-[10.5px] font-extrabold tracking-[0.14em] text-soft uppercase hover:text-ink"
				>Cancel</button
			>
			<button
				class="h-[42px] bg-ink px-5 text-[10.5px] font-extrabold tracking-[0.14em] text-paper-bg uppercase transition-colors hover:bg-warm"
				>{item ? 'Save' : 'Add to the roadmap'}</button
			>
		</div>
	</form>
{/snippet}

<AdminHeader
	title="Roadmap"
	subtitle="What’s on /roadmap: Upcoming, In development, Testing and Shipped."
>
	{#snippet actions()}
		<a href="/roadmap" target="_blank" rel="noopener" class={hbtnLine}>Public page ↗</a>
		<button type="button" onclick={() => (creating = !creating)} class={hbtn}
			>{creating ? 'Close' : '+ Add an item'}</button
		>
	{/snippet}
</AdminHeader>
<AdminTabs />

{#if !data.ready}
	<AdminNotice
		tone="info"
		message="The roadmap needs migration 047 (status checks, incidents and the roadmap). Apply it in Supabase, then reload."
	/>
{/if}
{#if form?.saved}<AdminNotice tone="success" message={form.saved} />{/if}
{#if form?.error && !form.section}<AdminNotice tone="error" message={form.error} />{/if}

<div class="mx-auto w-full max-w-[1200px] px-5 pt-6 pb-20 md:px-8">
	{#if creating}
		<div
			class="mb-8 border border-l-[6px] border-line2 border-l-ink bg-white"
			transition:slide={motion(220)}
		>
			{@render itemForm(null, 'upcoming')}
		</div>
	{/if}

	{#if data.ready && total === 0 && !creating}
		<div class="border border-dashed border-line2 px-6 py-10 text-center">
			<p class="font-newsreader text-[20px] font-semibold">The roadmap is empty.</p>
			<p class="mt-1 text-[13px] text-soft">Add what’s upcoming, in development and in testing.</p>
			<button type="button" onclick={() => (creating = true)} class="{hbtn} mt-4"
				>+ Add the first item</button
			>
		</div>
	{/if}

	{#each STAGES as stage (stage.id)}
		{@const items = data.roadmap[stage.id]}
		{#if items.length || (data.ready && total > 0)}
			<section class="mt-10 first:mt-0">
				<div class="flex items-end justify-between gap-3 border-b-[3px] border-ink pb-2">
					<h2 class={sectionTitle}>{stage.label}</h2>
					<span class="text-[12px] text-soft"
						>{items.length}
						{items.length === 1 ? 'item' : 'items'} · {stage.id === 'shipped'
							? 'newest first'
							: stage.note.toLowerCase()}</span
					>
				</div>
				{#if !items.length}
					<p class="mt-4 font-newsreader text-[16px] text-fade italic">Nothing here.</p>
				{/if}
				<ul class="mt-4 flex flex-col gap-3">
					{#each items as item, i (item.id)}
						{@const area = item.area ? AREA[item.area] : null}
						<li
							class="border border-l-[6px] border-line2 bg-white"
							style="border-left-color: {area?.tone || 'var(--color-line2)'}"
						>
							{#if editing === item.id}
								<div transition:slide={motion(200)}>{@render itemForm(item, stage.id)}</div>
							{:else}
								<div class="flex flex-col gap-4 px-4 py-4 md:flex-row md:items-center md:px-5">
									<div class="min-w-0 flex-1">
										<p class="flex flex-wrap items-center gap-2">
											{#if area}
												<span
													class="text-[9.5px] font-extrabold tracking-[0.16em] uppercase"
													style="color: {area.tone}">{area.label}</span
												>
											{/if}
											{#if !item.isPublic}
												<span
													class="border border-line2 px-1.5 py-px text-[9.5px] font-extrabold tracking-[0.14em] text-soft uppercase"
													>Hidden</span
												>
											{/if}
											{#if stage.id === 'shipped' && item.shippedAt}
												<span class="text-[11.5px] text-fade"
													>Shipped {shippedOn(item.shippedAt)}</span
												>
											{/if}
										</p>
										<p class="mt-1 font-newsreader text-[19px] leading-tight font-semibold">
											{item.title}
										</p>
										{#if item.body}
											<p class="mt-1 line-clamp-2 text-[13px] text-soft">{item.body}</p>
										{/if}
									</div>
									<div class="flex flex-wrap items-center gap-1.5">
										{#if stage.id !== 'shipped'}
											<form method="POST" action="?/nudge" use:enhance={quiet} class="contents">
												<input type="hidden" name="id" value={item.id} />
												<button
													name="dir"
													value="-1"
													disabled={i === 0}
													class="{small} w-[34px] justify-center px-0"
													aria-label="Move up">↑</button
												>
												<button
													name="dir"
													value="1"
													disabled={i === items.length - 1}
													class="{small} w-[34px] justify-center px-0"
													aria-label="Move down">↓</button
												>
											</form>
										{/if}
										<form method="POST" action="?/move" use:enhance={quiet} class="contents">
											<input type="hidden" name="id" value={item.id} />
											<label class="sr-only" for="move-{item.id}">Move to</label>
											<select
												id="move-{item.id}"
												name="stage"
												class="h-[34px] border border-line2 bg-white py-0 pr-8 pl-2.5 text-[12px] focus:border-ink focus:ring-0"
												onchange={(e) => e.currentTarget.form?.requestSubmit()}
											>
												{#each STAGES as s (s.id)}
													<option value={s.id} selected={s.id === stage.id}
														>{s.id === stage.id ? s.label : `Move to ${s.label}`}</option
													>
												{/each}
											</select>
										</form>
										<button
											type="button"
											onclick={() => ((editing = item.id), (confirming = null))}
											class={small}>Edit</button
										>
										{#if confirming === item.id}
											<form method="POST" action="?/remove" use:enhance class="contents">
												<input type="hidden" name="id" value={item.id} />
												<button
													class="inline-flex h-[34px] items-center bg-hero-rb px-3 text-[10px] font-extrabold tracking-[0.12em] text-white uppercase"
													>Delete it</button
												>
											</form>
											<button type="button" onclick={() => (confirming = null)} class={small}
												>Keep</button
											>
										{:else}
											<button
												type="button"
												onclick={() => (confirming = item.id)}
												class="{small} hover:border-hero-rb hover:text-hero-rb"
												aria-label="Delete {item.title}">Delete</button
											>
										{/if}
									</div>
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{/each}
</div>
