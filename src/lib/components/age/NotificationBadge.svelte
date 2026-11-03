<!--
  NotificationBadge — the familiar red count for things that are new for
  you (unread notifications), as phones and most sites show it: a red
  circle with a white number, "99+" past that, with a thin ring so it
  stands off whatever it sits on.

  It fades in when there's something new and fades out when it's cleared.
  When the number changes it rolls like a counter: going up, the old number
  is pushed up and out as the new one comes up from below (going down, the
  other way). Nothing moves when a page first loads with it already there,
  or for people who've asked their device for less motion.

  The only round thing on the site, on purpose: a square badge doesn't read
  as "notifications".

  Props: count, max (default 99), ring (the ring colour class, to match
  what's behind it), tone (the fill; red unless a page's branding calls for
  a quieter one), label (accessible text), class (placement).
-->
<script>
	import { untrack } from 'svelte';
	import { cubicOut } from 'svelte/easing';
	import { fade } from 'svelte/transition';

	/** @type {{ count: number, max?: number, ring?: string, tone?: string, label?: string, class?: string }} */
	let {
		count,
		max = 99,
		ring = 'ring-paper-bg',
		tone = 'bg-alert',
		label = '',
		class: cls = ''
	} = $props();

	const text = $derived(count > max ? `${max}+` : String(count));

	const still = () =>
		typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

	/** Which way the numbers roll: 1 (up) when the count grows, -1 when it shrinks. */
	let dir = $state(1);
	let last = untrack(() => count);
	// Before the new number is drawn, so both numbers roll the same way.
	$effect.pre(() => {
		const now = count;
		if (now !== last) dir = now > last ? 1 : -1;
		last = now;
	});

	const ROLL_MS = 260;
	/** The new number comes in from below (or above, going down). */
	function rollIn() {
		return {
			duration: still() ? 0 : ROLL_MS,
			easing: cubicOut,
			css: (/** @type {number} */ t, /** @type {number} */ u) =>
				`transform: translateY(${u * dir * 110}%); opacity: ${t}`
		};
	}
	/** The old number is pushed out the top (or bottom, going down). */
	function rollOut() {
		return {
			duration: still() ? 0 : ROLL_MS,
			easing: cubicOut,
			css: (/** @type {number} */ t, /** @type {number} */ u) =>
				`transform: translateY(${-u * dir * 110}%); opacity: ${t}`
		};
	}
	const fadeMs = () => (still() ? 0 : 200);
</script>

{#if count > 0}
	<span
		in:fade={{ duration: fadeMs() }}
		out:fade={{ duration: fadeMs() }}
		class="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full {tone} px-[5px] font-libre text-[10.5px] leading-none font-bold tracking-normal text-white tabular-nums ring-2 {ring} {cls}"
		role="status"
		aria-label={label || `${count} new`}
	>
		<span class="grid overflow-hidden" aria-hidden="true">
			{#key text}
				<span in:rollIn out:rollOut class="col-start-1 row-start-1 text-center">{text}</span>
			{/key}
		</span>
	</span>
{/if}
