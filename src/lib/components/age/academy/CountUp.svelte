<!--
  CountUp — a number that runs to its new value when it changes, for the
  partner calculator. Screen readers get only the final value; with
  reduced motion it changes at once.

  Props: value, format (number → text)
-->
<script>
	import { Tween, prefersReducedMotion } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	/** @type {{ value: number, format: (n: number) => string }} */
	let { value, format } = $props();

	const shown = Tween.of(() => value, {
		duration: () => (prefersReducedMotion.current ? 0 : 450),
		easing: cubicOut
	});
</script>

<span aria-hidden="true">{format(shown.current)}</span><span class="sr-only">{format(value)}</span>
