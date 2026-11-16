/**
 * The design system's icons — one 20×20 path each, drawn with a 1.6 stroke,
 * round caps and no fill (see Icon.svelte). One set for the whole site, so
 * every menu item, header, figure and empty state draws from the same
 * family. Add new ones here.
 */
export const ICON = {
	// areas
	home: 'M3.5 9.5 10 4l6.5 5.5V16a.5.5 0 0 1-.5.5h-3.5v-4.5h-5v4.5H4a.5.5 0 0 1-.5-.5z',
	inbox: 'M3.5 5h13v11h-13zM3.5 11h4l1 2h3l1-2h4',
	money: 'M2.5 5.5h15v9h-15zM10 12.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5zM5 8v4M15 8v4',
	people:
		'M7.5 9.5a2.75 2.75 0 1 0 0-5.5 2.75 2.75 0 0 0 0 5.5zM2.5 16.5c.4-2.8 2.4-4.5 5-4.5s4.6 1.7 5 4.5M13 4.2a2.6 2.6 0 0 1 0 5.1M14.5 12.3c1.6.5 2.7 2 3 4.2',
	ageopen: 'M10 2.5 12.2 7l4.8.7-3.5 3.4.8 4.9L10 13.7 5.7 16l.8-4.9L3 7.7 7.8 7z',
	insights: 'M3.5 16.5h13M5.5 16.5V11M9 16.5V6.5M12.5 16.5v-6M16 16.5V4',
	tools:
		'M12.5 3.5a3.5 3.5 0 0 0-3.3 4.6L3.5 13.8 6.2 16.5l5.7-5.7a3.5 3.5 0 0 0 4.6-3.3l-2 2-2.3-.3-.3-2.3z',

	// money
	orders: 'M4 5.5h12l-1 7.5H5.5zM7 16.5h.01M13 16.5h.01M4 5.5 3.5 3.5h-1',
	refunds: 'M7.5 6.5 4 10l3.5 3.5M4 10h8a4 4 0 0 1 0 8h-1.5',
	guideRefunds:
		'M4 4.5h5.5a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 0-1.5-1.5H4zM16 4.5h-2.5M14.5 2.5l-2 2 2 2',
	memberships: 'M2.5 5h15v10h-15zM2.5 8.5h15M5.5 12h3',
	migration: 'M4 7h11l-3-3M16 13H5l3 3',
	partners: 'M4 10.5 10 4l6 6.5-6 6.5zM10 4v13M4 10.5h12',

	// AGE Open
	overview: 'M3.5 3.5h5.5v5.5H3.5zM11 3.5h5.5v5.5H11zM3.5 11h5.5v5.5H3.5zM11 11h5.5v5.5H11z',
	events: 'M3 6.5h14v2.25a1.75 1.75 0 0 0 0 3.5v2.25H3v-2.25a1.75 1.75 0 0 0 0-3.5zM12 6.5v8',
	circuits:
		'M10 17s-5-4.6-5-8.5a5 5 0 0 1 10 0C15 12.4 10 17 10 17zM10 10.25a1.75 1.75 0 1 0 0-3.5 1.75 1.75 0 0 0 0 3.5z',
	standings:
		'M6.5 3.5h7v4a3.5 3.5 0 0 1-7 0zM6.5 5H3.5a3 3 0 0 0 3 3M13.5 5h3a3 3 0 0 1-3 3M10 11v3M7 16.5h6',
	import: 'M10 3.5v9M6.5 9 10 12.5 13.5 9M3.5 14v2.5h13V14',
	calendar: 'M3.5 6h13v10.5h-13zM3.5 9.5h13M7 3.5v4M13 3.5v4',
	store: 'M3.5 8 5 3.5h10L16.5 8M3.5 8h13M3.5 8v8.5h13V8M8 16.5v-4.5h4v4.5',

	// insights
	revenue: 'M3.5 16.5h13M3.5 13l4-4 3 3 6-6.5M12.5 5.5h4v4',
	membersChart: 'M10 9.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 16.5c.5-3 2.9-5 6-5s5.5 2 6 5',
	projections: 'M3.5 16.5h13M3.5 12.5l4-3.5 3 2 6-6M13 5h3.5v3.5M3.5 12.5',
	site: 'M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM3 10h14M10 3c1.9 2 2.9 4.4 2.9 7s-1 5-2.9 7c-1.9-2-2.9-4.4-2.9-7s1-5 2.9-7z',

	// tools
	desk: 'M13.5 3.5 16.5 6.5 7 16H4v-3zM11.5 5.5l3 3',
	classroom: 'M10 4 2.5 7.5 10 11l7.5-3.5zM5.5 9v4c1.2 1.3 2.7 2 4.5 2s3.3-.7 4.5-2V9M17.5 7.5v4',
	studio: 'M3.5 4.5h13v11h-13zM8.5 7.5v5l4-2.5z',

	// controls
	more: 'M4 4h4v4H4zM12 4h4v4h-4zM4 12h4v4H4zM12 12h4v4h-4z',
	close: 'M5 5l10 10M15 5 5 15',
	chevron: 'M8 5l5 5-5 5',
	back: 'M12 5l-5 5 5 5',
	external: 'M8.5 4.5h-4v11h11v-4M11.5 3.5h5v5M16.5 3.5 9.5 10.5',
	search: 'M9 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM13.5 13.5 17 17',
	filter: 'M3.5 5h13M6 10h8M8.5 15h3',
	dots: 'M5 10h.01M10 10h.01M15 10h.01',
	plus: 'M10 4v12M4 10h12',
	check: 'M4.5 10.5 8 14l7.5-8',
	alert: 'M10 3.5 17 16H3zM10 8.5v3.5M10 14.25h.01',
	mail: 'M3 5h14v10H3zM3 5l7 6 7-6',
	ticket: 'M3 6.5h14v2.25a1.75 1.75 0 0 0 0 3.5v2.25H3v-2.25a1.75 1.75 0 0 0 0-3.5zM12 6.5v8',
	course:
		'M4 4.5h5.5a1.5 1.5 0 0 1 1.5 1.5v10a1.5 1.5 0 0 0-1.5-1.5H4zM16 4.5h-3.5A1.5 1.5 0 0 0 11 6v10a1.5 1.5 0 0 1 1.5-1.5H16z',
	premium: 'M10 3 12 7.5l4.8.4-3.6 3.2 1.1 4.7L10 13.3l-4.3 2.5 1.1-4.7-3.6-3.2 4.8-.4z',
	clock: 'M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM10 6v4l2.5 2.5',
	video: 'M3.5 5.5h9v9h-9zM12.5 8.5l4-2.5v8l-4-2.5z',
	pen: 'M13.5 3.5 16.5 6.5 7 16H4v-3z'
};
