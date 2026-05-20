<!--
  StatsTableRenderView — public rendering of a stats_table node.
-->
<script>
	export let node = {};
	$: caption = node?.caption || '';
	$: columns = node?.columns || [];
	$: rows = node?.rows || [];
</script>

{#if columns.length > 0 && rows.length > 0}
	<figure class="my-8 overflow-x-auto rounded-lg border border-gray-800 bg-gray-900/60">
		<table class="w-full text-sm">
			<thead class="border-b border-gray-800 bg-gray-900/80 text-left text-xs tracking-wider text-gray-400 uppercase">
				<tr>
					{#each columns as col}
						<th class="px-4 py-3 font-medium">{col}</th>
					{/each}
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-800 text-gray-200">
				{#each rows as row}
					<tr class="hover:bg-gray-800/30">
						{#each columns as _, i}
							<td class="px-4 py-2.5 tabular-nums">{row[i] ?? ''}</td>
						{/each}
					</tr>
				{/each}
			</tbody>
		</table>
		{#if caption}
			<figcaption class="border-t border-gray-800 px-4 py-2 text-xs text-gray-500">
				{caption}
			</figcaption>
		{/if}
	</figure>
{/if}
