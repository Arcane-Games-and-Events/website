/**
 * Convert Payload CMS Lexical rich text JSON to HTML
 * Handles the common node types from Lexical editor
 */

/**
 * Convert a Lexical rich text object to HTML string
 * @param {Object} richText - The Lexical rich text object from Payload
 * @returns {string} HTML string
 */
export function lexicalToHtml(richText) {
	if (!richText) return '';

	// If it's already a string, return as-is
	if (typeof richText === 'string') {
		return richText;
	}

	// Handle Lexical root structure
	const root = richText.root || richText;

	if (!root || !root.children) {
		return '';
	}

	return root.children.map(node => serializeNode(node)).join('');
}

/**
 * Serialize a single Lexical node to HTML
 * @param {Object} node - A Lexical node
 * @returns {string} HTML string
 */
function serializeNode(node) {
	if (!node) return '';

	// Text node
	if (node.type === 'text') {
		let text = escapeHtml(node.text || '');

		// Apply formatting
		if (node.format) {
			if (node.format & 1) text = `<strong>${text}</strong>`; // bold
			if (node.format & 2) text = `<em>${text}</em>`; // italic
			if (node.format & 4) text = `<s>${text}</s>`; // strikethrough
			if (node.format & 8) text = `<u>${text}</u>`; // underline
			if (node.format & 16) text = `<code>${text}</code>`; // code
			if (node.format & 32) text = `<sub>${text}</sub>`; // subscript
			if (node.format & 64) text = `<sup>${text}</sup>`; // superscript
		}

		return text;
	}

	// Linebreak node
	if (node.type === 'linebreak') {
		return '<br />';
	}

	// Get children HTML
	const children = node.children
		? node.children.map(child => serializeNode(child)).join('')
		: '';

	// Handle different node types
	switch (node.type) {
		case 'paragraph':
			return `<p>${children}</p>`;

		case 'heading':
			const tag = node.tag || 'h2';
			return `<${tag}>${children}</${tag}>`;

		case 'quote':
			return `<blockquote>${children}</blockquote>`;

		case 'list':
			const listTag = node.listType === 'number' ? 'ol' : 'ul';
			return `<${listTag}>${children}</${listTag}>`;

		case 'listitem':
			return `<li>${children}</li>`;

		case 'link':
			const url = node.fields?.url || node.url || '#';
			const target = node.fields?.newTab || node.newTab ? ' target="_blank" rel="noopener noreferrer"' : '';
			return `<a href="${escapeHtml(url)}"${target}>${children}</a>`;

		case 'autolink':
			return `<a href="${escapeHtml(node.url || '#')}">${children}</a>`;

		case 'horizontalrule':
			return '<hr />';

		case 'upload':
			// Handle uploaded media
			if (node.value?.url) {
				const alt = node.value?.alt || '';
				return `<img src="${escapeHtml(node.value.url)}" alt="${escapeHtml(alt)}" />`;
			}
			return '';

		default:
			// For unknown types, just return children
			return children;
	}
}

/**
 * Escape HTML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
	if (!str) return '';
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}
