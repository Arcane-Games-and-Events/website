<!--
  NavProgress — a light-blue bar across the top of the window while a
  page loads, filling the header's 5px blue top stripe. Waits 120ms
  before showing so quick navigations never flash it, creeps toward 90%
  while loading, then fills and fades out when the page arrives.
  Rendered once, in the root layout.
-->
<script>
	import { navigating } from '$app/stores';

	let visible = $state(false);
	let progress = $state(0);
	let finishing = $state(false);

	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let startTimer;
	/** @type {ReturnType<typeof setInterval> | undefined} */
	let trickle;
	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let doneTimer;
	let loading = false;

	function start() {
		clearTimeout(doneTimer);
		finishing = false;
		startTimer = setTimeout(() => {
			visible = true;
			progress = 0.12;
			trickle = setInterval(() => (progress += (0.9 - progress) * 0.12), 250);
		}, 120);
	}

	function finish() {
		clearTimeout(startTimer);
		clearInterval(trickle);
		if (!visible) return;
		progress = 1;
		finishing = true;
		doneTimer = setTimeout(() => {
			visible = false;
			finishing = false;
			progress = 0;
		}, 450);
	}

	$effect(() => {
		const busy = !!$navigating;
		if (busy && !loading) start();
		else if (!busy && loading) finish();
		loading = busy;
	});

	$effect(() => () => {
		clearTimeout(startTimer);
		clearInterval(trickle);
		clearTimeout(doneTimer);
	});
</script>

{#if visible}
	<div class="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-[5px]" aria-hidden="true">
		<div
			class="h-full origin-left bg-warm-light shadow-[0_0_10px_rgba(96,165,250,0.75)]"
			style="transform: scaleX({progress}); opacity: {finishing
				? 0
				: 1}; transition: transform {finishing
				? 200
				: 300}ms ease-out, opacity 250ms ease {finishing ? 180 : 0}ms;"
		></div>
	</div>
{/if}
