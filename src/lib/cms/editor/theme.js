/**
 * Lexical editor theme — maps node types to CSS class names for the in-editor
 * DOM. Optional; the outer `.cms-editor-content` wrapper's global styles do
 * most of the visual work. Class hooks here let a future rebuild attach
 * more granular styles without touching the node classes themselves.
 */
export const editorTheme = {
	paragraph: 'cms-p',
	heading: {
		h1: 'cms-h1',
		h2: 'cms-h2',
		h3: 'cms-h3',
		h4: 'cms-h4',
		h5: 'cms-h5',
		h6: 'cms-h6'
	},
	list: {
		ol: 'cms-ol',
		ul: 'cms-ul',
		listitem: 'cms-li'
	},
	quote: 'cms-quote',
	link: 'cms-link',
	text: {
		bold: 'cms-b',
		italic: 'cms-i',
		underline: 'cms-u',
		strikethrough: 'cms-s',
		code: 'cms-code'
	}
};
