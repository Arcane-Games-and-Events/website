<!--
  LibraryFilters — the filters inside the Articles and Videos sections, on
  ink: Access (All, Free, Premium) as a segmented switch, Topic and Sort as
  dropdowns, Clear, and a line saying what's showing. Every change goes to
  a new address (back to page 1), so a filtered view can be shared.

  Props: filters ({ q, access, tag, sort }), topics, total, noun ([one, many]), path
-->
<script>
	import { goto } from '$app/navigation';
	import FilterSelect from '$lib/components/age/FilterSelect.svelte';
	import { filterHref } from './filterHref.js';

	/** @type {{ filters: any, topics: { name: string, slug: string, count: number }[], total: number, noun: [string, string], path: string }} */
	let { filters: f, topics, total, noun, path } = $props();

	const go = (over) => goto(filterHref(path, f, over), { noScroll: true, keepFocus: true });

	const ACCESS = [
		{ v: '', l: 'All' },
		{ v: 'free', l: 'Free' },
		{ v: 'premium', l: 'Premium' }
	];
	const filtered = $derived(!!(f.q || f.access || f.tag));
	const topicName = $derived(topics.find((t) => t.slug === f.tag)?.name);
	const line = $derived(
		total === 0
			? 'Nothing here matches that.'
			: `${total} ${total === 1 ? noun[0] : noun[1]}${f.q ? ` for “${f.q}”` : ''}${topicName ? ` in ${topicName}` : ''}${f.access ? ` · ${f.access === 'premium' ? 'Premium' : 'free to read'}` : ''}`
	);
</script>

<div class="flex flex-col gap-5 md:flex-row md:flex-wrap md:items-center md:gap-x-8">
	<div
		class="inline-flex w-full border border-line2 p-1 md:w-auto"
		role="group"
		aria-label="Access"
	>
		{#each ACCESS as o (o.v)}
			{@const on = f.access === o.v}
			<button
				type="button"
				onclick={() => go({ access: o.v })}
				aria-pressed={on}
				class="flex-1 px-4 py-2 text-[13px] font-semibold transition-colors md:flex-none {on
					? o.v === 'premium'
						? 'bg-prem text-white'
						: 'bg-ink text-paper-bg'
					: 'text-soft hover:text-ink'}">{o.l}</button
			>
		{/each}
	</div>
	<div
		class="grid grid-cols-2 items-end gap-x-5 gap-y-4 md:ml-auto md:flex md:items-center md:gap-7"
		onchange={(e) => {
			const t = /** @type {HTMLSelectElement} */ (e.target);
			const field = { Topic: 'tag', Sort: 'sort' }[t.getAttribute('aria-label') ?? ''];
			if (field) go({ [field]: t.value });
		}}
	>
		{#if topics.length}
			<FilterSelect
				label="Topic"
				value={f.tag}
				options={[{ v: '', l: 'Every topic' }, ...topics.map((t) => ({ v: t.slug, l: t.name }))]}
			/>
		{/if}
		<FilterSelect
			label="Sort"
			value={f.sort}
			options={[
				{ v: 'newest', l: 'Newest' },
				{ v: 'oldest', l: 'Oldest' }
			]}
		/>
		{#if filtered}
			<a
				href={path}
				class="col-span-2 justify-self-start text-[13px] font-semibold text-warm hover:text-ink md:col-span-1"
				>Clear filters</a
			>
		{/if}
	</div>
</div>
<p class="mt-5 text-[14px] text-fade" aria-live="polite">{line}</p>
