<!--
  PageHeader — the top of an app page: breadcrumbs (on pages further down),
  the title, one plain sentence about the page, and its buttons (the main
  action last). On phones the buttons wrap under the title.

  Props: title, description, breadcrumbs ([{ href?, label }]), leading
         (snippet: an Avatar or icon tile before the title), meta (snippet:
         badges under the title), actions (snippet), class
-->
<script>
	import Breadcrumbs from './Breadcrumbs.svelte';
	import { cx } from './utils.js';

	/** @type {{ title: string, description?: string, breadcrumbs?: { href?: string, label: string }[], leading?: import('svelte').Snippet, meta?: import('svelte').Snippet, actions?: import('svelte').Snippet, class?: string }} */
	let {
		title,
		description = '',
		breadcrumbs = [],
		leading,
		meta,
		actions,
		class: klass = ''
	} = $props();
</script>

<header class={cx('flex flex-col gap-4', klass)}>
	{#if breadcrumbs.length}<Breadcrumbs items={breadcrumbs} />{/if}
	<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
		<div class="flex min-w-0 items-start gap-4">
			{#if leading}<span class="shrink-0">{@render leading()}</span>{/if}
			<div class="min-w-0">
				<h1 class="text-2xl font-semibold tracking-tight text-balance text-fg">{title}</h1>
				{#if description}<p class="mt-1 max-w-2xl text-sm text-fg-muted">{description}</p>{/if}
				{#if meta}<div class="mt-3 flex flex-wrap items-center gap-2">{@render meta()}</div>{/if}
			</div>
		</div>
		{#if actions}<div class="flex shrink-0 flex-wrap items-center gap-2">
				{@render actions()}
			</div>{/if}
	</div>
</header>
