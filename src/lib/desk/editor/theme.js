/**
 * Lexical editor theme — maps node types to CSS class names for the in-editor
 * DOM. Optional; the outer `.desk-editor-content` wrapper's global styles do
 * most of the visual work. Class hooks here let a future rebuild attach
 * more granular styles without touching the node classes themselves.
 */
export const editorTheme = {
	paragraph: 'desk-p',
	heading: {
		h1: 'desk-h1',
		h2: 'desk-h2',
		h3: 'desk-h3',
		h4: 'desk-h4',
		h5: 'desk-h5',
		h6: 'desk-h6'
	},
	list: {
		ol: 'desk-ol',
		ul: 'desk-ul',
		listitem: 'desk-li'
	},
	quote: 'desk-quote',
	link: 'desk-link',
	text: {
		bold: 'desk-b',
		italic: 'desk-i',
		underline: 'desk-u',
		strikethrough: 'desk-s',
		code: 'desk-code'
	}
};
