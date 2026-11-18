<!--
  StatusBanner — a thin bar across the top of every page while an incident
  or maintenance is on and asks for a banner (Admin → Status). Coloured by
  how bad it is, it links to /status. Closing it hides that one incident for
  the rest of the visit; a new one shows again. Never on /status itself.

  Props: banner ({ id, kind, title, impact } | null)
-->
<script>
	import { page } from '$app/state';
	import { IMPACT } from './words.js';

	/** @type {{ banner: { id: string, kind: string, title: string, impact: string } | null }} */
	let { banner } = $props();

	let closed = $state(/** @type {string | null} */ (null));
	$effect(() => {
		try {
			closed = sessionStorage.getItem('age:status-banner');
		} catch {
			/* storage blocked: the banner just stays */
		}
	});
	const close = () => {
		closed = banner?.id ?? null;
		try {
			if (closed) sessionStorage.setItem('age:status-banner', closed);
		} catch {
			/* ignore */
		}
	};
	const show = $derived(
		!!banner && closed !== banner.id && !page.url.pathname.startsWith('/status')
	);
	const tone = $derived(banner ? IMPACT[banner.impact]?.tone || 'var(--color-ink)' : '');
</script>

{#if show && banner}
	<div class="relative z-[60] text-white" style="background: {tone}" role="status">
		<div
			class="mx-auto flex w-full max-w-[1600px] items-center gap-3 px-4 py-2 text-[12.5px] md:px-10 lg:px-14"
		>
			<span class="shrink-0 text-[9.5px] font-extrabold tracking-[0.18em] uppercase opacity-85"
				>{banner.kind === 'maintenance' ? 'Maintenance' : 'Heads up'}</span
			>
			<a href="/status" class="min-w-0 flex-1 truncate font-semibold hover:underline"
				>{banner.title} <span class="font-normal opacity-85">· Status →</span></a
			>
			<button
				type="button"
				onclick={close}
				class="-mr-1 flex h-7 w-7 shrink-0 items-center justify-center text-[16px] leading-none opacity-80 hover:opacity-100"
				aria-label="Hide this notice">×</button
			>
		</div>
	</div>
{/if}
