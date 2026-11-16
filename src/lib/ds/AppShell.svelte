<!--
  AppShell — the frame for a working tool (the admin, the Desk…): a side
  menu from desktop up, and on phones a top bar whose menu button opens the
  same menu in a Sheet. Each group can have a heading; each item an icon
  and a count.

  Props:
    label     the tool's name beside the wordmark ("Admin")
    nav       [{ heading?, items: [{ label, href, icon, count?, active? }] }]
    actions   snippet — top-right of the page bar (search, account)
    contained true to draw it inside a box (a preview) instead of
              filling the screen
    children  the page
-->
<script>
	import Icon from './Icon.svelte';
	import IconButton from './IconButton.svelte';
	import Sheet from './Sheet.svelte';
	import Wordmark from './Wordmark.svelte';
	import { cx, focusRing } from './utils.js';

	/** @type {{ label?: string, nav: { heading?: string, items: { label: string, href: string, icon: string, count?: number, active?: boolean }[] }[], actions?: import('svelte').Snippet, contained?: boolean, children: import('svelte').Snippet }} */
	let { label = 'Admin', nav, actions, contained = false, children } = $props();

	let menuOpen = $state(false);
	const current = $derived(nav.flatMap((g) => g.items).find((i) => i.active));
</script>

{#snippet menu()}
	<nav class="flex flex-col gap-6" aria-label="{label} sections">
		{#each nav as group, g (group.heading ?? g)}
			<div>
				{#if group.heading}
					<p class="mb-1 px-3 text-xs font-medium text-fg-subtle">{group.heading}</p>
				{/if}
				<ul class="flex flex-col gap-0.5">
					{#each group.items as item (item.href)}
						<li>
							<a
								href={item.href}
								aria-current={item.active ? 'page' : undefined}
								onclick={() => (menuOpen = false)}
								class={cx(
									'flex h-9 items-center gap-3 rounded-control px-3 text-sm font-medium transition-colors duration-150 ease-out',
									focusRing,
									item.active
										? 'bg-accent-soft text-accent-text'
										: 'text-fg-muted hover:bg-surface-sunken hover:text-fg'
								)}
							>
								<Icon name={item.icon} size={16} />
								<span class="min-w-0 flex-1 truncate">{item.label}</span>
								{#if item.count}
									<span
										class="rounded-pill bg-danger px-1.5 py-0.5 text-xs font-medium text-fg-on-accent tabular-nums"
										>{item.count > 99 ? '99+' : item.count}</span
									>
								{/if}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</nav>
{/snippet}

<div
	class={cx(
		'bg-canvas text-fg lg:grid lg:grid-cols-4 xl:grid-cols-5',
		contained ? 'overflow-hidden rounded-card border border-border' : 'min-h-screen'
	)}
>
	<!-- desktop: the side menu -->
	<aside
		class={cx(
			'hidden border-r border-border bg-surface px-3 py-5 lg:block',
			!contained && 'sticky top-0 h-screen overflow-y-auto'
		)}
	>
		<div class="px-3 pb-6"><Wordmark {label} /></div>
		{@render menu()}
	</aside>

	<div class="min-w-0 lg:col-span-3 xl:col-span-4">
		<!-- the page bar: on phones it carries the menu button -->
		<div
			class={cx(
				'flex h-14 items-center gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur sm:px-6',
				!contained && 'sticky top-0 z-30'
			)}
		>
			<IconButton icon="more" label="Menu" class="lg:hidden" onclick={() => (menuOpen = true)} />
			<span class="lg:hidden"><Wordmark {label} /></span>
			<p class="hidden text-sm font-medium text-fg-muted lg:block">{current?.label ?? ''}</p>
			<div class="ml-auto flex items-center gap-2">{@render actions?.()}</div>
		</div>
		<main class="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{@render children()}</main>
	</div>
</div>

<Sheet bind:open={menuOpen} title={label} side="left">
	{@render menu()}
</Sheet>
