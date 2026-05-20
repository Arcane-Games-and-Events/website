<!--
  Editor — Svelte wrapper around a Lexical editor instance.

  Mounts on a contenteditable div, registers rich-text/list/link nodes,
  serializes to JSON on every change, and exposes the editor instance to
  the toolbar.

  Usage:
    <Editor bind:value={article.body} placeholder="Start writing…" />

  `value` is a Lexical doc object ({ root: { ... } }). It's read once on
  mount as the initial state, then written back on every change. Don't
  reactively force `value` from outside after mount or you'll fight the
  editor — use it like a one-way bind from form state.
-->
<script>
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { createEditor, $insertNodes as insertNodes } from 'lexical';
	import {
		HeadingNode,
		QuoteNode,
		registerRichText,
		$createHeadingNode as createHeadingNode,
		$createQuoteNode as createQuoteNode
	} from '@lexical/rich-text';
	import { ListNode, ListItemNode } from '@lexical/list';
	import { LinkNode, AutoLinkNode } from '@lexical/link';
	import { registerHistory, createEmptyHistoryState } from '@lexical/history';
	import { mergeRegister } from '@lexical/utils';
	import { editorTheme } from './theme.js';
	import { coerceLexicalDoc, emptyLexicalDoc } from './utils.js';
	import { DecklistNode, $createDecklistNode as createDecklistNode } from './nodes/DecklistNode.js';
	import {
		StatsTableNode,
		$createStatsTableNode as createStatsTableNode
	} from './nodes/StatsTableNode.js';
	import { $createLinkNode as createLinkNode } from '@lexical/link';
	import {
		$createTextNode as createTextNode,
		$createParagraphNode as createParagraphNode,
		$getSelection as getSelection,
		$getRoot as getRoot,
		$getNodeByKey as getNodeByKey
	} from 'lexical';
	import { ImageUploadNode, $createImageUploadNode as createImageUploadNode } from './nodes/ImageUploadNode.js';
	import Toolbar from './Toolbar.svelte';
	import InsertDecklistDialog from './InsertDecklistDialog.svelte';
	import InsertStatsTableDialog from './InsertStatsTableDialog.svelte';
	import InsertCardLinkDialog from './InsertCardLinkDialog.svelte';
	import EditorContextMenu from './EditorContextMenu.svelte';
	import {
		INSERT_ORDERED_LIST_COMMAND,
		INSERT_UNORDERED_LIST_COMMAND
	} from '@lexical/list';
	import { FORMAT_TEXT_COMMAND } from 'lexical';
	import { $setBlocksType as setBlocksType } from '@lexical/selection';

	export let value = emptyLexicalDoc();
	export let placeholder = 'Start writing…';

	let decklistDialogOpen = false;
	let statsDialogOpen = false;
	let cardLinkDialogOpen = false;
	let cardLinkSelectedText = '';

	// Right-click context menu state.
	let contextMenuOpen = false;
	let contextMenuX = 0;
	let contextMenuY = 0;

	const dispatch = createEventDispatcher();

	let editorEl;
	let editor = null;
	let unregister = null;
	let isEmpty = true;

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
				ImageUploadNode
			],
			onError: (err) => {
				console.error('[lexical]', err);
			}
		});

		// Connect to DOM first so registerRichText has a target
		editor.setRootElement(editorEl);

		// Custom event from widget nodes' delete button — see DecklistNode etc.
		editorEl.addEventListener('cms-widget-delete', (e) => {
			const nodeKey = e.detail?.nodeKey;
			if (!nodeKey) return;
			editor.update(() => {
				const node = getNodeByKey(nodeKey);
				if (node) node.remove();
			});
		});

		// Register rich-text behavior + history (undo/redo) BEFORE hydrating
		// existing state — registerRichText is what teaches the editor to handle
		// Enter / paragraphs / list keyboard behavior.
		unregister = mergeRegister(
			registerRichText(editor),
			registerHistory(editor, createEmptyHistoryState(), 1000),
			editor.registerUpdateListener(({ editorState }) => {
				const json = editorState.toJSON();
				value = json;
				isEmpty = isEditorStateEmpty(json);
				dispatch('change', json);
			})
		);

		// Hydrate from existing content only when there's real content to load.
		// For new drafts (empty body) we let registerRichText leave its default
		// empty paragraph in place — trying to setEditorState() with a hand-built
		// empty doc was hanging the editor.
		try {
			const doc = coerceLexicalDoc(value);
			if (!isEditorStateEmpty(doc)) {
				const state = editor.parseEditorState(JSON.stringify(doc));
				editor.setEditorState(state);
			}
		} catch (err) {
			console.warn('[lexical] failed to hydrate initial state, starting empty', err);
		}
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

	function openCardLinkDialog() {
		if (!editor) return;
		editor.getEditorState().read(() => {
			const sel = editor._editorState._selection;
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
				// will splice it into a text run, so we don't need TOGGLE_LINK
				// (which depends on a wrappable text selection that doesn't exist
				// after the modal stole focus).
				insertNodes([linkNode]);
			} else {
				// No live selection (modal took focus). Append a new paragraph
				// containing the link to the end of the document so nothing is
				// silently lost.
				const para = createParagraphNode();
				para.append(linkNode);
				getRoot().append(para);
			}
		});
		editor.focus();
	}

	// Listen at the window level and gate by `editorEl.contains(target)` instead
	// of binding the directive directly to the contenteditable — Lexical can
	// rewire the editable on its own internal updates and Svelte's on:directive
	// can lose its handler. The browser still moves the caret to the click
	// point on right-click, so any block/format/insert command we run after
	// lands at the cursor.
	function handleWindowContextMenu(e) {
		if (!editorEl || !editorEl.contains(e.target)) return;
		e.preventDefault();
		e.stopPropagation();
		contextMenuX = e.clientX;
		contextMenuY = e.clientY;
		contextMenuOpen = true;
	}

	function ctxSetBlock(kind) {
		if (!editor) return;
		editor.update(() => {
			const selection = getSelection();
			if (!selection) return;
			if (kind === 'paragraph') {
				setBlocksType(selection, () => createParagraphNode());
			} else if (kind === 'quote') {
				setBlocksType(selection, () => createQuoteNode());
			} else {
				// 'h2' | 'h3' | 'h4' (etc.)
				setBlocksType(selection, () => createHeadingNode(kind));
			}
		});
	}

	function ctxInsertList(kind) {
		if (!editor) return;
		editor.dispatchCommand(
			kind === 'ol' ? INSERT_ORDERED_LIST_COMMAND : INSERT_UNORDERED_LIST_COMMAND,
			undefined
		);
	}

	function ctxFormatText(kind) {
		if (!editor) return;
		editor.dispatchCommand(FORMAT_TEXT_COMMAND, kind);
	}

	let imageInputEl;
	let imageUploading = false;

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
</script>

<svelte:window on:contextmenu={handleWindowContextMenu} />

<div class="cms-editor">
	<Toolbar
		{editor}
		{imageUploading}
		on:insertDecklist={() => (decklistDialogOpen = true)}
		on:insertStatsTable={() => (statsDialogOpen = true)}
		on:insertCardLink={openCardLinkDialog}
		on:insertImage={openImagePicker}
	/>
	<input
		bind:this={imageInputEl}
		type="file"
		accept="image/*"
		on:change={handleImageFile}
		class="hidden"
	/>
	<div class="relative rounded-b-lg border border-gray-700 bg-gray-900">
		<div
			bind:this={editorEl}
			contenteditable="true"
			role="textbox"
			aria-multiline="true"
			class="cms-editor-content min-h-[24rem] w-full px-4 py-3 text-gray-100 focus:outline-none"
			spellcheck="true"
		></div>
		{#if isEmpty}
			<div class="pointer-events-none absolute top-3 left-4 text-gray-500 select-none">
				{placeholder}
			</div>
		{/if}
	</div>
</div>

<InsertDecklistDialog
	bind:open={decklistDialogOpen}
	on:insert={(e) => insertDecklist(e.detail)}
/>
<InsertStatsTableDialog
	bind:open={statsDialogOpen}
	on:insert={(e) => insertStatsTable(e.detail)}
/>
<InsertCardLinkDialog
	bind:open={cardLinkDialogOpen}
	selectedText={cardLinkSelectedText}
	on:insert={(e) => insertCardLink(e.detail)}
/>

<EditorContextMenu
	bind:open={contextMenuOpen}
	x={contextMenuX}
	y={contextMenuY}
	on:setBlock={(e) => ctxSetBlock(e.detail)}
	on:insertList={(e) => ctxInsertList(e.detail)}
	on:formatText={(e) => ctxFormatText(e.detail)}
	on:insertImage={openImagePicker}
	on:insertDecklist={() => (decklistDialogOpen = true)}
	on:insertStatsTable={() => (statsDialogOpen = true)}
	on:insertCardLink={openCardLinkDialog}
/>

<style>
	.cms-editor :global(.cms-editor-content > *) {
		margin: 0;
	}
	.cms-editor :global(.cms-editor-content > * + *) {
		margin-top: 0.75rem;
	}
	.cms-editor-content {
		caret-color: #fff;
	}
</style>
