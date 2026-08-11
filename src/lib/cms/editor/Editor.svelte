<!--
  Editor — Svelte wrapper around a Lexical editor instance, editorial aesthetic.

  Mounts on a contenteditable div, registers rich-text/list/link nodes plus
  the AGE-specific widget nodes, serializes to Lexical JSON on every change,
  and exposes formatting + widget insertion via a top toolbar.

  Usage:
    <Editor bind:value={entry.body} placeholder="Start writing…" on:change={…} on:ready={…} />

  `value` is a Lexical doc object ({ root: { ... } }). It's read once on
  mount as the initial state, then written back on every change. Don't
  reactively force `value` from outside after mount or you'll fight the
  editor — use it like a one-way bind from form state.
-->
<script>
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import {
		createEditor,
		$insertNodes as insertNodes,
		$getSelection as getSelection,
		$getRoot as getRoot,
		$getNodeByKey as getNodeByKey,
		$createParagraphNode as createParagraphNode,
		$createTextNode as createTextNode,
		$isDecoratorNode as isDecoratorNode,
		FORMAT_TEXT_COMMAND
	} from 'lexical';
	import {
		HeadingNode,
		QuoteNode,
		registerRichText,
		$createHeadingNode as createHeadingNode,
		$createQuoteNode as createQuoteNode
	} from '@lexical/rich-text';
	import {
		ListNode,
		ListItemNode,
		INSERT_ORDERED_LIST_COMMAND,
		INSERT_UNORDERED_LIST_COMMAND,
		registerList
	} from '@lexical/list';
	import { LinkNode, AutoLinkNode, $createLinkNode as createLinkNode } from '@lexical/link';
	import { registerHistory, createEmptyHistoryState } from '@lexical/history';
	import { mergeRegister } from '@lexical/utils';
	import { $setBlocksType as setBlocksType } from '@lexical/selection';

	import { editorTheme } from './theme.js';
	import { coerceLexicalDoc, emptyLexicalDoc } from './utils.js';
	import {
		DecklistNode,
		$createDecklistNode as createDecklistNode
	} from './nodes/DecklistNode.js';
	import {
		StatsTableNode,
		$createStatsTableNode as createStatsTableNode
	} from './nodes/StatsTableNode.js';
	import {
		ImageUploadNode,
		$createImageUploadNode as createImageUploadNode
	} from './nodes/ImageUploadNode.js';
	import {
		InlineVideoNode,
		$createInlineVideoNode as createInlineVideoNode
	} from './nodes/InlineVideoNode.js';
	import InsertDecklistDialog from './InsertDecklistDialog.svelte';
	import InsertStatsTableDialog from './InsertStatsTableDialog.svelte';
	import InsertCardLinkDialog from './InsertCardLinkDialog.svelte';
	import InsertInlineVideoDialog from './InsertInlineVideoDialog.svelte';
	import EditorContextMenu from './EditorContextMenu.svelte';

	export let value = emptyLexicalDoc();
	export let placeholder = 'Start writing…';

	const dispatch = createEventDispatcher();

	let editorEl;
	let editor = null;
	let unregister = null;
	let isEmpty = true;

	let activeFormats = { bold: false, italic: false, underline: false, strikethrough: false };

	let imageInputEl;
	let imageUploading = false;

	let decklistDialogOpen = false;
	let statsDialogOpen = false;
	let cardLinkDialogOpen = false;
	let cardLinkSelectedText = '';
	let inlineVideoDialogOpen = false;

	// Right-click context menu state — the browser moves the caret to the
	// click point before the contextmenu event fires, so any block/format/
	// insert command we run after the menu closes lands at the cursor.
	let contextMenuOpen = false;
	let contextMenuX = 0;
	let contextMenuY = 0;

	function handleWindowContextMenu(e) {
		// Only intercept right-clicks inside the editor's content area.
		if (!editorEl || !editorEl.contains(e.target)) return;
		e.preventDefault();
		e.stopPropagation();
		contextMenuX = e.clientX;
		contextMenuY = e.clientY;
		contextMenuOpen = true;
	}

	onMount(() => {
		editor = createEditor({
			namespace: 'AgeCmsEditor',
			theme: editorTheme,
			nodes: [
				HeadingNode,
				QuoteNode,
				ListNode,
				ListItemNode,
				LinkNode,
				AutoLinkNode,
				DecklistNode,
				StatsTableNode,
				ImageUploadNode,
				InlineVideoNode
			],
			onError: (err) => {
				console.error('[lexical]', err);
			}
		});

		editor.setRootElement(editorEl);

		// Widget delete button custom event — dispatched by DecklistNode/
		// StatsTableNode/ImageUploadNode/InlineVideoNode.
		//
		// For inline images specifically, we ALSO clean up the underlying
		// media row + Supabase Storage object so orphans don't accumulate.
		// The endpoint reference-checks against every other place a mediaId
		// can appear (cover/thumb on entries + courses, live and draft)
		// before deleting, so an image shared as a cover elsewhere is safe.
		editorEl.addEventListener('cms-widget-delete', (e) => {
			const nodeKey = e.detail?.nodeKey;
			if (!nodeKey) return;

			// Read the mediaId BEFORE mutating — editor.update() is
			// asynchronous, so grabbing __data inside it and checking outside
			// would fire the fetch before the assignment happened. Read via
			// editorState.read() gives us a synchronous snapshot.
			let mediaIdToDelete = null;
			editor.getEditorState().read(() => {
				const node = getNodeByKey(nodeKey);
				const data = /** @type {any} */ (node)?.__data;
				if (data?.mediaId) mediaIdToDelete = data.mediaId;
			});

			// Remove the node from the doc.
			editor.update(() => {
				const node = getNodeByKey(nodeKey);
				if (node) node.remove();
			});

			// Fire-and-forget media cleanup. Endpoint reference-checks
			// against every other cover / thumbnail slot before deleting,
			// so shared images stay intact.
			if (mediaIdToDelete) {
				fetch(`/api/cms/media/${mediaIdToDelete}`, { method: 'DELETE' }).catch(() => {});
			}
		});

		// Ensure every decorator node has a writable sibling after it — a
		// bare paragraph. Fires in two cases:
		//   1. Decorator is the LAST child of root — otherwise the cursor
		//      has nowhere to land past it and typing is impossible.
		//   2. Decorator's next sibling is ANOTHER decorator — otherwise
		//      the writer can't insert a cursor between adjacent widgets
		//      (a decklist followed by a video, etc.) to type between them.
		// Transforms run inside the editor's update cycle, so mutating the
		// doc from here is safe (no cycle-triggering).
		function ensureTrailingParagraph(node) {
			const next = node.getNextSibling();
			if (next === null || isDecoratorNode(next)) {
				node.insertAfter(createParagraphNode());
			}
		}

		unregister = mergeRegister(
			registerRichText(editor),
			registerHistory(editor, createEmptyHistoryState(), 1000),
			// List commands (INSERT_ORDERED / INSERT_UNORDERED / REMOVE +
			// Enter-in-list-item handling) aren't wired by registerRichText.
			// Without this the toolbar's • List and 1. List buttons dispatch
			// commands that no listener consumes, so nothing happens.
			registerList(editor),
			// One transform per decorator type — each fires only when its
			// own node type changes, so we don't run every check on every
			// text edit.
			editor.registerNodeTransform(DecklistNode, ensureTrailingParagraph),
			editor.registerNodeTransform(StatsTableNode, ensureTrailingParagraph),
			editor.registerNodeTransform(ImageUploadNode, ensureTrailingParagraph),
			editor.registerNodeTransform(InlineVideoNode, ensureTrailingParagraph),
			editor.registerUpdateListener(({ editorState }) => {
				const json = editorState.toJSON();
				value = json;
				isEmpty = isEditorStateEmpty(json);
				editorState.read(() => {
					const sel = getSelection();
					if (sel && typeof sel.hasFormat === 'function') {
						activeFormats = {
							bold: sel.hasFormat('bold'),
							italic: sel.hasFormat('italic'),
							underline: sel.hasFormat('underline'),
							strikethrough: sel.hasFormat('strikethrough')
						};
					}
				});
				dispatch('change', json);
			})
		);

		try {
			const doc = coerceLexicalDoc(value);
			if (!isEditorStateEmpty(doc)) {
				const state = editor.parseEditorState(JSON.stringify(doc));
				editor.setEditorState(state);
			}
		} catch (err) {
			console.warn('[lexical] failed to hydrate initial state, starting empty', err);
		}

		dispatch('ready');
	});

	onDestroy(() => {
		if (unregister) unregister();
		if (editor) editor.setRootElement(null);
	});

	function isEditorStateEmpty(json) {
		const children = json?.root?.children || [];
		if (children.length === 0) return true;
		if (children.length === 1 && children[0].type === 'paragraph') {
			const inner = children[0].children || [];
			if (inner.length === 0) return true;
			if (inner.length === 1 && inner[0].type === 'text' && !inner[0].text) return true;
		}
		return false;
	}

	function formatText(kind) {
		if (!editor) return;
		editor.dispatchCommand(FORMAT_TEXT_COMMAND, kind);
	}

	function setBlock(kind) {
		if (!editor) return;
		editor.update(() => {
			const sel = getSelection();
			if (!sel) return;
			if (kind === 'paragraph') {
				setBlocksType(sel, () => createParagraphNode());
			} else if (kind === 'quote') {
				setBlocksType(sel, () => createQuoteNode());
			} else {
				setBlocksType(sel, () => createHeadingNode(kind));
			}
		});
	}

	function insertList(kind) {
		if (!editor) return;
		editor.dispatchCommand(
			kind === 'ol' ? INSERT_ORDERED_LIST_COMMAND : INSERT_UNORDERED_LIST_COMMAND,
			undefined
		);
	}

	function insertLink() {
		if (!editor) return;
		const url = prompt('Link URL', 'https://');
		if (!url) return;
		editor.update(() => {
			const sel = getSelection();
			const linkNode = createLinkNode(url);
			const selectedText = sel?.getTextContent?.() || '';
			linkNode.append(createTextNode(selectedText || url));
			if (sel) {
				insertNodes([linkNode]);
			} else {
				const para = createParagraphNode();
				para.append(linkNode);
				getRoot().append(para);
			}
		});
		editor.focus();
	}

	// --- Widget insertions -----------------------------------------------------

	function insertDecklist(data) {
		if (!editor) return;
		editor.update(() => {
			const node = createDecklistNode(data);
			insertNodes([node]);
		});
	}

	function insertStatsTable(data) {
		if (!editor) return;
		editor.update(() => {
			const node = createStatsTableNode(data);
			insertNodes([node]);
		});
	}

	function insertInlineVideo(data) {
		if (!editor) return;
		editor.update(() => {
			const node = createInlineVideoNode(data);
			insertNodes([node]);
		});
	}

	function openCardLinkDialog() {
		if (!editor) {
			cardLinkDialogOpen = true;
			return;
		}
		// Capture the currently-selected text (if any) so the dialog can seed
		// its search query — and pass it through to the link text.
		editor.getEditorState().read(() => {
			const sel = getSelection();
			cardLinkSelectedText = sel?.getTextContent?.() || '';
		});
		cardLinkDialogOpen = true;
	}

	function insertCardLink({ text, url }) {
		if (!editor) return;
		editor.update(() => {
			const linkNode = createLinkNode(url);
			linkNode.append(createTextNode(text));

			const selection = getSelection();
			if (selection) {
				// Insert the fully-built link node at the current caret. Lexical
				// will splice it into a text run, so TOGGLE_LINK (which depends on
				// a wrappable text selection that doesn't exist after the modal
				// stole focus) isn't the right primitive here.
				insertNodes([linkNode]);
			} else {
				// No live selection (modal took focus). Append a new paragraph
				// containing the link so nothing is silently lost.
				const para = createParagraphNode();
				para.append(linkNode);
				getRoot().append(para);
			}
		});
		editor.focus();
	}

	// --- Image upload ----------------------------------------------------------

	function openImagePicker() {
		imageInputEl?.click();
	}

	async function handleImageFile(e) {
		const file = e.target?.files?.[0];
		if (!file) return;
		if (!file.type.startsWith('image/')) {
			console.warn('Skipping non-image file');
			return;
		}
		imageUploading = true;
		try {
			const fd = new FormData();
			fd.append('file', file);
			const res = await fetch('/api/cms/upload', { method: 'POST', body: fd });
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				alert(body?.message || `Image upload failed (${res.status})`);
				return;
			}
			const { media } = await res.json();
			if (!editor || !media) return;
			editor.update(() => {
				const node = createImageUploadNode({
					url: media.url,
					alt: media.alt || '',
					width: media.width || null,
					height: media.height || null,
					mediaId: media.id
				});
				insertNodes([node]);
			});
		} catch (err) {
			alert(err?.message || 'Network error during image upload');
		} finally {
			imageUploading = false;
			if (imageInputEl) imageInputEl.value = '';
		}
	}

	// Compact toolbar button classes.
	const tbBase =
		'inline-flex h-8 min-w-[2rem] items-center justify-center rounded-md px-2 text-xs font-mono-system text-ink/80 transition-colors hover:bg-ink/5 disabled:opacity-50';
	const tbActive = 'bg-ink/10 text-ink';
</script>

<div class="cms-editor rounded-md border border-line2 bg-paper">
	<div class="flex flex-wrap items-center gap-1 border-b border-line2 bg-paper-bg/40 px-2 py-1.5">
		<button
			type="button"
			class="{tbBase} {activeFormats.bold ? tbActive : ''}"
			title="Bold (⌘B)"
			on:click={() => formatText('bold')}
		>
			<strong>B</strong>
		</button>
		<button
			type="button"
			class="{tbBase} {activeFormats.italic ? tbActive : ''}"
			title="Italic (⌘I)"
			on:click={() => formatText('italic')}
		>
			<em>I</em>
		</button>
		<button
			type="button"
			class="{tbBase} {activeFormats.underline ? tbActive : ''}"
			title="Underline (⌘U)"
			on:click={() => formatText('underline')}
		>
			<u>U</u>
		</button>
		<button
			type="button"
			class="{tbBase} {activeFormats.strikethrough ? tbActive : ''}"
			title="Strikethrough"
			on:click={() => formatText('strikethrough')}
		>
			<s>S</s>
		</button>

		<span class="mx-1 h-5 w-px bg-line2"></span>

		<button type="button" class={tbBase} title="Paragraph" on:click={() => setBlock('paragraph')}>
			P
		</button>
		<button type="button" class={tbBase} title="Heading 2" on:click={() => setBlock('h2')}>H2</button>
		<button type="button" class={tbBase} title="Heading 3" on:click={() => setBlock('h3')}>H3</button>
		<button type="button" class={tbBase} title="Heading 4" on:click={() => setBlock('h4')}>H4</button>
		<button type="button" class={tbBase} title="Quote" on:click={() => setBlock('quote')}>“ ”</button>

		<span class="mx-1 h-5 w-px bg-line2"></span>

		<button type="button" class={tbBase} title="Bullet list" on:click={() => insertList('ul')}>• List</button>
		<button type="button" class={tbBase} title="Numbered list" on:click={() => insertList('ol')}>1. List</button>

		<span class="mx-1 h-5 w-px bg-line2"></span>

		<button type="button" class={tbBase} title="Link" on:click={insertLink}>Link</button>
		<button
			type="button"
			class={tbBase}
			title="Insert image"
			disabled={imageUploading}
			on:click={openImagePicker}
		>
			{imageUploading ? 'Uploading…' : 'Image'}
		</button>
		<input
			bind:this={imageInputEl}
			type="file"
			accept="image/*"
			on:change={handleImageFile}
			class="hidden"
		/>

		<span class="mx-1 h-5 w-px bg-line2"></span>

		<button
			type="button"
			class={tbBase}
			title="Insert card link"
			on:click={openCardLinkDialog}
		>
			Card
		</button>
		<button
			type="button"
			class={tbBase}
			title="Insert decklist"
			on:click={() => (decklistDialogOpen = true)}
		>
			Deck
		</button>
		<button
			type="button"
			class={tbBase}
			title="Insert stats table"
			on:click={() => (statsDialogOpen = true)}
		>
			Table
		</button>
		<button
			type="button"
			class={tbBase}
			title="Insert inline video (YouTube)"
			on:click={() => (inlineVideoDialogOpen = true)}
		>
			Video
		</button>
	</div>

	<div class="relative">
		<div
			bind:this={editorEl}
			contenteditable="true"
			role="textbox"
			aria-multiline="true"
			class="cms-editor-content min-h-[24rem] w-full px-4 py-5 font-newsreader text-ink focus:outline-none sm:px-6"
			spellcheck="true"
		></div>
		{#if isEmpty}
			<div class="pointer-events-none absolute top-5 left-4 text-ink/40 select-none font-newsreader sm:left-6">
				{placeholder}
			</div>
		{/if}
	</div>
</div>

<svelte:window on:contextmenu={handleWindowContextMenu} />

<InsertDecklistDialog bind:open={decklistDialogOpen} on:insert={(e) => insertDecklist(e.detail)} />
<InsertStatsTableDialog bind:open={statsDialogOpen} on:insert={(e) => insertStatsTable(e.detail)} />
<InsertCardLinkDialog
	bind:open={cardLinkDialogOpen}
	selectedText={cardLinkSelectedText}
	on:insert={(e) => insertCardLink(e.detail)}
/>
<InsertInlineVideoDialog
	bind:open={inlineVideoDialogOpen}
	on:insert={(e) => insertInlineVideo(e.detail)}
/>

<EditorContextMenu
	bind:open={contextMenuOpen}
	x={contextMenuX}
	y={contextMenuY}
	on:setBlock={(e) => setBlock(e.detail)}
	on:insertList={(e) => insertList(e.detail)}
	on:formatText={(e) => formatText(e.detail)}
	on:insertImage={openImagePicker}
	on:insertCardLink={openCardLinkDialog}
	on:insertDecklist={() => (decklistDialogOpen = true)}
	on:insertStatsTable={() => (statsDialogOpen = true)}
	on:insertVideo={() => (inlineVideoDialogOpen = true)}
/>

<style>
	.cms-editor-content :global(.cms-p) {
		margin: 0.75rem 0;
		line-height: 1.7;
	}
	.cms-editor-content :global(p) {
		margin: 0.75rem 0;
		line-height: 1.7;
	}
	.cms-editor-content :global(.cms-h1),
	.cms-editor-content :global(h1) {
		font-size: 1.875rem;
		line-height: 1.2;
		font-weight: 600;
		margin: 1.5rem 0 0.75rem;
	}
	.cms-editor-content :global(.cms-h2),
	.cms-editor-content :global(h2) {
		font-size: 1.5rem;
		line-height: 1.25;
		font-weight: 600;
		margin: 1.5rem 0 0.75rem;
	}
	.cms-editor-content :global(.cms-h3),
	.cms-editor-content :global(h3) {
		font-size: 1.25rem;
		line-height: 1.3;
		font-weight: 600;
		margin: 1.25rem 0 0.5rem;
	}
	.cms-editor-content :global(.cms-h4),
	.cms-editor-content :global(h4) {
		font-size: 1.125rem;
		line-height: 1.3;
		font-weight: 600;
		margin: 1.25rem 0 0.5rem;
	}
	.cms-editor-content :global(.cms-ul),
	.cms-editor-content :global(ul) {
		list-style: disc;
		padding-left: 1.5rem;
		margin: 0.75rem 0;
	}
	.cms-editor-content :global(.cms-ol),
	.cms-editor-content :global(ol) {
		list-style: decimal;
		padding-left: 1.5rem;
		margin: 0.75rem 0;
	}
	.cms-editor-content :global(li) {
		margin: 0.25rem 0;
	}
	.cms-editor-content :global(.cms-quote),
	.cms-editor-content :global(blockquote) {
		border-left: 3px solid var(--color-line2, #ddd);
		padding-left: 1rem;
		color: var(--color-ink, #333);
		opacity: 0.85;
		margin: 1rem 0;
		font-style: italic;
	}
	.cms-editor-content :global(a),
	.cms-editor-content :global(.cms-link) {
		color: var(--color-accent, #1a56db);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.cms-editor-content :global(.cms-b) {
		font-weight: 700;
	}
	.cms-editor-content :global(.cms-i) {
		font-style: italic;
	}
	.cms-editor-content :global(.cms-u) {
		text-decoration: underline;
	}
	.cms-editor-content :global(.cms-s) {
		text-decoration: line-through;
	}
	.cms-editor-content :global(.cms-code),
	.cms-editor-content :global(code) {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.9em;
		background: rgba(0, 0, 0, 0.05);
		padding: 0.1em 0.3em;
		border-radius: 3px;
	}
</style>
