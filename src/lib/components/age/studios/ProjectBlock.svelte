<!--
  ProjectBlock — a project on AGE Studios, printed as a flat block in its
  kind's colour with a halftone screen: the cover set into the block like a
  poster, then the kind, the title and a line about it. A rubber "New"
  stamp for the first weeks, Premium in the corner, ↗ when it lives on
  another site. On hover the block lifts off its plate.

  `lead` is the big version that opens the page: picture and words side by
  side on wide screens.

  Props: project (a publicProjects() card), lead, eager
-->
<script>
	import Picture from '$lib/components/media/Picture.svelte';
	import PremiumTag from '$lib/components/age/PremiumTag.svelte';
	import { PROJECT_TYPE } from '$lib/studio/projects.js';

	/** @type {{ project: any, lead?: boolean, eager?: boolean }} */
	let { project: p, lead = false, eager = false } = $props();
	const t = $derived(PROJECT_TYPE[p.type] ?? PROJECT_TYPE.feature);
	const fresh = $derived(
		!!p.publishedAt && Date.now() - new Date(p.publishedAt).getTime() < 21 * 86400000
	);
</script>

<a
	href={p.href}
	target={p.external ? '_blank' : undefined}
	rel={p.external ? 'noopener' : undefined}
	class="group block h-full"
>
	<div
		class="st-lift flex h-full flex-col {t.block} {lead ? 'md:grid md:grid-cols-[1.35fr_1fr]' : ''}"
		style="--plate: {t.plate}"
	>
		<span class="st-dots pointer-events-none absolute inset-0" aria-hidden="true"></span>
		<span class="relative block {lead ? 'p-3 md:p-4' : 'p-2.5'}">
			<span class="relative block aspect-video overflow-hidden bg-ink/20">
				{#if p.cover}
					<Picture
						image={p.cover}
						alt=""
						sizes={lead ? '(min-width: 768px) 680px, 100vw' : '(min-width: 1024px) 380px, 100vw'}
						loading={eager ? 'eager' : 'lazy'}
						class="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
					/>
				{:else}
					<span
						class="st-wide absolute inset-0 flex items-center justify-center p-4 text-center text-[22px] leading-none font-black uppercase opacity-80"
						>{t.label}</span
					>
				{/if}
				{#if p.isPremium}<PremiumTag variant="corner" size="sm" />{/if}
			</span>
			{#if fresh}
				<span
					class="st-stamp absolute -top-1 right-3 bg-paper-bg px-2 py-0.5 text-[9.5px] font-black tracking-[0.18em] text-studio uppercase md:right-5"
					>New</span
				>
			{/if}
		</span>
		<span
			class="relative flex flex-1 flex-col {lead
				? 'px-5 pt-2 pb-6 md:justify-end md:px-7 md:py-8'
				: 'px-4 pt-1.5 pb-5'}"
		>
			<span
				class="flex items-center gap-2 text-[9.5px] font-extrabold tracking-[0.22em] uppercase opacity-85"
			>
				<span class="text-[8px]" aria-hidden="true">◆</span>{t.label}{#if p.external}<span
						class="ml-auto text-[12px] tracking-normal"
						aria-label="On another site">↗</span
					>{/if}
			</span>
			<span
				class="mt-2 block font-newsreader font-semibold tracking-[-0.015em] [text-wrap:balance] {lead
					? 'text-[30px] leading-[1.02] md:text-[44px]'
					: 'text-[23px] leading-[1.08]'}">{p.title}</span
			>
			{#if p.dek}
				<span
					class="mt-2 block font-newsreader italic opacity-85 {lead
						? 'text-[17px] leading-snug md:text-[19px]'
						: 'line-clamp-2 text-[15px] leading-snug'}">{p.dek}</span
				>
			{/if}
			{#if lead}
				<span
					class="mt-5 inline-flex w-fit items-center gap-2 border-[1.5px] border-current px-4 py-2.5 text-[10px] font-extrabold tracking-[0.18em] uppercase transition-[gap] group-hover:gap-3"
					>Open it <span aria-hidden="true">{p.external ? '↗' : '→'}</span></span
				>
			{/if}
		</span>
	</div>
</a>
