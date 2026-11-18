<script>
	import AdminHeader, { btn as hbtn } from '$lib/components/age/admin/AdminHeader.svelte';
	import AdminTabs from '$lib/components/age/admin/AdminTabs.svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';
	import Figures from '$lib/components/age/admin/Figures.svelte';
	import * as ui from '$lib/components/age/admin/ui.js';
	import * as F from '$lib/components/age/store/fields.js';
	import { slide } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import { prefersReducedMotion } from 'svelte/motion';

	let { data, form } = $props();

	let showAddSeasonForm = $state(false);
	let editingSeasonId = $state(null);
	let calendarSubTab = $state('upcoming');
	let successMessage = $state('');
	let errorMessage = $state('');

	$effect(() => {
		if (form?.success) {
			successMessage = form.message || 'Operation completed successfully';
			errorMessage = '';
			const timeout = setTimeout(() => (successMessage = ''), 5000);
			return () => clearTimeout(timeout);
		} else if (form?.error) {
			errorMessage = form.error;
			successMessage = '';
			const timeout = setTimeout(() => (errorMessage = ''), 5000);
			return () => clearTimeout(timeout);
		}
	});

	const upcomingLssEvents = $derived(
		(data.lssEvents || []).filter((s) => new Date(s.endDate) >= new Date())
	);
	const completedLssEvents = $derived(
		(data.lssEvents || []).filter((s) => new Date(s.endDate) < new Date())
	);
	const displayedLssEvents = $derived(
		calendarSubTab === 'upcoming' ? upcomingLssEvents : completedLssEvents
	);

	const FORMATS = [
		'Classic Constructed',
		'Blitz',
		'Silver Age',
		'Draft',
		'Sealed',
		'Team Event',
		'Living Legend'
	];
	const TYPES = [
		'Skirmish',
		'Road to Nationals',
		'ProQuest',
		'Pro Tour',
		'Worlds',
		'Calling',
		'Battle Hardened',
		'Other'
	];

	// Each kind of LSS event's colour: the card's edge, its badge, the form.
	const TONE = {
		Skirmish: 'var(--color-warm)',
		'Road to Nationals': 'var(--color-gold)',
		ProQuest: 'var(--color-prem)',
		Calling: 'var(--color-hero-rb)',
		'Battle Hardened': 'var(--color-soft)',
		'Pro Tour': 'var(--color-ink)',
		Worlds: 'var(--color-ink)'
	};
	const toneOf = (t) => TONE[t] || 'var(--color-fade)';

	function statusOf(startDate, endDate) {
		const now = new Date();
		if (now >= startDate && now <= endDate) return { label: 'On now', tone: 'bg-prem text-white' };
		if (now > endDate) return { label: 'Done', tone: 'border border-line2 text-fade' };
		const days = Math.ceil((startDate.getTime() - now.getTime()) / 86400000);
		return {
			label: days <= 1 ? 'Starts tomorrow' : `In ${days} days`,
			tone: 'border border-ink text-ink'
		};
	}
	const activeNow = $derived(
		(data.lssEvents || []).filter((s) => {
			const now = new Date();
			return now >= new Date(s.startDate) && now <= new Date(s.endDate);
		}).length
	);
	const hidden = $derived((data.lssEvents || []).filter((s) => !s.isActive).length);
	const day = (d, year = false) =>
		new Date(d).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			...(year ? { year: 'numeric' } : {}),
			timeZone: 'UTC'
		});
	const part = (d, o) => new Date(d).toLocaleDateString('en-US', { timeZone: 'UTC', ...o });
	const ymd = (d) => new Date(d).toISOString().split('T')[0];
	const formatsOf = (s) =>
		(s.format || '')
			.split(',')
			.map((x) => x.trim())
			.filter(Boolean);
	// A tap-to-pick chip for a checkbox or radio inside it, lit in the form's colour.
	const chip =
		'relative flex h-10 cursor-pointer items-center border border-line2 bg-white px-3.5 text-xs font-semibold text-ink transition-colors hover:border-ink/50 has-[:checked]:border-transparent has-[:checked]:bg-(--cc) has-[:checked]:text-white has-[:focus-visible]:ring-3 ring-(--cc)/25';
	const motion = (ms) => ({ duration: prefersReducedMotion.current ? 0 : ms, easing: cubicOut });
	// The type picked in the open form, for its colour.
	let formType = $state('');
</script>

<svelte:head><title>Calendar · Admin</title></svelte:head>

<AdminHeader
	title="LSS calendar"
	subtitle="Skirmishes, RtN, ProQuests, Callings — the competitive road."
>
	{#snippet actions()}
		<button
			type="button"
			onclick={() => {
				showAddSeasonForm = !showAddSeasonForm;
				formType = '';
			}}
			class={hbtn}>+ Add event</button
		>
	{/snippet}
</AdminHeader>
<AdminTabs />

{#if successMessage}
	<AdminNotice tone="success" message={successMessage} ondismiss={() => (successMessage = '')} />
{/if}
{#if errorMessage}
	<AdminNotice tone="error" message={errorMessage} ondismiss={() => (errorMessage = '')} />
{/if}

<div class="mx-auto w-full max-w-page px-5 pt-6 pb-20 md:px-8">
	<Figures
		items={[
			{ label: 'On the calendar', value: ui.fmt((data.lssEvents || []).length) },
			{ label: 'Active now', value: ui.fmt(activeNow), tone: 'text-prem' },
			{ label: 'Upcoming', value: ui.fmt(upcomingLssEvents.length - activeNow), tone: 'text-warm' },
			{ label: 'Completed', value: ui.fmt(completedLssEvents.length) },
			{ label: 'Hidden', value: ui.fmt(hidden), note: 'not shown on the site' }
		]}
		cols="md:grid-cols-5"
	/>

	{#if showAddSeasonForm}
		<div
			class="mt-8 border border-l-6 border-line2 bg-white"
			style="border-left-color: {toneOf(formType)}"
		>
			<p class="px-4 pt-5 md:px-6">
				<span class="ao-cond text-3xl leading-none font-black uppercase">New on the calendar</span>
			</p>
			{@render eventForm(null)}
		</div>
	{/if}

	<div class="mt-8 flex flex-wrap items-center justify-between gap-3">
		<div class="flex flex-wrap gap-1.5" role="group" aria-label="Show">
			{#each [{ id: 'upcoming', label: 'Upcoming & on now', n: upcomingLssEvents.length }, { id: 'completed', label: 'Done', n: completedLssEvents.length }] as f (f.id)}
				<button
					type="button"
					onclick={() => (calendarSubTab = f.id)}
					aria-pressed={calendarSubTab === f.id}
					class="inline-flex h-9 items-center gap-2 border px-3 text-xs font-extrabold tracking-widest uppercase transition-colors {calendarSubTab ===
					f.id
						? 'border-ink bg-ink text-paper-bg'
						: 'border-line2 bg-white text-soft hover:border-ink hover:text-ink'}"
					>{f.label} <span class="tabular-nums opacity-60">{f.n}</span></button
				>
			{/each}
		</div>
		<span
			class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-extrabold tracking-widest text-soft uppercase"
		>
			{#each Object.entries(TONE).slice(0, 5) as [t, tone] (t)}
				<span class="flex items-center gap-1.5"
					><span class="h-2 w-2" style="background: {tone}" aria-hidden="true"></span>{t}</span
				>
			{/each}
		</span>
	</div>

	<ul class="mt-5 flex flex-col gap-2">
		{#each displayedLssEvents as season (season.id)}
			{@const start = new Date(season.startDate)}
			{@const end = new Date(season.endDate)}
			{@const status = statusOf(start, end)}
			{@const tone = toneOf(season.eventType)}
			{@const done = status.label === 'Done'}
			{@const open = editingSeasonId === season.id}
			<li
				class="border border-l-4 transition-shadow duration-200 {season.isActive
					? 'border-line2 bg-white'
					: 'border-dashed border-line2 bg-paper/60'} {open ? 'shadow-md' : ''}"
				style="border-left-color: {tone}; border-left-style: solid"
			>
				<div
					class="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-3.5 py-3 md:grid-cols-[84px_minmax(0,1fr)_190px_150px_auto] md:gap-x-5 md:px-4 {done
						? 'opacity-70'
						: ''}"
				>
					<!-- the dates, as a stub -->
					<span class="flex flex-col items-center leading-none">
						<span class="text-xs font-extrabold tracking-widest uppercase" style="color: {tone}"
							>{part(start, { month: 'short' })}</span
						>
						<span class="ao-cond text-3xl font-black tabular-nums"
							>{part(start, {
								day: 'numeric'
							})}{#if ymd(start) !== ymd(end) && part( start, { month: 'short' } ) === part( end, { month: 'short' } )}<span
									class="text-lg text-fade">–{part(end, { day: 'numeric' })}</span
								>{/if}</span
						>
						<span class="text-xs text-fade tabular-nums">{part(end, { year: 'numeric' })}</span>
					</span>
					<span class="min-w-0">
						<span class="flex flex-wrap items-center gap-2">
							<span class="truncate font-newsreader text-lg leading-tight font-semibold"
								>{season.name}</span
							>
							{#if season.link}<a
									href={season.link}
									target="_blank"
									rel="noopener noreferrer"
									class="shrink-0 text-xs text-warm hover:text-ink"
									aria-label="Official page for {season.name}">↗</a
								>{/if}
							{#if !season.isActive}<span
									class="border border-dashed border-ink/40 px-1.5 py-px text-xs font-extrabold tracking-widest text-soft uppercase"
									>Hidden</span
								>{/if}
						</span>
						<span class="mt-1 flex flex-wrap gap-1">
							{#each formatsOf(season) as f (f)}<span
									class="border border-line2 px-1.5 py-px text-xs text-soft">{f}</span
								>{:else}<span class="text-xs text-fade">No formats set</span>{/each}
						</span>
						{#if season.description}<span class="mt-1 block truncate text-xs text-fade"
								>{season.description}</span
							>{/if}
					</span>
					<span
						class="col-span-2 col-start-2 row-start-2 flex flex-wrap items-center gap-1.5 md:col-span-1 md:col-start-3 md:row-start-1"
					>
						{#if season.eventType}<span
								class="px-2 py-1 text-xs font-extrabold tracking-widest text-white uppercase"
								style="background: {tone}">{season.eventType}</span
							>{/if}
						<span class="px-2 py-0.5 text-xs font-extrabold tracking-widest uppercase {status.tone}"
							>{status.label}</span
						>
					</span>
					<span class="hidden text-xs text-soft tabular-nums md:block"
						>{day(start)} – {day(end, true)}</span
					>
					<span class="col-start-3 row-start-1 justify-self-end md:col-start-5">
						<button
							type="button"
							onclick={() => {
								editingSeasonId = open ? null : season.id;
								formType = season.eventType || '';
							}}
							aria-expanded={open}
							class="inline-flex h-9 items-center border px-3 text-xs font-extrabold tracking-widest uppercase transition-colors {open
								? 'border-ink bg-ink text-paper-bg'
								: 'border-line2 bg-white hover:border-ink'}">{open ? 'Close' : 'Edit'}</button
						>
					</span>
				</div>
				{#if open}
					{@render eventForm(season)}
				{/if}
			</li>
		{:else}
			<li class={ui.empty}>
				No {calendarSubTab === 'upcoming' ? 'upcoming' : 'past'} events.{#if calendarSubTab === 'upcoming'}
					<span>&nbsp;</span>
					<button
						type="button"
						onclick={() => (showAddSeasonForm = true)}
						class="{ui.textAction} not-italic">Add one →</button
					>{/if}
			</li>
		{/each}
	</ul>
</div>

{#snippet eventForm(season)}
	<form
		method="POST"
		action={season ? '?/updateLssSeason' : '?/createLssSeason'}
		use:enhance={() => {
			return async ({ result, update }) => {
				if (result.type === 'success') {
					if (season) editingSeasonId = null;
					else showAddSeasonForm = false;
					await invalidateAll();
				}
				await update();
			};
		}}
		class="border-t border-line2 bg-white"
		style="--cc: {formType ? toneOf(formType) : 'var(--color-ink)'}"
		transition:slide={motion(220)}
	>
		{#if season}<input type="hidden" name="seasonId" value={season.id} />{/if}
		<div class="flex flex-col gap-6 px-4 py-5 md:px-6 md:py-6">
			<div class={F.groupFirst}>
				<div>
					<p class={F.groupTitle}>The event</p>
					<p class={F.groupNote}>Its name, and what kind of LSS event it is.</p>
				</div>
				<div class="flex flex-col gap-4">
					<label class="block">
						<span class={F.label}>Name</span>
						<input
							name="name"
							type="text"
							required
							value={season?.name || ''}
							placeholder="Skirmish Season 5"
							class={F.field}
						/>
					</label>
					<div>
						<span class={F.label}>Kind</span>
						<div class="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Kind">
							{#each TYPES as t (t)}
								<label class={chip}
									><input
										type="radio"
										name="eventType"
										value={t}
										checked={(season?.eventType || '') === t}
										onchange={() => (formType = t)}
										class="sr-only"
									/>{t}</label
								>
							{/each}
						</div>
					</div>
				</div>
			</div>
			<div class={F.group}>
				<div>
					<p class={F.groupTitle}>When</p>
					<p class={F.groupNote}>The first and last day.</p>
				</div>
				<div class="grid max-w-lg grid-cols-2 gap-3">
					<label class="block">
						<span class={F.label}>Starts</span>
						<input
							name="startDate"
							type="date"
							required
							value={season ? ymd(season.startDate) : ''}
							class={F.field}
						/>
					</label>
					<label class="block">
						<span class={F.label}>Ends</span>
						<input
							name="endDate"
							type="date"
							required
							value={season ? ymd(season.endDate) : ''}
							class={F.field}
						/>
					</label>
				</div>
			</div>
			<div class={F.group}>
				<div>
					<p class={F.groupTitle}>Formats</p>
					<p class={F.groupNote}>Pick every format it’s played in.</p>
				</div>
				<div class="flex flex-wrap gap-1.5">
					{#each FORMATS as f (f)}
						<label class={chip}
							><input
								type="checkbox"
								name="format"
								value={f}
								checked={(season?.format || '').includes(f)}
								class="sr-only"
							/>{f}</label
						>
					{/each}
				</div>
			</div>
			<div class={F.group}>
				<div>
					<p class={F.groupTitle}>Details</p>
					<p class={F.groupNote}>A line about it, and the official page.</p>
				</div>
				<div class="grid gap-3 md:grid-cols-2">
					<label class="block">
						<span class={F.label}
							>Description <span class="font-semibold tracking-normal normal-case">(optional)</span
							></span
						>
						<input
							name="description"
							type="text"
							value={season?.description || ''}
							class={F.field}
						/>
					</label>
					<label class="block">
						<span class={F.label}
							>Official link <span class="font-semibold tracking-normal normal-case"
								>(optional)</span
							></span
						>
						<input
							name="link"
							type="url"
							value={season?.link || ''}
							placeholder="https://fabtcg.com/…"
							class={F.field}
						/>
					</label>
				</div>
			</div>
		</div>
		<div
			class="flex flex-wrap items-center justify-between gap-3 border-t border-line2 bg-paper/60 px-4 py-3 md:px-6"
		>
			<span class="flex flex-wrap items-center gap-x-5 gap-y-2">
				{#if season}
					<label class="flex cursor-pointer items-center gap-2 text-xs">
						<input
							type="checkbox"
							name="isActive"
							value="true"
							checked={season.isActive}
							class="h-4 w-4 border-line2 text-ink focus:ring-0"
						/>
						Show on the site
					</label>
					<button
						type="submit"
						formaction="?/deleteLssSeason"
						formnovalidate
						onclick={(e) => {
							if (!confirm(`Delete ${season.name} from the calendar?`)) e.preventDefault();
						}}
						class="text-xs font-extrabold tracking-widest text-hero-rb uppercase hover:underline"
						>Delete</button
					>
				{/if}
			</span>
			<span class="flex items-center gap-2">
				<button
					type="button"
					onclick={() => (season ? (editingSeasonId = null) : (showAddSeasonForm = false))}
					class="inline-flex h-10 items-center px-3 text-xs font-extrabold tracking-widest text-soft uppercase hover:text-ink"
					>Cancel</button
				>
				<button
					type="submit"
					class="inline-flex h-10 items-center px-5 text-xs font-extrabold tracking-widest text-white uppercase transition hover:brightness-110"
					style="background: var(--cc)">{season ? 'Save changes' : 'Add to calendar'}</button
				>
			</span>
		</div>
	</form>
{/snippet}
