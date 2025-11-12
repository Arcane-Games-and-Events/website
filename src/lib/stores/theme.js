import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Site is permanently in dark mode
const darkTheme = 'dark';

export const theme = writable(darkTheme);

// Apply dark class to document on mount
if (browser) {
	document.documentElement.classList.add('dark');
}
