<!--
  StatsTableRenderView — public rendering of a stats_table node in the
  editorial paper-and-ink aesthetic.
-->
<script>
	export let node = {};
	$: caption = node?.caption || '';
	$: columns = node?.columns || [];
	$: rows = node?.rows || [];
</script>

{#if columns.length > 0 && rows.length > 0}
	<figure class="my-8 overflow-x-auto rounded-md border border-line2 bg-paper">
		<table class="w-full text-sm">
			<thead class="border-b border-line2 bg-paper-bg text-left text-[11px] tracking-wider text-ink/60 uppercase font-mono-system">
				<tr>
					{#each columns as col}
						<th class="px-4 py-3 font-medium">{col}</th>
					{/each}
				</tr>
			</thead>
			<tbody class="divide-y divide-line2 text-ink">
				{#each rows as row}
					<tr class="hover:bg-paper-bg/60">
						{#each columns as _, i}
							<td class="px-4 py-2.5 tabular-nums">{row[i] ?? ''}</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
		{#if caption}
			<figcaption class="border-t border-line2 px-4 py-2 text-xs text-ink/60">
				{caption}
			</figcaption>
		{/if}
	</figure>
{/if}
