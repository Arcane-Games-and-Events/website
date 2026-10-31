<script>
	import AgeShell from '$lib/components/age/AgeShell.svelte';
	import WatchArchive from '$lib/components/age/watch/WatchArchive.svelte';

	let { data } = $props();
	const COPY = {
		podcasts: {
			kicker: 'On the mic',
			title: 'Podcasts',
			lead: 'Every episode from AGE Studios’ shows.',
			noun: ['episode', 'episodes']
		},
		interviews: {
			kicker: 'In conversation',
			title: 'Interviews',
			lead: 'Players, organisers and designers, in their own words.',
			noun: ['interview', 'interviews']
		},
		video: {
			kicker: 'From the Studio',
			title: 'Video',
			lead: 'Features, explainers and everything else on tape.',
			noun: ['video', 'videos']
		}
	};
	const c = $derived(COPY[data.section]);
</script>

<svelte:head><title>{c.title} · AGE Studios</title></svelte:head>

<AgeShell active="AGE Studios">
	<WatchArchive
		{data}
		path="/studios/{data.section}"
		kicker={c.kicker}
		title={c.title}
		lead={c.lead}
		noun={c.noun}
	/>
</AgeShell>
