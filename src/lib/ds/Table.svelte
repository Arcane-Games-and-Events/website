<!--
  Table — rows of data with the same fields: payouts, ledgers, results.
  Wide tables scroll sideways inside their card on phones, with the first
  column held in place. For lists of people or things you open, use List.

  Props:
    columns  [{ key, label, align?: 'left' | 'right', class? }]
    rows     the data
    cell     snippet(row, column) — what goes in a cell (default: row[key])
    empty    text when there are no rows
    caption  an accessible caption (visually hidden)
-->
<script>
	import { cx } from './utils.js';

	/** @type {{ columns: { key: string, label: string, align?: 'left' | 'right', class?: string }[], rows: any[], cell?: import('svelte').Snippet<[any, any]>, rowKey?: (row: any, i: number) => any, empty?: string, caption?: string, class?: string }} */
	let {
		columns,
		rows,
		cell,
		rowKey = (r, i) => r.id ?? i,
		empty = 'Nothing here yet.',
		caption = '',
		class: klass = ''
	} = $props();
</script>

<div
	class={cx('overflow-x-auto rounded-card border border-border bg-surface shadow-raised', klass)}
>
	<table class="w-full min-w-max border-collapse text-sm">
		{#if caption}<caption class="sr-only">{caption}</caption>{/if}
		<thead>
			<tr class="border-b border-border bg-surface-sunken">
				{#each columns as c, i (c.key)}
					<th
						scope="col"
						class={cx(
							'px-4 py-2.5 text-xs font-medium text-fg-muted',
							c.align === 'right' ? 'text-right' : 'text-left',
							i === 0 && 'sticky left-0 bg-surface-sunken',
							c.class
						)}>{c.label}</th
					>
				{/each}
			</tr>
		</thead>
		<tbody class="divide-y divide-border">
			{#each rows as row, r (rowKey(row, r))}
				<tr class="hover:bg-surface-sunken">
					{#each columns as c, i (c.key)}
						<td
							class={cx(
								'px-4 py-3 text-fg',
								c.align === 'right' ? 'text-right tabular-nums' : 'text-left',
								i === 0 && 'sticky left-0 bg-surface font-medium',
								c.class
							)}
						>
							{#if cell}{@render cell(row, c)}{:else}{row[c.key] ?? '—'}{/if}
						</td>
					{/each}
				</tr>
			{:else}
				<tr
					><td colspan={columns.length} class="px-4 py-10 text-center text-fg-subtle">{empty}</td
					></tr
				>
			{/each}
		</tbody>
	</table>
</div>
