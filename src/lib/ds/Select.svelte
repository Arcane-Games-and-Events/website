<!--
  Select — pick one from a list. Pass `options` ([{ value, label }] or
  plain strings) or write <option>s as children.
  Props: value (bindable), options, placeholder (a first empty choice),
         size, invalid, class (layout only)
-->
<script>
	import { cx } from './utils.js';
	import { control } from './fields.js';

	/** @type {{ value?: any, options?: (string | { value: any, label: string, disabled?: boolean })[], placeholder?: string, size?: 'sm' | 'md' | 'lg', invalid?: boolean, class?: string, children?: import('svelte').Snippet, [key: string]: any }} */
	let {
		value = $bindable(''),
		options = [],
		placeholder = '',
		size = 'md',
		invalid = false,
		class: klass = '',
		children,
		...rest
	} = $props();

	const opts = $derived(options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o)));
</script>

<select
	{...rest}
	bind:value
	aria-invalid={invalid || undefined}
	class={cx(control(size, invalid), 'py-0 pr-9', klass)}
>
	{#if placeholder}<option value="">{placeholder}</option>{/if}
	{#each opts as o (o.value)}
		<option value={o.value} disabled={o.disabled}>{o.label}</option>
	{/each}
	{@render children?.()}
</select>
