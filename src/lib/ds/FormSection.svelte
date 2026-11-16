<!--
  FormSection — one group of a form: its title and a sentence on the left
  (on top on phones), the fields on the right. Stack them for long forms;
  put the save buttons in the last one's footer or a sticky bar.
  Props: title, description, class, children (the fields)
-->
<script>
	import { cx } from './utils.js';
	/** @type {{ title: string, description?: string, class?: string, children: import('svelte').Snippet }} */
	let { title, description = '', class: klass = '', children } = $props();
</script>

<section
	class={cx(
		'grid gap-x-8 gap-y-4 border-b border-border py-8 first:pt-0 last:border-b-0 md:grid-cols-3',
		klass
	)}
>
	<div>
		<h2 class="text-base font-semibold text-fg">{title}</h2>
		{#if description}<p class="mt-1 text-sm text-fg-muted">{description}</p>{/if}
	</div>
	<div class="flex flex-col gap-5 md:col-span-2">{@render children()}</div>
</section>
