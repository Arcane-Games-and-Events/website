import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Initialize with dark mode as default
const defaultTheme = 'dark';

// Get initial theme from localStorage or use default
const initialTheme = browser
	? (localStorage.getItem('theme') || defaultTheme)
	: defaultTheme;

export const theme = writable(initialTheme);

// Subscribe to theme changes and update localStorage and document
if (browser) {
	theme.subscribe(value => {
		localStorage.setItem('theme', value);

		// Apply or remove dark class to document
		if (value === 'dark') {
			document.documentElement.classList.add('dark');
		} else {
			document.documentElement.classList.remove('dark');
		}
	});

	// Apply initial theme
	if (initialTheme === 'dark') {
		document.documentElement.classList.add('dark');
	} else {
		document.documentElement.classList.remove('dark');
	}
}

export function toggleTheme() {
	theme.update(current => current === 'dark' ? 'light' : 'dark');
}
