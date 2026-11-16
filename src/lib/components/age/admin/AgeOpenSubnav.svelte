<!--
  AgeOpenSubnav — the pages of the admin AGE Open area: the overview, the
  events (and a new one), and circuits and their stores. Sits under the
  admin tabs on each of those pages. Players and match imports still live
  at /admin/players and /admin/import-matches, off the menu.
-->
<script>
	import { page } from '$app/state';
	import AdminSubnav from './AdminSubnav.svelte';

	const path = $derived(page.url.pathname);
	const items = $derived([
		{ href: '/admin/ageopen', label: 'Overview', active: path === '/admin/ageopen' },
		{ href: '/admin/events', label: 'Events', active: path.startsWith('/admin/events') },
		{
			href: '/admin/circuits',
			label: 'Circuits & stores',
			active: path.startsWith('/admin/circuits') || path.startsWith('/admin/stores')
		}
	]);
</script>

<AdminSubnav label="AGE Open" {items} />
