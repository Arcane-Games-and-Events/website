/**
 * Tailwind class map applied to Lexical nodes inside the editor.
 * Mirrors how the public renderer styles things via the `prose` class on the
 * rendered HTML, so writers see what the article will roughly look like.
 */
export const editorTheme = {
	root: 'cms-editor-root',
	paragraph: 'mb-4 leading-relaxed text-gray-100',
	quote: 'border-l-2 border-gray-600 pl-6 text-gray-300 italic my-4',
	heading: {
		h1: 'text-4xl font-bold text-white mt-8 mb-4',
		h2: 'text-3xl font-bold text-white mt-8 mb-4',
		h3: 'text-2xl font-semibold text-white mt-6 mb-3',
		h4: 'text-xl font-semibold text-white mt-6 mb-3',
		h5: 'text-lg font-semibold text-white mt-4 mb-2',
		h6: 'text-base font-semibold text-white mt-4 mb-2'
	},
	list: {
		ul: 'list-disc list-inside ml-4 my-4 text-gray-100',
		ol: 'list-decimal list-inside ml-4 my-4 text-gray-100',
		listitem: 'mb-1',
		nested: {
			listitem: 'list-none'
		}
	},
	link: 'text-blue-400 underline hover:text-blue-300 cursor-pointer',
	text: {
		bold: 'font-bold',
		italic: 'italic',
		underline: 'underline',
		strikethrough: 'line-through',
		code: 'rounded bg-white/10 px-1.5 py-0.5 text-sm text-orange-400 font-mono'
	}
};
