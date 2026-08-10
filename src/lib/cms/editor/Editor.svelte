<!--
  Editor — Svelte wrapper around a Lexical editor instance, editorial aesthetic.

  Mounts on a contenteditable div, registers rich-text/list/link nodes plus
  the AGE-specific widget nodes, serializes to Lexical JSON on every change,
  and exposes minimal formatting via a top toolbar.

  Usage:
    <Editor bind:value={entry.body} placeholder="Start writing…" on:change={…} on:ready={…} />

  `value` is a Lexical doc object ({ root: { ... } }). It's read once on
  mount as the initial state, then written back on every change. Don't
  reactively force `value` from outside after mount or you'll fight the
  editor — use it like a one-way bind from form state.

  Widget-insert UI (Decklist / StatsTable / CardLink dialogs) is deferred to
  step 4 alongside the card-search backend. The DecoratorNode delete buttons
  already work for removing widgets that get inserted via other flows.
-->
<script>
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { createEditor, $insertNodes as insertNodes, $getSelection as getSelection, $getRoot as getRoot, $getNodeByKey as getNodeByKey, $createParagraphNode as createParagraphNode, $createTextNode as createTextNode, FORMAT_TEXT_COMMAND } from 'lexical';
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
		INSERT_UNORDERED_LIST_COMMAND
	} from '@lexical/list';
	import { LinkNode, AutoLinkNode, $createLinkNode as createLinkNode } from '@lexical/link';
	import { registerHistory, createEmptyHistoryState } from '@lexical/history';
	import { mergeRegister } from '@lexical/utils';
	import { $setBlocksType as setBlocksType } from '@lexical/selection';

	import { editorTheme } from './theme.js';
	import { coerceLexicalDoc, emptyLexicalDoc } from './utils.js';
	import { DecklistNode } from './nodes/DecklistNode.js';
	import { StatsTableNode } from './nodes/StatsTableNode.js';
	import {
		ImageUploadNode,
		$createImageUploadNode as createImageUploadNode
	} from './nodes/ImageUploadNode.js';

	export let value = emptyLexicalDoc();
	export let placeholder = 'Start writing…';

	const dispatch = createEventDispatcher();

	let editorEl;
	let editor = null;
	let unregister = null;
	let isEmpty = true;

	// Track which inline formats are active so the toolbar buttons can style
	// themselves as pressed. Updated inside the update listener below.
	let activeFormats = { bold: false, italic: false, underline: false, strikethrough: false };

	let imageInputEl;
	let imageUploading = false;

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

		// Attach to the DOM before registerRichText so it has a target.
		editor.setRootElement(editorEl);

		// Widget delete button custom event — dispatched by DecklistNode/StatsTableNode/ImageUploadNode.
		editorEl.addEventListener('cms-widget-delete', (e) => {
			const nodeKey = e.detail?.nodeKey;
			if (!nodeKey) return;
			editor.update(() => {
				const node = getNodeByKey(nodeKey);
				if (node) node.remove();
			});
		});

		unregister = mergeRegister(
			registerRichText(editor),
			registerHistory(editor, createEmptyHistoryState(), 1000),
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

		// Hydrate initial state only when there's real content — hand-building
		// an empty doc via setEditorState was hanging the editor, so we let
		// registerRichText's default empty paragraph stand when value is blank.
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
			if (selectedText) {
				linkNode.append(createTextNode(selectedText));
			} else {
				linkNode.append(createTextNode(url));
			}
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
	</div>

	<div class="relative">
		<div
			bind:this={editorEl}
			contenteditable="true"
			role="textbox"
			aria-multiline="true"
			class="cms-editor-content min-h-[24rem] w-full px-6 py-5 font-newsreader text-ink focus:outline-none"
			spellcheck="true"
		></div>
		{#if isEmpty}
			<div class="pointer-events-none absolute top-5 left-6 text-ink/40 select-none font-newsreader">
				{placeholder}
			</div>
		{/if}
	</div>
</div>

<style>
	/* Prose-style typography for the in-editor content. Kept in one place so
	   the visual reader-vs-editor difference stays minimal. */
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
