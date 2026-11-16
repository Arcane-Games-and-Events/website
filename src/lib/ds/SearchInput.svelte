<!--
  SearchInput — a search box with the magnifier, a clear button once
  something's typed, and an optional spinner while results load.
  Props: value (bindable), placeholder, loading, size, class (layout only)
-->
<script>
	import Icon from './Icon.svelte';
	import Spinner from './Spinner.svelte';
	import { control } from './fields.js';

	/** @type {{ value?: string, placeholder?: string, loading?: boolean, size?: 'sm' | 'md' | 'lg', class?: string, [key: string]: any }} */
	let {
		value = $bindable(''),
		placeholder = 'Search',
		loading = false,
		size = 'md',
		class: klass = '',
		...rest
	} = $props();
</script>

<div class="relative {klass}" role="search">
	<span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-fg-subtle"
		><Icon name="search" size={16} /></span
	>
	<input
		{...rest}
		type="text"
		inputmode="search"
		enterkeyhint="search"
		bind:value
		{placeholder}
		aria-label={rest['aria-label'] || placeholder}
		class="{control(size)} pr-9 pl-9"
	/>
	<span class="absolute inset-y-0 right-0 flex items-center pr-2 text-fg-subtle">
		{#if loading}
			<span class="px-1"><Spinner size={16} label="Searching" /></span>
		{:else if value}
			<button
				type="button"
				onclick={() => (value = '')}
				class="rounded-control p-1 hover:bg-surface-sunken hover:text-fg"
				aria-label="Clear search"><Icon name="close" size={16} /></button
			>
		{/if}
	</span>
</div>
