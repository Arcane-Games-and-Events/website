<script>
	import { page } from '$app/stores';
	import { fly, fade } from 'svelte/transition';

	export let user;

	// Sidebar state
	let collapsed = false;
	let mobileOpen = false;

	function toggleCollapse() {
		collapsed = !collapsed;
	}

	function toggleMobile() {
		mobileOpen = !mobileOpen;
	}

	function closeMobile() {
		mobileOpen = false;
	}

	// Navigation items grouped by section
	const mainNavItems = [
		{ href: '/', label: 'Home', icon: 'home' },
		{ href: '/read', label: 'Read', icon: 'article' },
		{ href: '/play', label: 'Play', icon: 'calendar' },
		{ href: '/academy', label: 'Academy', icon: 'book' },
		{ href: '/live', label: 'AGE Live', icon: 'video' }
	];

	const personalNavItems = [
		{ href: '/dashboard', label: 'Dashboard', icon: 'dashboard', requiresAuth: true },
		{ href: '/account', label: 'Account', icon: 'user', requiresAuth: true }
	];

	// Reactive active check - must use $page directly for reactivity
	function checkActive(href, pathname) {
		if (href === '/') return pathname === '/';
		return pathname.startsWith(href);
	}

	// Get user initials
	function getUserInitials(firstName, lastName) {
		if (!firstName) return 'U';
		if (lastName) return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
		return firstName.charAt(0).toUpperCase();
	}

	// Heroicons v2 outline paths (24x24)
	const icons = {
		// Navigation
		home: 'm2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
		newspaper: 'M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z',
		calendar: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5',
		bookOpen: 'M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25',
		videoCamera: 'm15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z',
		chartBar: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
		cog6Tooth: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
		sparkles: 'M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z',
		shieldCheck: 'M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z',
		// UI Controls
		bars3: 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5',
		xMark: 'M6 18 18 6M6 6l12 12',
		chevronDoubleLeft: 'm18.75 4.5-7.5 7.5 7.5 7.5m-6-15L5.25 12l7.5 7.5',
		chevronDoubleRight: 'm5.25 4.5 7.5 7.5-7.5 7.5m6-15 7.5 7.5-7.5 7.5',
		arrowRightOnRectangle: 'M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9',
		arrowLeftOnRectangle: 'M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75',
		// Common icons
		check: 'm4.5 12.75 6 6 9-13.5',
		chevronRight: 'm8.25 4.5 7.5 7.5-7.5 7.5',
		chevronLeft: 'M15.75 19.5 8.25 12l7.5-7.5',
		chevronDown: 'm19.5 8.25-7.5 7.5-7.5-7.5',
		chevronUp: 'm4.5 15.75 7.5-7.5 7.5 7.5',
		plus: 'M12 4.5v15m7.5-7.5h-15',
		minus: 'M5 12h14',
		magnifyingGlass: 'm21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z',
		user: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z',
		userCircle: 'M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
		envelope: 'M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75',
		heart: 'M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z',
		star: 'M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z',
		clock: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
		mapPin: 'M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z',
		phone: 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z',
		currencyDollar: 'M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
		ticket: 'M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 0 1 0 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 0 1 0-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375Z',
		creditCard: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z',
		share: 'M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z',
		link: 'M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244',
		arrowLeft: 'M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18',
		arrowRight: 'M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3',
		arrowUp: 'M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18',
		arrowDown: 'M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3',
		exclamationTriangle: 'M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z',
		informationCircle: 'M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z',
		checkCircle: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
		xCircle: 'm9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
		trash: 'm14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0',
		pencil: 'm16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10',
		eye: 'M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
		eyeSlash: 'M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88',
		academicCap: 'M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5',
		playCircle: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM15.91 11.672a.375.375 0 0 1 0 .656l-5.603 3.113a.375.375 0 0 1-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112Z',
		// Keep old names as aliases for backward compatibility
		article: 'M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z',
		book: 'M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25',
		video: 'm15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z',
		dashboard: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
		settings: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
		premium: 'M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z',
		admin: 'M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z',
		collapse: 'm18.75 4.5-7.5 7.5 7.5 7.5m-6-15L5.25 12l7.5 7.5',
		expand: 'm5.25 4.5 7.5 7.5-7.5 7.5m6-15 7.5 7.5-7.5 7.5',
		menu: 'M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5',
		close: 'M6 18 18 6M6 6l12 12',
		logout: 'M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9',
		login: 'M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75'
	};
</script>

<!-- Mobile overlay -->
{#if mobileOpen}
	<div
		class="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
		transition:fade={{ duration: 200 }}
		on:click={closeMobile}
		on:keydown={(e) => e.key === 'Escape' && closeMobile()}
		role="button"
		tabindex="-1"
		aria-label="Close sidebar"
	></div>
{/if}

<!-- Mobile sidebar -->
<div
	class="fixed inset-y-0 left-0 z-50 lg:hidden {mobileOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out"
>
	<div class="relative flex h-full w-72 flex-col bg-gray-900/80 backdrop-blur-2xl border-r border-white/10 shadow-2xl shadow-black/50">
		<!-- Glassmorphic gradient overlay -->
		<div class="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/20 pointer-events-none"></div>
		<!-- Subtle glow effect -->
		<div class="absolute -right-px top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/20 via-purple-500/10 to-blue-500/20"></div>
		<!-- Header -->
		<div class="relative z-10 flex h-16 items-center justify-between px-4 border-b border-white/10 bg-white/[0.02]">
			<a href="/" class="flex items-center" on:click={closeMobile}>
				<img src="/logo.svg" alt="AGE" class="h-8 w-auto" />
			</a>
			<button
				on:click={closeMobile}
				class="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" d={icons.close} />
				</svg>
			</button>
		</div>

		<!-- Navigation -->
		<nav class="relative z-10 flex-1 overflow-y-auto px-3 py-4">
			<!-- Main Section -->
			<div class="mb-6">
				<p class="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-gray-500">Main</p>
				<ul class="space-y-1">
					{#each mainNavItems as item}
						<li>
							<a
								href={item.href}
								on:click={closeMobile}
								class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 border
								{checkActive(item.href, $page.url.pathname)
									? 'bg-gradient-to-r from-blue-500/20 to-purple-500/10 text-white shadow-lg shadow-blue-500/10 border-white/10'
									: 'text-gray-400 border-transparent hover:bg-white/5 hover:text-white hover:border-white/5'}"
							>
								<svg class="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d={icons[item.icon]} />
								</svg>
								<span>{item.label}</span>
							</a>
						</li>
					{/each}
					<!-- Premium link for non-premium users -->
					{#if !user || (user.role !== 'premium' && user.role !== 'admin')}
						<li>
							<a
								href="/premium"
								on:click={closeMobile}
								class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 border
								{checkActive('/premium', $page.url.pathname)
									? 'bg-gradient-to-r from-blue-500/20 to-purple-500/10 text-white shadow-lg shadow-blue-500/10 border-white/10'
									: 'text-gray-400 border-transparent hover:bg-white/5 hover:text-white hover:border-white/5'}"
							>
								<svg class="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d={icons.premium} />
								</svg>
								<span>Premium</span>
							</a>
						</li>
					{/if}
				</ul>
			</div>

			<!-- Personal Section -->
			{#if user}
				<div class="mb-6">
					<p class="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-gray-500">Personal</p>
					<ul class="space-y-1">
						{#each personalNavItems as item}
							{#if !item.requiresAuth || user}
								<li>
									<a
										href={item.href}
										on:click={closeMobile}
										class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 border
										{checkActive(item.href, $page.url.pathname)
											? 'bg-gradient-to-r from-blue-500/20 to-purple-500/10 text-white shadow-lg shadow-blue-500/10 border-white/10'
											: 'text-gray-400 border-transparent hover:bg-white/5 hover:text-white hover:border-white/5'}"
									>
										<svg class="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" d={icons[item.icon]} />
										</svg>
										<span>{item.label}</span>
									</a>
								</li>
							{/if}
						{/each}
						<!-- Admin link -->
						{#if user?.role === 'admin'}
							<li>
								<a
									href="/admin"
									on:click={closeMobile}
									class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 border
									{checkActive('/admin', $page.url.pathname)
										? 'bg-gradient-to-r from-blue-500/20 to-purple-500/10 text-white shadow-lg shadow-blue-500/10 border-white/10'
										: 'text-gray-400 border-transparent hover:bg-white/5 hover:text-white hover:border-white/5'}"
								>
									<svg class="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" d={icons.admin} />
									</svg>
									<span>Admin</span>
								</a>
							</li>
						{/if}
					</ul>
				</div>
			{/if}
		</nav>

		<!-- Premium CTA Banner (for non-premium users) -->
		{#if !user || (user.role !== 'premium' && user.role !== 'admin')}
			<div class="relative z-10 mx-3 mb-3">
				<div class="relative overflow-hidden rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-600/20 via-blue-600/10 to-purple-600/20 backdrop-blur-sm p-4">
					<!-- Decorative glow -->
					<div class="absolute -top-4 -right-4 w-24 h-24 bg-purple-500/30 rounded-full blur-2xl"></div>
					<div class="absolute -bottom-4 -left-4 w-20 h-20 bg-blue-500/20 rounded-full blur-2xl"></div>
					<div class="relative">
						<div class="flex items-center gap-2 mb-1">
							<svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" d={icons.sparkles} />
							</svg>
							<h3 class="font-semibold text-white text-sm">Join AGE Premium</h3>
						</div>
						<p class="text-xs text-gray-300 mb-3">Discover the best content anywhere.</p>
						<a
							href="/premium"
							on:click={closeMobile}
							class="block w-full rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-2 text-center text-sm font-medium text-white hover:from-purple-600 hover:to-blue-600 shadow-lg shadow-purple-500/25 transition-all"
						>
							Join Now
						</a>
					</div>
				</div>
			</div>
		{/if}

		<!-- User Section (Bottom) -->
		<div class="relative z-10 border-t border-white/10 p-4 bg-white/[0.02]">
			{#if user}
				{@const isPremiumUser = user.role === 'premium' || user.role === 'admin'}
				<div class="flex items-center gap-3">
					<div class="relative">
						<div class="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white shadow-lg transition-all duration-200
							{isPremiumUser
								? 'bg-gradient-to-br from-emerald-400 via-green-500 to-emerald-600 shadow-emerald-500/40 ring-2 ring-emerald-400/50'
								: 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-blue-500/25 ring-2 ring-white/10'}">
							{getUserInitials(user.firstName, user.lastName)}
						</div>
						{#if isPremiumUser}
							<div class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-green-600 shadow-lg shadow-emerald-500/50">
								<svg class="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
									<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
								</svg>
							</div>
						{/if}
					</div>
					<div class="flex-1 min-w-0">
						<p class="truncate text-sm font-medium text-white">
							{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 'User'}
						</p>
						{#if isPremiumUser}
							<span class="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500/20 to-green-600/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 mt-1">
								<svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d={icons.sparkles} />
								</svg>
								PREMIUM
							</span>
						{:else}
							<p class="truncate text-xs text-gray-400">{user.email}</p>
						{/if}
					</div>
					<form method="POST" action="/logout">
						<button
							type="submit"
							class="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
							title="Logout"
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" d={icons.logout} />
							</svg>
						</button>
					</form>
				</div>
			{:else}
				<div class="flex flex-col gap-2">
					<a
						href="/login"
						on:click={closeMobile}
						class="w-full rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-white/5 transition-all duration-200"
					>
						Login
					</a>
					<a
						href="/signup"
						on:click={closeMobile}
						class="w-full rounded-lg border border-blue-400/20 bg-gradient-to-r from-blue-500/80 to-purple-500/80 backdrop-blur-sm px-4 py-2.5 text-center text-sm font-medium text-white hover:from-blue-500 hover:to-purple-500 hover:border-blue-400/40 shadow-lg shadow-blue-500/20 transition-all duration-200"
					>
						Sign Up
					</a>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Desktop sidebar -->
<div
	class="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:flex lg:flex-col
	{collapsed ? 'lg:w-20' : 'lg:w-72'} transition-all duration-300 ease-in-out"
>
	<div class="relative flex h-full flex-col bg-gray-900/80 backdrop-blur-2xl border-r border-white/10 shadow-2xl shadow-black/50">
		<!-- Glassmorphic gradient overlay -->
		<div class="absolute inset-0 bg-gradient-to-b from-white/5 via-transparent to-black/20 pointer-events-none"></div>
		<!-- Subtle glow effect on border -->
		<div class="absolute -right-px top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/20 via-purple-500/10 to-blue-500/20"></div>
		<!-- Header -->
		<div class="relative z-10 flex h-16 items-center {collapsed ? 'justify-center px-2' : 'justify-between px-4'} border-b border-white/10 bg-white/[0.02]">
			<a href="/" class="flex items-center">
				{#if collapsed}
					<!-- Icon only when collapsed - placeholder until icon provided -->
					<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex-shrink-0 shadow-lg shadow-blue-500/25">
						<span class="text-lg font-bold text-white">A</span>
					</div>
				{:else}
					<img src="/logo.svg" alt="AGE" class="h-8 w-auto" />
				{/if}
			</a>
			{#if !collapsed}
				<button
					on:click={toggleCollapse}
					class="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
					title="Collapse sidebar"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" d={icons.collapse} />
					</svg>
				</button>
			{/if}
		</div>

		<!-- Expand button when collapsed -->
		{#if collapsed}
			<div class="relative z-10 flex justify-center py-3 border-b border-white/10">
				<button
					on:click={toggleCollapse}
					class="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
					title="Expand sidebar"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" d={icons.expand} />
					</svg>
				</button>
			</div>
		{/if}

		<!-- Navigation -->
		<nav class="relative z-10 flex-1 overflow-y-auto {collapsed ? 'px-2' : 'px-3'} py-4">
			<!-- Main Section -->
			<div class="mb-6">
				{#if !collapsed}
					<p class="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-gray-500">Main</p>
				{/if}
				<ul class="space-y-1">
					{#each mainNavItems as item}
						<li>
							<a
								href={item.href}
								class="flex items-center {collapsed ? 'justify-center' : 'gap-3'} rounded-lg {collapsed ? 'px-2' : 'px-3'} py-2.5 text-sm font-medium transition-all duration-200 border
								{checkActive(item.href, $page.url.pathname)
									? 'bg-gradient-to-r from-blue-500/20 to-purple-500/10 text-white shadow-lg shadow-blue-500/10 border-white/10'
									: 'text-gray-400 border-transparent hover:bg-white/5 hover:text-white hover:border-white/5'}"
								title={collapsed ? item.label : ''}
							>
								<svg class="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d={icons[item.icon]} />
								</svg>
								{#if !collapsed}
									<span>{item.label}</span>
								{/if}
							</a>
						</li>
					{/each}
					<!-- Premium link for non-premium users -->
					{#if !user || (user.role !== 'premium' && user.role !== 'admin')}
						<li>
							<a
								href="/premium"
								class="flex items-center {collapsed ? 'justify-center' : 'gap-3'} rounded-lg {collapsed ? 'px-2' : 'px-3'} py-2.5 text-sm font-medium transition-all duration-200 border
								{checkActive('/premium', $page.url.pathname)
									? 'bg-gradient-to-r from-blue-500/20 to-purple-500/10 text-white shadow-lg shadow-blue-500/10 border-white/10'
									: 'text-gray-400 border-transparent hover:bg-white/5 hover:text-white hover:border-white/5'}"
								title={collapsed ? 'Premium' : ''}
							>
								<svg class="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d={icons.premium} />
								</svg>
								{#if !collapsed}
									<span>Premium</span>
								{/if}
							</a>
						</li>
					{/if}
				</ul>
			</div>

			<!-- Personal Section -->
			{#if user}
				<div class="mb-6">
					{#if !collapsed}
						<p class="mb-2 px-3 text-xs font-medium uppercase tracking-wider text-gray-500">Personal</p>
					{/if}
					<ul class="space-y-1">
						{#each personalNavItems as item}
							{#if !item.requiresAuth || user}
								<li>
									<a
										href={item.href}
										class="flex items-center {collapsed ? 'justify-center' : 'gap-3'} rounded-lg {collapsed ? 'px-2' : 'px-3'} py-2.5 text-sm font-medium transition-all duration-200 border
										{checkActive(item.href, $page.url.pathname)
											? 'bg-gradient-to-r from-blue-500/20 to-purple-500/10 text-white shadow-lg shadow-blue-500/10 border-white/10'
											: 'text-gray-400 border-transparent hover:bg-white/5 hover:text-white hover:border-white/5'}"
										title={collapsed ? item.label : ''}
									>
										<svg class="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" d={icons[item.icon]} />
										</svg>
										{#if !collapsed}
											<span>{item.label}</span>
										{/if}
									</a>
								</li>
							{/if}
						{/each}
						<!-- Admin link -->
						{#if user?.role === 'admin'}
							<li>
								<a
									href="/admin"
									class="flex items-center {collapsed ? 'justify-center' : 'gap-3'} rounded-lg {collapsed ? 'px-2' : 'px-3'} py-2.5 text-sm font-medium transition-all duration-200 border
									{checkActive('/admin', $page.url.pathname)
										? 'bg-gradient-to-r from-blue-500/20 to-purple-500/10 text-white shadow-lg shadow-blue-500/10 border-white/10'
										: 'text-gray-400 border-transparent hover:bg-white/5 hover:text-white hover:border-white/5'}"
									title={collapsed ? 'Admin' : ''}
								>
									<svg class="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" d={icons.admin} />
									</svg>
									{#if !collapsed}
										<span>Admin</span>
									{/if}
								</a>
							</li>
						{/if}
					</ul>
				</div>
			{/if}
		</nav>

		<!-- Premium CTA Banner (for non-premium users) -->
		{#if !user || (user.role !== 'premium' && user.role !== 'admin')}
			{#if !collapsed}
				<div class="relative z-10 mx-3 mb-3">
					<div class="relative overflow-hidden rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-600/20 via-blue-600/10 to-purple-600/20 backdrop-blur-sm p-4">
						<!-- Decorative glow -->
						<div class="absolute -top-4 -right-4 w-24 h-24 bg-purple-500/30 rounded-full blur-2xl"></div>
						<div class="absolute -bottom-4 -left-4 w-20 h-20 bg-blue-500/20 rounded-full blur-2xl"></div>
						<div class="relative">
							<div class="flex items-center gap-2 mb-1">
								<svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d={icons.sparkles} />
								</svg>
								<h3 class="font-semibold text-white text-sm">Join AGE Premium</h3>
							</div>
							<p class="text-xs text-gray-300 mb-3">Discover the best content anywhere.</p>
							<a
								href="/premium"
								class="block w-full rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-2 text-center text-sm font-medium text-white hover:from-purple-600 hover:to-blue-600 shadow-lg shadow-purple-500/25 transition-all"
							>
								Join Now
							</a>
						</div>
					</div>
				</div>
			{:else}
				<div class="relative z-10 flex justify-center mb-3">
					<a
						href="/premium"
						class="p-2.5 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-purple-400 hover:text-white hover:from-purple-500/40 hover:to-blue-500/40 transition-all border border-purple-500/30"
						title="Join Premium"
					>
						<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" d={icons.sparkles} />
						</svg>
					</a>
				</div>
			{/if}
		{/if}

		<!-- User Section (Bottom) -->
		<div class="relative z-10 border-t border-white/10 {collapsed ? 'p-2' : 'p-4'} bg-white/[0.02]">
			{#if user}
				{@const isPremiumUser = user.role === 'premium' || user.role === 'admin'}
				{#if collapsed}
					<!-- Collapsed: Just avatar -->
					<div class="flex flex-col items-center gap-2">
						<a href="/account" class="relative" title="Account">
							<div class="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white shadow-lg transition-all duration-200
								{isPremiumUser
									? 'bg-gradient-to-br from-emerald-400 via-green-500 to-emerald-600 shadow-emerald-500/40 ring-2 ring-emerald-400/50 hover:ring-emerald-300/70'
									: 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-blue-500/25 ring-2 ring-white/10 hover:ring-blue-400/50'}">
								{getUserInitials(user.firstName, user.lastName)}
							</div>
							{#if isPremiumUser}
								<div class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-green-600 shadow-lg shadow-emerald-500/50">
									<svg class="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
										<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
									</svg>
								</div>
							{/if}
						</a>
						<form method="POST" action="/logout">
							<button
								type="submit"
								class="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
								title="Logout"
							>
								<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d={icons.logout} />
								</svg>
							</button>
						</form>
					</div>
				{:else}
					<!-- Expanded: Full user info -->
					<div class="flex items-center gap-3">
						<a href="/account" class="relative flex-shrink-0">
							<div class="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white shadow-lg transition-all duration-200
								{isPremiumUser
									? 'bg-gradient-to-br from-emerald-400 via-green-500 to-emerald-600 shadow-emerald-500/40 ring-2 ring-emerald-400/50 hover:ring-emerald-300/70'
									: 'bg-gradient-to-br from-blue-500 to-purple-600 shadow-blue-500/25 ring-2 ring-white/10 hover:ring-blue-400/50'}">
								{getUserInitials(user.firstName, user.lastName)}
							</div>
							{#if isPremiumUser}
								<div class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-green-600 shadow-lg shadow-emerald-500/50">
									<svg class="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24">
										<path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
									</svg>
								</div>
							{/if}
						</a>
						<div class="flex-1 min-w-0">
							<p class="truncate text-sm font-medium text-white">
								{user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 'User'}
							</p>
							{#if isPremiumUser}
								<span class="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500/20 to-green-600/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 mt-1">
									<svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" d={icons.sparkles} />
									</svg>
									PREMIUM
								</span>
							{:else}
								<p class="truncate text-xs text-gray-400">{user.email}</p>
							{/if}
						</div>
						<form method="POST" action="/logout">
							<button
								type="submit"
								class="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
								title="Logout"
							>
								<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" d={icons.logout} />
								</svg>
							</button>
						</form>
					</div>
				{/if}
			{:else}
				{#if collapsed}
					<div class="flex flex-col items-center gap-2">
						<a
							href="/login"
							class="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
							title="Login"
						>
							<svg class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
							</svg>
						</a>
					</div>
				{:else}
					<div class="flex flex-col gap-2">
						<a
							href="/login"
							class="w-full rounded-lg border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-white/5 transition-all duration-200"
						>
							Login
						</a>
						<a
							href="/signup"
							class="w-full rounded-lg border border-blue-400/20 bg-gradient-to-r from-blue-500/80 to-purple-500/80 backdrop-blur-sm px-4 py-2.5 text-center text-sm font-medium text-white hover:from-blue-500 hover:to-purple-500 hover:border-blue-400/40 shadow-lg shadow-blue-500/20 transition-all duration-200"
						>
							Sign Up
						</a>
					</div>
				{/if}
			{/if}
		</div>
	</div>
</div>

<!-- Main content wrapper -->
<div class="{collapsed ? 'lg:pl-20' : 'lg:pl-72'} transition-all duration-300 ease-in-out">
	<!-- Top bar for mobile -->
	<div class="relative sticky top-0 z-30 flex h-16 items-center justify-center border-b border-white/10 bg-gray-950/80 backdrop-blur-2xl px-4 lg:hidden">
		<!-- Subtle gradient overlay -->
		<div class="absolute inset-0 bg-gradient-to-r from-white/[0.02] to-transparent pointer-events-none"></div>
		<button
			on:click={toggleMobile}
			class="absolute left-4 z-10 p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
		>
			<svg class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" d={icons.menu} />
			</svg>
		</button>
		<a href="/" class="relative z-10 flex items-center">
			<img src="/logo.svg" alt="AGE" class="h-7 w-auto" />
		</a>
	</div>

	<!-- Page content -->
	<slot />
</div>
