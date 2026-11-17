<!--
  AgeOpenHeader — the top of every page in the admin AGE Open area: the
  shared AdminHeader (the ink poster band, kicker, poster-face title,
  subtitle and buttons) with its trail starting at AGE Open; then the
  admin tabs, and on the area's top pages the AGE Open sub-navigation.

  A page one level down (a store, a circuit, an event, a "new" page) gives
  a trail instead: the kicker becomes a breadcrumb back up through the area
  (AGE Open / Circuits & stores / Los Angeles) and the sub-navigation is
  left out, so there's never more than one menu under the admin tabs — the
  page's own, if it has one.

  Props:
    title, subtitle, kicker ('Admin · AGE Open' unless given)
    circuit   a circuit's name: its colour and code badge
    trail     [{ href, label }] — the pages above this one, after AGE Open
    actions   buttons beside the title (use the exported btn classes)

  Figures and anything else page-specific go in the page, under the tabs,
  so every header in the area has the same shape.
-->
<script module>
	export { btn, btnLine } from './AdminHeader.svelte';
</script>

<script>
	import AdminHeader from './AdminHeader.svelte';
	import AdminTabs from './AdminTabs.svelte';
	import AgeOpenSubnav from './AgeOpenSubnav.svelte';

	/** @type {{ title: string, subtitle?: string, kicker?: string, circuit?: string | null, trail?: { href: string, label: string }[], actions?: import('svelte').Snippet }} */
	let {
		title,
		subtitle = '',
		kicker = 'Admin · AGE Open',
		circuit = null,
		trail = null,
		actions
	} = $props();
</script>

<AdminHeader
	{title}
	{subtitle}
	{kicker}
	{circuit}
	{trail}
	root={{ href: '/admin/ageopen', label: 'AGE Open' }}
	{actions}
/>
<AdminTabs />
{#if !trail}<AgeOpenSubnav />{/if}
