<script>
	/**
	 * Result of a form action, in the site's voice.
	 * @type {{ tone?: 'success'|'error'|'info', message: string }}
	 */
	let { tone = 'info', message } = $props();
	const T = {
		success: 'border-prem bg-prem/10 text-ink',
		error: 'border-hero-rb bg-hero-rb/5 text-hero-rb',
		info: 'border-line2 bg-paper text-ink'
	};
</script>

{#if message}
	<div
		class="mb-6 border-l-3 px-4 py-3 text-sm font-semibold {T[tone] || T.info}"
		role={tone === 'error' ? 'alert' : 'status'}
	>
		{message}
	</div>
{/if}
