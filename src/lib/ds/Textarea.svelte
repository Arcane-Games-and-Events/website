<!--
  Textarea — several lines of text.
  Props: value (bindable), rows (default 4), invalid, class (layout only)
-->
<script>
	import { cx } from './utils.js';
	import { control } from './fields.js';

	/** @type {{ value?: string, rows?: number, invalid?: boolean, class?: string, [key: string]: any }} */
	let { value = $bindable(''), rows = 4, invalid = false, class: klass = '', ...rest } = $props();
</script>

<textarea
	{...rest}
	{rows}
	bind:value
	aria-invalid={invalid || undefined}
	class={cx(control('md', invalid), 'h-auto py-2 leading-6', klass)}
></textarea>
