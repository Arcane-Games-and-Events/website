<script>
	import DeskHeader from '$lib/components/age/desk/DeskHeader.svelte';
	import AdminTabs from '$lib/components/age/admin/AdminTabs.svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import AdminNotice from '$lib/components/admin/AdminNotice.svelte';
	import Figures from '$lib/components/age/admin/Figures.svelte';
	import Section from '$lib/components/age/admin/Section.svelte';
	import * as ui from '$lib/components/age/admin/ui.js';

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

	function statusOf(startDate, endDate) {
		const now = new Date();
		if (now >= startDate && now <= endDate) return { label: 'Active', tone: ui.pillTone.active };
		if (now > endDate) return { label: 'Completed', tone: ui.pillTone.completed };
		return { label: 'Upcoming', tone: ui.pillTone.upcoming };
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
	const ymd = (d) => new Date(d).toISOString().split('T')[0];
	const chip =
		'flex cursor-pointer items-center gap-2 border border-line2 px-2.5 py-1.5 text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors hover:border-ink has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-paper-bg';
</script>

<svelte:head><title>Calendar · Admin</title></svelte:head>

<DeskHeader
	kicker="Admin"
	title="LSS calendar"
	subtitle="Skirmishes, RtN, ProQuests, Callings — the competitive road."
>
	{#snippet actions(compact)}
		<button
			type="button"
			onclick={() => (showAddSeasonForm = !showAddSeasonForm)}
			class="inline-flex items-center bg-paper-bg px-3 text-[10px] font-extrabold tracking-[0.14em] text-ink uppercase transition-colors hover:bg-warm-light {compact
				? 'h-[30px]'
				: 'h-[36px]'}">+ Add event</button
		>
	{/snippet}
</DeskHeader>
<AdminTabs />

{#if successMessage}
	<AdminNotice tone="success" message={successMessage} ondismiss={() => (successMessage = '')} />
{/if}
{#if errorMessage}
	<AdminNotice tone="error" message={errorMessage} ondismiss={() => (errorMessage = '')} />
{/if}

<div class="mx-auto w-full max-w-[1200px] px-5 pt-6 pb-20 md:px-8">
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
		<form
			method="POST"
			action="?/createLssSeason"
			use:enhance={() => {
				return async ({ result, update }) => {
					if (result.type === 'success') {
						showAddSeasonForm = false;
						await invalidateAll();
					}
					await update();
				};
			}}
			class="{ui.panel} mt-8 p-5 md:p-6"
		>
			<p class="text-[9.5px] font-extrabold tracking-[0.2em] text-fade uppercase">New event</p>
			<h2 class="mt-1 mb-5 font-newsreader text-[22px] font-semibold">What's on the schedule?</h2>
			<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<label class="block">
					<span class={ui.label}>Event name <span class="text-hero-rb">*</span></span>
					<input
						name="name"
						type="text"
						required
						value=""
						placeholder="Skirmish Season 5"
						class="{ui.input} mt-1.5"
					/>
				</label>
				<label class="block">
					<span class={ui.label}>Type</span>
					<select name="eventType" class="{ui.select} mt-1.5 w-full">
						<option value="">Select type</option>
						{#each TYPES as t (t)}<option value={t}>{t}</option>{/each}
					</select>
				</label>
				<label class="block">
					<span class={ui.label}>Start <span class="text-hero-rb">*</span></span>
					<input name="startDate" type="date" required value="" class="{ui.input} mt-1.5" />
				</label>
				<label class="block">
					<span class={ui.label}>End <span class="text-hero-rb">*</span></span>
					<input name="endDate" type="date" required value="" class="{ui.input} mt-1.5" />
				</label>
			</div>
			<div class="mt-5">
				<span class={ui.label}>Formats</span>
				<div class="mt-2 flex flex-wrap gap-1.5">
					{#each FORMATS as f (f)}
						<label class={chip}
							><input type="checkbox" name="format" value={f} class="sr-only" />{f}</label
						>
					{/each}
				</div>
			</div>
			<div class="mt-5 grid gap-4 md:grid-cols-2">
				<label class="block">
					<span class={ui.label}>Description</span>
					<input
						name="description"
						type="text"
						value=""
						placeholder="Optional"
						class="{ui.input} mt-1.5"
					/>
				</label>
				<label class="block">
					<span class={ui.label}>Official link</span>
					<input
						name="link"
						type="url"
						value=""
						placeholder="https://fabtcg.com/…"
						class="{ui.input} mt-1.5"
					/>
				</label>
			</div>
			<div class="mt-6 flex justify-end gap-2">
				<button type="button" onclick={() => (showAddSeasonForm = false)} class={ui.ghost}
					>Cancel</button
				>
				<button type="submit" class={ui.btn}>Add to calendar →</button>
			</div>
		</form>
	{/if}

	<div class="mt-8 flex flex-wrap items-center justify-between gap-3">
		<div class="flex gap-px border border-line2 bg-line2" role="group" aria-label="Show">
			<button
				type="button"
				onclick={() => (calendarSubTab = 'upcoming')}
				class="h-[38px] px-3.5 text-[10px] font-extrabold tracking-[0.14em] uppercase {calendarSubTab ===
				'upcoming'
					? 'bg-ink text-paper-bg'
					: 'bg-paper-bg text-soft hover:text-ink'}"
				>Upcoming & active · {upcomingLssEvents.length}</button
			>
			<button
				type="button"
				onclick={() => (calendarSubTab = 'completed')}
				class="h-[38px] px-3.5 text-[10px] font-extrabold tracking-[0.14em] uppercase {calendarSubTab ===
				'completed'
					? 'bg-ink text-paper-bg'
					: 'bg-paper-bg text-soft hover:text-ink'}">Completed · {completedLssEvents.length}</button
			>
		</div>
	</div>

	<Section
		title={calendarSubTab === 'upcoming' ? 'Upcoming and active' : 'Completed'}
		class="mt-6"
		note="{ui.fmt(displayedLssEvents.length)} {displayedLssEvents.length === 1
			? 'event'
			: 'events'}"
	>
		<div
			class="{ui.rowHead} grid-cols-[minmax(0,1fr)_130px_minmax(0,180px)_170px_100px_120px] gap-3"
		>
			<span>Event</span><span>Type</span><span>Formats</span><span>Dates</span><span>Status</span
			><span class="text-right">Actions</span>
		</div>
		<ul>
			{#each displayedLssEvents as season (season.id)}
				{@const start = new Date(season.startDate)}
				{@const end = new Date(season.endDate)}
				{@const status = statusOf(start, end)}
				<li class={ui.row}>
					{#if editingSeasonId === season.id}
						<form
							method="POST"
							action="?/updateLssSeason"
							use:enhance={() => {
								return async ({ result, update }) => {
									if (result.type === 'success') {
										editingSeasonId = null;
										await invalidateAll();
									}
									await update();
								};
							}}
							class="my-3 border-l-[3px] border-ink bg-paper p-5"
						>
							<input type="hidden" name="seasonId" value={season.id} />
							<p class="mb-4 text-[9.5px] font-extrabold tracking-[0.2em] text-fade uppercase">
								Editing · {season.name}
							</p>
							<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
								<label class="block">
									<span class={ui.label}>Event name <span class="text-hero-rb">*</span></span>
									<input
										name="name"
										type="text"
										required
										value={season?.name || ''}
										placeholder="Skirmish Season 5"
										class="{ui.input} mt-1.5"
									/>
								</label>
								<label class="block">
									<span class={ui.label}>Type</span>
									<select name="eventType" class="{ui.select} mt-1.5 w-full">
										<option value="">Select type</option>
										{#each TYPES as t (t)}<option value={t} selected={season?.eventType === t}
												>{t}</option
											>{/each}
									</select>
								</label>
								<label class="block">
									<span class={ui.label}>Start <span class="text-hero-rb">*</span></span>
									<input
										name="startDate"
										type="date"
										required
										value={season ? ymd(season.startDate) : ''}
										class="{ui.input} mt-1.5"
									/>
								</label>
								<label class="block">
									<span class={ui.label}>End <span class="text-hero-rb">*</span></span>
									<input
										name="endDate"
										type="date"
										required
										value={season ? ymd(season.endDate) : ''}
										class="{ui.input} mt-1.5"
									/>
								</label>
							</div>
							<div class="mt-5">
								<span class={ui.label}>Formats</span>
								<div class="mt-2 flex flex-wrap gap-1.5">
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
							<div class="mt-5 grid gap-4 md:grid-cols-2">
								<label class="block">
									<span class={ui.label}>Description</span>
									<input
										name="description"
										type="text"
										value={season?.description || ''}
										placeholder="Optional"
										class="{ui.input} mt-1.5"
									/>
								</label>
								<label class="block">
									<span class={ui.label}>Official link</span>
									<input
										name="link"
										type="url"
										value={season?.link || ''}
										placeholder="https://fabtcg.com/…"
										class="{ui.input} mt-1.5"
									/>
								</label>
							</div>
							<div class="mt-5 flex flex-wrap items-center justify-between gap-3">
								<label class="flex items-center gap-2 text-[12.5px]">
									<input
										type="checkbox"
										name="isActive"
										value="true"
										checked={season.isActive}
										class="h-4 w-4 border-line2 text-ink focus:ring-0"
									/>
									Show on the site
								</label>
								<div class="flex gap-2">
									<button type="button" onclick={() => (editingSeasonId = null)} class={ui.ghost}
										>Cancel</button
									>
									<button type="submit" class={ui.btn}>Save →</button>
								</div>
							</div>
						</form>
					{:else}
						<div
							class="py-3 md:grid md:grid-cols-[minmax(0,1fr)_130px_minmax(0,180px)_170px_100px_120px] md:items-center md:gap-3"
						>
							<span class="flex min-w-0 items-center gap-2">
								<span class="{ui.titleText} truncate">{season.name}</span>
								{#if season.link}<a
										href={season.link}
										target="_blank"
										rel="noopener noreferrer"
										class="shrink-0 text-warm hover:text-ink"
										aria-label="Official page">↗</a
									>{/if}
								{#if !season.isActive}<span class="{ui.pill} {ui.pillTone.inactive}">Hidden</span
									>{/if}
							</span>
							<span class="mt-1.5 flex flex-wrap items-center gap-1.5 md:contents">
								<span
									>{#if season.eventType}<span class={ui.pill}>{season.eventType}</span>{:else}<span
											class="text-fade">—</span
										>{/if}</span
								>
								<span class="truncate text-[12px] text-soft" title={season.format || ''}
									>{season.format || '—'}</span
								>
								<span class="text-[12.5px] whitespace-nowrap text-soft tabular-nums"
									>{day(start)} – {day(end, true)}</span
								>
								<span><span class="{ui.pill} {status.tone}">{status.label}</span></span>
							</span>
							<span class="mt-2 flex items-center gap-1 md:mt-0 md:justify-end">
								<button
									type="button"
									onclick={() => (editingSeasonId = season.id)}
									class={ui.ghostSm}>Edit</button
								>
								<form
									method="POST"
									action="?/deleteLssSeason"
									use:enhance={() => {
										return async ({ result, update }) => {
											if (result.type === 'success') await invalidateAll();
											await update();
										};
									}}
								>
									<input type="hidden" name="seasonId" value={season.id} />
									<button
										type="submit"
										onclick={(e) => {
											if (!confirm('Delete this event?')) e.preventDefault();
										}}
										class={ui.danger}>Delete</button
									>
								</form>
							</span>
						</div>
					{/if}
				</li>
			{:else}
				<li class={ui.empty}>
					No {calendarSubTab === 'upcoming' ? 'upcoming' : 'completed'} events.{#if calendarSubTab === 'upcoming'}
						<span>&nbsp;</span>
						<button
							type="button"
							onclick={() => (showAddSeasonForm = true)}
							class="{ui.textAction} not-italic">Add one →</button
						>{/if}
				</li>
			{/each}
		</ul>
	</Section>
</div>
