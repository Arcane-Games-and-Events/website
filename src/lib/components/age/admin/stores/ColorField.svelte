<!--
  ColorField — a colour picker with a live strip showing it as it appears
  on event cards. Its own component so changing the colour doesn't
  re-render (and reset) the rest of the form.

  Props: id, name, value (#rrggbb), label (the text on the strip)
-->
<script>
	import { untrack } from 'svelte';

	/** @type {{ id: string, name: string, value?: string, label?: string }} */
	let { id, name, value = '#5c5a52', label = 'Circuit' } = $props();

	let color = $state(untrack(() => value));
</script>

<div class="flex items-center gap-3">
	<input
		{id}
		{name}
		type="color"
		bind:value={color}
		class="h-10 w-13 shrink-0 cursor-pointer border border-line2 bg-paper p-1"
	/>
	<div
		class="min-w-0 flex-1 border border-t-3 border-line2 bg-white px-3 py-2"
		style="border-top-color: {color}"
	>
		<p class="truncate text-xs font-extrabold tracking-widest uppercase" style="color: {color}">
			AGE Open · {label}
		</p>
	</div>
</div>
