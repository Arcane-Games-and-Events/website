<script>
	/**
	 * A discussion author's square: their profile photo when they have one,
	 * otherwise their initials. The teacher wears gold; everyone else gets one
	 * of the site's tones, picked from their name so the same person always
	 * looks the same.
	 */
	/** @type {{ name: string, photo?: string | null, teacher?: boolean, size?: number }} */
	let { name, photo = null, teacher = false, size = 36 } = $props();

	const TONES = [
		'bg-academy text-paper-bg',
		'bg-warm text-white',
		'bg-ink text-paper-bg',
		'bg-prem text-white',
		'bg-[#7a4a2a] text-white'
	];
	const initials = $derived(
		String(name || '?')
			.split(/\s+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((w) => w[0].toUpperCase())
			.join('') || '?'
	);
	const tone = $derived.by(() => {
		if (teacher) return 'bg-gold text-[#241b07]';
		let h = 0;
		for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) | 0;
		return TONES[Math.abs(h) % TONES.length];
	});
</script>

{#if photo}
	<img
		src={photo}
		alt=""
		aria-hidden="true"
		loading="lazy"
		width={size}
		height={size}
		class="shrink-0 bg-panel object-cover {teacher
			? 'ring-2 ring-gold ring-offset-1 ring-offset-paper-bg'
			: ''}"
		style="width:{size}px;height:{size}px"
	/>
{:else}
	<span
		aria-hidden="true"
		class="inline-flex shrink-0 items-center justify-center font-jost font-semibold {tone}"
		style="width:{size}px;height:{size}px;font-size:{Math.round(size * 0.38)}px">{initials}</span
	>
{/if}
