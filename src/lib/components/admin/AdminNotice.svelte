<script>
	/**
	 * Admin success / error banner shown after a form action. The section
	 * spans the admin content width; `pad` sets its vertical spacing.
	 *
	 * @type {{ tone: 'success' | 'error', message: string, pad?: string }}
	 */
	let { tone, message, pad = 'pb-[12px]' } = $props();
</script>

<section class="mx-auto w-full max-w-[1600px] overflow-x-clip px-4 {pad} md:px-10 lg:px-14">
	<div
		class="border-[1.5px] border-ink p-4 text-white {tone === 'success' ? 'bg-prem' : 'bg-warm'}"
	>
		<span
			class="font-mono-system text-[10px] font-extrabold tracking-[0.16em] uppercase"
			style="color: {tone === 'success' ? '#d6eedf' : 'rgba(255,255,255,0.75)'};"
			>{tone === 'success' ? 'Success' : 'Error'}</span
		>
		<p class="mt-[2px] font-newsreader text-[16px] font-semibold">{message}</p>
	</div>
</section>
