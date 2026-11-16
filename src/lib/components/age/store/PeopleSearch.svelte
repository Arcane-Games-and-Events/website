<!--
  PeopleSearch — find an AGE account to add, by name, email or GEM ID.
  Results drop down as you type (initials, name, masked email, GEM ID);
  arrow keys move, Enter picks, Escape closes. People already added are
  shown but can't be picked. The pick is sent as `name` (the account id),
  and is shown as a chip that can be cleared.

  Props: endpoint (GET ?q= → { people }), name (form field, default
  userId), placeholder, exclude (account ids already added), excludeNote
  ("On the team"), label (for screen readers), onpick
-->
<script>
	/** @type {{ endpoint: string, name?: string, placeholder?: string, exclude?: string[], excludeNote?: string, label?: string, picked?: any }} */
	let {
		endpoint,
		name = 'userId',
		placeholder = 'Search by name, email or GEM ID',
		exclude = [],
		excludeNote = 'Already added',
		label = 'Find someone',
		picked = $bindable(null)
	} = $props();

	const uid = `ps-${Math.random().toString(36).slice(2, 8)}`;
	let q = $state('');
	let results = $state(/** @type {any[]} */ ([]));
	let open = $state(false);
	let active = $state(0);
	let loading = $state(false);
	let searched = $state('');
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let timer;
	let seq = 0;

	function search(text) {
		clearTimeout(timer);
		if (text.trim().length < 2) {
			results = [];
			searched = '';
			loading = false;
			return;
		}
		loading = true;
		timer = setTimeout(async () => {
			const mine = ++seq;
			try {
				const res = await fetch(`${endpoint}?q=${encodeURIComponent(text.trim())}`);
				const body = res.ok ? await res.json() : { people: [] };
				if (mine !== seq) return;
				results = body.people || [];
				searched = text.trim();
				active = Math.max(
					0,
					results.findIndex((p) => !exclude.includes(p.id))
				);
			} catch {
				if (mine === seq) results = [];
			} finally {
				if (mine === seq) loading = false;
			}
		}, 180);
	}

	function pick(p) {
		if (!p || exclude.includes(p.id)) return;
		picked = p;
		open = false;
		q = '';
		results = [];
	}

	function onkey(e) {
		if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) open = true;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			active = Math.min(results.length - 1, active + 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			active = Math.max(0, active - 1);
		} else if (e.key === 'Enter') {
			if (open && results[active]) {
				e.preventDefault();
				pick(results[active]);
			} else if (!picked) e.preventDefault();
		} else if (e.key === 'Escape') {
			open = false;
		}
	}
</script>

<div class="relative">
	<input type="hidden" {name} value={picked?.id || ''} />
	{#if picked}
		<div
			class="flex h-[46px] items-center gap-3 border bg-white pr-2 pl-1.5"
			style="border-color: var(--cc, var(--color-ink))"
		>
			<span
				class="flex h-[34px] w-[34px] shrink-0 items-center justify-center font-newsreader text-[13px] font-semibold text-white"
				style="background: var(--cc, var(--color-ink))"
				aria-hidden="true">{picked.initials}</span
			>
			<span class="min-w-0 flex-1 leading-tight">
				<span class="block truncate text-[14px] font-semibold">{picked.name}</span>
				<span class="block truncate text-[11px] text-fade"
					>{picked.email}{picked.gemId ? ` · GEM ${picked.gemId}` : ''}</span
				>
			</span>
			<button
				type="button"
				onclick={() => (picked = null)}
				class="flex h-8 w-8 shrink-0 items-center justify-center text-[18px] leading-none text-fade hover:text-ink"
				aria-label="Choose someone else">×</button
			>
		</div>
	{:else}
		<label for={uid} class="sr-only">{label}</label>
		<div
			class="flex h-[46px] items-center gap-2.5 border border-line2 bg-white px-3.5 transition-[border-color,box-shadow] focus-within:border-[var(--cc,var(--color-ink))] focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--cc,var(--color-ink))_18%,transparent)] hover:border-ink/40"
		>
			<svg
				viewBox="0 0 20 20"
				class="h-4 w-4 shrink-0 text-fade"
				fill="none"
				stroke="currentColor"
				stroke-width="1.8"
				aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4.5 4.5" /></svg
			>
			<input
				id={uid}
				type="search"
				autocomplete="off"
				role="combobox"
				aria-expanded={open && q.trim().length >= 2}
				aria-controls="{uid}-list"
				aria-activedescendant={open && results[active] ? `${uid}-${active}` : undefined}
				bind:value={q}
				oninput={() => {
					open = true;
					search(q);
				}}
				onfocus={() => (open = true)}
				onblur={() => setTimeout(() => (open = false), 150)}
				onkeydown={onkey}
				{placeholder}
				class="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-[14.5px] placeholder:text-fade focus:ring-0 focus:outline-none"
			/>
			{#if loading}<span
					class="h-3.5 w-3.5 shrink-0 animate-spin border-2 border-line2 border-t-ink"
					aria-hidden="true"
				></span>{/if}
		</div>

		{#if open && q.trim().length >= 2 && (results.length || (!loading && searched))}
			<ul
				id="{uid}-list"
				role="listbox"
				class="absolute top-[calc(100%+4px)] right-0 left-0 z-50 max-h-[320px] overflow-y-auto border border-line2 bg-white shadow-[0_20px_40px_-24px_rgb(23_21_15/0.5)]"
			>
				{#each results as p, i (p.id)}
					{@const taken = exclude.includes(p.id)}
					<!-- Keyboard picking is on the combobox input (arrows, Enter). -->
					<!-- svelte-ignore a11y_click_events_have_key_events -->
					<li
						id="{uid}-{i}"
						role="option"
						aria-selected={i === active}
						aria-disabled={taken}
						onmousedown={(e) => e.preventDefault()}
						onclick={() => pick(p)}
						onmouseenter={() => (active = i)}
						class="flex items-center gap-3 px-3 py-2.5 {taken
							? 'cursor-default opacity-50'
							: 'cursor-pointer'} {i === active && !taken ? 'bg-paper' : ''}"
					>
						<span
							class="flex h-[34px] w-[34px] shrink-0 items-center justify-center bg-ink font-newsreader text-[13px] font-semibold text-white"
							aria-hidden="true">{p.initials}</span
						>
						<span class="min-w-0 flex-1 leading-tight">
							<span class="block truncate text-[14px] font-semibold">{p.name}</span>
							<span class="block truncate text-[11px] text-fade"
								>{p.email}{p.gemId ? ` · GEM ${p.gemId}` : ''}</span
							>
						</span>
						{#if taken}<span
								class="shrink-0 text-[9px] font-extrabold tracking-[0.14em] text-fade uppercase"
								>{excludeNote}</span
							>{/if}
					</li>
				{:else}
					<li class="px-3.5 py-3 text-[13px] leading-snug text-soft">
						No AGE account matches “{searched}”. They need to
						<a href="/signup" target="_blank" class="font-semibold text-warm hover:underline"
							>sign up</a
						> first.
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</div>
