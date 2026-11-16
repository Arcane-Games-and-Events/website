<!--
  Input — a one-line text field. Bind its value; everything else (type,
  name, placeholder, required…) goes to the input.
  Props: value (bindable), size (sm | md | lg), invalid, icon (inside, on
         the left), class (layout only)
-->
<script>
	import Icon from './Icon.svelte';
	import { control } from './fields.js';

	/** @type {{ value?: any, size?: 'sm' | 'md' | 'lg', invalid?: boolean, icon?: string, class?: string, [key: string]: any }} */
	let {
		value = $bindable(''),
		size = 'md',
		invalid = false,
		icon = '',
		class: klass = '',
		...rest
	} = $props();
</script>

{#if icon}
	<div class="relative {klass}">
		<span
			class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-fg-subtle"
			><Icon name={icon} size={16} /></span
		>
		<input
			{...rest}
			bind:value
			aria-invalid={invalid || undefined}
			class="{control(size, invalid)} pl-9"
		/>
	</div>
{:else}
	<input
		{...rest}
		bind:value
		aria-invalid={invalid || undefined}
		class="{control(size, invalid)} {klass}"
	/>
{/if}
