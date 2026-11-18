<!--
  UptimeBars — one part of the site's last N days as a row of bars, a day
  each (Pacific): green when every check passed, gold for some failures,
  red for many, grey with no checks. Hover or focus a bar for the day.

  Props: bars ({ day, total, ok }[]), days (how many to show, from the end)
-->
<script>
	import { barTone } from './words.js';

	/** @type {{ bars: { day: string, total: number, ok: number }[], days?: number }} */
	let { bars, days = 90 } = $props();

	const shown = $derived(bars.slice(-days));
	const label = (b) => {
		const d = new Date(`${b.day}T12:00:00Z`).toLocaleDateString('en-US', {
			timeZone: 'UTC',
			month: 'short',
			day: 'numeric'
		});
		if (!b.total) return `${d}: no checks`;
		const failed = b.total - b.ok;
		return failed
			? `${d}: ${failed} of ${b.total} checks failed`
			: `${d}: all ${b.total} checks passed`;
	};
</script>

<div
	class="flex h-[30px] items-stretch gap-[2px]"
	role="list"
	aria-label="Last {shown.length} days"
>
	{#each shown as b (b.day)}
		<span
			role="listitem"
			tabindex="-1"
			title={label(b)}
			aria-label={label(b)}
			class="min-w-[2px] flex-1 transition-opacity hover:opacity-70"
			style="background: {barTone(b)}"
		></span>
	{/each}
</div>
