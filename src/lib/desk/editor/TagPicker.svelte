<!--
  TagPicker — files an entry under one tag, in the entry sidebar.

  Shows the current tag with Change / Remove. Changing opens a search box
  over the shared tag list; typing a name that isn't there offers to add it
  as a new tag. Picking saves straight away (through `onpick`), replacing
  any tag the entry had: a piece only ever has one.

  Props:
    value  — the entry's tag { id, name, slug } or null
    tags   — every tag: { id, name, slug, count }
    onpick — async (tag | null) => boolean; saves, returns false on failure
-->
<script>
	import { titleToSlug } from '$lib/desk/slug.js';

	/** @type {{ value: any, tags: any[], onpick: (tag: any) => Promise<boolean> }} */
	let { value, tags = [], onpick } = $props();
	// The sidebar renders twice (desktop column, phone drawer): unique ids.
	const uid = $props.id();

	const TAG_NAME_MAX = 40;

	let open = $state(false);
	let query = $state('');
	let active = $state(0);
	let busy = $state(false);
	let error = $state('');
	let saved = $state('');
	/** @type {HTMLInputElement | undefined} */
	let input = $state();
	let savedTimer;
	// Tags added here since the page loaded.
	let added = $state([]);
	const all = $derived([...tags, ...added.filter((a) => !tags.some((t) => t.id === a.id))]);

	const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
	const cleaned = $derived(query.replace(/\s+/g, ' ').trim().slice(0, TAG_NAME_MAX).trim());
	const matches = $derived.by(() => {
		const q = norm(cleaned);
		const list = all.filter((t) => t.id !== value?.id);
		if (!q) return list;
		return list
			.filter((t) => norm(t.name).includes(q))
			.sort((a, b) => norm(a.name).indexOf(q) - norm(b.name).indexOf(q));
	});
	// Offer a new tag unless the name is already one (by its web address,
	// so "deck tech" finds "Deck Tech").
	const newSlug = $derived(titleToSlug(cleaned));
	const exists = $derived(!!newSlug && all.some((t) => t.slug === newSlug));
	const canAdd = $derived(!!newSlug && !exists);
	const options = $derived([
		...matches.map((t) => ({ kind: 'tag', tag: t })),
		...(canAdd ? [{ kind: 'new', name: cleaned }] : [])
	]);
	$effect(() => {
		options;
		active = 0;
	});

	function start() {
		open = true;
		query = '';
		error = '';
		requestAnimationFrame(() => input?.focus());
	}
	function cancel() {
		open = false;
		query = '';
		error = '';
	}

	async function choose(opt) {
		if (!opt || busy) return;
		busy = true;
		error = '';
		try {
			let tag = opt.tag;
			if (opt.kind === 'new') {
				const res = await fetch('/api/desk/tags', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ name: opt.name })
				});
				const body = await res.json().catch(() => ({}));
				if (!res.ok) throw new Error(body?.message || 'Could not add that tag');
				tag = { ...body.tag, count: 0 };
				if (!all.some((t) => t.id === tag.id)) added = [...added, tag];
			}
			if (await onpick(tag)) {
				open = false;
				query = '';
				flash(`Filed under ${tag.name}.`);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Something went wrong';
		} finally {
			busy = false;
		}
	}

	async function remove() {
		if (busy) return;
		busy = true;
		error = '';
		try {
			if (await onpick(null)) flash('Tag removed.');
		} finally {
			busy = false;
		}
	}

	function flash(msg) {
		saved = msg;
		clearTimeout(savedTimer);
		savedTimer = setTimeout(() => (saved = ''), 3500);
	}

	function onkeydown(e) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			active = Math.min(active + 1, options.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			active = Math.max(active - 1, 0);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			choose(options[active]);
		} else if (e.key === 'Escape') {
			e.preventDefault();
			cancel();
		}
	}

	const textAction =
		'text-[10px] font-extrabold tracking-[0.12em] uppercase transition-colors disabled:opacity-45';
</script>

<div>
	{#if !open}
		<div class="mt-1.5 flex min-h-[40px] items-center justify-between gap-3">
			{#if value}
				<span
					class="inline-flex min-w-0 items-center gap-2 border border-ink px-2.5 py-1.5 text-[11px] font-extrabold tracking-[0.12em] uppercase"
				>
					<span class="text-[7px] text-warm" aria-hidden="true">◆</span>
					<span class="truncate">{value.name}</span>
				</span>
				<span class="flex shrink-0 items-center gap-4">
					<button type="button" onclick={start} disabled={busy} class="{textAction} hover:text-warm"
						>Change</button
					>
					<button
						type="button"
						onclick={remove}
						disabled={busy}
						class="{textAction} text-fade hover:text-hero-rb">Remove</button
					>
				</span>
			{:else}
				<button
					type="button"
					onclick={start}
					class="flex h-[40px] w-full items-center justify-between border border-dashed border-line2 px-2.5 text-left text-[13.5px] text-fade transition-colors hover:border-ink hover:text-ink"
				>
					No tag yet
					<span class="text-[10px] font-extrabold tracking-[0.12em] text-ink uppercase"
						>Add tag</span
					>
				</button>
			{/if}
		</div>
	{:else}
		<div class="mt-1.5 border border-ink bg-paper">
			<input
				bind:this={input}
				bind:value={query}
				{onkeydown}
				type="text"
				maxlength={TAG_NAME_MAX}
				placeholder="Search tags, or type a new one"
				autocomplete="off"
				role="combobox"
				aria-expanded="true"
				aria-controls="{uid}-options"
				aria-activedescendant={options.length ? `${uid}-opt-${active}` : undefined}
				aria-label="Tag"
				class="h-[40px] w-full border-0 border-b border-line2 bg-transparent px-2.5 text-[14px] focus:ring-0 focus:outline-none"
			/>
			<ul id="{uid}-options" role="listbox" class="max-h-[232px] overflow-y-auto bg-white">
				{#each options as opt, i (opt.kind === 'tag' ? opt.tag.id : 'new')}
					<li
						id="{uid}-opt-{i}"
						role="option"
						aria-selected={i === active}
						class="border-b border-line last:border-b-0"
					>
						<button
							type="button"
							tabindex="-1"
							disabled={busy}
							onpointerenter={() => (active = i)}
							onclick={() => choose(opt)}
							class="flex w-full items-baseline justify-between gap-3 px-2.5 py-2.5 text-left text-[13.5px] transition-colors {i ===
							active
								? 'bg-paper'
								: ''}"
						>
							{#if opt.kind === 'tag'}
								<span class="min-w-0 truncate">{opt.tag.name}</span>
								<span class="shrink-0 text-[11px] text-fade tabular-nums"
									>{opt.tag.count} {opt.tag.count === 1 ? 'piece' : 'pieces'}</span
								>
							{:else}
								<span class="min-w-0 truncate"
									>Add <strong class="font-semibold">“{opt.name}”</strong></span
								>
								<span
									class="shrink-0 text-[10px] font-extrabold tracking-[0.12em] text-warm uppercase"
									>New tag</span
								>
							{/if}
						</button>
					</li>
				{:else}
					<li class="px-2.5 py-3 text-[12.5px] text-fade">
						{all.length ? 'No other tags match.' : 'No tags yet. Type a name to add the first.'}
					</li>
				{/each}
			</ul>
			<div class="flex items-center justify-between gap-3 border-t border-line2 px-2.5 py-2">
				<span class="text-[11px] text-fade">↑ ↓ to move · Enter to pick</span>
				<button type="button" onclick={cancel} class="{textAction} hover:text-warm">Cancel</button>
			</div>
		</div>
	{/if}

	{#if error}
		<p class="mt-1.5 text-[11.5px] leading-snug text-hero-rb" role="alert">{error}</p>
	{:else if saved}
		<p class="mt-1.5 text-[11.5px] leading-snug text-prem" role="status">✓ {saved}</p>
	{:else}
		<p class="mt-1.5 text-[11.5px] leading-snug text-fade">
			One per piece. It's the label above the title, and the piece is listed on that tag's page.
		</p>
	{/if}
</div>
