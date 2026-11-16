/**
 * The look shared by every text-like control (Input, Textarea, Select,
 * SearchInput), so they line up wherever they sit together.
 */
import { cx } from './utils.js';

export const control = (size = 'md', invalid = false) =>
	cx(
		'block w-full rounded-control border bg-surface font-ui text-fg shadow-raised transition-colors duration-150 ease-out placeholder:text-fg-subtle focus:border-accent focus:ring-2 focus:ring-ring/25 focus:outline-none disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-fg-subtle',
		invalid ? 'border-danger' : 'border-border-strong',
		size === 'sm'
			? 'h-8 px-2.5 text-sm'
			: size === 'lg'
				? 'h-10 px-3 text-base'
				: 'h-9 px-3 text-sm'
	);
