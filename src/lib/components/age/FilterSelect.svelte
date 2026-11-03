<script>
	/**
	 * Filter dropdown for the editorial filter bars (Library, Academy).
	 * The visible part is a small-caps label, the selected option's text
	 * (so the control is always exactly as wide as its value — no clipping)
	 * and one drawn chevron over a hairline. The real <select> sits on top,
	 * invisible, so clicks, keyboard and the phone's native picker all work.
	 */
	/** @type {{ label: string, value: string, options: { v: string, l: string }[], accent?: string, dark?: boolean }} */
	let {
		label,
		value = $bindable(),
		options,
		accent = 'focus-within:border-warm',
		dark = false
	} = $props();
	const current = $derived(options.find((o) => o.v === value)?.l ?? options[0]?.l ?? '');
</script>

<label class="group flex min-w-0 flex-col gap-1.5 md:flex-row md:items-baseline md:gap-2.5">
	<span
		class="text-[9.5px] font-extrabold tracking-[0.16em] whitespace-nowrap uppercase {dark
			? 'text-paper-bg/50'
			: 'text-fade'}">{label}</span
	>
	<span
		class="relative flex w-full items-center justify-between gap-2 border-b py-1.5 transition-colors md:inline-flex md:w-auto md:justify-start {dark
			? 'border-paper-bg/25 group-hover:border-paper-bg'
			: 'border-line2 group-hover:border-ink'} {accent}"
	>
		<span
			class="truncate text-[10.5px] font-extrabold tracking-[0.14em] whitespace-nowrap uppercase md:overflow-visible {dark
				? 'text-paper-bg'
				: 'text-ink'}">{current}</span
		>
		<svg
			class="h-[6px] w-[9px] shrink-0 transition-colors {dark
				? 'text-paper-bg/50 group-hover:text-paper-bg'
				: 'text-fade group-hover:text-ink'}"
			viewBox="0 0 10 6"
			fill="none"
			stroke="currentColor"
			stroke-width="1.5"
			stroke-linecap="square"
			aria-hidden="true"
		>
			<path d="M1 1l4 4 4-4" />
		</svg>
		<select
			bind:value
			aria-label={label}
			class="absolute inset-0 h-full w-full cursor-pointer appearance-none border-0 bg-none opacity-0"
		>
			{#each options as o (o.v)}
				<option value={o.v}>{o.l}</option>
			{/each}
		</select>
	</span>
</label>
