<!--
  LibrarySearch — the Library's search box, on paper: a white field with the
  search mark and a blue Search button. A plain GET form, so a search has
  its own address.

  Props: action (where it goes), q (what's in it), placeholder, large,
  hidden (other filters to keep when searching)
-->
<script>
	/** @type {{ action?: string, q?: string, placeholder?: string, large?: boolean, hidden?: Record<string, string> }} */
	let {
		action = '/library/search',
		q = '',
		placeholder = 'Search articles, videos and matches',
		large = false,
		hidden = {}
	} = $props();
</script>

<form
	method="GET"
	{action}
	role="search"
	class="group flex items-center border bg-white transition-colors focus-within:border-warm focus-within:bg-white {large
		? 'border-ink/25 shadow-[0_10px_30px_-18px_rgb(30_64_175/0.45)]'
		: 'border-line2'}"
>
	{#each Object.entries(hidden) as [k, v] (k)}{#if v}<input
				type="hidden"
				name={k}
				value={v}
			/>{/if}{/each}
	<label class="flex min-w-0 flex-1 items-center gap-3 {large ? 'px-5' : 'px-4'}">
		<svg
			class="shrink-0 text-fade transition-colors group-focus-within:text-warm {large
				? 'h-5 w-5'
				: 'h-4 w-4'}"
			viewBox="0 0 20 20"
			fill="none"
			stroke="currentColor"
			stroke-width="1.8"
			aria-hidden="true"
		>
			<circle cx="8.5" cy="8.5" r="5.5" />
			<path d="M13 13l4.5 4.5" stroke-linecap="square" />
		</svg>
		<span class="sr-only">Search</span>
		<input
			type="search"
			name="q"
			value={q}
			{placeholder}
			autocomplete="off"
			class="w-full min-w-0 border-0 bg-transparent p-0 text-ink placeholder:text-fade focus:ring-0 focus:outline-none {large
				? 'py-[18px] text-[17px] md:text-[19px]'
				: 'py-3 text-[15px]'}"
		/>
	</label>
	<button
		type="submit"
		class="m-1.5 shrink-0 bg-warm font-bold text-white transition-colors hover:bg-ink {large
			? 'px-5 py-3 text-[13px] md:px-7'
			: 'px-4 py-2 text-[12px]'}">Search</button
	>
</form>
