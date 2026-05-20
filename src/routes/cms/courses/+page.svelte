<script>
	export let data;

	$: courses = data.courses || [];

	async function createNew() {
		const res = await fetch('/api/cms/courses', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ title: 'Untitled course' })
		});
		if (!res.ok) {
			alert('Failed to create course');
			return;
		}
		const { course } = await res.json();
		window.location.href = `/cms/courses/${course.id}`;
	}

	function statusBadge(s) {
		const map = {
			draft: 'bg-gray-500/20 text-gray-300',
			published: 'bg-emerald-500/20 text-emerald-400',
			archived: 'bg-amber-500/20 text-amber-400'
		};
		return map[s] || 'bg-gray-500/20 text-gray-300';
	}

	function fmtDate(d) {
		if (!d) return '—';
		return new Date(d).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function fmtPrice(p) {
		if (p == null) return '—';
		return `$${Number(p).toFixed(2)}`;
	}
</script>

<svelte:head>
	<title>Courses - CMS</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
	<div class="mb-6 flex flex-wrap items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-bold text-white">Courses</h1>
			<p class="mt-1 text-sm text-gray-400">
				Text + video courses. Each course has modules and lessons.
			</p>
		</div>
		<button
			on:click={createNew}
			class="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-500"
		>
			+ New Course
		</button>
	</div>

	<div class="mb-4 flex flex-wrap items-center gap-2 text-sm">
		<a
			href="/cms/courses"
			class="rounded-full px-3 py-1 {!data.statusFilter ? 'bg-purple-500/20 text-purple-300' : 'text-gray-400 hover:text-white'}">All</a
		>
		{#each ['draft', 'published', 'archived'] as s}
			<a
				href="/cms/courses?status={s}"
				class="rounded-full px-3 py-1 capitalize {data.statusFilter === s
					? 'bg-purple-500/20 text-purple-300'
					: 'text-gray-400 hover:text-white'}">{s}</a
			>
		{/each}
	</div>

	<div class="overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
		{#if courses.length === 0}
			<div class="px-6 py-12 text-center text-gray-400">
				<p>No courses yet.</p>
				<button
					on:click={createNew}
					class="mt-3 text-sm font-medium text-purple-400 hover:text-purple-300"
				>
					Create your first course
				</button>
			</div>
		{:else}
			<table class="w-full text-sm">
				<thead
					class="border-b border-gray-800 bg-gray-900/80 text-left text-xs tracking-wider text-gray-500 uppercase"
				>
					<tr>
						<th class="px-4 py-3">Title</th>
						<th class="px-4 py-3">Status</th>
						<th class="px-4 py-3">Author</th>
						<th class="px-4 py-3 text-right">Price</th>
						<th class="px-4 py-3">Updated</th>
						<th class="px-4 py-3"></th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-800">
					{#each courses as c}
						<tr class="hover:bg-gray-800/30">
							<td class="px-4 py-3">
								<div class="font-medium text-white">{c.title}</div>
								<div class="text-xs text-gray-500">/{c.slug}</div>
							</td>
							<td class="px-4 py-3">
								<span class="rounded-full px-2 py-0.5 text-xs font-medium {statusBadge(c.status)}">
									{c.status}
								</span>
							</td>
							<td class="px-4 py-3 text-gray-300">
								{c.authorFirstName ? `${c.authorFirstName} ${c.authorLastName || ''}` : '—'}
							</td>
							<td class="px-4 py-3 text-right text-white">{fmtPrice(c.price)}</td>
							<td class="px-4 py-3 text-xs text-gray-400">{fmtDate(c.updatedAt)}</td>
							<td class="px-4 py-3 text-right">
								<a
									href="/cms/courses/{c.id}"
									class="text-sm font-medium text-purple-400 hover:text-purple-300">Edit →</a
								>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</div>
</div>
