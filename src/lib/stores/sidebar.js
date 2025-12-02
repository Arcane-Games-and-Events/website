import { writable } from 'svelte/store';

// Sidebar collapsed state - shared across components
export const sidebarCollapsed = writable(false);
