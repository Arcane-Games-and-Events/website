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
		$isTextNode as isTextNode,
		$getNearestNodeFromDOMNode as getNearestNodeFromDOMNode,
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
	import {
		LinkNode,
		AutoLinkNode,
		$createLinkNode as createLinkNode,
		$isLinkNode as isLinkNode
	} from '@lexical/link';
	import { registerHistory, createEmptyHistoryState } from '@lexical/history';
	import { mergeRegister } from '@lexical/utils';
	import { $setBlocksType as setBlocksType } from '@lexical/selection';

	import { editorTheme } from './theme.js';
	import { coerceLexicalDoc, emptyLexicalDoc } from './utils.js';
	import { DecklistNode, $createDecklistNode as createDecklistNode } from './nodes/DecklistNode.js';
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
	import EditImageDialog from './EditImageDialog.svelte';
	import EditorContextMenu from './EditorContextMenu.svelte';
	import CardLinkPopover from './CardLinkPopover.svelte';
	import { mountWidget } from './widgets/mount.svelte.js';
	import { parseCardLinkUrl } from '$lib/cms/render/lexical-utils.js';

	export let value = emptyLexicalDoc();
	export let placeholder = 'Start writing…';
	/** Optional snippet rendered at the end of the toolbar (save state, settings). */
	export let toolbarEnd = null;

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
	let imageDialogOpen = false;

	// Editing an existing widget: its node key, and the data that fills the
	// dialog. A dialog with `initial` saves into the node instead of inserting.
	let editingKey = null;
	let statsInitial = null;
	let decklistInitial = null;
	let videoInitial = null;
	let imageInitial = null;

	// Card link popover (opens under a clicked card link) and the link being changed.
	let contentWrapEl;
	let cardPopover = null; // { key, name, pitch, customUrl, top, left }
	let cardInitial = null;

	// Widget cards mounted into decorator nodes, by node key.
	const widgets = new Map();

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

		editorEl.addEventListener('click', handleContentClick);
		editorEl.addEventListener('keydown', () => (cardPopover = null));

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
			editor.registerDecoratorListener(syncWidgets),
			editor.registerMutationListener(LinkNode, markCardLinks),
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
				syncWidgets();
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
		for (const w of widgets.values()) w.handle.destroy();
		widgets.clear();
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

	// --- Widget cards ----------------------------------------------------------

	// Keep one card mounted in each decorator node's element: mount new ones,
	// update changed ones in place, drop the ones whose node went away.
	function syncWidgets() {
		if (!editor) return;
		const decorators = editor.getDecorators();
		for (const [key, w] of widgets) {
			if (!decorators[key] || editor.getElementByKey(key) !== w.el) {
				w.handle.destroy();
				widgets.delete(key);
			}
		}
		for (const [key, dec] of Object.entries(decorators)) {
			const el = editor.getElementByKey(key);
			if (!el) continue;
			const w = widgets.get(key);
			if (!w) {
				const handle = mountWidget(el, dec, {
					onedit: () => editWidget(key),
					onremove: () => removeWidget(key)
				});
				widgets.set(key, { el, dec, handle });
			} else if (w.dec !== dec) {
				w.dec = dec;
				w.handle.update(dec);
			}
		}
	}

	// For inline images we also clean up the media row + storage object. The
	// endpoint keeps anything still used as a cover or thumbnail.
	function removeWidget(nodeKey) {
		if (!editor) return;
		let mediaIdToDelete = null;
		editor.getEditorState().read(() => {
			const data = /** @type {any} */ (getNodeByKey(nodeKey))?.__data;
			if (data?.mediaId) mediaIdToDelete = data.mediaId;
		});
		editor.update(() => getNodeByKey(nodeKey)?.remove());
		if (mediaIdToDelete) {
			fetch(`/api/cms/media/${mediaIdToDelete}`, { method: 'DELETE' }).catch(() => {});
		}
	}

	function editWidget(nodeKey) {
		if (!editor) return;
		let type = null;
		let data = null;
		editor.getEditorState().read(() => {
			const node = /** @type {any} */ (getNodeByKey(nodeKey));
			type = node?.getType();
			data = node?.__data;
		});
		if (!type) return;
		editingKey = nodeKey;
		if (type === 'stats_table') [statsInitial, statsDialogOpen] = [data, true];
		else if (type === 'decklist') [decklistInitial, decklistDialogOpen] = [data, true];
		else if (type === 'inline_video') [videoInitial, inlineVideoDialogOpen] = [data, true];
		else if (type === 'upload') [imageInitial, imageDialogOpen] = [data, true];
	}

	function saveWidget(data) {
		const key = editingKey;
		if (!editor || !key) return;
		editor.update(() => /** @type {any} */ (getNodeByKey(key))?.setData(data));
	}

	function endEdit() {
		editingKey = statsInitial = decklistInitial = videoInitial = imageInitial = null;
	}

	// --- Card links --------------------------------------------------------------

	const PITCH_LETTER = { 1: 'r', 2: 'y', 3: 'b' };

	// Lexical renders card: hrefs as about:blank, so mark card links with a
	// data attribute for styling and clicks. Lexical doesn't watch attributes.
	function markCardLinks(mutations) {
		editor.getEditorState().read(() => {
			for (const [key, kind] of mutations) {
				if (kind === 'destroyed') continue;
				const node = getNodeByKey(key);
				const el = editor.getElementByKey(key);
				if (!el || !isLinkNode(node)) continue;
				el.toggleAttribute('data-card-link', !!parseCardLinkUrl(node.getURL()));
			}
		});
	}

	function handleContentClick(e) {
		const a = e.target?.closest?.('a');
		if (!a || !editorEl.contains(a)) return;
		e.preventDefault(); // links never navigate from inside the editor
		let info = null;
		editor.read(() => {
			const node = getNearestNodeFromDOMNode(a);
			const card = isLinkNode(node) ? parseCardLinkUrl(node.getURL()) : null;
			if (card) {
				info = {
					key: node.getKey(),
					name: card.cardId,
					pitch: PITCH_LETTER[card.pitch] || null,
					customUrl: card.customUrl
				};
			}
		});
		if (!info || !contentWrapEl) {
			cardPopover = null;
			return;
		}
		const r = a.getBoundingClientRect();
		const box = contentWrapEl.getBoundingClientRect();
		cardPopover = {
			...info,
			top: Math.round(r.bottom - box.top + 6),
			left: Math.round(Math.max(0, Math.min(r.left - box.left, box.width - 240)))
		};
	}

	function changeCardLink({ name, url }) {
		const { key, name: oldName, customUrl } = cardInitial || {};
		if (!editor || !key) return;
		editor.update(() => {
			const link = getNodeByKey(key);
			if (!isLinkNode(link)) return;
			link.setURL(customUrl ? `${url}|${customUrl}` : url);
			// link text that was just the old card's name follows the new card
			const only = link.getChildrenSize() === 1 ? link.getFirstChild() : null;
			if (isTextNode(only) && only.getTextContent() === oldName) only.setTextContent(name);
		});
	}

	function removeCardLink(key) {
		cardPopover = null;
		editor?.update(() => {
			const link = getNodeByKey(key);
			if (!isLinkNode(link)) return;
			for (const child of link.getChildren()) link.insertBefore(child);
			link.remove();
		});
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

	// Toolbar: square buttons in the site's sans. Every button keeps focus
	// in the editor (mousedown preventDefault) so the selection survives.
	const tbShape =
		'inline-flex h-9 min-w-9 shrink-0 items-center justify-center px-2 font-libre text-[12px] font-semibold transition-colors disabled:opacity-50';
	const tbIdle = 'text-ink/75 hover:bg-ink/[0.06] hover:text-ink';
	const tbActive = 'bg-ink text-paper-bg';
	const tbBase = `${tbShape} ${tbIdle}`;
	const keepFocus = (e) => e.preventDefault();

	// Phone toolbar folds block styles and inserts into two menus.
	let menu = null; // 'style' | 'insert' | null
	function toggleMenu(name) {
		menu = menu === name ? null : name;
	}
	function pick(fn) {
		menu = null;
		fn();
	}
	const STYLE_ITEMS = [
		['Paragraph', () => setBlock('paragraph')],
		['Heading 2', () => setBlock('h2')],
		['Heading 3', () => setBlock('h3')],
		['Heading 4', () => setBlock('h4')],
		['Quote', () => setBlock('quote')],
		['Bulleted list', () => insertList('ul')],
		['Numbered list', () => insertList('ol')],
		['Strikethrough', () => formatText('strikethrough')]
	];
	const INSERT_ITEMS = [
		['Link', () => insertLink()],
		['Image', () => openImagePicker()],
		['Card link', () => openCardLinkDialog()],
		['Decklist', () => (decklistDialogOpen = true)],
		['Stats table', () => (statsDialogOpen = true)],
		['YouTube video', () => (inlineVideoDialogOpen = true)]
	];
	function closeMenuOnOutside(e) {
		if (menu && !e.target.closest?.('[data-tb-menu]')) menu = null;
		if (cardPopover && !e.target.closest?.('[data-card-popover], [data-card-link]')) {
			cardPopover = null;
		}
	}
</script>

<svelte:document on:pointerdown={closeMenuOnOutside} />

<div class="cms-editor border border-line2 bg-white transition-colors focus-within:border-ink">
	<!-- toolbar: sticks under the page's own sticky chrome (--editor-top).
	     The buttons sit in a container sized to what's left after toolbarEnd,
	     and fold into menus by that width. -->
	<div
		class="sticky top-[var(--editor-top,0px)] z-20 flex items-center gap-1 border-b border-line2 bg-paper-bg/95 px-1.5 py-1 backdrop-blur-sm"
		role="toolbar"
		aria-label="Formatting"
	>
		<div class="@container min-w-0 flex-1">
			<div class="flex items-center gap-0.5">
				<button
					type="button"
					class="{tbShape} {activeFormats.bold ? tbActive : tbIdle}"
					title="Bold (⌘B)"
					aria-pressed={!!activeFormats.bold}
					on:mousedown={keepFocus}
					on:click={() => formatText('bold')}><strong>B</strong></button
				>
				<button
					type="button"
					class="{tbShape} {activeFormats.italic ? tbActive : tbIdle}"
					title="Italic (⌘I)"
					aria-pressed={!!activeFormats.italic}
					on:mousedown={keepFocus}
					on:click={() => formatText('italic')}
					><em class="font-newsreader text-[14px]">I</em></button
				>
				<button
					type="button"
					class="{tbShape} {activeFormats.underline ? tbActive : tbIdle}"
					title="Underline (⌘U)"
					aria-pressed={!!activeFormats.underline}
					on:mousedown={keepFocus}
					on:click={() => formatText('underline')}><u>U</u></button
				>
				<span class="hidden @min-[480px]:flex">
					<button
						type="button"
						class="{tbShape} {activeFormats.strikethrough ? tbActive : tbIdle}"
						title="Strikethrough"
						aria-pressed={!!activeFormats.strikethrough}
						on:mousedown={keepFocus}
						on:click={() => formatText('strikethrough')}><s>S</s></button
					>
				</span>

				<span class="mx-1 h-5 w-px shrink-0 bg-line2" aria-hidden="true"></span>

				<!-- block styles: inline when there's room, a menu otherwise -->
				<span class="hidden items-center gap-0.5 @min-[480px]:flex">
					<button
						type="button"
						class={tbBase}
						title="Paragraph"
						on:mousedown={keepFocus}
						on:click={() => setBlock('paragraph')}>¶</button
					>
					<button
						type="button"
						class={tbBase}
						title="Heading 2"
						on:mousedown={keepFocus}
						on:click={() => setBlock('h2')}>H2</button
					>
					<button
						type="button"
						class={tbBase}
						title="Heading 3"
						on:mousedown={keepFocus}
						on:click={() => setBlock('h3')}>H3</button
					>
					<button
						type="button"
						class={tbBase}
						title="Heading 4"
						on:mousedown={keepFocus}
						on:click={() => setBlock('h4')}>H4</button
					>
					<button
						type="button"
						class={tbBase}
						title="Quote"
						on:mousedown={keepFocus}
						on:click={() => setBlock('quote')}
						><span class="font-newsreader text-[16px]">“</span></button
					>
					<button
						type="button"
						class={tbBase}
						title="Bulleted list"
						on:mousedown={keepFocus}
						on:click={() => insertList('ul')}>• List</button
					>
					<button
						type="button"
						class={tbBase}
						title="Numbered list"
						on:mousedown={keepFocus}
						on:click={() => insertList('ol')}>1. List</button
					>
					<span class="mx-1 h-5 w-px bg-line2" aria-hidden="true"></span>
				</span>
				<span class="relative @min-[480px]:hidden" data-tb-menu>
					<button
						type="button"
						class="{tbShape} gap-1 {menu === 'style' ? tbActive : tbIdle}"
						aria-haspopup="menu"
						aria-expanded={menu === 'style'}
						on:mousedown={keepFocus}
						on:click={() => toggleMenu('style')}
						>Style <span class="text-[9px]" aria-hidden="true">▾</span></button
					>
					{#if menu === 'style'}
						<div
							class="absolute top-full left-0 z-30 mt-1 w-48 border border-ink bg-paper-bg shadow-[0_18px_36px_-20px_rgba(20,16,8,0.6)]"
							role="menu"
						>
							{#each STYLE_ITEMS as [lbl, fn] (lbl)}
								<button
									type="button"
									role="menuitem"
									class="block w-full border-b border-line px-3.5 py-2.5 text-left font-libre text-[13.5px] last:border-b-0 hover:bg-paper"
									on:mousedown={keepFocus}
									on:click={() => pick(fn)}>{lbl}</button
								>
							{/each}
						</div>
					{/if}
				</span>

				<!-- link and inserts: inline when there's room, a menu otherwise -->
				<span class="hidden items-center gap-0.5 @min-[680px]:flex">
					<button
						type="button"
						class={tbBase}
						title="Link"
						on:mousedown={keepFocus}
						on:click={insertLink}>Link</button
					>
					<span class="mx-1 h-5 w-px bg-line2" aria-hidden="true"></span>
					<button
						type="button"
						class={tbBase}
						title="Insert image"
						disabled={imageUploading}
						on:mousedown={keepFocus}
						on:click={openImagePicker}>{imageUploading ? 'Uploading…' : 'Image'}</button
					>
					<button
						type="button"
						class={tbBase}
						title="Insert card link"
						on:mousedown={keepFocus}
						on:click={openCardLinkDialog}>Card</button
					>
					<button
						type="button"
						class={tbBase}
						title="Insert decklist"
						on:mousedown={keepFocus}
						on:click={() => (decklistDialogOpen = true)}>Deck</button
					>
					<button
						type="button"
						class={tbBase}
						title="Insert stats table"
						on:mousedown={keepFocus}
						on:click={() => (statsDialogOpen = true)}>Table</button
					>
					<button
						type="button"
						class={tbBase}
						title="Insert YouTube video"
						on:mousedown={keepFocus}
						on:click={() => (inlineVideoDialogOpen = true)}>Video</button
					>
				</span>
				<span class="relative @min-[680px]:hidden" data-tb-menu>
					<button
						type="button"
						class="{tbShape} gap-1 {menu === 'insert' ? tbActive : tbIdle}"
						aria-haspopup="menu"
						aria-expanded={menu === 'insert'}
						on:mousedown={keepFocus}
						on:click={() => toggleMenu('insert')}
						>{imageUploading ? 'Uploading…' : 'Insert'}
						<span class="text-[9px]" aria-hidden="true">▾</span></button
					>
					{#if menu === 'insert'}
						<div
							class="absolute top-full right-0 z-30 mt-1 w-48 border border-ink bg-paper-bg shadow-[0_18px_36px_-20px_rgba(20,16,8,0.6)]"
							role="menu"
						>
							{#each INSERT_ITEMS as [lbl, fn] (lbl)}
								<button
									type="button"
									role="menuitem"
									class="block w-full border-b border-line px-3.5 py-2.5 text-left font-libre text-[13.5px] last:border-b-0 hover:bg-paper"
									on:mousedown={keepFocus}
									on:click={() => pick(fn)}>{lbl}</button
								>
							{/each}
						</div>
					{/if}
				</span>
				<input
					bind:this={imageInputEl}
					type="file"
					accept="image/*"
					on:change={handleImageFile}
					class="hidden"
				/>
			</div>
		</div>

		{#if toolbarEnd}
			<span class="flex shrink-0 items-center gap-1">{@render toolbarEnd()}</span>
		{/if}
	</div>

	<div class="relative" bind:this={contentWrapEl}>
		<div
			bind:this={editorEl}
			contenteditable="true"
			role="textbox"
			aria-multiline="true"
			aria-label="Entry body"
			class="cms-editor-content min-h-[26rem] w-full px-4 py-5 font-newsreader text-[18px] text-ink focus:outline-none md:px-7 md:py-7 md:text-[19px]"
			spellcheck="true"
		></div>
		{#if isEmpty}
			<div
				class="pointer-events-none absolute top-5 left-4 font-newsreader text-[18px] text-fade italic select-none md:top-7 md:left-7 md:text-[19px]"
			>
				{placeholder}
			</div>
		{/if}
		{#if cardPopover}
			<CardLinkPopover
				link={cardPopover}
				onchange={() => {
					cardInitial = cardPopover;
					cardPopover = null;
					cardLinkDialogOpen = true;
				}}
				onremove={() => removeCardLink(cardPopover.key)}
				onclose={() => (cardPopover = null)}
			/>
		{/if}
	</div>
</div>

<svelte:window on:contextmenu={handleWindowContextMenu} />

<InsertDecklistDialog
	bind:open={decklistDialogOpen}
	initial={decklistInitial}
	onsubmit={(d) => (decklistInitial ? saveWidget(d) : insertDecklist(d))}
	onclose={endEdit}
/>
<InsertStatsTableDialog
	bind:open={statsDialogOpen}
	initial={statsInitial}
	onsubmit={(d) => (statsInitial ? saveWidget(d) : insertStatsTable(d))}
	onclose={endEdit}
/>
<InsertInlineVideoDialog
	bind:open={inlineVideoDialogOpen}
	initial={videoInitial}
	onsubmit={(d) => (videoInitial ? saveWidget(d) : insertInlineVideo(d))}
	onclose={endEdit}
/>
<EditImageDialog
	bind:open={imageDialogOpen}
	initial={imageInitial}
	onsubmit={saveWidget}
	onclose={endEdit}
/>
<InsertCardLinkDialog
	bind:open={cardLinkDialogOpen}
	selectedText={cardInitial ? '' : cardLinkSelectedText}
	initial={cardInitial}
	onsubmit={(d) => (cardInitial ? changeCardLink(d) : insertCardLink(d))}
	onclose={() => (cardInitial = null)}
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
	/* Theme classes only (see theme.js), never bare tags: widget previews
	   inside the editor carry the article's own typography. */
	.cms-editor-content :global(.cms-p) {
		margin: 0.75rem 0;
		line-height: 1.7;
	}
	.cms-editor-content :global(.cms-h1) {
		font-size: 1.875rem;
		line-height: 1.2;
		font-weight: 600;
		margin: 1.5rem 0 0.75rem;
	}
	.cms-editor-content :global(.cms-h2) {
		font-size: 1.6rem;
		line-height: 1.2;
		font-weight: 600;
		letter-spacing: -0.01em;
		margin: 2rem 0 0.75rem;
	}
	.cms-editor-content :global(.cms-h3) {
		font-size: 1.25rem;
		line-height: 1.3;
		font-weight: 600;
		margin: 1.25rem 0 0.5rem;
	}
	.cms-editor-content :global(.cms-h4) {
		font-size: 1.125rem;
		line-height: 1.3;
		font-weight: 600;
		margin: 1.25rem 0 0.5rem;
	}
	.cms-editor-content :global(.cms-ul) {
		list-style: disc;
		padding-left: 1.5rem;
		margin: 0.75rem 0;
	}
	.cms-editor-content :global(.cms-ol) {
		list-style: decimal;
		padding-left: 1.5rem;
		margin: 0.75rem 0;
	}
	.cms-editor-content :global(.cms-li) {
		margin: 0.25rem 0;
	}
	.cms-editor-content :global(.cms-quote) {
		border-left: 3px solid var(--color-warm, #1e40af);
		padding-left: 1rem;
		color: var(--color-ink, #333);
		margin: 1rem 0;
		font-style: italic;
	}
	.cms-editor-content :global(.cms-link) {
		color: var(--color-warm, #1e40af);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	/* card links: a tinted, dotted link that opens the card preview */
	.cms-editor-content :global(.cms-link[data-card-link]) {
		background: color-mix(in srgb, var(--color-warm, #1e40af) 8%, transparent);
		text-decoration-style: dotted;
		text-decoration-thickness: 1.5px;
		text-underline-offset: 3px;
		padding: 0 0.12em;
		cursor: pointer;
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
	.cms-editor-content :global(.cms-code) {
		font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
		font-size: 0.9em;
		background: rgba(0, 0, 0, 0.05);
		padding: 0.1em 0.3em;
	}
</style>
