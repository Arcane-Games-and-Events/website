<!--
  Avatar — a person's photo, or their initials on a soft grey (as in
  Contacts), so a list of people stays calm. Round in the app look, square
  in the editorial look.
  Props: name, src (photo url), size (xs 24 | sm 32 | md 40 | lg 48 | xl 64),
         class (layout only)
-->
<script>
	import { cx } from './utils.js';

	/** @type {{ name?: string | null, src?: string | null, size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl', class?: string }} */
	let { name = '', src = null, size = 'md', class: klass = '' } = $props();

	const SIZE = {
		xs: 'size-6 text-xs',
		sm: 'size-8 text-xs',
		md: 'size-10 text-sm',
		lg: 'size-12 text-base',
		xl: 'size-16 text-xl'
	};
	const initials = $derived(
		(name || '?')
			.replace(/@.*/, '')
			.split(/[\s._-]+/)
			.filter(Boolean)
			.slice(0, 2)
			.map((w) => w[0]?.toUpperCase() || '')
			.join('') || '?'
	);
	let broken = $state(false);
</script>

{#if src && !broken}
	<img
		{src}
		alt={name || ''}
		loading="lazy"
		onerror={() => (broken = true)}
		class={cx('shrink-0 rounded-pill object-cover ring-1 ring-border', SIZE[size], klass)}
	/>
{:else}
	<span
		class={cx(
			'inline-flex shrink-0 items-center justify-center rounded-pill bg-linear-to-b from-fg-subtle/60 to-fg-subtle font-semibold text-fg-on-accent select-none',
			SIZE[size],
			klass
		)}
		role="img"
		aria-label={name || 'Unknown'}>{initials}</span
	>
{/if}
